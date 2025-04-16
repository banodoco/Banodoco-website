import { startGrowth } from './plant-animation.js';

// Initialize plant animation after footer is loaded
function initializePlantAnimation() {
    const wateringContainer = document.querySelector('.watering-container');
    const initialBud = document.getElementById('initialBud');
    const waterDrops = document.querySelector('.water-drops');
    
    // Ensure initialBud has full opacity at the start
    if (initialBud) {
        initialBud.style.opacity = '1';
    }

    // Add a class with slower transition when needed
    function addSlowerTransition() {
        if (window.innerWidth < 768) {
            wateringContainer.style.transition = 'transform 4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 2s ease';
        } else {
            wateringContainer.style.transition = 'transform 2.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 1s ease';
        }
    }

    if (wateringContainer) {
        function handleAnimation(e) {
            if (e.type === 'touchstart') {
                e.preventDefault();
            }
            if (!window.animationStarted) {
                window.animationStarted = true;
                
                // Disable hover animation by adding a class
                wateringContainer.classList.add('no-hover');
                
                // Apply slower transition before adding the pouring class
                addSlowerTransition();
                
                // Add pouring class to start the watering animation
                wateringContainer.classList.add('pouring');
                
                // Start fading out the initial bud 1 second after watering starts
                setTimeout(() => {
                    if (initialBud) {
                        initialBud.style.transition = 'opacity 2.5s ease-in-out';
                        initialBud.style.opacity = '0';
                    }
                }, 500); // 1 second delay
                
                // Start at the bud's position
                const budRect = initialBud.getBoundingClientRect();
                const startX = budRect.left + budRect.width / 2;
                const startY = budRect.top + budRect.height / 2;

                // Determine DPR (same logic as in plant-animation.js)
                const dpr = window.innerWidth < 768 ? 1 : (window.devicePixelRatio || 1);
                
                // Reduce the animation duration for water droplets
                const drops = document.querySelectorAll('.drop');
                drops.forEach(drop => {
                    drop.style.animationDuration = '0.7s';
                });
                
                // Wait for the water animation to complete, then start growth
                setTimeout(() => {
                    // Stop the water animation by removing the pouring class
                    wateringContainer.classList.remove('pouring');
                    
                    // Start the growth from the sapling position with options, scaling coordinates by DPR
                    startGrowth(startX * dpr, startY * dpr, { duration: 2000 });
                    
                    // Add fade-out class to the watering can
                    wateringContainer.classList.add('fade-out');
                    
                    // Get the social-links element for margin adjustment
                    const socialLinks = document.querySelector('.social-links');
                    
                    if (socialLinks && window.innerWidth >= 768) {
                        requestAnimationFrame(() => {
                            socialLinks.style.marginBottom = '1rem';
                        });
                    }
                }, 1500); // Delay for water drop animation
            }
        }
        
        wateringContainer.addEventListener('click', handleAnimation);
        wateringContainer.addEventListener('touchstart', handleAnimation);
    }
}

// Export the initialization function
export { initializePlantAnimation }; 