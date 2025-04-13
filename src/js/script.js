// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather icons
    feather.replace();

    // --- iPad BNDC Video Fallback --- 
    const isIPad = /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const bndcVideoElement = document.getElementById('bndcVideo');
    const bndcFallbackImageElement = document.getElementById('bndcFallbackImage');

    if (isIPad && bndcVideoElement && bndcFallbackImageElement) {
      console.log("iPad detected, swapping BNDC video for fallback image.");
      bndcVideoElement.style.display = 'none';       // Hide the video
      bndcFallbackImageElement.style.display = 'block'; // Show the image
      // Stop the video if it might have started loading/playing
      bndcVideoElement.pause();
      bndcVideoElement.removeAttribute('src'); // Use removeAttribute for video sources
      bndcVideoElement.load(); // Optional: ensure loading stops
    } else if (bndcVideoElement) {
      // Optional: Ensure video plays only if it's not an iPad fallback case
      // bndcVideoElement.play(); // Add if needed, but browsers might block autoplay
    }
    // --- End iPad BNDC Video Fallback ---

    // --- Dynamically load HEADER --- 
    fetch('src/components/header.html')
        .then(response => response.text())
        .then(html => {
            const headerElement = document.getElementById('header');
            if (headerElement) {
                headerElement.innerHTML = html;
                console.log("Header HTML loaded, applying .visible class");
                // Ensure header starts invisible (handled by CSS, but remove class just in case)
                headerElement.classList.remove('visible'); 
                // Apply final state by adding class
                // Minimal timeout might still be useful here
                setTimeout(() => {
                    headerElement.classList.add('visible');
                }, 1); 
                
                // Re-run feather.replace() if header contains icons
                if (typeof feather !== 'undefined') {
                    feather.replace(); 
                }
            }
        });

    // Set playback speed for the Renaissance video
    const renaissanceVideo = document.getElementById('renaissance-video');
    if (renaissanceVideo) {
        renaissanceVideo.playbackRate = 0.7;
    }

    // Set playback speed for the BNDC video
    const bndcVideo = document.querySelector('video[src="assets/bndc/1.webm"]');
    if (bndcVideo) {
        bndcVideo.playbackRate = 1.25; // Increase speed by 25%
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
            // Note: bottom positioning is likely handled by CSS overrides now
            console.log('iOS Safari legend reposition applied via JS (position only):', legend.style.cssText);
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

            // Ensure footer starts invisible for transition by setting styles directly
            footerElement.style.opacity = '0';
            footerElement.style.transform = 'translateY(20px)';
            // Optionally remove class if it somehow exists, though styles take precedence
            footerElement.classList.remove('visible'); 

            // Observe the footer *after* loading its content and setting initial styles
            if (observer) { // Check if observer is initialized
              console.log("Observer found, attempting to observe footer (now styled invisible):", footerElement);
              observer.observe(footerElement);
            } else {
              console.error("IntersectionObserver not initialized when trying to observe footer.");
            }

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

    // --- Page Visibility API Handler for BNDC Video ---
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Select the video element within the BNDC card
            // Using the data-category="placeholder" as seen in index.html
            const bndcVideo = document.querySelector('.card[data-category="placeholder"] video');
            if (bndcVideo) {
                console.log('Page became visible, reloading BNDC video.'); // Optional: for debugging
                bndcVideo.load(); // Reload the video source
            }
        }
    });

    const filterButtons = document.querySelectorAll('.filter-btn');

    // Add fade-in animation on scroll
    // Select elements that should fade in *on scroll* (exclude first section)
    const sectionsToAnimateOnScroll = document.querySelectorAll('.content-section:not(:first-of-type), .dashboard, .card'); 
    // Select the element that should fade in *immediately*
    const firstContentSection = document.querySelector('.content-section:first-of-type');

    // Set initial styles for elements that fade in on scroll -- NOW DONE IN CSS
    // sectionsToAnimateOnScroll.forEach(el => {
    //   el.style.opacity = '0';
    //   // el.style.transform = 'translateY(20px)'; // Removed transform
    // });

    // Set initial styles and trigger immediate fade-in ONLY for the first content section
    if (firstContentSection) {
      console.log("Setting initial state for immediate fade-in: -- Handled by CSS");
      // firstContentSection.style.opacity = '0'; -- REMOVED, handled by CSS
      // Remove class just in case (still useful)
      firstContentSection.classList.remove('visible');

      // Apply final state by adding class (timeout ensures transition occurs if needed, but often not necessary for class toggle)
      // Using a minimal timeout just in case browser needs a frame to register initial state
      setTimeout(() => {
          console.log("Adding .visible class for immediate fade-in via timeout:", firstContentSection.className);
          firstContentSection.classList.add('visible');
      }, 1); // Minimal 1ms delay
    }

    const observerOptions = {
        root: null, // relative to the viewport
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the element is visible
    };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            console.log("Intersection detected for:", entry.target.id || entry.target.className);
            if (entry.isIntersecting) {
                // Apply final state by adding the class
                console.log("Adding .visible class to:", entry.target.id || entry.target.className);
                entry.target.classList.add('visible');
                // entry.target.style.transform = 'translateY(0)'; // Removed transform

                observer.unobserve(entry.target); // Stop observing once visible
            }
        });
    };

    // Define observer here so it's accessible in the footer fetch scope
    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe only the scroll-dependent sections initially
    sectionsToAnimateOnScroll.forEach(section => {
        observer.observe(section);
    });

    // Added code to trigger fade-in for visible elements on page load
    window.addEventListener('load', () => {
        sectionsToAnimateOnScroll.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom >= 0) {
                 // Apply final state by adding the class
                console.log("Adding .visible class on load to:", section.id || section.className);
                section.classList.add('visible');
            }
        });
    });

    // Ensure footer and plant canvas are always visible
    const footerEl = document.getElementById('footer');
    if (footerEl) {
      footerEl.removeAttribute('style'); // Remove inline styles that force opacity 0
      footerEl.classList.add('visible');
    }
    const plantCanvas = document.getElementById('plantCanvas');
    if (plantCanvas) {
      plantCanvas.removeAttribute('style');
      plantCanvas.classList.add('visible');
    }
}); // End of DOMContentLoaded 