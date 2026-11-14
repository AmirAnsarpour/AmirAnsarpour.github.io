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


def optional_json(path, fallback, *, empty_statuses=()):
    """Keep older optional data when an endpoint is temporarily unavailable."""
    try:
        response = github(path)
        if not response and 204 in empty_statuses:
            return []
        return json.loads(response)
    except urllib.error.HTTPError as exc:
        if exc.code in empty_statuses:
            return None if 404 in empty_statuses else []
        print(f'Optional GitHub data unavailable: {path} ({exc.code})', file=sys.stderr)
    except (OSError, ValueError) as exc:
        print(f'Optional GitHub data unavailable: {path} ({type(exc).__name__})', file=sys.stderr)
    return fallback


def repository_contributors(path, fallback):
    contributors = []
    try:
        page = 1
        while True:
            response = github(f'{path}/contributors?per_page=100&page={page}')
            batch = json.loads(response) if response else []
            if not isinstance(batch, list):
                raise ValueError('Invalid contributors')
            contributors.extend({key: contributor.get(key) for key in ('login', 'html_url', 'avatar_url', 'contributions')} for contributor in batch if isinstance(contributor, dict))
            if len(batch) < 100:
                return contributors
            page += 1
    except (OSError, ValueError) as exc:
        print(f'Contributors unavailable: {path} ({type(exc).__name__})', file=sys.stderr)
        return fallback


def build():
    previous = previous_snapshot()
    previous_repos = {repo.get('full_name'): repo for repo in previous.get('repos', []) if isinstance(repo, dict)}
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
            old = previous_repos.get(repo.get('full_name'), {})
            commits = optional_json(path + '/commits?per_page=5', old.get('recent_commits'), empty_statuses=(409,))
            if isinstance(commits, list):
                item['recent_commits'] = [{'message': (commit.get('commit', {}).get('message') or commit.get('message') or '').split('\n', 1)[0], 'date': commit.get('commit', {}).get('committer', {}).get('date') or commit.get('date'), 'html_url': commit.get('html_url')} for commit in commits if isinstance(commit, dict)]
            release = optional_json(path + '/releases/latest', old.get('latest_release', False), empty_statuses=(404,))
            if release is None or isinstance(release, dict):
                item['latest_release'] = None if release is None else {key: release.get(key) for key in ('name', 'tag_name', 'published_at', 'html_url')}
                if release is not None:
                    item['latest_release']['assets'] = [{key: asset.get(key) for key in ('name', 'browser_download_url')} for asset in (release.get('assets') or []) if isinstance(asset, dict)][:12]
            contributors = repository_contributors(path, old.get('contributors'))
            if isinstance(contributors, list):
                item['contributors'] = [{key: contributor.get(key) for key in ('login', 'html_url', 'avatar_url', 'contributions')} for contributor in contributors if isinstance(contributor, dict)]
            repos.append(item)
        if len(batch) < 100:
            break
        page += 1
    starred = []
    try:
        starred_page = 1
        while True:
            batch = json.loads(github(f'users/{OWNER}/starred?per_page=100&page={starred_page}'))
            if not isinstance(batch, list):
                raise ValueError('Invalid starred repositories')
            for repo in batch:
                if isinstance(repo, dict) and not repo.get('private'):
                    starred.append({key: repo.get(key) for key in ('full_name', 'html_url', 'description', 'language', 'stargazers_count')})
            if len(batch) < 100:
                break
            starred_page += 1
    except (OSError, ValueError):
        starred = previous.get('starred')
        print('Starred repositories unavailable; preserving previous public data.', file=sys.stderr)
    events = []
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
    # The Events API exposes a bounded recent history; page through up to 300 events.
    for event_page in range(1, 4):
        batch = json.loads(github(f'users/{OWNER}/events/public?per_page=100&page={event_page}'))
        if not isinstance(batch, list):
            raise ValueError('Invalid events data')
        for event in batch:
            try:
                when = datetime.datetime.fromisoformat(event.get('created_at', '').replace('Z', '+00:00'))
            except ValueError:
                continue
            if when >= cutoff:
                events.append({'type': event.get('type'), 'created_at': event.get('created_at'), 'repo': {'name': event.get('repo', {}).get('name')}})
        if len(batch) < 100:
            break
    try:
        contributions = json.loads(get(f'https://github-contributions-api.jogruber.de/v4/{OWNER}?y=last'))
        if not contributions.get('contributions'):
            raise ValueError('Invalid calendar data')
    except (OSError, ValueError):
        contributions = previous.get('contributions')
        if not contributions:
            raise RuntimeError('Contribution calendar unavailable and no prior calendar exists')
        print('Calendar unavailable; preserving previous public data.', file=sys.stderr)
    return {'version':1, 'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'profile':{'followers':user['followers'], 'following':user['following']}, 'repos':repos, 'starred':starred, 'events':events, 'contributions':contributions}


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
