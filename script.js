// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Handle meme card expansion on mobile
    const memeCard = document.querySelector('.meme-card');
    if (memeCard) {
        memeCard.addEventListener('click', function() {
            // Check if we're on mobile (using the same breakpoint as in CSS)
            if (window.innerWidth <= 768) {
                this.classList.toggle('expanded-mobile');
                
                // If we're closing the card, scroll to it to ensure it's visible
                if (!this.classList.contains('expanded-mobile')) {
                    const cardRect = this.getBoundingClientRect();
                    if (cardRect.top < 0) {
                        this.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }
        });
        
        // Close the meme card when clicking outside of it
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768 && !memeCard.contains(event.target) && memeCard.classList.contains('expanded-mobile')) {
                memeCard.classList.remove('expanded-mobile');
            }
        });
    }
    
    if (pomLetters) {
        // Add a subtle bounce effect when hovering over the letters
        const letters = pomLetters.querySelectorAll('.letter');
        
        // Click interaction
        pomLetters.addEventListener('click', () => {
            // Stop any existing animations
            letters.forEach(letter => {
                letter.style.animation = 'none';
            });
            
            // Add the active class for the reveal
            pomLetters.classList.add('active');
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
                
                // Find the parent card
                const card = p.closest('.card');
                
                // Find or create text-content container
                let textContent = p.closest('.text-content');
                
                // If there's no text-content wrapper, wrap the paragraph
                if (!textContent && card) {
                    // Only wrap if not already wrapped
                    if (p.parentNode === card) {
                        // Create a text-content wrapper
                        textContent = document.createElement('div');
                        textContent.className = 'text-content';
                        
                        // Replace the paragraph with the wrapper containing the paragraph
                        p.parentNode.insertBefore(textContent, p);
                        textContent.appendChild(p);
                    }
                }
                
                if (textContent && card) {
                    // Store the full height for use on hover
                    const fullHeight = p.scrollHeight;
                    textContent.setAttribute('data-full-height', fullHeight + 'px');
                    
                    // Add hover event listener if not already added
                    if (!card.hasAttribute('data-hover-handler')) {
                        card.setAttribute('data-hover-handler', 'true');
                        
                        card.addEventListener('mouseenter', () => {
                            // Set the text content to expand
                            textContent.style.maxHeight = textContent.getAttribute('data-full-height');
                            p.style.webkitLineClamp = 'unset';
                            p.style.maxHeight = 'none';
                            
                            // Show the link with a natural flow
                            const link = card.querySelector('.link');
                            if (link) {
                                link.style.opacity = '1';
                                link.style.transform = 'translateY(0)';
                            }
                        });
                        
                        card.addEventListener('mouseleave', () => {
                            // Reset text content
                            textContent.style.maxHeight = '';
                            p.style.webkitLineClamp = '';
                            p.style.maxHeight = '';
                            
                            // Hide the link
                            const link = card.querySelector('.link');
                            if (link) {
                                link.style.opacity = '';
                                link.style.transform = '';
                            }
                        });
                    }
                }
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
        
        // On hover, update iframe src to include autoplay
        card.addEventListener('mouseenter', () => {
            iframe.src = videoSrc.includes('?') 
                ? videoSrc.replace('autoplay=0', 'autoplay=1') 
                : videoSrc + '?autoplay=1';
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

    // Get all cards with links
    const cardsWithLinks = document.querySelectorAll('.card');
    
    // Add click event for mobile users
    cardsWithLinks.forEach(card => {
        card.addEventListener('click', () => {
            // Toggle expanded state
            card.classList.toggle('expanded-mobile');
            
            // Handle link visibility for mobile expanded state
            const link = card.querySelector('.link');
            if (link) {
                if (card.classList.contains('expanded-mobile')) {
                    link.style.opacity = '1';
                    link.style.transform = 'translateY(0)';
                } else {
                    link.style.opacity = '';
                    link.style.transform = '';
                }
            }
            
            // Handle GIF images for mobile expanded state
            if (card.classList.contains('expanded-mobile')) {
                const staticImages = card.querySelectorAll('.static-image');
                const gifImages = card.querySelectorAll('.gif-image');
                
                staticImages.forEach(img => {
                    img.style.opacity = '0';
                });
                
                gifImages.forEach(img => {
                    img.style.opacity = '1';
                });
            } else {
                const staticImages = card.querySelectorAll('.static-image');
                const gifImages = card.querySelectorAll('.gif-image');
                
                staticImages.forEach(img => {
                    img.style.opacity = '1';
                });
                
                gifImages.forEach(img => {
                    img.style.opacity = '0';
                });
            }
        });
        
        // Add hover events as fallback for color transition
        card.addEventListener('mouseenter', () => {
            const images = card.querySelectorAll('.tile-image:not(.gif-image)');
            images.forEach(img => {
                img.style.filter = 'grayscale(0%)';
            });
            
            // Handle GIF images
            const staticImages = card.querySelectorAll('.static-image');
            const gifImages = card.querySelectorAll('.gif-image');
            
            staticImages.forEach(img => {
                img.style.opacity = '0';
            });
            
            gifImages.forEach(img => {
                img.style.opacity = '1';
            });
        });
        
        // Add mouseleave event to de-expand cards when hovering away
        card.addEventListener('mouseleave', () => {
            // Remove expanded state when hovering away, even if clicked
            card.classList.remove('expanded-mobile');
            
            // Reset images
            const images = card.querySelectorAll('.tile-image:not(.gif-image)');
            images.forEach(img => {
                img.style.filter = 'grayscale(0%)';
            });
            
            // Handle GIF images
            const staticImages = card.querySelectorAll('.static-image');
            const gifImages = card.querySelectorAll('.gif-image');
            
            staticImages.forEach(img => {
                img.style.opacity = '1';
            });
            
            gifImages.forEach(img => {
                img.style.opacity = '0';
            });
        });
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

    // Optional: Add masonry-like layout with animation
    function resizeGridItem(item) {
        // Remove the min-height setting that's causing excessive buffer
        // Only set a minimum height if absolutely necessary
        const contentHeight = item.querySelector('.text-content')?.scrollHeight || 0;
        const imageHeight = item.querySelector('.image-container')?.scrollHeight || 0;
        const titleHeight = item.querySelector('h3')?.scrollHeight || 0;
        
        // Clear any previously set min-height
        item.style.minHeight = '';
        
        // Only set a very minimal height if the content is extremely short
        if (contentHeight + imageHeight + titleHeight < 150) {
            item.style.minHeight = '300px';
        }
    }

    function resizeAllGridItems() {
        const allItems = document.querySelectorAll('.card');
        allItems.forEach(item => {
            resizeGridItem(item);
        });
    }

    // Initial resize
    window.addEventListener('load', resizeAllGridItems);
    window.addEventListener('resize', resizeAllGridItems);
}); 