// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather icons
    feather.replace();

    // Preload the Steerable Motion GIF
    const steerableMotionGifUrl = 'https://banodoco.s3.us-east-1.amazonaws.com/Untitled+(1152+x+512+px)+(1).gif';
    const preloadGif = new Image();
    preloadGif.src = steerableMotionGifUrl;
    
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
        // Hide it when at the very top of the page
        if (scrollTop <= 0) {
            // At the very top of the page
            topBorder.classList.remove('visible');
        } else if (scrollTop > scrollThreshold) {
            // Scrolled down past the threshold
            topBorder.classList.add('visible');
        }
        
        // Hide the bottom border when near the bottom of the page
        // We use a larger offset (100px) to hide it before reaching the absolute bottom
        if (scrollTop + windowHeight >= documentHeight - 100) {
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
        // Get all the letters
        const letters = pomLetters.querySelectorAll('.letter');
        let lastClickTime = Date.now();
        let inactivityTimer = null;
        let nameResetTimer = null; // Timer for resetting name back to POM
        let allLettersClicked = false;
        let anyLetterClicked = false;
        
        // Function to check if all letters have been clicked
        function checkAllLettersClicked() {
            allLettersClicked = Array.from(letters).every(letter => letter.classList.contains('clicked'));
            
            if (allLettersClicked) {
                // If all letters are clicked, activate the name reveal
                clearTimeout(inactivityTimer); // Clear any existing timer
                
                // Stop all vibrations
                letters.forEach(letter => {
                    letter.style.animation = '';
                });
                
                setTimeout(() => {
                    pomLetters.classList.add('active');
                    
                    // Set timer to reset back to POM after 5 seconds
                    clearTimeout(nameResetTimer);
                    nameResetTimer = setTimeout(() => {
                        resetLetters();
                    }, 5000); // 5 seconds
                }, 300);
                
                return true;
            }
            
            return false;
        }
        
        // Function to reset the letters
        function resetLetters() {
            letters.forEach(letter => {
                letter.classList.remove('clicked');
                letter.style.animation = '';
            });
            pomLetters.classList.remove('active');
            allLettersClicked = false;
            anyLetterClicked = false;
            
            clearTimeout(inactivityTimer);
            clearTimeout(nameResetTimer);
        }
        
        // Function to start vibrating all letters
        function startVibratingLetters() {
            letters.forEach(letter => {
                // Only vibrate letters that have been clicked
                if (letter.classList.contains('clicked')) {
                    letter.style.animation = 'letter-vibrate 0.5s infinite';
                }
            });
            
            // Set a timer to stop vibration after 10 seconds
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                if (!allLettersClicked) {
                    // Stop vibration but keep the clicked state
                    letters.forEach(letter => {
                        if (letter.classList.contains('clicked')) {
                            letter.style.animation = 'letter-clicked-pulse 2s infinite';
                        }
                    });
                }
            }, 10000); // 10 seconds
        }
        
        // Add click event to each individual letter
        letters.forEach((letter, index) => {
            letter.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the event from bubbling up
                
                // If letter is not already clicked, mark it as clicked
                if (!letter.classList.contains('clicked')) {
                    letter.classList.add('clicked');
                    anyLetterClicked = true;
                    
                    // Start vibrating all clicked letters
                    startVibratingLetters();
                    
                    // Check if all letters are now clicked
                    if (checkAllLettersClicked()) {
                        // If all letters are clicked, stop the vibration
                        letters.forEach(letter => {
                            letter.style.animation = '';
                        });
                    }
                }
            });
        });
        
        // Add click event to the container to reset if clicking outside letters
        pomLetters.addEventListener('click', (e) => {
            // Only trigger if clicking directly on the container (not on a letter)
            if (e.target === pomLetters) {
                resetLetters();
            }
        });
        
        // Add mouseout event to reset when hovering away
        pomLetters.addEventListener('mouseleave', () => {
            // Only reset if not all letters have been clicked yet
            if (!allLettersClicked) {
                resetLetters();
            }
        });
        
        // Add mouseover event to ensure animations continue
        pomLetters.addEventListener('mouseenter', () => {
            // If any letter has been clicked but not all, ensure clicked letters are vibrating
            if (anyLetterClicked && !allLettersClicked && !pomLetters.classList.contains('active')) {
                startVibratingLetters();
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
        
        // Reset hover-gifs
        document.querySelectorAll('.hover-gif').forEach(gif => {
            gif.style.opacity = '0';
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

    // Handle hover-gif visibility for project tiles
    const projectTiles = document.querySelectorAll('.project-tile');
    projectTiles.forEach(tile => {
        const hoverGif = tile.querySelector('.hover-gif');
        if (hoverGif) {
            const gifImg = hoverGif.querySelector('img');
            const originalSrc = gifImg ? gifImg.src : '';
            
            // Show hover-gif on mouseenter
            tile.addEventListener('mouseenter', () => {
                hoverGif.style.opacity = '1';
            });
            
            // Hide hover-gif and reset GIF on mouseleave
            tile.addEventListener('mouseleave', () => {
                hoverGif.style.opacity = '0';
                
                // Reset the GIF by removing and re-adding the src
                if (gifImg && originalSrc) {
                    // Use setTimeout to ensure the opacity transition completes first
                    setTimeout(() => {
                        gifImg.src = '';
                        // Force browser reflow
                        void gifImg.offsetWidth;
                        gifImg.src = originalSrc;
                    }, 500); // Wait for opacity transition to complete
                }
            });
        }
    });

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

    // Store original iframe sources for each video card
    const videoSources = new Map();

    // Function to reset all video cards
    function resetAllVideoCards() {
        document.querySelectorAll('.video-card').forEach(card => {
            const videoEmbed = card.querySelector('.video-embed');
            const videoOverlay = card.querySelector('.video-overlay');
            
            // Remove any existing iframe
            while (videoEmbed.firstChild) {
                videoEmbed.removeChild(videoEmbed.firstChild);
            }
            
            // Show the overlay
            if (videoOverlay) {
                videoOverlay.style.opacity = '1';
                videoOverlay.style.visibility = 'visible';
            }
            
            // Hide the embed container
            videoEmbed.style.opacity = '0';
            videoEmbed.style.visibility = 'hidden';
        });
    }

    // Add helper function to reset all video cards except the current one
    function resetOtherVideoCards(currentCard) {
        const allVideoCards = document.querySelectorAll('.video-card');
        allVideoCards.forEach(card => {
            if (card !== currentCard) {
                const videoEmbed = card.querySelector('.video-embed');
                const videoOverlay = card.querySelector('.video-overlay');
                if (videoEmbed) {
                    while (videoEmbed.firstChild) {
                        videoEmbed.removeChild(videoEmbed.firstChild);
                    }
                    videoEmbed.style.opacity = '0';
                    videoEmbed.style.visibility = 'hidden';
                }
                if (videoOverlay) {
                    videoOverlay.style.opacity = '1';
                    videoOverlay.style.visibility = 'visible';
                }
            }
        });
    }

    // Handle video cards
    const videoCards = document.querySelectorAll('.video-card');
    
    videoCards.forEach(card => {
        const videoEmbed = card.querySelector('.video-embed');
        const iframe = videoEmbed.querySelector('iframe');
        
        // Store the original iframe source
        if (iframe) {
            videoSources.set(card, {
                src: iframe.src,
                width: iframe.width,
                height: iframe.height,
                title: iframe.title,
                frameborder: iframe.getAttribute('frameborder'),
                allow: iframe.getAttribute('allow'),
                allowfullscreen: iframe.hasAttribute('allowfullscreen')
            });
            
            // Remove the iframe initially
            videoEmbed.removeChild(iframe);
        }
        
        // For mobile, handle click on the video overlay
        const videoOverlay = card.querySelector('.video-overlay');
        if (videoOverlay) {
            videoOverlay.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card expansion
                // Reset all other video cards except current one
                resetOtherVideoCards(card);
                
                // Create a new iframe with the stored attributes
                const iframeData = videoSources.get(card);
                if (iframeData) {
                    const newIframe = document.createElement('iframe');
                    newIframe.src = iframeData.src + (iframeData.src.includes('?') ? '&' : '?') + 'autoplay=1';
                    newIframe.width = iframeData.width;
                    newIframe.height = iframeData.height;
                    newIframe.title = iframeData.title;
                    
                    if (iframeData.frameborder) {
                        newIframe.setAttribute('frameborder', iframeData.frameborder);
                    }
                    
                    if (iframeData.allow) {
                        newIframe.setAttribute('allow', iframeData.allow);
                    }
                    
                    if (iframeData.allowfullscreen) {
                        newIframe.setAttribute('allowfullscreen', '');
                    }
                    
                    // Add the new iframe to the embed container
                    videoEmbed.appendChild(newIframe);
                    
                    // Hide the overlay and show the embed
                    videoOverlay.style.opacity = '0';
                    videoOverlay.style.visibility = 'hidden';
                    videoEmbed.style.opacity = '1';
                    videoEmbed.style.visibility = 'visible';
                    
                    // For mobile, also expand the card when clicking on the video
                    if (window.innerWidth <= 768) {
                        // Reset all cards first
                        cards.forEach(c => {
                            if (c !== card) {
                                c.classList.remove('expanded');
                                handleHoverGifForMobile(c, false);
                                
                                // Reset any fixed positioning
                                c.style.position = '';
                                c.style.top = '';
                                c.style.left = '';
                                c.style.width = '';
                                c.style.zIndex = '';
                                c.style.transform = '';
                            }
                        });
                        
                        // Expand this card
                        if (!card.classList.contains('expanded')) {
                            handleCardExpansion(card);
                            handleHoverGifForMobile(card, true);
                        }
                    }
                }
            });
        }

        // Update mouseleave event to immediately hide and remove the video
        card.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) { // only apply for desktop
                const videoEmbed = card.querySelector('.video-embed');
                const videoOverlay = card.querySelector('.video-overlay');
                
                // Immediately hide the video embed and show the overlay
                if (videoEmbed) {
                    videoEmbed.style.opacity = '0';
                    videoEmbed.style.visibility = 'hidden';
                    
                    // Remove the iframe immediately to stop the video
                    while (videoEmbed.firstChild) {
                        videoEmbed.removeChild(videoEmbed.firstChild);
                    }
                }
                
                if (videoOverlay) {
                    videoOverlay.style.opacity = '1';
                    videoOverlay.style.visibility = 'visible';
                }
            }
        });

        card.addEventListener('mouseenter', () => {
            const videoEmbed = card.querySelector('.video-embed');
            const videoOverlay = card.querySelector('.video-overlay');
            
            if (videoEmbed) {
                // If the video embed has an iframe (video was playing), show it again
                if (videoEmbed.children.length > 0) {
                    videoEmbed.style.opacity = '1';
                    videoEmbed.style.visibility = 'visible';
                    
                    if (videoOverlay) {
                        videoOverlay.style.opacity = '0';
                        videoOverlay.style.visibility = 'hidden';
                    }
                } else {
                    // Otherwise, ensure the overlay is visible
                    videoEmbed.style.opacity = '0';
                    videoEmbed.style.visibility = 'hidden';
                    
                    if (videoOverlay) {
                        videoOverlay.style.opacity = '1';
                        videoOverlay.style.visibility = 'visible';
                    }
                }
            }
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

    // Handle card expansion logic
    const cards = document.querySelectorAll('.card');
    
    // Add a touchstart event listener to the document to ensure touch events are properly initialized
    document.addEventListener('touchstart', function() {
        // This is just to ensure touch events are properly registered
    }, {passive: true});
    
    // Function to handle hover-gif for mobile
    function handleHoverGifForMobile(card, isExpanded) {
        const hoverGif = card.querySelector('.hover-gif');
        if (hoverGif) {
            if (isExpanded) {
                // Show the hover-gif when card is expanded on mobile
                hoverGif.style.opacity = '1';
            } else {
                // Hide the hover-gif when card is collapsed on mobile
                hoverGif.style.opacity = '0';
            }
        }
    }
    
    // Function to get card position relative to viewport
    function getCardPosition(card) {
        const rect = card.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            cardHeight: rect.height,
            viewportHeight: window.innerHeight
        };
    }
    
    // Function to scroll to maintain card position after expansion
    function maintainCardPosition(card, originalPosition) {
        // Get the new position after expansion
        const newRect = card.getBoundingClientRect();
        
        // Calculate how much the card has moved
        const deltaY = newRect.top - originalPosition.top;
        
        // Only scroll if there's a significant shift
        if (Math.abs(deltaY) > 10) {
            // Smooth scroll to adjust for the shift
            window.scrollBy({
                top: deltaY,
                behavior: 'smooth'
            });
        }
    }
    
    // Function to handle card expansion that prevents diagonal movement
    function handleCardExpansion(card) {
        // Get the current position before any changes
        const rect = card.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add expanded class first
        card.classList.add('expanded');
        
        // Wait longer for the expanded class to fully take effect
        // This helps prevent the diagonal movement by ensuring the expansion is complete
        setTimeout(() => {
            // Get the expanded dimensions
            const expandedRect = card.getBoundingClientRect();
            
            // Calculate the center of the viewport
            const viewportHeight = window.innerHeight;
            const viewportCenterY = viewportHeight / 2;
            
            // Calculate where the center of the card is relative to the viewport
            const cardCenterY = expandedRect.top + (expandedRect.height / 2);
            
            // Calculate how much we need to scroll to center the card
            const scrollOffset = cardCenterY - viewportCenterY;
            
            // Only scroll if the card isn't already centered (with some tolerance)
            if (Math.abs(scrollOffset) > 20) {
                // Calculate the new scroll position
                const newScrollTop = scrollTop + scrollOffset;
                
                // Get the document height
                const documentHeight = Math.max(
                    document.body.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.clientHeight,
                    document.documentElement.scrollHeight,
                    document.documentElement.offsetHeight
                );
                
                // Ensure we don't scroll beyond the document boundaries
                const maxScrollTop = documentHeight - window.innerHeight;
                const targetScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
                
                // Scroll to center the card vertically
                window.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            }
        }, 300); // Increased from 50ms to 300ms to ensure expansion is complete
    }
    
    // Function to handle mobile card interaction
    function handleMobileCardInteraction(card, e) {
        // Prevent default behavior to avoid any conflicts
        e.preventDefault();
        
        // Special handling for Steerable Motion card
        const isSteerableMotionCard = card.getAttribute('data-position') === '2';
        
        // Reset all video cards when interacting with any card
        resetAllVideoCards();
        
        const isExpanded = card.classList.contains('expanded');
        
        // Reset all cards first
        cards.forEach(c => {
            // Skip the current card if it's expanded (we'll handle it separately)
            if (c === card && isExpanded) {
                return;
            }
            
            c.classList.remove('expanded');
            
            // Reset hover-gif for all cards
            handleHoverGifForMobile(c, false);
            
            // Reset all meme cards when closing
            if (c.classList.contains('meme-card')) {
                const memeImages = c.querySelectorAll('.meme-image');
                memeImages.forEach(img => {
                    img.style.transform = 'translateY(10px)';
                    img.style.opacity = '0';
                });
            }
            
            // Reset any fixed positioning that might have been applied
            c.style.position = '';
            c.style.top = '';
            c.style.left = '';
            c.style.width = '';
            c.style.zIndex = '';
            c.style.transform = ''; // Reset transform as well
            
            // Ensure links are hidden when card is unexpanded
            const link = c.querySelector('.link');
            if (link) {
                link.style.opacity = '0';
                link.style.transform = 'translateY(10px)';
                link.style.pointerEvents = 'none';
                link.style.display = 'none'; // Ensure link is not displayed
            }
        });
        
        if (isExpanded) {
            // If the card is already expanded, just collapse it
            card.classList.remove('expanded');
            handleHoverGifForMobile(card, false);
            
            // Reset any fixed positioning
            card.style.position = '';
            card.style.top = '';
            card.style.left = '';
            card.style.width = '';
            card.style.zIndex = '';
            card.style.transform = ''; // Reset transform as well
            
            // Ensure link is hidden when card is unexpanded
            const link = card.querySelector('.link');
            if (link) {
                link.style.opacity = '0';
                link.style.transform = 'translateY(10px)';
                link.style.pointerEvents = 'none';
                link.style.display = 'none'; // Ensure link is not displayed
            }
            
            // Reset GIF if this is the Steerable Motion card
            if (isSteerableMotionCard) {
                const gifImg = card.querySelector('.hover-gif img');
                if (gifImg) {
                    const originalSrc = gifImg.src;
                    setTimeout(() => {
                        gifImg.src = '';
                        void gifImg.offsetWidth;
                        gifImg.src = originalSrc;
                    }, 500);
                }
            }
            
            // Reset meme card if needed
            if (card.classList.contains('meme-card')) {
                const memeImages = card.querySelectorAll('.meme-image');
                memeImages.forEach(img => {
                    img.style.transform = 'translateY(10px)';
                    img.style.opacity = '0';
                });
            }
        } else {
            // For Steerable Motion card, force expansion and show GIF immediately
            if (isSteerableMotionCard) {
                const hoverGif = card.querySelector('.hover-gif');
                if (hoverGif) {
                    hoverGif.style.opacity = '1';
                    hoverGif.style.pointerEvents = 'none';
                }
            }
            
            // Use the new expansion handler
            handleCardExpansion(card);
            
            // Handle hover-gif for this card
            handleHoverGifForMobile(card, true);
            
            // Make link visible when card is expanded
            const link = card.querySelector('.link');
            if (link) {
                link.style.opacity = '1';
                link.style.transform = 'translateY(0)';
                link.style.pointerEvents = 'auto';
                link.style.display = 'inline-block'; // Ensure link is displayed
            }
            
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

        // Mobile interaction handling - use touchstart as the primary event
        if ('ontouchstart' in window) {
            // For touch devices, use touchstart for more responsive interaction
            card.addEventListener('touchstart', function(e) {
                if (window.innerWidth <= 768) {
                    // Store touch start position to detect if it's a tap or scroll
                    const touchStartY = e.touches[0].clientY;
                    
                    // Add touchend listener to check if it's a tap
                    const touchEndHandler = function(endEvent) {
                        // Remove this listener after it's used
                        card.removeEventListener('touchend', touchEndHandler);
                        
                        // Calculate touch movement
                        const touchEndY = endEvent.changedTouches[0].clientY;
                        const touchDiff = Math.abs(touchEndY - touchStartY);
                        
                        // If movement is small enough, consider it a tap
                        if (touchDiff < 10) {
                            handleMobileCardInteraction(card, endEvent);
                        }
                    };
                    
                    // Add temporary touchend listener
                    card.addEventListener('touchend', touchEndHandler);
                }
            }, {passive: true});
            
            // Prevent click events from firing twice on touch devices
            card.addEventListener('click', function(e) {
                if (window.innerWidth <= 768 && e.pointerType !== 'mouse') {
                    e.preventDefault();
                }
            });
        } else {
            // Fallback to click for non-touch devices
            card.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    handleMobileCardInteraction(card, e);
                }
            });
        }
    });

    // Update the body click/touch handler to reset any fixed positioning
    document.body.addEventListener('click', (e) => {
        // Only collapse if click did not occur inside a card
        if (window.innerWidth <= 768 && !e.target.closest('.card')) {
            // Reset all video cards when clicking outside
            resetAllVideoCards();
            
            cards.forEach(card => {
                card.classList.remove('expanded');
                
                // Reset hover-gif for all cards
                handleHoverGifForMobile(card, false);

                // Reset meme images
                if (card.classList.contains('meme-card')) {
                    const memeImages = card.querySelectorAll('.meme-image');
                    memeImages.forEach(img => {
                        img.style.transform = 'translateY(10px)';
                        img.style.opacity = '0';
                    });
                }
                
                // Reset any fixed positioning
                card.style.position = '';
                card.style.top = '';
                card.style.left = '';
                card.style.width = '';
                card.style.zIndex = '';
                card.style.transform = ''; // Reset transform as well
                
                // Hide links when clicking outside cards
                const link = card.querySelector('.link');
                if (link) {
                    link.style.opacity = '0';
                    link.style.transform = 'translateY(10px)';
                    link.style.pointerEvents = 'none';
                    link.style.display = 'none'; // Ensure link is not displayed
                }
            });
        }
    });
    
    // Add a touchend event listener to the document body to ensure touch events are properly handled
    document.body.addEventListener('touchend', (e) => {
        // This is just to ensure touch events are properly registered
        // The actual logic is handled in the click event
    }, {passive: true});
    
    // Reset all video cards on page load
    resetAllVideoCards();
    
    // Special handling for Steerable Motion card on mobile
    if (window.innerWidth <= 768) {
        const steerableMotionCard = document.querySelector('.card[data-position="2"]');
        if (steerableMotionCard) {
            console.log('Found Steerable Motion card, applying special mobile handling');
            
            // Force the hover-gif to be non-interactive
            const hoverGif = steerableMotionCard.querySelector('.hover-gif');
            if (hoverGif) {
                // Ensure pointer events are disabled
                hoverGif.style.pointerEvents = 'none';
                
                // Make sure all children also have pointer events disabled
                hoverGif.querySelectorAll('*').forEach(el => {
                    el.style.pointerEvents = 'none';
                });
            }
        }
    } else {
        document.querySelectorAll('.hover-gif').forEach(hoverGif => {
            hoverGif.style.pointerEvents = 'auto';
        });
    }

    // Ensure GIF is properly preloaded
    preloadGif.onload = () => {
        // Once preloaded, find the actual GIF in the DOM and ensure it's using the preloaded version
        const steerableMotionCard = document.querySelector('.card[data-position="2"]');
        if (steerableMotionCard) {
            const hoverGif = steerableMotionCard.querySelector('.hover-gif img');
            if (hoverGif) {
                // Force the browser to use the preloaded version
                hoverGif.src = steerableMotionGifUrl + '?preloaded=true';
            }
        }
    };

    // Function to set equal heights for cards in the same row
    function setEqualCardHeights() {
        if (window.innerWidth > 768) {
            // First, remove any previously set row classes
            document.querySelectorAll('.card').forEach(card => {
                const classes = [...card.classList];
                classes.forEach(cls => {
                    if (cls.startsWith('card-row-')) {
                        card.classList.remove(cls);
                    }
                });
                // Reset inline height
                card.style.height = '';
            });

            // Get all unexpanded cards
            const cards = document.querySelectorAll('.card:not(.expanded)');
            let rows = {};
            let rowCounter = 0;

            // Group cards by their top offset (row)
            cards.forEach(card => {
                const topOffset = Math.round(card.getBoundingClientRect().top);
                if (!rows[topOffset]) {
                    rows[topOffset] = {
                        cards: [],
                        rowIndex: rowCounter++
                    };
                }
                rows[topOffset].cards.push(card);
            });

            // For each row, find the tallest card and set a CSS custom property
            Object.values(rows).forEach(row => {
                const rowClass = `card-row-${row.rowIndex}`;
                const maxHeight = Math.max(...row.cards.map(card => {
                    // Temporarily remove any height constraints
                    const originalHeight = card.style.height;
                    card.style.height = 'auto';
                    const height = card.offsetHeight;
                    card.style.height = originalHeight;
                    return height;
                }));

                // Add row class to each card and set the row height
                row.cards.forEach(card => {
                    card.classList.add(rowClass);
                    card.style.setProperty('--row-height', `${maxHeight}px`);
                });
            });

            // Add a style element if it doesn't exist
            let styleEl = document.getElementById('equal-height-styles');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'equal-height-styles';
                document.head.appendChild(styleEl);
            }

            // Create CSS rules for each row
            let css = '';
            for (let i = 0; i < rowCounter; i++) {
                css += `.card-row-${i}:not(.expanded) { height: var(--row-height) !important; }\n`;
            }
            styleEl.textContent = css;
        } else {
            // Reset heights on mobile
            document.querySelectorAll('.card').forEach(card => {
                card.style.height = '';
                card.style.removeProperty('--row-height');
            });
            
            // Remove the style element
            const styleEl = document.getElementById('equal-height-styles');
            if (styleEl) {
                styleEl.textContent = '';
            }
        }

        // At the end of setEqualCardHeights function, smoothly fade in the dashboard
        const dashboard = document.querySelector('.dashboard');
        if (dashboard && !dashboard.classList.contains('visible')) {
            dashboard.classList.add('visible');
        }
    }

    // Call on load and resize only
    window.addEventListener('load', setEqualCardHeights);
    window.addEventListener('resize', debounce(setEqualCardHeights, 250));

    // Simple debounce function to prevent excessive recalculations
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Add hover effect for POM borders to transform to PETEROMALLEY
    const pomBorders = document.querySelectorAll('.pom-border-top, .pom-border-bottom');
    
    pomBorders.forEach(border => {
        // Make borders interactive
        border.style.pointerEvents = 'auto';
        
        // Get all letter elements in sequence
        const letterElements = border.querySelectorAll('.letter-p, .letter-o, .letter-m');
        
        // Map each POM sequence to PETEROMALLEY
        // P -> P, O -> E, M -> T, P -> E, O -> R, M -> O, P -> M, O -> A, M -> L, P -> L, O -> E, M -> Y
        
        letterElements.forEach((letter, index) => {
            const position = index % 12; // PETEROMALLEY has 12 letters
            let originalText = letter.textContent;
            let transformedText;
            
            switch(position) {
                case 0: transformedText = 'P'; break;  // P -> P
                case 1: transformedText = 'E'; break;  // O -> E
                case 2: transformedText = 'T'; break;  // M -> T
                case 3: transformedText = 'E'; break;  // P -> E
                case 4: transformedText = 'R'; break;  // O -> R
                case 5: transformedText = 'O'; break;  // M -> O
                case 6: transformedText = 'M'; break;  // P -> M
                case 7: transformedText = 'A'; break;  // O -> A
                case 8: transformedText = 'L'; break;  // M -> L
                case 9: transformedText = 'L'; break;  // P -> L
                case 10: transformedText = 'E'; break; // O -> E
                case 11: transformedText = 'Y'; break; // M -> Y
            }
            
            letter.addEventListener('mouseenter', () => {
                letter.textContent = transformedText;
                letter.classList.add('transformed');
            });
            
            letter.addEventListener('mouseleave', () => {
                letter.textContent = originalText;
                letter.classList.remove('transformed');
            });
        });
    });
}); 