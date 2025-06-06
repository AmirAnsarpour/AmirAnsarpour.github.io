/**
 * Main script for Amir Ansarpour's portfolio site
 */

document.addEventListener('DOMContentLoaded', () => {
    // Add any additional initialization code here
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add hover effects for links
    const links = document.querySelectorAll('a:not(.repo-card)');
    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            link.style.transition = 'all 0.3s ease';
        });
    });
    
    // Create snowflake noise effect similar to paarrsa.ir
    const filmGrain = document.querySelector('.film-grain');
    if (filmGrain) {
        // Clear any previous content
        filmGrain.innerHTML = '';
        
        // Number of snowflakes - more for a denser effect like paarrsa.ir
        const snowflakeCount = 300;
        
        // Create snowflakes
        for (let i = 0; i < snowflakeCount; i++) {
            createSnowflake(filmGrain);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            // Clear existing snowflakes
            filmGrain.innerHTML = '';
            
            // Create new snowflakes for the new window size
            for (let i = 0; i < snowflakeCount; i++) {
                createSnowflake(filmGrain);
            }
        });
    }
});

/**
 * Creates a single snowflake and animates it
 * @param {HTMLElement} container - The container element for the snowflake
 */
function createSnowflake(container) {
    // Create snowflake element
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    
    // Set random initial position
    const startPositionX = Math.random() * window.innerWidth;
    const startPositionY = Math.random() * window.innerHeight;
    
    // Set random size (0.5px to 2px) - smaller for a more subtle effect
    const size = Math.random() * 1.5 + 0.5;
    
    // Apply styles
    snowflake.style.width = `${size}px`;
    snowflake.style.height = `${size}px`;
    snowflake.style.left = `${startPositionX}px`;
    snowflake.style.top = `${startPositionY}px`;
    snowflake.style.opacity = Math.random() * 0.5 + 0.1; // Lower opacity for subtlety
    
    // Add to container
    container.appendChild(snowflake);
    
    // Random speed (slower for larger flakes to create depth perception)
    const speedFactor = 2 - size; // Adjusted for more natural movement
    
    // Random movement parameters - more horizontal movement like paarrsa.ir
    const speedX = (Math.random() - 0.5) * speedFactor * 1.5;
    const speedY = (Math.random() * 0.3 + 0.2) * speedFactor; // Slower vertical movement
    
    let posX = startPositionX;
    let posY = startPositionY;
    
    // Random flickering
    let flickerInterval = null;
    if (Math.random() > 0.7) { // Only some snowflakes flicker
        flickerInterval = setInterval(() => {
            snowflake.style.opacity = Math.random() * 0.5 + 0.1;
        }, Math.random() * 2000 + 1000);
    }
    
    // Animation function using requestAnimationFrame
    function animate() {
        // Update position
        posX += speedX;
        posY += speedY;
        
        // Apply new position
        snowflake.style.left = `${posX}px`;
        snowflake.style.top = `${posY}px`;
        
        // Check if snowflake is out of view
        if (posY > window.innerHeight) {
            // Reset position to top with random x
            posX = Math.random() * window.innerWidth;
            posY = -10;
            snowflake.style.left = `${posX}px`;
            snowflake.style.top = `${posY}px`;
        } else if (posX < -10 || posX > window.innerWidth + 10) {
            // Reset position if it goes off the sides
            posX = Math.random() * window.innerWidth;
            posY = Math.random() * window.innerHeight;
            snowflake.style.left = `${posX}px`;
            snowflake.style.top = `${posY}px`;
        }
        
        // Continue animation
        requestAnimationFrame(animate);
    }
    
    // Start animation
    animate();
}