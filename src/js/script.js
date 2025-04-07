// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather icons
    feather.replace();

    // Set playback speed for the Renaissance video
    const renaissanceVideo = document.getElementById('renaissance-video');
    if (renaissanceVideo) {
        renaissanceVideo.playbackRate = 0.7;
    }

    // Handle video card functionality only
    const videoCards = document.querySelectorAll('.video-card');
    const videoSources = new Map();

    videoCards.forEach(card => {
        const videoEmbed = card.querySelector('.video-embed');
        // If there's an existing iframe, store its attributes and remove it
        const iframe = videoEmbed.querySelector('iframe');
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
            videoEmbed.removeChild(iframe);
        }
        
        // Set up the video overlay click to insert a new iframe and autoplay the video
        const videoOverlay = card.querySelector('.video-overlay');
        videoOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
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
                videoEmbed.appendChild(newIframe);
                // Show the embed container and hide the overlay and thumbnail
                videoEmbed.style.display = 'block';
                videoOverlay.style.display = 'none';
                const thumbnail = card.querySelector('.video-thumbnail');
                if (thumbnail) {
                    thumbnail.style.display = 'none';
                }
            }
        });

        // On desktop, reset the video card on mouseleave
        card.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                // Clear the video embed
                while (videoEmbed.firstChild) {
                    videoEmbed.removeChild(videoEmbed.firstChild);
                }
                videoEmbed.style.display = 'none';
                // Restore the overlay and thumbnail
                const videoOverlay = card.querySelector('.video-overlay');
                if (videoOverlay) {
                    videoOverlay.style.display = 'flex';
                }
                const thumbnail = card.querySelector('.video-thumbnail');
                if (thumbnail) {
                    thumbnail.style.display = 'block';
                }
            }
        });
    });

    // Find the ADOS card specifically
    const adosCard = document.querySelector('.card[data-category="ados"]');
    
    // Keep track of all hover containers for potential other uses, but handle ADOS separately
    const otherHoverContainers = document.querySelectorAll('.image-hover-container:not(:scope .card[data-category="ados"] .image-hover-container)'); // Select containers NOT in ADOS card
    
    const lightbox = document.getElementById('video-lightbox');
    const lightboxContent = document.getElementById('lightbox-content');
    const closeLightboxButton = lightbox.querySelector('.close-lightbox');
    
    // Handle the ADOS card hover separately
    if (adosCard) {
        const imageContainer = adosCard.querySelector('.image-hover-container'); // Find container inside the card
        if (imageContainer) { // Check if the container exists
            const staticImage = imageContainer.querySelector('.static-image');
            const hoverGif = imageContainer.querySelector('.hover-gif');
            const watchButton = imageContainer.querySelector('.watch-video-button');
            
            // Ensure both images exist before adding listeners
            if (staticImage && hoverGif) {
                const originalGifSrc = hoverGif.src;
    
                // Add listeners to the CARD itself
                adosCard.addEventListener('mouseenter', () => {
                    staticImage.style.display = 'none';
                    hoverGif.style.display = 'block';
                    
                    if (!adosCard.dataset.playedThisHover) { // Use card's dataset
                        hoverGif.src = ''; 
                        hoverGif.src = originalGifSrc; 
                        adosCard.dataset.playedThisHover = 'true'; 
                    }
                });
    
                adosCard.addEventListener('mouseleave', () => {
                    hoverGif.style.display = 'none';
                    staticImage.style.display = 'block';
                    hoverGif.src = ''; 
                    delete adosCard.dataset.playedThisHover; // Use card's dataset
                });
                
                 // --- Lightbox Logic (scoped to the ADOS card's button) --- 
                if (watchButton) {
                    watchButton.addEventListener('click', (event) => {
                        event.stopPropagation(); 
                        
                        const existingVideo = lightboxContent.querySelector('video');
                        if (existingVideo) {
                            lightboxContent.removeChild(existingVideo);
                        }
    
                        const video = document.createElement('video');
                        video.src = 'https://banodoco.s3.us-east-1.amazonaws.com/intro.mov'; 
                        video.controls = true;
                        video.autoplay = true;
                        video.style.maxWidth = '100%';
                        video.style.maxHeight = 'calc(100vh - 60px)'; 
                        video.style.display = 'block';
                        video.style.position = 'relative';
                        video.style.zIndex = 1000; 
    
                        lightboxContent.appendChild(video);
    
                        const titleElement = lightboxContent.querySelector('.lightbox-title');
                        if (titleElement) {
                            titleElement.classList.remove('fade-out'); 
                            setTimeout(() => {
                                titleElement.classList.add('fade-out');
                            }, 5000); 
                        }
                        lightbox.classList.add('show');
                    });
                }
            } else {
                console.warn("Static image or hover GIF not found within the ADOS card's image container.");
            }
        } else {
            console.warn("Image hover container not found within the ADOS card.");
        }
    } else {
        console.warn("ADOS card (.card[data-category='ados']) not found.");
    }
    
    // Process any other hover containers normally (if any)
    otherHoverContainers.forEach(container => {
        const staticImage = container.querySelector('.static-image');
        const hoverGif = container.querySelector('.hover-gif');
        // Note: Watch button logic might need adjustment if other cards use it differently
        const watchButton = container.querySelector('.watch-video-button'); 
        
        if (staticImage && hoverGif) {
            const originalGifSrc = hoverGif.src;
    
            container.addEventListener('mouseenter', () => {
                staticImage.style.display = 'none';
                hoverGif.style.display = 'block';
                if (!container.dataset.playedThisHover) {
                    hoverGif.src = ''; 
                    hoverGif.src = originalGifSrc; 
                    container.dataset.playedThisHover = 'true'; 
                }
            });
    
            container.addEventListener('mouseleave', () => {
                hoverGif.style.display = 'none';
                staticImage.style.display = 'block';
                hoverGif.src = ''; 
                delete container.dataset.playedThisHover; 
            });
            
            // Add lightbox logic for *other* cards if they have a watch button
            // WARNING: Assumes they all use the same video source. Adjust if needed.
            if (watchButton && lightbox && lightboxContent) {
                 watchButton.addEventListener('click', (event) => {
                    event.stopPropagation(); 
                    
                    const existingVideo = lightboxContent.querySelector('video');
                    if (existingVideo) {
                        lightboxContent.removeChild(existingVideo);
                    }
    
                    const video = document.createElement('video');
                    video.src = 'https://banodoco.s3.us-east-1.amazonaws.com/intro.mov'; // <<-- Might need different src for other cards
                    video.controls = true;
                    video.autoplay = true;
                    // ... (rest of video setup copied from above) ...
                    video.style.maxWidth = '100%';
                    video.style.maxHeight = 'calc(100vh - 60px)'; 
                    video.style.display = 'block';
                    video.style.position = 'relative'; 
                    video.style.zIndex = 1000; 
    
                    lightboxContent.appendChild(video);
    
                    // ... (rest of lightbox show/title logic copied from above) ...
                    const titleElement = lightboxContent.querySelector('.lightbox-title');
                     if (titleElement) {
                         titleElement.classList.remove('fade-out'); 
                         setTimeout(() => {
                             titleElement.classList.add('fade-out');
                         }, 5000); 
                     }
                    lightbox.classList.add('show');
                });
            }
        }
    });
    
    // --- General Lightbox Closing Logic (remains the same) ---
    if (lightbox && closeLightboxButton && lightboxContent) {
        const closeLightbox = () => {
            lightbox.classList.remove('show');
            const video = lightboxContent.querySelector('video');
            if (video) {
                lightboxContent.removeChild(video);
            }
            const titleElement = lightboxContent.querySelector('.lightbox-title');
            if (titleElement) {
                titleElement.classList.remove('fade-out');
            }
        };
    
        closeLightboxButton.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (event) => {
            if (event.target === lightbox) {
                closeLightbox();
            }
        });
    
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && lightbox.classList.contains('show')) {
                closeLightbox();
            }
        });
    }

    // iOS Safari legend fix
    if (/iP(hone|od|ad)/.test(navigator.platform)) {
      window.addEventListener('load', function() { // Use load to ensure layout is complete
        setTimeout(function() {
          var legend = document.getElementById('legend');
          if (legend) {
            legend.style.position = 'absolute'; // Re-apply position just in case
            legend.style.right = '10px';
            legend.style.left = 'auto';
            // Note: bottom positioning is likely handled by CSS overrides now
            console.log('iOS Safari legend reposition applied via JS:', legend.style.cssText);
          } else {
            console.warn("Legend element not found for iOS fix.");
          }
        }, 150); // Slightly longer timeout
      });
    }

    // Dynamically fetch the shared footer partial
    fetch('src/components/footer.html')
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
      })
      .then(html => {
        const footerElement = document.getElementById('footer');
        if (footerElement) {
            footerElement.innerHTML = html;
            console.log("Footer HTML loaded.");

            // Initialize plant animation after footer is loaded
            // Attempt to load and run plant-init.js if it exists
            import('./components/plant-init.js')
              .then(module => {
                if (typeof module.initializePlantAnimation === 'function') {
                  console.log("Initializing plant animation...");
                  module.initializePlantAnimation();
                } else {
                  console.warn('initializePlantAnimation function not found in plant-init.js');
                }
              })
              .catch(err => {
                console.warn('Could not load plant-init.js dynamically. Plant animation might not start.', err);
              });

            // Replace feather icons within the newly added footer
            if (typeof feather !== 'undefined') {
              console.log("Replacing feather icons in footer...");
              feather.replace();
            } else {
              console.warn("Feather icons library not loaded when footer arrived.");
            }
        } else {
            console.error("Footer element (#footer) not found in DOM.");
        }
      })
      .catch(error => {
          console.error("Error fetching or processing footer:", error);
      });

    // BNDC Card hover logic
    const bndcCard = document.querySelector('.card[data-category="placeholder"]');
    if (bndcCard) {
        const bndcVideo = bndcCard.querySelector('video');
        if (bndcVideo) {
            let playTimeoutId = null;
            console.log("Setting up BNDC card hover listeners.");
            bndcCard.addEventListener('mouseenter', () => {
                if (playTimeoutId) clearTimeout(playTimeoutId);
                playTimeoutId = setTimeout(() => {
                    console.log("Playing BNDC video on hover...");
                    bndcVideo.play().catch(e => console.error("Error playing BNDC video:", e));
                }, 350);
            });
            bndcCard.addEventListener('mouseleave', () => {
                if (playTimeoutId) {
                    clearTimeout(playTimeoutId);
                    playTimeoutId = null;
                }
                console.log("Pausing BNDC video on mouseleave.");
                bndcVideo.pause();
                bndcVideo.currentTime = 0;
            });
        } else {
            console.warn("BNDC video element not found inside the placeholder card.");
        }
    } else {
        console.warn("BNDC card (.card[data-category='placeholder']) not found.");
    }

    // Initialize BNDC Squiggles (Dynamically imports the module)
    console.log("Attempting to initialize BNDC squiggles...");
    import('./components/bndc-squiggles.js')
      .then(module => {
        if (typeof module.initializeBndcSquiggles === 'function') {
          module.initializeBndcSquiggles('bndc-squiggle-canvas-container');
          console.log("BNDC squiggles initialized.");
        } else {
           console.warn('initializeBndcSquiggles function not found in bndc-squiggles.js');
        }
      })
      .catch(err => console.error('Failed to load bndc-squiggles module dynamically:', err));


    // Mellon Sneak Peek Logic (Dynamically imports functions)
    const sneakPeekButton = document.querySelector('.sneak-peek-button');
    const mellonAnimationContainer = document.getElementById('mellon-animation-container');

    if (sneakPeekButton && mellonAnimationContainer) { // Check button and container first
        const sneakPeekContent = mellonAnimationContainer.querySelector('.sneak-peek-content');
        if (sneakPeekContent) { // Then check content
             console.log("Setting up Mellon sneak peek button listener.");
            let isSneakPeekVisible = false;
            let mellonFuncs = null; // To store loaded functions

            const loadMellonFunctions = async () => {
                if (mellonFuncs) return mellonFuncs; // Return cached functions if already loaded
                try {
                    const module = await import('./components/mellon-animation.js');
                    if (typeof module.suppressMellonText === 'function' && typeof module.unsuppressMellonText === 'function') {
                         console.log("Mellon animation functions loaded.");
                         mellonFuncs = {
                             suppress: module.suppressMellonText,
                             unsuppress: module.unsuppressMellonText
                         };
                         return mellonFuncs;
                    } else {
                         console.warn("Mellon functions (suppress/unsuppress) not found in module.");
                         return null;
                    }
                } catch (err) {
                    console.error('Failed to load mellon-animation module dynamically:', err);
                    return null;
                }
            };

            sneakPeekButton.addEventListener('click', async () => {
                const funcs = await loadMellonFunctions();
                if (!funcs) {
                     console.error("Cannot toggle sneak peek, Mellon functions not available.");
                     return;
                }

                if (!isSneakPeekVisible) {
                    console.log("Showing Mellon sneak peek.");
                    sneakPeekContent.classList.add('visible');
                    funcs.suppress(mellonAnimationContainer);
                    sneakPeekButton.textContent = 'Hide sneak peek';
                    isSneakPeekVisible = true;
                } else {
                    console.log("Hiding Mellon sneak peek.");
                    sneakPeekContent.classList.remove('visible');
                    funcs.unsuppress(mellonAnimationContainer);
                    sneakPeekButton.textContent = 'Take a sneak peek';
                    isSneakPeekVisible = false;
                }
            });
        } else {
             console.warn("Mellon sneak peek content element not found inside container.");
        }
    } else {
        if (document.querySelector('[data-category="mellon"]')) { // Only warn if Mellon card exists but button/container don't
             console.warn("Mellon sneak peek button or animation container not found. Button logic disabled.");
        }
         // If Mellon card itself is commented out/removed, no warning is needed.
    }


    // Renaissance video hover effect
    console.log('Attempting to set up Renaissance video hover from script.js');
    const renaissanceContainer = renaissanceVideo ? renaissanceVideo.closest('.styled-image-box') : null;

    if (renaissanceVideo && renaissanceContainer) {
        console.log('Found Renaissance video and container, adding listeners.');
        let reverseAnimationId = null;

        const reverseStep = () => {
            const step = 1 / 60; // ~60fps reverse
            const newTime = renaissanceVideo.currentTime - step;
            if (newTime <= 0) {
                renaissanceVideo.currentTime = 0;
                if (reverseAnimationId) cancelAnimationFrame(reverseAnimationId);
                reverseAnimationId = null;
            } else {
                renaissanceVideo.currentTime = newTime;
                reverseAnimationId = requestAnimationFrame(reverseStep);
            }
        };

        const handleEnded = () => {
             // Check playbackRate to ensure it ended while playing forward, not backward.
            if (renaissanceVideo.playbackRate > 0 && !renaissanceVideo.paused) {
                 console.log('Renaissance forward playback ended.');
                 // Don't pause here, let mouseleave handle it or click handle it.
                 // Pausing here can interfere if the mouse is still over the element.
            }
        };

        renaissanceContainer.addEventListener('mouseenter', () => {
            console.log('Mouse entered Renaissance');
            if (reverseAnimationId) {
                cancelAnimationFrame(reverseAnimationId);
                reverseAnimationId = null;
            }
            // Only play if paused and not already playing forward
            if (renaissanceVideo.paused) {
                 renaissanceVideo.playbackRate = 1;
                 renaissanceVideo.play().catch(e => console.error('Error playing forward Renaissance video:', e));
            }
        });

        renaissanceContainer.addEventListener('mouseleave', () => {
            console.log('Mouse left Renaissance');
            // Always pause on mouseleave before potentially starting reverse
            renaissanceVideo.pause();
            if (reverseAnimationId) {
                 cancelAnimationFrame(reverseAnimationId); // Cancel any existing reverse
            }
            if (renaissanceVideo.currentTime > 0 && !reverseAnimationId) { // Only start reverse if not already at 0 and not already reversing
                reverseAnimationId = requestAnimationFrame(reverseStep);
            } else if (renaissanceVideo.currentTime <= 0) {
                reverseAnimationId = null; // Ensure it's null if at start
            }
        });

        // Click/Tap to toggle play/pause
        renaissanceContainer.addEventListener('click', () => {
            console.log('Renaissance container clicked/tapped');
            if (reverseAnimationId) { // Stop reverse if active
                cancelAnimationFrame(reverseAnimationId);
                reverseAnimationId = null;
            }
            if (renaissanceVideo.paused) {
                renaissanceVideo.playbackRate = 1;
                renaissanceVideo.play().catch(e => console.error('Error playing Renaissance video on click:', e));
            } else {
                renaissanceVideo.pause();
            }
        });

        // Listener for when the video naturally ends
        renaissanceVideo.addEventListener('ended', handleEnded);

    } else {
        console.warn('Could not find Renaissance video (#renaissance-video) or its container (.styled-image-box). Hover/click effects inactive.');
    }

}); // End of DOMContentLoaded 