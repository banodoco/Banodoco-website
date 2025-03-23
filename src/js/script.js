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
}); 