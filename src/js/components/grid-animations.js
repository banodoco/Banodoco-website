// Determine base URL based on environment
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? '' 
  : '/banodoco-new-website';

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
    promises.push(preloadImage(`${BASE_URL}/assets/numbered/${i}.png`, 'community'));
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
    await preloadCommunityImages();
    const communityDisplayed = new Set();

    for (let i = 0; i < 16; i++) {
      let randomIndex = Math.floor(Math.random() * 66);
      while (communityDisplayed.has(randomIndex)) {
        randomIndex = Math.floor(Math.random() * 66);
      }
      communityDisplayed.add(randomIndex);
      
      const img = document.createElement('img');
      img.src = `${BASE_URL}/assets/numbered/${randomIndex}.png`;
      img.dataset.originalIndex = randomIndex;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';
      img.style.transition = 'filter 0.3s ease';

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
  img.addEventListener('mouseenter', function() {
    let newIndex = getUniqueCommunityImage(img, communityDisplayed);
    img.src = `${BASE_URL}/assets/numbered/${newIndex}.png`;
    img.style.filter = 'brightness(1.2)';
    
    if (!img.flickerInterval) {
      img.flickerInterval = setInterval(function() {
        let newIndex = getUniqueCommunityImage(img, communityDisplayed);
        img.src = `${BASE_URL}/assets/numbered/${newIndex}.png`;
      }, 100);
    }
  });

  img.addEventListener('mouseleave', function() {
    setTimeout(() => {
      if (img.flickerInterval) {
        clearInterval(img.flickerInterval);
        img.flickerInterval = null;
      }
      img.style.filter = 'brightness(1)';
    }, 1000);
  });

  img.addEventListener('click', function() {
    if (img.flickerInterval) {
      clearInterval(img.flickerInterval);
      img.flickerInterval = null;
    }
    
    img.flickerInterval = setInterval(function() {
      let newIndex = getUniqueCommunityImage(img, communityDisplayed);
      img.src = `${BASE_URL}/assets/numbered/${newIndex}.png`;
    }, 100);
    
    setTimeout(function() {
      if (img.flickerInterval) {
        clearInterval(img.flickerInterval);
        img.flickerInterval = null;
      }
    }, 3000);
  });
}

// Initialize ownership grid
async function initializeOwnershipGrid() {
  try {
    const response = await fetch(`${BASE_URL}/data/profile_pics_list.json`);
    const imagePaths = await response.json();
    
    // Add BASE_URL to all image paths in the list
    const imageFiles = imagePaths.map(path => `${BASE_URL}${path}`);
    
    const container = document.querySelector('.ownership-images-grid');
    if (!container) return;

    const loadingOverlay = showLoadingState(container);

    try {
      // Preload all ownership images first
      await preloadOwnershipImages(imageFiles);

      const usedIndices = new Set();
      const ownershipDisplayed = new Set();

      for (let i = 0; i < 100; i++) {
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
        
        if (usedIndices.size >= imageFiles.length && i < 99) {
          usedIndices.clear();
        }
      }
    } finally {
      removeLoadingState(container, loadingOverlay);
    }
  } catch (error) {
    console.error('Error loading profile pics list:', error);
    const container = document.querySelector('.ownership-images-grid');
    for (let i = 0; i < 100; i++) {
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