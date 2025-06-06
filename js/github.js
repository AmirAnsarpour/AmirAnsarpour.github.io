/**
 * GitHub Repositories Fetcher
 * Fetches and displays repositories from GitHub with a minimal design
 */

document.addEventListener('DOMContentLoaded', () => {
    // GitHub username
    const username = 'AmirAnsarpour';
    const reposContainer = document.getElementById('repositories');
    
    // Fetch repositories from GitHub
    fetchRepositories(username);
    
    // Initialize particles.js
    initParticles();
});

/**
 * Fetch repositories from GitHub API
 * @param {string} username - GitHub username
 */
async function fetchRepositories(username) {
    try {
        // Show loading state
        document.querySelectorAll('.repo-placeholder').forEach(placeholder => {
            placeholder.style.opacity = '1';
        });
        
        // Get all repositories (up to 100)
        const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch repositories');
        }
        
        const repos = await response.json();
        
        // Sort repositories by stars (highest to lowest)
        repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
        
        // Hide loading placeholders
        document.querySelectorAll('.repo-placeholder').forEach(placeholder => {
            placeholder.style.opacity = '0';
            setTimeout(() => placeholder.style.display = 'none', 300);
        });
        
        // Display top 12 repositories
        displayRepositories(repos.slice(0, 12));
    } catch (error) {
        console.error('Error fetching repositories:', error);
        displayErrorMessage();
    }
}

/**
 * Display repositories in the container
 * @param {Array} repos - Array of repository objects
 */
function displayRepositories(repos) {
    // Clear loading placeholders
    const reposContainer = document.getElementById('repositories');
    
    if (repos.length === 0) {
        reposContainer.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-xl text-gray-400">No repositories found</p>
            </div>
        `;
        return;
    }
    
    // Display each repository with a staggered animation
    repos.forEach((repo, index) => {
        // Create a link element that wraps the entire card
        const card = document.createElement('a');
        card.href = repo.html_url;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.className = 'repo-card p-6 opacity-0';
        card.style.animationDelay = `${index * 100}ms`;
        
        // Format date
        const updatedAt = new Date(repo.updated_at);
        const formattedDate = updatedAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Format stars count
        const starsCount = formatNumber(repo.stargazers_count);
        
        // Create repository card content
        card.innerHTML = `
            <h3 class="repo-name">${repo.name}</h3>
            <p class="repo-description line-clamp-1">
                ${repo.description || 'No description available'}
            </p>
            <div class="repo-stats">
                <div class="flex items-center">
                    <span class="language-dot ${getLanguageColor(repo.language)}"></span>
                    ${repo.language || 'Unknown'}
                </div>
                <div class="flex items-center space-x-4">
                    <div class="flex items-center">
                        <i class="far fa-star mr-1"></i>
                        ${starsCount}
                    </div>
                </div>
            </div>
        `;
        
        reposContainer.appendChild(card);
        
        // Trigger animation after a small delay
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + index * 100);
    });
}

/**
 * Format number with K suffix for thousands
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
function formatNumber(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num;
}

/**
 * Get color class based on programming language
 * @param {string} language - Programming language
 * @returns {string} - CSS class for the language color
 */
function getLanguageColor(language) {
    if (!language) return 'bg-gray-500';
    
    const colors = {
        'JavaScript': 'bg-yellow-400',
        'TypeScript': 'bg-blue-400',
        'HTML': 'bg-orange-500',
        'CSS': 'bg-blue-500',
        'Python': 'bg-green-500',
        'Java': 'bg-red-500',
        'C#': 'bg-purple-500',
        'PHP': 'bg-indigo-500',
        'Ruby': 'bg-red-600',
        'Go': 'bg-blue-300',
        'Swift': 'bg-orange-600',
        'Kotlin': 'bg-purple-400',
        'Rust': 'bg-orange-700',
        'Dart': 'bg-blue-400',
    };
    
    return colors[language] || 'bg-gray-500';
}

/**
 * Display error message if repositories cannot be fetched
 */
function displayErrorMessage() {
    const reposContainer = document.getElementById('repositories');
    reposContainer.innerHTML = `
        <div class="col-span-full bg-secondary border border-gray-800 p-6 text-center">
            <p class="text-xl text-gray-400 mb-2">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Unable to load repositories
            </p>
            <p class="text-gray-300">
                Please check your connection and try again later.
            </p>
        </div>
    `;
}

/**
 * Initialize particles.js with custom configuration for minimal black and white theme
 */
function initParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: {
                    value: 40,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: '#ffffff'
                },
                shape: {
                    type: 'circle',
                    stroke: {
                        width: 0,
                        color: '#000000'
                    },
                },
                opacity: {
                    value: 0.2,
                    random: true,
                    anim: {
                        enable: true,
                        speed: 1,
                        opacity_min: 0.1,
                        sync: false
                    }
                },
                size: {
                    value: 2,
                    random: true,
                    anim: {
                        enable: true,
                        speed: 2,
                        size_min: 0.1,
                        sync: false
                    }
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#ffffff',
                    opacity: 0.2,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 0.5,
                    direction: 'none',
                    random: true,
                    straight: false,
                    out_mode: 'out',
                    bounce: false,
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: {
                        enable: true,
                        mode: 'grab'
                    },
                    onclick: {
                        enable: true,
                        mode: 'push'
                    },
                    resize: true
                },
                modes: {
                    grab: {
                        distance: 140,
                        line_linked: {
                            opacity: 0.5
                        }
                    },
                    push: {
                        particles_nb: 3
                    }
                }
            },
            retina_detect: true
        });
    }
} 