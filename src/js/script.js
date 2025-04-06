// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather icons
    feather.replace();

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
                        video.src = 'assets/ados_video/intro.mov'; 
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
                    video.src = 'assets/ados_video/intro.mov'; // <<-- Might need different src for other cards
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
}); 