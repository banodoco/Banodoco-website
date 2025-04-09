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
                    
                    // START FADE/MARGIN ADJUSTMENT IMMEDIATELY
                    console.log('Starting fade-out of watering can AND margin adjustment NOW (immediately after startGrowth).');
                    
                    // Add fade-out class to the watering can
                    wateringContainer.classList.add('fade-out');
                    
                    // Get parent elements for logging
                    const footer = document.getElementById('footer');
                    const finalSection = document.querySelector('.final-section');
                    
                    // Log initial parent dimensions
                    if (footer) console.log('Footer initial height:', footer.offsetHeight, window.getComputedStyle(footer).height);
                    if (finalSection) console.log('Final Section initial height:', finalSection.offsetHeight, window.getComputedStyle(finalSection).height);
                    
                    // Get the social-links element
                    const socialLinks = document.querySelector('.social-links');
                    
                    if (socialLinks) {
                        console.log('Starting margin adjustment for .social-links.');
                        const currentMargin = window.getComputedStyle(socialLinks).marginBottom;
                        console.log('Current .social-links margin-bottom (before transition):', currentMargin);
                        
                        // Set the target margin - use requestAnimationFrame for timing
                        requestAnimationFrame(() => {
                            // Log parent dimensions just before setting margin
                            if (footer) console.log('Footer height BEFORE margin set:', footer.offsetHeight, window.getComputedStyle(footer).height);
                            if (finalSection) console.log('Final Section height BEFORE margin set:', finalSection.offsetHeight, window.getComputedStyle(finalSection).height);
                            
                            console.log('Setting new .social-links margin-bottom to 1.75rem.');
                            socialLinks.style.marginBottom = '1.75rem';
                            
                            // Log parent dimensions immediately after setting margin (might not reflect final state yet)
                            setTimeout(() => {
                                if (footer) console.log('Footer height JUST AFTER margin set:', footer.offsetHeight, window.getComputedStyle(footer).height);
                                if (finalSection) console.log('Final Section height JUST AFTER margin set:', finalSection.offsetHeight, window.getComputedStyle(finalSection).height);
                            }, 0);
                        });
                        
                    } else {
                        console.log('.social-links element not found.');
                    }

                }, 1500); // Delay for water drop animation
            }
        });
    }
}

// Export the initialization function
export { initializePlantAnimation }; 