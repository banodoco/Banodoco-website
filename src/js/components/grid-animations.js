// Global cache for preloaded images
const imageCache = {
  community: new Map(),
  ownership: new Map()
};

// Preload a single image and store in cache
function preloadImage(src, cacheType) {
  return new Promise((resolve, reject) => {
    if (imageCache[cacheType].has(src)) {
      resolve(imageCache[cacheType].get(src));
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache[cacheType].set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

// Preload all community images
async function preloadCommunityImages() {
  const promises = [];
  for (let i = 0; i < 66; i++) {
    promises.push(preloadImage(`./assets/numbered/${i}.png`, 'community'));
  }
  return Promise.all(promises);
}

// Preload ownership images
async function preloadOwnershipImages(imageFiles) {
  const promises = [];
  for (const src of imageFiles) {
    promises.push(preloadImage(src, 'ownership'));
  }
  return Promise.all(promises);
}

// Show loading state
function showLoadingState(container) {
  container.style.opacity = '0.5';
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    z-index: 100;
  `;
  loadingOverlay.innerHTML = '<div>Loading...</div>';
  container.parentElement.style.position = 'relative';
  container.parentElement.appendChild(loadingOverlay);
  return loadingOverlay;
}

// Remove loading state
function removeLoadingState(container, loadingOverlay) {
  container.style.opacity = '1';
  loadingOverlay.remove();
}

// Function to create SVG with pastel color
function createPastelSvg(container) {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 65 + Math.random() * 15;
  const lightness = 80 + Math.random() * 10;
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.style.display = "block";
  svg.style.cursor = "pointer"; // Add cursor pointer to indicate interactivity
  
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("width", "20");
  rect.setAttribute("height", "20");
  rect.setAttribute("fill", color);
  
  svg.appendChild(rect);
  container.appendChild(svg);
}

// Function to check if all images are fixed
function checkIfAllFixed(communityContainer) {
  const images = communityContainer.querySelectorAll('img');
  const allFixed = Array.from(images).every(img => img.fixed);
  if (allFixed) {
    if (!communityContainer.querySelector('.congrats-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'congrats-overlay';
      overlay.textContent = "Congratulations! You have too much time on your hands. Perhaps that time would be better spent contributing to open source?";
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      overlay.style.color = '#fff';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.textAlign = 'center';
      overlay.style.padding = '1rem';
      overlay.style.zIndex = '1000';
      communityContainer.style.position = 'relative';
      communityContainer.appendChild(overlay);
    }
  }
}

// Initialize community grid
async function initializeCommunityGrid() {
  const communityContainer = document.querySelector('.community-images-grid');
  if (!communityContainer) return;

  const loadingOverlay = showLoadingState(communityContainer);

  try {
    // Preload all community images first
    await preloadCommunityImages();

    // Track currently displayed community images to prevent duplicates
    const communityDisplayed = new Set();

    // Determine number of images based on screen width
    const isMobile = window.innerWidth <= 768;
    const numberOfImages = isMobile ? 18 : 16; // 6x2 on mobile, 8x2 on desktop

    // Create community grid with the calculated number of images
    for (let i = 0; i < numberOfImages; i++) {
      let randomIndex = Math.floor(Math.random() * 66);
      while (communityDisplayed.has(randomIndex)) {
        randomIndex = Math.floor(Math.random() * 66);
      }
      communityDisplayed.add(randomIndex);
      
      const img = document.createElement('img');
      img.src = './assets/numbered/' + randomIndex + '.png';
      img.dataset.originalIndex = randomIndex;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';
      img.style.transition = 'filter 0.3s ease';

      // Add event listeners
      addCommunityImageEventListeners(img, communityDisplayed);
      communityContainer.appendChild(img);
    }
  } finally {
    removeLoadingState(communityContainer, loadingOverlay);
  }
}

// Helper function to get a unique community image - now uses cache
function getUniqueCommunityImage(img, communityDisplayed) {
  const availableIndices = Array.from(
    { length: 66 }, 
    (_, index) => index
  ).filter(index => !communityDisplayed.has(index));
  
  if (availableIndices.length < 5) {
    const displayedArray = Array.from(communityDisplayed);
    const toRemove = Math.max(5, Math.floor(displayedArray.length * 0.2));
    
    for (let j = 0; j < toRemove; j++) {
      const randomRemoveIndex = Math.floor(Math.random() * displayedArray.length);
      communityDisplayed.delete(displayedArray[randomRemoveIndex]);
      displayedArray.splice(randomRemoveIndex, 1);
    }
    
    return getUniqueCommunityImage(img, communityDisplayed);
  }
  
  const randomAvailableIndex = Math.floor(Math.random() * availableIndices.length);
  const newIndex = availableIndices[randomAvailableIndex];
  
  communityDisplayed.add(newIndex);
  
  const oldIndex = parseInt(img.dataset.originalIndex);
  communityDisplayed.delete(oldIndex);
  
  img.dataset.originalIndex = newIndex;
  
  return newIndex;
}

// Add event listeners to community images
function addCommunityImageEventListeners(img, communityDisplayed) {
  let animationTimeout = null;
  let isAnimating = false;
  let currentGlobalDirection = 1; // 1 for forward snake, -1 for backward snake

  // Determine grid columns based on screen width
  const isMobile = window.innerWidth <= 768;
  const gridCols = isMobile ? 6 : 8; // 6 for mobile, 8 for desktop

  // Helper to map snake index to linear index
  function getLinearIndexFromSnake(snakeIndex, cols, totalImages) {
      const numRows = totalImages / cols;
      const row = Math.floor(snakeIndex / cols);
      // Ensure row calculation is valid
      if (row >= numRows) {
          console.error(`Calculated row ${row} exceeds number of rows ${numRows}`);
          return snakeIndex % totalImages; // Fallback
      }

      if (row % 2 === 0) { // Even row (0, 2, ...), moving right L->R
          return snakeIndex;
      } else { // Odd row (1, 3, ...), moving left R->L
          const startOfRowSnake = row * cols; // Snake index for the first element encountered in this row (leftmost)
          const colSnake = snakeIndex - startOfRowSnake; // Column index within the snake sequence for this row (0 to cols-1)
          const linearCol = (cols - 1) - colSnake; // Actual column index in the grid (reversed)
          return row * cols + linearCol;
      }
  }

  // Helper to map linear index to snake index
  function getSnakeIndexFromLinear(linearIndex, cols, totalImages) {
      const numRows = totalImages / cols;
      const row = Math.floor(linearIndex / cols);
       // Ensure row calculation is valid
      if (row >= numRows) {
          console.error(`Calculated row ${row} exceeds number of rows ${numRows} for linear index ${linearIndex}`);
          return linearIndex % totalImages; // Fallback
      }
      const col = linearIndex % cols;

      if (row % 2 === 0) { // Even row, L->R
          return linearIndex; // Snake index matches linear index
      } else { // Odd row, R->L
          // The snake index corresponds to the position when traversing right-to-left
          const snakeCol = (cols - 1) - col; // Column index if traversing R->L
          return row * cols + snakeCol;
      }
  }
  
  // --- Animation Cycle Logic (Modified for single run) ---
  const animateCycle = (currentIndex, direction, stepCount) => { // Added stepCount
      if (!isAnimating) return; // Stop if flag is turned off (e.g., by mouseleave)

      const communityContainer = img.closest('.community-images-grid'); // Ensure we have the container context
      if (!communityContainer) {
          isAnimating = false;
          return; // Stop if container not found
      }
      const allImages = Array.from(communityContainer.querySelectorAll('img'));
      const totalImages = allImages.length;

      // Check if cycle should end (completed one round or no images) BEFORE setting the timeout
      if (totalImages === 0 || stepCount >= totalImages) { 
          isAnimating = false; 
          return; // Stop the animation cycle
      }

      animationTimeout = setTimeout(() => {
          requestAnimationFrame(() => {
              // Re-check isAnimating after timeout/frame, in case mouseleave occurred
              if (!isAnimating) return; 

              // Calculate the next image index in snake pattern
              const currentSnakeIndex = getSnakeIndexFromLinear(currentIndex, gridCols, totalImages);
              let nextSnakeIndex = (currentSnakeIndex + direction + totalImages) % totalImages;
              let nextLinearIndex = getLinearIndexFromSnake(nextSnakeIndex, gridCols, totalImages);
              
              const nextImg = allImages[nextLinearIndex];
              if (!nextImg) {
                  console.error(`Could not find image at linear index ${nextLinearIndex}`);
                  isAnimating = false; // Stop if image not found
                  return;
              }

              // Update the image source
              const oldIndex = parseInt(nextImg.dataset.originalIndex);
              const newIndex = getUniqueCommunityImage(nextImg, communityDisplayed);
              
              preloadImage(`./assets/numbered/${newIndex}.png`, 'community').then(preloadedImg => {
                  nextImg.src = preloadedImg.src; // Use preloaded image src
                  nextImg.dataset.originalIndex = newIndex; // Update original index
                  
                  // Visual feedback (brightness flash)
                  nextImg.style.filter = 'brightness(1.5)';
                  setTimeout(() => {
                    if (nextImg) nextImg.style.filter = 'brightness(1)';
                  }, 150); // Revert brightness quickly

                  // Continue the animation cycle if still animating
                  if (isAnimating) { 
                      animateCycle(nextLinearIndex, direction, stepCount + 1); // Pass the new *linear* index and increment stepCount
                  }
              }).catch(error => {
                  console.error("Error preloading image:", error);
                  isAnimating = false; // Stop animation on image load error
              });
          });
      }, 50); // Delay between steps
  };

  // --- Desktop Hover Listeners (Only add if not mobile) ---
  if (window.innerWidth > 768) {
    img.addEventListener('mouseenter', function() {
      // Only start animation if not already running
      if (isAnimating) return; 
      isAnimating = true; // Set flag to indicate animation is active
      img.style.filter = 'brightness(1.2)'; // Visual feedback for hover start

      // Find the starting index and begin the animation cycle
      const communityContainer = img.closest('.community-images-grid');
       if (!communityContainer) {
           isAnimating = false;
           return;
       }
      const allImgs = Array.from(communityContainer.querySelectorAll('img'));
      const startIndex = allImgs.indexOf(img);
      
      if (startIndex !== -1) {
          animateCycle(startIndex, currentGlobalDirection, 0); // Start cycle with current direction & stepCount 0
          currentGlobalDirection *= -1; // Flip the direction for the *next* hover event
      } else {
          console.error("Could not find starting image index for animation.");
          isAnimating = false; // Reset flag if start fails
      }
    }); // End mouseenter

    img.addEventListener('mouseleave', function() {
      clearTimeout(animationTimeout); // Stop any pending animation steps
      img.style.filter = 'brightness(1)'; // Revert visual feedback
      isAnimating = false; // Allow animation to restart on next enter
    }); // End mouseleave
  }

  // --- Mobile Tap Listener ---
  img.addEventListener('click', function(event) {
      event.preventDefault(); // Prevent default link behavior if wrapped in <a>

      if (img.fixed) {
          // If the image is fixed, unfix it and revert to SVG
          img.fixed = false;
          img.style.opacity = '0'; // Fade out
          setTimeout(() => {
              const svgContainer = img.previousElementSibling; // Assuming SVG is before img
              if (svgContainer && svgContainer.tagName === 'svg') {
                  svgContainer.style.display = 'block';
                  img.remove(); // Remove the image element
              } else {
                  // Fallback if structure is different or SVG not found
                  const newIndex = getUniqueCommunityImage(img, communityDisplayed);
                  img.src = './assets/numbered/' + newIndex + '.png';
                  img.style.opacity = '1';
              }
              checkIfAllFixed(img.closest('.community-images-grid'));
          }, 300); // Match transition time
          return;
      }

      // --- Animation Logic for Mobile Tap --- 
      if (window.innerWidth <= 768) { 
          if (isAnimating) return; // Prevent starting if already running
          isAnimating = true; // Set flag

          const communityContainer = img.closest('.community-images-grid');
          if (!communityContainer) {
              isAnimating = false;
              return;
          }
          const allImgs = Array.from(communityContainer.querySelectorAll('img'));
          const startIndex = allImgs.indexOf(img);

          if (startIndex !== -1) {
              animateCycle(startIndex, currentGlobalDirection, 0); // Start the animation cycle
              currentGlobalDirection *= -1; // Flip direction for the next tap
              // Note: isAnimating will be set to false within animateCycle when it finishes
          } else {
              console.error("Could not find starting image index for mobile animation.");
              isAnimating = false; // Reset flag if start fails
          }
      } else {
          // --- Standard Desktop Click Behavior (single image change) ---
          const oldIndex = parseInt(img.dataset.originalIndex);
          const newIndex = getUniqueCommunityImage(img, communityDisplayed);

          // Apply a quick visual feedback (e.g., scale or brightness)
          img.style.transform = 'scale(1.1)';
          img.style.filter = 'brightness(1.2)';

          preloadImage(`./assets/numbered/${newIndex}.png`, 'community').then(preloadedImg => {
              img.src = preloadedImg.src;
              img.dataset.originalIndex = newIndex;
              
              // Reset visual feedback after a short delay
              setTimeout(() => {
                  img.style.transform = 'scale(1)';
                  img.style.filter = 'brightness(1)';
              }, 150);
          }).catch(error => {
              console.error("Error preloading image on click:", error);
              // Reset visual feedback even if preload fails
              setTimeout(() => {
                  img.style.transform = 'scale(1)';
                  img.style.filter = 'brightness(1)';
              }, 150);
          });

          // Remove the old index from the displayed set
          communityDisplayed.delete(oldIndex);
      }
  });

  // // Easter Egg: Make image fixed on double click (Removed for simplicity)
  // img.addEventListener('dblclick', function(event) {
  //     event.preventDefault(); // Prevent zoom
  //     if (!img.fixed) {
  //         img.fixed = true; // Mark the image as fixed
  //         img.style.filter = 'grayscale(80%) brightness(0.8)'; // Visual indication
  //         checkIfAllFixed(img.closest('.community-images-grid'));
  //     } else {
  //         img.fixed = false;
  //         img.style.filter = 'none'; // Remove visual indication
  //     }
  // });
}

// Initialize ownership grid
async function initializeOwnershipGrid() {
  try {
    // --- Inject Ownership Grid CSS ---
    const ownershipGridCSS = `
      /* Base styles for ownership grid */
      .ownership-images-grid {
        display: grid;
        gap: 2px;
        margin: 1rem 0;
        overflow: hidden; /* Contain internal overflow */
        /* Mobile-first: 12 columns, 6 rows */
        grid-template-columns: repeat(12, minmax(0, 1fr));
        grid-template-rows: repeat(6, auto);
      }

      /* Hide items beyond 72 for mobile */
      .ownership-images-grid > *:nth-child(n+73) {
        display: none;
      }

      .ownership-images-grid img,
      .ownership-images-grid div,
      .ownership-images-grid svg {
        width: 100%;
        object-fit: cover;
        display: block; /* Ensure divs/svgs behave like images */
        aspect-ratio: 1 / 1;
      }

      /* SVG Hover effects */
      .ownership-images-grid svg rect {
        transition: filter 0.3s ease;
      }
      .ownership-images-grid svg:hover rect {
        filter: brightness(1.15);
      }

      /* Responsive adjustments */
      /* Small tablets */
      @media (min-width: 480px) {
        .ownership-images-grid {
          grid-template-columns: repeat(14, minmax(0, 1fr));
          grid-template-rows: repeat(4, auto);
        }
        .ownership-images-grid > *:nth-child(n+73) { display: block; }
        .ownership-images-grid > *:nth-child(n+85) { display: none; }
      }

      /* Small Desktops */
      @media (min-width: 992px) {
        .ownership-images-grid {
          grid-template-columns: repeat(18, minmax(0, 1fr));
          grid-template-rows: repeat(4, auto);
        }
        .ownership-images-grid > *:nth-child(n+97) { display: block; }
        .ownership-images-grid > *:nth-child(n+109) { display: none; }
      }

      /* Desktop - Restore original flow with 3 rows */
      @media (min-width: 1200px) {
        .ownership-images-grid {
          grid-auto-flow: column;
          grid-template-columns: none;
          grid-auto-columns: minmax(0, 1fr);
          grid-template-rows: repeat(3, auto);
        }
        .ownership-images-grid > *:nth-child(n+109) { display: block; }
      }
    `;
    const styleElement = document.createElement('style');
    styleElement.textContent = ownershipGridCSS;
    document.head.appendChild(styleElement);
    // --- End CSS Injection ---

    const response = await fetch('./data/profile_pics_list.json');
    const imageFiles = await response.json();
    
    const container = document.querySelector('.ownership-images-grid');
    if (!container) return;

    const loadingOverlay = showLoadingState(container);

    try {
      // Preload all ownership images first
      await preloadOwnershipImages(imageFiles);

      const usedIndices = new Set();
      const ownershipDisplayed = new Set();

      for (let i = 0; i < 102; i++) {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * imageFiles.length);
        } while (usedIndices.has(randomIndex));
        
        usedIndices.add(randomIndex);
        ownershipDisplayed.add(randomIndex);
        
        const img = document.createElement('img');
        img.src = imageFiles[randomIndex];
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.style.transition = 'filter 0.3s ease';
        img.dataset.index = i;
        img.dataset.originalIndex = randomIndex;

        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.dataset.index = i;
        
        addOwnershipImageEventListeners(wrapper, img, imageFiles, ownershipDisplayed);

        wrapper.appendChild(img);
        container.appendChild(wrapper);
        
        if (usedIndices.size >= imageFiles.length && i < 101) {
          usedIndices.clear();
        }
      }
    } finally {
      removeLoadingState(container, loadingOverlay);
    }
  } catch (error) {
    console.error('Error loading profile pics list:', error);
    const container = document.querySelector('.ownership-images-grid');
    for (let i = 0; i < 102; i++) {
      createPastelSvg(container);
    }
  }
}

// Helper function to get a unique ownership image
function getUniqueOwnershipImage(img, ownershipDisplayed, imageFiles) {
  const availableIndices = Array.from(
    { length: imageFiles.length }, 
    (_, index) => index
  ).filter(index => !ownershipDisplayed.has(index));
  
  if (availableIndices.length < 5) {
    const displayedArray = Array.from(ownershipDisplayed);
    const toRemove = Math.max(5, Math.floor(displayedArray.length * 0.2));
    
    for (let j = 0; j < toRemove; j++) {
      const randomRemoveIndex = Math.floor(Math.random() * displayedArray.length);
      ownershipDisplayed.delete(displayedArray[randomRemoveIndex]);
      displayedArray.splice(randomRemoveIndex, 1);
    }
    
    return getUniqueOwnershipImage(img, ownershipDisplayed, imageFiles);
  }
  
  const randomAvailableIndex = Math.floor(Math.random() * availableIndices.length);
  const newIndex = availableIndices[randomAvailableIndex];
  
  ownershipDisplayed.add(newIndex);
  
  const oldIndex = parseInt(img.dataset.originalIndex);
  ownershipDisplayed.delete(oldIndex);
  
  img.dataset.originalIndex = newIndex;
  
  return newIndex;
}

// Add event listeners to ownership images
function addOwnershipImageEventListeners(wrapper, img, imageFiles, ownershipDisplayed) {
  wrapper.addEventListener('mouseenter', function() {
    img.style.filter = 'brightness(1.2)';
    
    if (!img.flickerInterval) {
      img.flickerInterval = setInterval(function() {
        let newIndex = getUniqueOwnershipImage(img, ownershipDisplayed, imageFiles);
        img.src = imageFiles[newIndex];
      }, 100);
    }
  });
  
  wrapper.addEventListener('mouseleave', function() {
    setTimeout(() => {
      if (img.flickerInterval) {
        clearInterval(img.flickerInterval);
        img.flickerInterval = null;
      }
      img.style.filter = 'brightness(1)';
    }, 1000);
  });

  wrapper.addEventListener('click', function() {
    if (img.flickerInterval) {
      clearInterval(img.flickerInterval);
      img.flickerInterval = null;
    }
    
    img.flickerInterval = setInterval(function() {
      let newIndex = getUniqueOwnershipImage(img, ownershipDisplayed, imageFiles);
      img.src = imageFiles[newIndex];
    }, 100);
    
    setTimeout(function() {
      if (img.flickerInterval) {
        clearInterval(img.flickerInterval);
        img.flickerInterval = null;
      }
    }, 3000);
  });
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Start both initializations concurrently
  Promise.all([
    initializeCommunityGrid(),
    initializeOwnershipGrid()
  ]).catch(console.error);
}); 