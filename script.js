// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather icons
    feather.replace();

    // Handle POM letters name reveal
    const pomLetters = document.getElementById('pom-letters');
    
    // Add scroll detection for the top border
    const topBorder = document.querySelector('.pom-border-top');
    const bottomBorder = document.querySelector('.pom-border-bottom');
    let lastScrollTop = 0;
    const scrollThreshold = 50; // Reduced from 100 to 50 pixels
    
    // Function to handle scroll events
    function handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        
        // Show the top border when scrolled down past the threshold
        if (scrollTop > scrollThreshold) {
            topBorder.classList.add('visible');
        } else {
            topBorder.classList.remove('visible');
        }
        
        // Hide the bottom border when near the bottom of the page
        // We use a small offset (50px) to hide it slightly before reaching the absolute bottom
        if (scrollTop + windowHeight > documentHeight - 50) {
            bottomBorder.classList.add('hidden');
        } else {
            bottomBorder.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop;
    }
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Initialize scroll state on page load
    handleScroll();
    
    // Handle meme card expansion - removed old implementation as it's now handled by the general card expansion system
    
    if (pomLetters) {
        // Add a subtle bounce effect when hovering over the letters
        const letters = pomLetters.querySelectorAll('.letter');
        
        // Click interaction
        pomLetters.addEventListener('click', () => {
            pomLetters.classList.toggle('active');
        });
        
        // Add mouseout event to hide the name reveal when hovering away
        pomLetters.addEventListener('mouseleave', () => {
            // Remove active class to hide the name
            pomLetters.classList.remove('active');
            
            // Reset letter animations
            setTimeout(() => {
                letters.forEach(letter => {
                    letter.style.animation = '';
                });
            }, 300);
        });
        
        // Add mouseover event to restore animations when hovering again
        pomLetters.addEventListener('mouseenter', () => {
            // Restore pulse animations if not active
            if (!pomLetters.classList.contains('active')) {
                letters.forEach((letter, index) => {
                    letter.style.animation = `letter-pulse 1.5s infinite ${index * 0.2}s`;
                });
            }
        });
    }
    
    // Reset all image filters on page load
    function resetImageFilters() {
        // Reset tile images
        document.querySelectorAll('.tile-image:not(.gif-image)').forEach(img => {
            img.style.filter = 'grayscale(0%)';
        });
        
        // Reset square images
        document.querySelectorAll('.square-image').forEach(img => {
            img.style.filter = 'grayscale(0%)';
            img.style.transform = 'scale(1)'; // Ensure images start at normal scale
        });
        
        // Reset video thumbnails
        document.querySelectorAll('.video-thumbnail').forEach(img => {
            img.style.filter = 'grayscale(0%)';
        });
        
        // Reset GIF images
        document.querySelectorAll('.gif-image').forEach(img => {
            img.style.opacity = '0';
        });
        
        document.querySelectorAll('.static-image').forEach(img => {
            img.style.opacity = '1';
        });
    }
    
    // Handle links with data-href attributes
    const linksWithHref = document.querySelectorAll('.link[data-href]');
    
    linksWithHref.forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card expansion
            const href = link.getAttribute('data-href');
            if (href) {
                window.open(href, '_blank');
            }
        });
    });

    // Detect truncated paragraphs and add the 'truncated' class
    function detectTruncatedText() {
        document.querySelectorAll('.card p').forEach(p => {
            // Check if the paragraph is truncated
            if (p.scrollHeight > p.clientHeight) {
                p.classList.add('truncated');
            } else {
                p.classList.remove('truncated');
            }
        });
    }

    // Reset all image filters on page load
    resetImageFilters();

    // Detect truncated text after the page has loaded
    window.addEventListener('load', detectTruncatedText);
    window.addEventListener('resize', detectTruncatedText);

    // Handle hover text visibility
    function ensureHoverTextVisibility() {
        const hoverTextElements = document.querySelectorAll('.image-hover-text');
        
        hoverTextElements.forEach(element => {
            // Add mouseenter event to each container
            element.parentElement.addEventListener('mouseenter', () => {
                // Reset any height constraints
                element.style.maxHeight = 'none';
                element.style.overflow = 'visible';
                
                // Get the computed height after removing constraints
                const fullHeight = element.scrollHeight;
                
                // Apply the height
                element.style.height = `${fullHeight}px`;
            });
            
            // Reset on mouseleave
            element.parentElement.addEventListener('mouseleave', () => {
                element.style.height = '';
            });
        });
    }
    
    // Initialize hover text visibility
    window.addEventListener('load', ensureHoverTextVisibility);

    // Sort cards based on data-position attribute
    function sortCardsByPosition() {
        const dashboard = document.querySelector('.dashboard');
        const cards = Array.from(dashboard.querySelectorAll('.card'));
        
        // Sort cards by their data-position attribute
        cards.sort((a, b) => {
            const posA = parseInt(a.getAttribute('data-position')) || 999;
            const posB = parseInt(b.getAttribute('data-position')) || 999;
            return posA - posB;
        });
        
        // Reappend cards in the sorted order
        cards.forEach(card => {
            dashboard.appendChild(card);
        });
    }
    
    // Call sort function on load
    sortCardsByPosition();

    // Handle video cards
    const videoCards = document.querySelectorAll('.video-card');
    
    videoCards.forEach(card => {
        const iframe = card.querySelector('iframe');
        const videoSrc = iframe.src;
        
        // Set initial iframe src without autoplay
        iframe.src = videoSrc;
        
        // On hover, update iframe src to include autoplay only if the card is fully expanded
        card.addEventListener('mouseenter', () => {
            if (card.classList.contains('expanded')) {
                iframe.src = videoSrc.includes('?') 
                    ? videoSrc.replace('autoplay=0', 'autoplay=1') 
                    : videoSrc + '?autoplay=1';
            }
        });
        
        // On mouse leave, reset iframe src to stop video
        card.addEventListener('mouseleave', () => {
            iframe.src = videoSrc;
        });
        
        // For mobile, handle click on the video overlay
        const videoOverlay = card.querySelector('.video-overlay');
        if (videoOverlay) {
            videoOverlay.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card expansion
                iframe.src = videoSrc.includes('?') 
                    ? videoSrc.replace('autoplay=0', 'autoplay=1') 
                    : videoSrc + '?autoplay=1';
                videoOverlay.style.opacity = '0';
                videoOverlay.style.visibility = 'hidden';
                card.querySelector('.video-embed').style.opacity = '1';
                card.querySelector('.video-embed').style.visibility = 'visible';
            });
        }
    });

    // Handle square image containers for mobile and hover
    const squareImageContainers = document.querySelectorAll('.square-image-container');
    
    squareImageContainers.forEach(container => {
        container.addEventListener('click', () => {
            // First, remove mobile-active class from all containers
            squareImageContainers.forEach(c => {
                if (c !== container) {
                    c.classList.remove('mobile-active');
                }
            });
            
            // Toggle mobile-active class for the clicked container
            container.classList.toggle('mobile-active');
        });
        
        // Add hover events as fallback for color transition
        container.addEventListener('mouseenter', () => {
            const image = container.querySelector('.square-image');
            if (image) {
                image.style.filter = 'grayscale(0%)';
                image.style.transform = 'scale(1.05)';
                container.style.zIndex = '2'; // Ensure hovered container is on top
            }
        });
        
        // Add mouseleave event to de-expand square images when hovering away
        container.addEventListener('mouseleave', () => {
            // Remove mobile-active class when hovering away
            container.classList.remove('mobile-active');
            
            const image = container.querySelector('.square-image');
            if (image) {
                image.style.filter = 'grayscale(0%)';
                image.style.transform = 'scale(1)';
                container.style.zIndex = '1'; // Reset z-index
            }
        });
    });

    // Handle card expansion logic
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        // Hover-based expansion for desktop
        card.addEventListener('mouseenter', () => {
            if (window.innerWidth > 768) {
                cards.forEach(c => c.classList.remove('expanded'));
                card.classList.add('expanded');
                
                // Special handling for meme cards on desktop hover
                if (card.classList.contains('meme-card')) {
                    const memeImages = card.querySelectorAll('.meme-image');
                    memeImages.forEach((img, index) => {
                        img.style.transitionDelay = `${0.1 * (index + 1)}s`;
                        img.style.transform = 'translateY(0)';
                        img.style.opacity = '1';
                    });
                }
            }
        });

        card.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                card.classList.remove('expanded');
                
                // Special handling for meme cards on desktop hover out
                if (card.classList.contains('meme-card')) {
                    const memeImages = card.querySelectorAll('.meme-image');
                    memeImages.forEach(img => {
                        img.style.transitionDelay = '0s';
                        img.style.transform = 'translateY(10px)';
                        img.style.opacity = '0';
                    });
                }
            }
        });

        // Click-based expansion for mobile
        card.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const isExpanded = card.classList.contains('expanded');
                cards.forEach(c => {
                    c.classList.remove('expanded');
                    
                    // Reset all meme cards when closing
                    if (c.classList.contains('meme-card')) {
                        const memeImages = c.querySelectorAll('.meme-image');
                        memeImages.forEach(img => {
                            img.style.transform = 'translateY(10px)';
                            img.style.opacity = '0';
                        });
                    }
                });
                
                if (!isExpanded) {
                    card.classList.add('expanded');
                    
                    // Special handling for meme cards on mobile click
                    if (card.classList.contains('meme-card')) {
                        const memeImages = card.querySelectorAll('.meme-image');
                        memeImages.forEach((img, index) => {
                            img.style.transitionDelay = `${0.1 * (index + 1)}s`;
                            img.style.transform = 'translateY(0)';
                            img.style.opacity = '1';
                        });
                    }
                }
            }
        });
    });

    // Collapse all cards when clicking outside on mobile
    document.body.addEventListener('click', (e) => {
        // Only collapse if click did not occur inside a card
        if (window.innerWidth <= 768 && !e.target.closest('.card')) {
            cards.forEach(card => {
                card.classList.remove('expanded');

                // Reset meme images
                if (card.classList.contains('meme-card')) {
                    const memeImages = card.querySelectorAll('.meme-image');
                    memeImages.forEach(img => {
                        img.style.transform = 'translateY(10px)';
                        img.style.opacity = '0';
                    });
                }
            });
        }
    });
}); 