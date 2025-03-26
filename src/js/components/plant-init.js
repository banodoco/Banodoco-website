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
        wateringContainer.style.transition = 'transform 2.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 1s ease';
    }

    if (wateringContainer) {
        wateringContainer.addEventListener('click', () => {
            if (!window.animationStarted) {
                window.animationStarted = true;
                
                // Disable hover animation by adding a class
                wateringContainer.classList.add('no-hover');
                
                // Apply slower transition before adding the pouring class
                addSlowerTransition();
                
                // Add pouring class to start the watering animation
                wateringContainer.classList.add('pouring');
                
                // Start fading out the initial bud immediately when watering starts
                if (initialBud) {
                    initialBud.style.transition = 'opacity 2.5s ease-in-out';
                    initialBud.style.opacity = '0';
                }
                
                // Start at the bud's position
                const budRect = initialBud.getBoundingClientRect();
                const startX = budRect.left + budRect.width / 2;
                const startY = budRect.top + budRect.height / 2;
                
                // Reduce the animation duration for water droplets
                const drops = document.querySelectorAll('.drop');
                drops.forEach(drop => {
                    drop.style.animationDuration = '0.7s';
                });
                
                // Wait for the water animation to complete, then start growth
                setTimeout(() => {
                    // Stop the water animation by removing the pouring class
                    wateringContainer.classList.remove('pouring');
                    
                    // Start the growth from the sapling position
                    startGrowth(startX, startY);
                    
                    // Wait for the plant to start growing before fading out the watering can
                    setTimeout(() => {
                        // Add fade-out class to the watering can
                        wateringContainer.classList.add('fade-out');
                        
                        // Wait for fade-out to complete before hiding
                        setTimeout(() => {
                            wateringContainer.style.display = 'none';
                            if (initialBud) {
                                initialBud.style.display = 'none';
                            }
                            
                            // Wait an additional 1 second before removing the dead space
                            setTimeout(() => {
                                // Get the social-links element and adjust its margin to remove dead space
                                const socialLinks = document.querySelector('.social-links');
                                if (socialLinks) {
                                    // Add a transition for smooth animation
                                    socialLinks.style.transition = 'margin-bottom 1.5s ease-in-out';
                                    // After a small delay to ensure transition is applied
                                    setTimeout(() => {
                                        socialLinks.style.marginBottom = '0.45rem';
                                    }, 50);
                                }
                            }, 1000);
                        }, 1000); // Wait for fade-out to complete before hiding
                    }, 1000); // Wait for plant to start growing
                    
                }, 1500); // Delay for water drop animation
            }
        });
    }
}

// Export the initialization function
export { initializePlantAnimation }; 