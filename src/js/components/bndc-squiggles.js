import * as THREE from 'three';

// Simple Linear Interpolation function
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

export function initializeBndcSquiggles(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id ${containerId} not found.`);
        return;
    }

    const parentCard = container.closest('.card[data-category="placeholder"]');
    if (!parentCard) {
        console.error('Parent card for squiggles not found.');
        return;
    }

    let scene, camera, renderer;
    let smallShapes = []; // Store small shape line objects
    let speechBubble = null; // Store speech bubble line object
    let bubbleTextSprite = null; // Store text sprite object
    let targetText = "Helllooo...what's up?"; // Store the target text
    let bubbleTotalPoints = 0; // Store total points for drawRange animation
    let currentTextLength = 0; // Track how much text is visible
    let writingStartTime = 0; // Track when writing begins
    let writingSpeed = 8; // Characters per second
    let writingHasBegun = false; // Flag to track if typing should start

    // Animation state variables
    let animationFrameId = null;
    let clock = new THREE.Clock();
    let animationState = 'idle'; // 'idle', 'shapesFading', 'bubbleAppearing', 'bubbleWriting', 'bubbleFading', 'shapesAppearing'
    let transitionProgress = 0;
    const transitionDuration = 0.8; // Duration of fade/appear in seconds

    function init() {
        scene = new THREE.Scene();

        const width = container.clientWidth;
        const height = container.clientHeight;
        camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
        camera.position.z = 10;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        createSmallShapes();
        createSpeechBubble();
        createBubbleText();

        setShapesVisibility(true, true); // Set initial state immediately
        setBubbleVisibility(false, true);

        renderStatic();
        setupEventListeners();
        startAnimationLoop(); // Start idle animation initially
    }

    function createSmallShapes() {
        smallShapes.forEach(shape => {
            scene.remove(shape.line); // Remove previous line object
            // If materials/geometries need disposal, add here
        });
        smallShapes = [];

        const materials = [
            new THREE.LineBasicMaterial({ color: 0x4285F4, linewidth: 1.5, transparent: true, opacity: 1 }),
            new THREE.LineBasicMaterial({ color: 0xDB4437, linewidth: 1.5, transparent: true, opacity: 1 }),
            new THREE.LineBasicMaterial({ color: 0xF4B400, linewidth: 1.5, transparent: true, opacity: 1 }),
            new THREE.LineBasicMaterial({ color: 0x0F9D58, linewidth: 1.5, transparent: true, opacity: 1 }),
            new THREE.LineBasicMaterial({ color: 0x9C27B0, linewidth: 1.5, transparent: true, opacity: 1 })
        ];

        const numShapes = 50;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const maxShapeSize = Math.min(width, height) * 0.09;

        for (let i = 0; i < numShapes; i++) {
            const points = [];
            const shapeType = Math.floor(Math.random() * 3);
            const size = maxShapeSize * (0.4 + Math.random() * 0.6);
            let posX;
            const placementChance = Math.random();
            const widthRange = width * 0.95;
            if (placementChance < 0.20) {
                const leftZoneWidth = widthRange * 0.20;
                const leftZoneStart = -widthRange / 2;
                posX = leftZoneStart + Math.random() * leftZoneWidth;
            } else {
                const biasFactor = Math.pow(Math.random(), 0.6);
                posX = (biasFactor - 0.5) * widthRange;
            }
            const posY = (Math.random() - 0.5) * height * 0.95;
            const initialRotation = Math.random() * Math.PI * 2;

            if (shapeType === 0) { // Triangle
                 for (let j = 0; j < 3; j++) {
                    const angle = initialRotation + (j / 3) * Math.PI * 2;
                    points.push(new THREE.Vector3(Math.cos(angle) * size / 2, Math.sin(angle) * size / 2, 0));
                }
            } else if (shapeType === 1) { // Square
                 const halfSize = size / 2;
                 points.push(new THREE.Vector3(-halfSize, -halfSize, 0));
                 points.push(new THREE.Vector3( halfSize, -halfSize, 0));
                 points.push(new THREE.Vector3( halfSize,  halfSize, 0));
                 points.push(new THREE.Vector3(-halfSize,  halfSize, 0));
            } else { // Circle
                 const segments = 12;
                 for (let j = 0; j < segments; j++) {
                     const angle = initialRotation + (j / segments) * Math.PI * 2;
                     points.push(new THREE.Vector3(Math.cos(angle) * size / 2, Math.sin(angle) * size / 2, 0));
                }
            }
            if (points.length > 0) points.push(points[0].clone());

            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            const line = new THREE.Line(geometry, materials[i % materials.length].clone()); // Clone material
            line.position.set(posX, posY, 0);
            line.rotation.z = initialRotation;
            line.scale.set(1, 1, 1); 

            const shapeData = {
                line: line,
                initialRotation: initialRotation,
                rotationSpeed: (Math.random() - 0.5) * 2.0, // Reduced from 4.0
                driftSpeedX: (Math.random() - 0.5) * 23, // Reduced from 45
                driftSpeedY: (Math.random() - 0.5) * 23, // Reduced from 45
                initialPosX: posX,
                initialPosY: posY
            };
            
            scene.add(line);
            smallShapes.push(shapeData); // Store the object containing line and its data
        }
    }

    function createSpeechBubble() {
        // Dispose old geometry/material if they exist
        if (speechBubble) {
            if (speechBubble.geometry) speechBubble.geometry.dispose();
            if (speechBubble.material) speechBubble.material.dispose();
            scene.remove(speechBubble);
            speechBubble = null;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;
        const bubbleWidth = width * 0.45; // Slightly smaller width
        const bubbleHeight = height * 0.45; // Slightly smaller height
        const centerX = width * 0.15; // Move bubble more to the right
        const centerY = height * 0.1;

        // Create points for a smoother bubble shape
        const points = [];
        const segments = 40; // More segments for smoother curve
        
        // Create main bubble shape
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            // Add slight vertical squish for more natural look
            const xRadius = bubbleWidth / 2;
            const yRadius = bubbleHeight / 2 * 0.9; // Slight vertical squish
            points.push(new THREE.Vector3(
                centerX + Math.cos(angle) * xRadius,
                centerY + Math.sin(angle) * yRadius,
                0
            ));
        }

        // Add tail pointing to video (left side)
        const tailStartIndex = Math.floor(segments * 0.65); // Position where tail starts
        const tailStartPoint = points[tailStartIndex].clone();
        const tailEndX = centerX - bubbleWidth * 0.7; // Extend tail further left
        const tailEndY = centerY - bubbleHeight * 0.2; // Adjust Y position for better angle
        const controlPoint1 = new THREE.Vector3(
            tailStartPoint.x - bubbleWidth * 0.3,
            tailStartPoint.y - bubbleHeight * 0.1,
            0
        );
        const controlPoint2 = new THREE.Vector3(
            tailEndX + bubbleWidth * 0.1,
            tailEndY + bubbleHeight * 0.1,
            0
        );

        // Insert tail points with better curve control
        points.splice(tailStartIndex + 1, 0,
            controlPoint1,
            controlPoint2,
            new THREE.Vector3(tailEndX, tailEndY, 0),
            controlPoint2.clone(),
            controlPoint1.clone(),
            points[tailStartIndex].clone()
        );

        // Create smooth curve through all points
        const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
        const curvePoints = curve.getPoints(200); // More points for smoother curve
        bubbleTotalPoints = curvePoints.length;

        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

        // Center the geometry
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        // Create material with slightly thicker line
        const material = new THREE.LineBasicMaterial({ 
            color: 0x666666, // Slightly darker for better contrast
            linewidth: 2, // Thicker line
            transparent: true, 
            opacity: 1 
        });

        speechBubble = new THREE.Line(geometry, material);
        // Calculate original intended position
        const originalPosX = centerX + center.x;
        const originalPosY = centerY + center.y;
        // Set the final position, shifted left by 60 units (40 + 20)
        speechBubble.position.set(originalPosX - 60, originalPosY, 0);

        // Set initial drawRange to 0
        geometry.setDrawRange(0, 0);

        scene.add(speechBubble);
    }

    function createBubbleText(textToShow = "") { // Modified to accept initial text
        if (bubbleTextSprite) scene.remove(bubbleTextSprite);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const baseFontSize = 15; // Base font size in CSS pixels
        const basePadding = 10; // Base padding in CSS pixels
        const baseCanvasHeight = 28; // Base height based on font size + padding

        // --- Calculate Logical Dimensions (based on base font size) ---
        context.font = `${baseFontSize}px Arial`;
        const logicalTextMetrics = context.measureText(targetText); // Measure the full target text
        const logicalTextWidth = logicalTextMetrics.width;
        const logicalCanvasWidth = Math.ceil(logicalTextWidth) + basePadding * 2;
        const logicalCanvasHeight = baseCanvasHeight;

        // --- Calculate Render Dimensions (scaled by DPR) ---
        const renderCanvasWidth = logicalCanvasWidth * dpr;
        const renderCanvasHeight = logicalCanvasHeight * dpr;
        canvas.width = renderCanvasWidth;
        canvas.height = renderCanvasHeight;

        // --- Configure Context for High-Res Drawing ---
        context.font = `${baseFontSize * dpr}px Arial`; // Use scaled font size
        context.fillStyle = "#444444";
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        // Draw the initial text (might be empty) using scaled coordinates
        context.fillText(textToShow, basePadding * dpr, renderCanvasHeight / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;

        // Dispose previous texture if it exists and is different
        if (bubbleTextSprite && bubbleTextSprite.material.map && bubbleTextSprite.material.map !== texture) {
             bubbleTextSprite.material.map.dispose();
        }

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0 }); // Start transparent

        // If sprite already exists, just update material, else create new sprite
        if (bubbleTextSprite) {
             bubbleTextSprite.material = spriteMaterial;
        } else {
            bubbleTextSprite = new THREE.Sprite(spriteMaterial);
             // Scale sprite based on LOGICAL dimensions to match desired world size
             const width = container.clientWidth;
             const height = container.clientHeight;
             // const spriteScaleFactor = 0.98; // Adjusted size (0.7 * 1.4) // Remove this factor
             // Use logicalCanvasWidth and logicalCanvasHeight for scaling
             bubbleTextSprite.scale.set(logicalCanvasWidth, logicalCanvasHeight, 1); // Scale directly by logical size

             // Position the text inside the original bubble area, before the 30 unit shift
             const bubbleOriginalCenterX = speechBubble.position.x + 30; // Add back the offset
             const bubbleOriginalCenterY = speechBubble.position.y;
             const bubbleWidth = width * 0.45; // Use the same width as in createSpeechBubble
             const bubbleHeight = height * 0.45; // Use the same height

             // Position text relative to the *original* bubble center, then shift right and down
             const baseSpriteYPosition = bubbleOriginalCenterY + bubbleHeight * 0.1; // Base Y
             const spriteYPosition = baseSpriteYPosition - 5; // Shift down 5px
             const baseSpriteXPosition = bubbleOriginalCenterX - (bubbleWidth / 2) * 0.8; // Base X (start near left-center of original bubble)
             const spriteXPosition = baseSpriteXPosition + 85; // Shift 90px right

             bubbleTextSprite.position.set(spriteXPosition, spriteYPosition, 1);
             scene.add(bubbleTextSprite);
        }
        // Ensure visibility matches bubble visibility logic, especially on resize/recreate
         if (speechBubble) {
             bubbleTextSprite.visible = speechBubble.visible;
             bubbleTextSprite.material.opacity = speechBubble.material.opacity;
         } else {
             // Default to hidden if speech bubble doesn't exist yet
             bubbleTextSprite.visible = false;
             bubbleTextSprite.material.opacity = 0;
         }
    }
    
    // Helper function to update the text texture dynamically
    function updateTextTexture(textToShow) {
        if (!bubbleTextSprite || !bubbleTextSprite.material.map?.image) {
             console.warn("Trying to update text texture before sprite/canvas exists.");
             return; // Exit if sprite or canvas isn't ready
        }
        const canvas = bubbleTextSprite.material.map.image; // Get the existing canvas
        const context = canvas.getContext('2d');
        const canvasWidth = canvas.width; // Already scaled width
        const canvasHeight = canvas.height; // Already scaled height
        const dpr = window.devicePixelRatio || 1;
        const baseFontSize = 15; // Ensure consistency
        const basePadding = 10; // Ensure consistency

        // Clear the canvas
        context.clearRect(0, 0, canvasWidth, canvasHeight);

        // Re-apply scaled font and draw the new text
        context.font = `${baseFontSize * dpr}px Arial`;
        context.fillStyle = "#444444";
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.fillText(textToShow, basePadding * dpr, canvasHeight / 2); // Use scaled padding/coords

        // Tell Three.js to update the texture
        bubbleTextSprite.material.map.needsUpdate = true;
    }

    function renderStatic() {
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    // Helper functions for visibility and state control
    function setShapesVisibility(visible, immediate = false) {
        smallShapes.forEach(shapeData => {
            shapeData.line.visible = visible;
            if (immediate) {
                shapeData.line.material.opacity = visible ? 1 : 0;
                shapeData.line.scale.set(visible ? 1 : 0.1, visible ? 1 : 0.1, 1);
            }
        });
    }

    function setBubbleVisibility(visible, immediate = false) {
        if (speechBubble) {
             speechBubble.visible = visible;
             if(immediate) {
                 // Handle immediate visibility change for drawing effect
                 if (visible) {
                      speechBubble.geometry.setDrawRange(0, bubbleTotalPoints); // Draw full line
                      speechBubble.material.opacity = 1;
                      speechBubble.scale.set(1, 1, 1); // Ensure scale is normal
                 } else {
                      speechBubble.geometry.setDrawRange(0, 0); // Draw nothing
                      speechBubble.material.opacity = 0; // Also set opacity just in case
                      speechBubble.scale.set(0.1, 0.1, 1); // Reset scale for fade-in consistency if needed (though fade-in now uses drawRange)
                 }
             }
        }
        if (bubbleTextSprite) {
             bubbleTextSprite.visible = visible;
              if(immediate) {
                 // Reset text content when hiding immediately
                 if (!visible) {
                      currentTextLength = 0;
                      // Only update texture if it exists
                      if (bubbleTextSprite.material.map?.image) {
                           updateTextTexture(""); // Clear texture
                      }
                 }
             }
        }
    }

    function startTransition(newState) {
        // Allow interrupting writing to start fading immediately
        if (animationState === 'bubbleWriting' && newState === 'bubbleFading') {
             // No transition needed, just change state and let bubbleFading handle opacity
        } else if (animationState === newState) {
             return; // Don't restart the same transition
        } else if ((newState === 'shapesFading' && animationState === 'shapesAppearing') ||
            (newState === 'shapesAppearing' && animationState === 'shapesFading') ||
            (newState === 'bubbleAppearing' && animationState === 'bubbleFading') ||
            (newState === 'bubbleFading' && animationState === 'bubbleAppearing')) {
            // Reverse ongoing fade/appear transition
            transitionProgress = 1.0 - transitionProgress;
        } else {
            // Start a new transition
            transitionProgress = 0; // Reset transition progress for the new state

            // Handle state-specific setup ONLY if it's a true start, not a continuation

            if (newState === 'bubbleAppearing') {
                // Resetting when the bubble starts appearing
                currentTextLength = 0;
                writingHasBegun = false; // Crucial reset
                if (bubbleTextSprite && bubbleTextSprite.material.map?.image) {
                    updateTextTexture(""); // Clear texture
                }
            } else if (newState === 'bubbleWriting') {
                // Only reset time/length if we *weren't* already writing during bubbleAppearing
                if (!writingHasBegun) { 
                    writingStartTime = clock.getElapsedTime();
                    currentTextLength = 0;
                    if (bubbleTextSprite && bubbleTextSprite.material.map?.image) {
                         updateTextTexture(""); // Clear texture if starting fresh
                    }
                }
                 // Ensure flag is true when entering this state regardless
                 writingHasBegun = true;
            }
            // Other state initializations could go here...
        }

        // Set the new state
        animationState = newState;
        startAnimationLoop(); // Ensure loop is running
    }

    // Renamed function to start the main animation loop if needed
    function startAnimationLoop() {
        if (!animationFrameId) {
            clock.start(); // Ensure clock is running or restarts
            animate();
        }
    }
    
    // Function for idle shape animation
    function animateIdleShapes(deltaTime) {
         const width = container.clientWidth;
         const height = container.clientHeight;
         const boundaryX = width / 2;
         const boundaryY = height / 2;
         const elapsedTime = clock.elapsedTime; 
         const maxShapeSize = Math.min(width, height) * 0.09; // Define maxShapeSize here

         smallShapes.forEach((shapeData, index) => { // Added index for offset
             const line = shapeData.line;
             if (!line.visible) return; 

             // Rotation
             line.rotation.z = shapeData.initialRotation + elapsedTime * shapeData.rotationSpeed;

             // Drifting
             line.position.x += shapeData.driftSpeedX * deltaTime;
             line.position.y += shapeData.driftSpeedY * deltaTime;

             // Bouncing (add vertical oscillation)
             const bounceFrequency = 3.0; 
             const bounceAmplitude = 15.0; // Significantly higher bounce amplitude
             const bounceOffset = Math.sin(elapsedTime * bounceFrequency + index * 0.5) * bounceAmplitude;
             line.position.y += bounceOffset * deltaTime; 

             // Boundary check (wrap around)
             // Note: Bounce might cause slightly quicker wrapping on Y axis
             if (line.position.x > boundaryX + maxShapeSize) line.position.x = -boundaryX - maxShapeSize;
             if (line.position.x < -boundaryX - maxShapeSize) line.position.x = boundaryX + maxShapeSize;
             if (line.position.y > boundaryY + maxShapeSize) line.position.y = -boundaryY - maxShapeSize;
             if (line.position.y < -boundaryY - maxShapeSize) line.position.y = boundaryY + maxShapeSize;
         });
    }
    
    function resetShapesToStatic() {
         smallShapes.forEach(shapeData => {
            const line = shapeData.line;
            // Reset position and rotation to initial values
            line.position.set(shapeData.initialPosX, shapeData.initialPosY, 0);
            line.rotation.z = shapeData.initialRotation;
             // Also reset scale and opacity for the start of shapesAppearing
             line.material.opacity = 0;
             line.scale.set(0.1, 0.1, 1);
        });
    }

    // Function to randomize shape positions
    function randomizeShapesPosition() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const boundaryX = width / 2;
        const boundaryY = height / 2;
        const maxShapeSize = Math.min(width, height) * 0.09; // Use this to keep shapes within view

        smallShapes.forEach(shapeData => {
            const line = shapeData.line;
            // Set random position within bounds, considering shape size
            line.position.x = (Math.random() - 0.5) * (width - maxShapeSize * 2);
            line.position.y = (Math.random() - 0.5) * (height - maxShapeSize * 2);
            // Keep rotation and scale as they will be handled by shapesAppearing
        });
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        let needsRender = false;

        // Handle Transitions and Writing
        if (animationState !== 'idle') {
            // Only manage transitionProgress for fade/appear states
            if (animationState !== 'bubbleWriting') {
                 transitionProgress += deltaTime / transitionDuration;
                 transitionProgress = Math.min(transitionProgress, 1.0);
            }
            needsRender = true;

            if (animationState === 'shapesFading') {
                smallShapes.forEach(shapeData => {
                    const line = shapeData.line;
                    line.material.opacity = lerp(1, 0, transitionProgress);
                    const scale = lerp(1, 0.1, transitionProgress);
                    line.scale.set(scale, scale, 1);
                    // Drift animation during fade
                    line.position.x += (line.position.x > 0 ? 1 : -1) * deltaTime * 50; // Faster drift out
                    line.position.y += (line.position.y > 0 ? 1 : -1) * deltaTime * 50;
                });
                if (transitionProgress >= 1) {
                    setShapesVisibility(false, true);
                    resetShapesToStatic(); // Reset them after they fade
                    startTransition('bubbleAppearing');
                }
            } else if (animationState === 'bubbleAppearing') {
                 if (speechBubble) {
                     speechBubble.visible = true; // Make sure it's visible
                     // Animate drawRange until complete
                     const count = Math.ceil(lerp(0, bubbleTotalPoints, transitionProgress));
                     speechBubble.geometry.setDrawRange(0, count);
                     // Fade in opacity and scale up
                     speechBubble.material.opacity = lerp(0, 1, transitionProgress);
                     const scale = lerp(0.1, 1, transitionProgress);
                     speechBubble.scale.set(scale, scale, 1);
                 }

                 // Make text sprite visible and fade in
                 if(bubbleTextSprite) {
                     bubbleTextSprite.visible = true;
                     // Fade in opacity, but let writing logic override to 1 later if needed
                     if (!writingHasBegun) {
                        bubbleTextSprite.material.opacity = lerp(0, 1, transitionProgress);
                     }
                 }

                 // Check if it's time to start writing
                 if (!writingHasBegun && transitionProgress >= 0.0) { // Start writing immediately
                     writingHasBegun = true;
                     writingStartTime = clock.getElapsedTime();
                     currentTextLength = 0; // Reset text length counter
                     // Ensure text texture is empty initially when writing starts mid-draw
                     if (bubbleTextSprite && bubbleTextSprite.material.map?.image) {
                        updateTextTexture("");
                        bubbleTextSprite.material.map.image.__currentText = "";
                     }
                 }

                 // If writing has started, handle text updates here
                 if (writingHasBegun) {
                     const elapsedWritingTime = clock.getElapsedTime() - writingStartTime;
                     let charsToShow = Math.min(Math.floor(elapsedWritingTime * writingSpeed), targetText.length);
                     currentTextLength = charsToShow;

                     if (bubbleTextSprite && bubbleTextSprite.material.map?.image) {
                         const expectedText = targetText.substring(0, charsToShow);
                         if (bubbleTextSprite.material.map.image.__currentText !== expectedText) {
                             updateTextTexture(expectedText);
                             bubbleTextSprite.material.map.image.__currentText = expectedText;
                         }
                     }
                      // Ensure text sprite opacity snaps to 1 once writing starts
                      if (bubbleTextSprite && bubbleTextSprite.material.opacity < 1) {
                          bubbleTextSprite.material.opacity = 1;
                      }
                 }

                 // Check if bubble drawing is finished
                 if (transitionProgress >= 1) {
                    // Bubble is drawn. Check if writing is also finished.
                    const isWritingFinished = currentTextLength >= targetText.length;
                    if (isWritingFinished) {
                        animationState = 'idle'; // Both done, go idle
                    } else {
                        // Bubble done, but writing continues. Transition to dedicated writing state.
                        // Note: writingStartTime and currentTextLength are already set correctly.
                        startTransition('bubbleWriting');
                    }
                 }
            } else if (animationState === 'bubbleWriting') {
                 // This state now ONLY handles continuing writing if it didn't finish during bubbleAppearing
                 const elapsedWritingTime = clock.getElapsedTime() - writingStartTime;
                 let charsToShow = Math.min(Math.floor(elapsedWritingTime * writingSpeed), targetText.length);
                 currentTextLength = charsToShow;

                 // Only update texture if the text content changes
                 if (bubbleTextSprite && bubbleTextSprite.material.map?.image) {
                      const expectedText = targetText.substring(0, charsToShow);
                      if (bubbleTextSprite.material.map.image.__currentText !== expectedText) { // Avoid unnecessary updates
                          updateTextTexture(expectedText);
                          bubbleTextSprite.material.map.image.__currentText = expectedText; // Track rendered text
                      }
                 }

                 // Ensure text sprite opacity is 1
                 if (bubbleTextSprite && bubbleTextSprite.material.opacity < 1) {
                     bubbleTextSprite.material.opacity = 1;
                 }

                 if (charsToShow >= targetText.length) {
                     // Ensure final text is drawn correctly
                     if (bubbleTextSprite && bubbleTextSprite.material.map?.image && bubbleTextSprite.material.map.image.__currentText !== targetText) {
                         updateTextTexture(targetText);
                         bubbleTextSprite.material.map.image.__currentText = targetText;
                     }
                     animationState = 'idle'; // Finished writing
                 }
                 // Keep needsRender = true while writing
            } else if (animationState === 'bubbleFading') {
                 const scale = lerp(1, 0.1, transitionProgress);
                 // Fade out using scale and opacity (keep this simple)
                 if(speechBubble) {
                     speechBubble.scale.set(scale, scale, 1);
                     speechBubble.material.opacity = lerp(1, 0, transitionProgress);
                 }
                 if(bubbleTextSprite) bubbleTextSprite.material.opacity = lerp(1, 0, transitionProgress); // Fade text too
                 if (transitionProgress >= 1) {
                    setBubbleVisibility(false, true); // This will also clear the text now
                    randomizeShapesPosition(); // Randomize positions before appearing
                    // Explicitly set initial state for shapes appearing animation
                    smallShapes.forEach(shapeData => {
                        shapeData.line.material.opacity = 0;
                        shapeData.line.scale.set(0.1, 0.1, 1);
                    });
                    startTransition('shapesAppearing');
                 }
            } else if (animationState === 'shapesAppearing') {
                setShapesVisibility(true); 
                smallShapes.forEach(shapeData => {
                    const line = shapeData.line;
                    line.material.opacity = lerp(0, 1, transitionProgress);
                    const scale = lerp(0.1, 1, transitionProgress);
                    line.scale.set(scale, scale, 1);
                });
                if (transitionProgress >= 1) {
                    animationState = 'idle'; // Shapes are now idle and visible
                }
            }
        } else { 
             // --- Idle Animation --- 
             if (!speechBubble || !speechBubble.visible) {
                 animateIdleShapes(deltaTime);
                 needsRender = true; // Shapes are moving, need render
             } else {
                  // Bubble is visible and idle (finished writing), no animation needed here
                  // Loop might stop below if conditions are met
             }
        }
        
        // Stop loop logic needs adjustment: Don't stop if writing
        const isTrulyIdle = animationState === 'idle';
        const shapesAreHidden = !smallShapes.some(s => s.line.visible);
        const bubbleIsHidden = !speechBubble || !speechBubble.visible;
        
        if (isTrulyIdle && shapesAreHidden && bubbleIsHidden) {
             // Everything is idle and hidden
             cancelAnimationFrame(animationFrameId);
             animationFrameId = null;
             clock.stop();
        } else if (isTrulyIdle && !bubbleIsHidden) {
             // Bubble is visible and idle (finished writing), stop animation
             cancelAnimationFrame(animationFrameId);
             animationFrameId = null;
             clock.stop();
        } else if (isTrulyIdle && !shapesAreHidden && bubbleIsHidden) {
            // Shapes are visible and idle, keep animating them via animateIdleShapes
            // needsRender is set inside animateIdleShapes if called
        }


        if (needsRender) {
            renderer.render(scene, camera);
        }
    }

    function setupEventListeners() {
         // Only add hover listeners for non-touch devices
         const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
         if (!isTouchDevice) {
             parentCard.addEventListener('mouseenter', () => {
                 startTransition('shapesFading');
             });
             parentCard.addEventListener('mouseleave', () => {
                 startTransition('bubbleFading');
             });
         }
         window.addEventListener('resize', onWindowResize);
    }
    
    function onWindowResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height || !renderer) return;
        camera.left = width / -2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = height / -2;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        
        // Store current visibility state before recreating
        const shapesWereVisible = smallShapes.some(s => s.line.visible);
        const bubbleWasVisible = speechBubble && speechBubble.visible;

        // Recreate elements
        createSmallShapes();
        createSpeechBubble();
        // Recreate text - pass empty string initially, visibility will be set below
        createBubbleText("");
 
        // Reset visibility based on *previous* state before resize
        if (bubbleWasVisible) {
             setShapesVisibility(false, true);
             setBubbleVisibility(true, true);
             // Ensure bubble drawRange is full after recreation if it was visible
             if(speechBubble) speechBubble.geometry.setDrawRange(0, bubbleTotalPoints);

             // If bubble was visible, assume text was fully written or being written
             // For simplicity on resize, just show full text immediately.
             currentTextLength = targetText.length;
             updateTextTexture(targetText);
             animationState = 'idle'; // Set to idle with bubble visible
             renderStatic(); // Render the static bubble state
             // Stop animation loop if it was running
              if (animationFrameId) {
                  cancelAnimationFrame(animationFrameId);
                  animationFrameId = null;
                  clock.stop();
              }
        } else { // shapesWereVisible or initially idle
             setShapesVisibility(true, true);
             setBubbleVisibility(false, true);
             animationState = 'idle'; // Set to idle with shapes visible
             startAnimationLoop(); // Restart idle shape animation
             renderStatic(); // Render initial state after resize
        }
    }

    // Start the process
    init();
} 