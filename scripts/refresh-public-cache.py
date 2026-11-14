#!/usr/bin/env python3
"""Refresh the public portfolio cache without committing GitHub data to the repo."""
import datetime
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

OWNER = 'AmirAnsarpour'
ROOT = 'https://nepmcsckxjlpkmnujoma.supabase.co'
BUCKET = 'portfolio-public-cache'
OBJECT = 'sites/amir-ansarpour/github.json'
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
SUPABASE_SECRET = os.environ.get('SUPABASE_CACHE_SECRET', '')


def get(url, *, github=False, accept='application/json', optional_404=False):
    headers = {'User-Agent': 'amir-portfolio-cache/1.0', 'Accept': accept}
    if github and GITHUB_TOKEN:
        headers['Authorization'] = 'Bearer ' + GITHUB_TOKEN
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as res:
            return res.read().decode('utf-8')
    except urllib.error.HTTPError as exc:
        if optional_404 and exc.code == 404:
            return None
        raise


def github(path, *, accept='application/vnd.github+json', optional_404=False):
    return get('https://api.github.com/' + path, github=True, accept=accept, optional_404=optional_404)


def previous_snapshot():
    try:
        return json.loads(get(f'{ROOT}/storage/v1/object/public/{BUCKET}/{OBJECT}'))
    except (OSError, ValueError):
        return {}


def build():
    previous = previous_snapshot()
    user = json.loads(github(f'users/{OWNER}'))
    if not all(isinstance(user.get(k), int) for k in ('followers', 'following')):
        raise ValueError('Invalid GitHub profile')
    repos = []
    page = 1
    while True:
        batch = json.loads(github(f'users/{OWNER}/repos?type=owner&per_page=100&page={page}'))
        if not isinstance(batch, list):
            raise ValueError('Invalid GitHub repositories')
        for repo in batch:
            if repo.get('private') or repo.get('owner', {}).get('login', '').lower() != OWNER.lower():
                continue
            name = urllib.parse.quote(repo['name'], safe='')
            path = f'repos/{OWNER}/{name}'
            languages = json.loads(github(path + '/languages'))
            if not isinstance(languages, dict):
                raise ValueError('Invalid language data')
            readme = github(path + '/readme', accept='application/vnd.github.html+json', optional_404=True)
            if readme is not None and not readme.lstrip().startswith('<'):
                raise ValueError('Unexpected README format')
            keys = ('name','full_name','html_url','description','language','stargazers_count','forks_count','pushed_at','updated_at','default_branch','homepage')
            item = {key: repo.get(key) for key in keys}
            item.update(languages=languages, readme_html=readme)
            repos.append(item)
        if len(batch) < 100:
            break
        page += 1
    events = json.loads(github(f'users/{OWNER}/events/public?per_page=30'))
    if not isinstance(events, list):
        raise ValueError('Invalid events data')
    events = [{'type': x.get('type'), 'created_at': x.get('created_at'), 'repo': {'name': x.get('repo', {}).get('name')}} for x in events]
    try:
        contributions = json.loads(get(f'https://github-contributions-api.jogruber.de/v4/{OWNER}?y=last'))
        if not contributions.get('contributions'):
            raise ValueError('Invalid calendar data')
    except (OSError, ValueError):
        contributions = previous.get('contributions')
        if not contributions:
            raise RuntimeError('Contribution calendar unavailable and no prior calendar exists')
        print('Calendar unavailable; preserving previous public data.', file=sys.stderr)
    return {'version':1, 'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'profile':{'followers':user['followers'], 'following':user['following']}, 'repos':repos, 'events':events, 'contributions':contributions}


def main():
    global SUPABASE_SECRET, GITHUB_TOKEN
    if not SUPABASE_SECRET:
        if sys.stdin.isatty():
            SUPABASE_SECRET = input('Supabase secret key: ').strip()
        else:
            SUPABASE_SECRET = sys.stdin.readline().strip()
    if not GITHUB_TOKEN:
        try:
            GITHUB_TOKEN = subprocess.check_output(['gh','auth','token'], text=True, stderr=subprocess.DEVNULL).strip()
        except (FileNotFoundError, subprocess.CalledProcessError):
            pass
    if not SUPABASE_SECRET:
        raise RuntimeError('SUPABASE_CACHE_SECRET is required')
    data = build()
    body = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    url = f'{ROOT}/storage/v1/object/{BUCKET}/{OBJECT}'
    request = urllib.request.Request(url, data=body, method='POST', headers={'apikey':SUPABASE_SECRET, 'Content-Type':'application/json', 'Cache-Control':'max-age=300', 'x-upsert':'true'})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status not in (200, 201):
            raise RuntimeError('Upload rejected')
    print(f'Public cache refreshed: {len(data["repos"])} repositories, {len(data["events"])} public events.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Cache refresh failed: {type(error).__name__}: {error}', file=sys.stderr)
        sys.exit(1)
