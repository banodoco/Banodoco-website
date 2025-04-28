document.addEventListener("DOMContentLoaded", function() {
  // Detect if we're on a mobile device
  var isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // Get the video element and its container
  var video = document.getElementById("renaissance-video");
  var container = document.querySelector('.styled-image-box');

  if (!video || !container) {
    console.error("Video element or container not found.");
    return;
  }

  // Reverse playback animation id storage
  var reverseAnimationId = null;

  // -------------------------------------------------------------
  // 1. REVERSE-PLAYBACK LOGIC (used on desktop when mouse leaves)
  // -------------------------------------------------------------
  function reverseStep() {
    if (!video) return;
    var step = 1/60; // ~60 fps reverse
    var newTime = video.currentTime - step;

    if (newTime <= 0) { // reached start
      video.currentTime = 0;
      if (reverseAnimationId) {
        cancelAnimationFrame(reverseAnimationId);
        reverseAnimationId = null;
      }
      video.pause(); // stay paused on first frame
    } else {
      video.currentTime = newTime;
      reverseAnimationId = requestAnimationFrame(reverseStep);
    }
  }

  function startReversePlayback() {
    if (!video || video.currentTime <= 0) return;

    // Cancel any prior reverse request
    if (reverseAnimationId) {
      cancelAnimationFrame(reverseAnimationId);
      reverseAnimationId = null;
    }

    if (!video.paused) video.pause(); // stop forward play
    reverseAnimationId = requestAnimationFrame(reverseStep);
  }

  // -------------------------------------------------------------
  // 2. DESKTOP POINTER HANDLERS
  // -------------------------------------------------------------
  function handleMouseEnter() {
    if (!video) return;

    // Stop reversing if active
    if (reverseAnimationId) {
      cancelAnimationFrame(reverseAnimationId);
      reverseAnimationId = null;
    }

    if (video.ended) {
      // If video is at the end, start reverse playback
      startReversePlayback();
    } else if (video.paused) {
      // Otherwise, if paused, play forward
      video.playbackRate = 0.75;
      video.play().catch(function(err) {
        console.error('hover play failed', err);
      });
    }
  }

  function handleMouseLeave() {
    if (!video) return;

    if (!video.paused) video.pause(); // pause immediately
    if (video.currentTime > 0 && !reverseAnimationId) {
      startReversePlayback(); // start rewinding
    }
  }

  function handleClick() {
    if (!video) return;

    // Cancel reverse if running
    if (reverseAnimationId) {
      cancelAnimationFrame(reverseAnimationId);
      reverseAnimationId = null;
    }

    // Toggle play/pause at 0.75× speed
    if (video.paused) {
      video.playbackRate = 0.75;
      video.play().catch(function(err) {
        console.error('click play failed', err);
      });
    } else {
      video.pause();
    }
  }

  // -------------------------------------------------------------
  // 3. ATTACH/DETACH POINTER LISTENERS & INTERSECTION OBSERVERS
  // -------------------------------------------------------------
  if (!isMobile) {
    // DESKTOP: Attach pointer listeners
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('click', handleClick);

    // DESKTOP — auto play while 60% visible (overlay removed)
    video.pause(); // ensure paused initially
    // Optionally, handle overlay display here if necessary

    var desktopObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.target === container) {
          if (entry.intersectionRatio >= 0.6) { // ≥60% visible
            if (video.paused) {
              video.playbackRate = 0.75;
              video.play().catch(function() {});
            }
          } else {
            if (!video.paused) {
              video.pause();
              // Restore overlay if needed (e.g., by toggling a CSS class)
              // var overlay = container.querySelector('.video-overlay');
              // if (overlay) overlay.style.display = 'block';
            }
          }
        }
      });
    }, { threshold: [0.6] });

    desktopObserver.observe(container);
  } else {
    // MOBILE — play/pause based on 50% visibility
    video.pause(); // ensure video is paused initially

    var mobileObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.target === container) {
          if (entry.intersectionRatio >= 0.5) { // at least 50% visible
            if (video.paused) {
              video.playbackRate = 0.5;
              video.play().catch(function() {});
            }
          } else {
            if (!video.paused) video.pause();
          }
        }
      });
    }, { threshold: [0.5] });

    mobileObserver.observe(container);
  }

  // -------------------------------------------------------------
  // 4. CLEANUP ON UNLOAD
  // -------------------------------------------------------------
  window.addEventListener('beforeunload', function() {
    if (!isMobile) {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('click', handleClick);
    }
    if (reverseAnimationId) {
      cancelAnimationFrame(reverseAnimationId);
      reverseAnimationId = null;
    }
  });
}); 