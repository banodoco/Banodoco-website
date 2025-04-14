const canvas = document.getElementById('scaffoldCanvas');
const ctx = canvas.getContext('2d');

let sticks = []; // Array to hold scaffold stick objects
let vines = []; // Array to hold vine segment objects
let seeds = []; // ADDED: Array for falling seeds
let treeCount = 0;
let manualStickCount = 0; // Track manually added grid sticks
const STICK_LIMIT_MANUAL = 5;
let buildStage = 'initial'; // 'initial', 'building', 'vine-growing'
let lastTimestamp = 0;

// Grid parameters (will be calculated)
let gridCellSize = 40;
let gridNumRows = 0;
let gridNumCols = 0;
let gridOffsetX = 0;

// Initial stick pile (visual representation, only shown initially)
const stickPile = {
    x: 0, y: 0, radius: 30, stickCount: 20
};

function calculateGridParams() {
    gridCellSize = 40;
    gridNumRows = Math.floor(canvas.height / gridCellSize);
    gridNumCols = Math.floor(canvas.width / gridCellSize);
    gridOffsetX = (canvas.width - gridNumCols * gridCellSize) / 2;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stickPile.x = canvas.width / 2;
    stickPile.y = canvas.height - 50;
    calculateGridParams();
    draw();
}

window.addEventListener('resize', resizeCanvas);

// --- Animation Objects ---

class Stick {
    constructor(startX, startY, endX, endY) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.color = '#8B4513'; // Brown color for sticks
        this.width = 3;
        this.addedTime = performance.now(); // Track when it was added for potential effects
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(this.endX, this.endY);
        ctx.lineWidth = this.width;
        ctx.strokeStyle = this.color;
        ctx.stroke();
    }
}

class VineSegment {
    constructor(startX, startY, angle, length) {
        this.startX = startX;
        this.startY = startY;
        this.angle = angle; // Radians
        this.maxLength = length * (1.5 + Math.random() * 1.5); // Increased length variance further
        this.currentLength = 0;
        this.growthRate = 0.04 + Math.random() * 0.04;
        this.width = 2 + Math.random();
        this.color = '#228B22';
        this.finished = false;
        this.children = [];
        this.depth = 0;
        this.hasAttemptedSpawn = false; // Keep this flag for flowers

        // Flowering properties
        this.canFlower = true; // CHANGED: Always allow flowering attempt
        this.floweringProgress = 0;
        this.isFlowering = false;
        this.flowerColor = `hsl(${Math.random() * 360}, 70%, 75%)`;
        this.flowerPositions = []; // ADDED: Store multiple flower positions {x, y, progress}
    }

    update(delta) {
        if (this.currentLength < this.maxLength) {
            this.currentLength += this.growthRate * delta;
            this.currentLength = Math.min(this.currentLength, this.maxLength);
        } else {
            // Branching logic (runs once when fully grown)
            if (!this.finished && this.depth < 12) {
                 this.finished = true;
                 const endX = this.startX + Math.cos(this.angle) * this.currentLength;
                 const endY = this.startY + Math.sin(this.angle) * this.currentLength;
                 const numBranches = Math.floor(Math.random() * 3) + 1;
                 for(let i = 0; i < numBranches; i++) {
                     const angleVariance = Math.PI / 2; // +/- 45 degrees deviation from parent
                     const newAngle = this.angle + (Math.random() - 0.5) * angleVariance;
                     const newLength = this.maxLength * (0.5 + Math.random() * 0.3);
                     const child = new VineSegment(endX, endY, newAngle, newLength);
                     child.depth = this.depth + 1;
                     vines.push(child);
                 }
            }
            // Attempt to start flowering if conditions met
            if (this.canFlower && !this.isFlowering && !this.hasAttemptedSpawn) {
                 this.startFlowering();
            }
        }
        // Update flowering animation if active for any flowers
        if (this.isFlowering) {
            let allFlowersDone = true;
            this.flowerPositions.forEach(flower => {
                if (flower.progress < 1) {
                    flower.progress += 0.02; // Simple progress increase per frame
                    allFlowersDone = false;
                }
            });
            // If all flowers in this segment are fully grown, attempt seed drop ONCE
            if (allFlowersDone && !this.hasAttemptedSpawn) {
                 this.attemptSeedDrop();
            }
        }
    }

    startFlowering() {
        if (this.isFlowering) return; 
        this.isFlowering = true;
        // this.hasAttemptedSpawn = true; // Move this to attemptSeedDrop
        
        // Generate 3-6 flower positions along the segment
        const numFlowers = 3 + Math.floor(Math.random() * 4);
        this.flowerPositions = [];
        for (let i = 0; i < numFlowers; i++) {
            // Position along the segment (e.g., 30% to 100% of current length)
            const lengthRatio = 0.3 + Math.random() * 0.7;
            const flowerX = this.startX + Math.cos(this.angle) * this.currentLength * lengthRatio;
            const flowerY = this.startY + Math.sin(this.angle) * this.currentLength * lengthRatio;
            this.flowerPositions.push({ x: flowerX, y: flowerY, progress: 0 });
        }
        // No timeout-based animation needed here directly, progress is updated in main update loop
        // this.animateFlower(); 
    }

    attemptSeedDrop() {
        if (this.hasAttemptedSpawn) return; // Only try once per segment
        this.hasAttemptedSpawn = true;
        this.flowerPositions.forEach(flowerPos => {
             if (Math.random() < 0.9) { // 90% chance per flower to drop a seed
                 seeds.push(new Seed(flowerPos.x, flowerPos.y));
             }
        });
    }

    draw() {
        const endX = this.startX + Math.cos(this.angle) * this.currentLength;
        const endY = this.startY + Math.sin(this.angle) * this.currentLength;
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = this.width;
        ctx.strokeStyle = this.color;
        ctx.stroke();

        // Draw multiple flowers using animated progress
        if (this.isFlowering) {
            this.flowerPositions.forEach(flower => {
                 const flowerSize = 2 + (flower.progress * 5); // Use progress for size
                 ctx.fillStyle = this.flowerColor;
                 ctx.beginPath();
                 ctx.arc(flower.x, flower.y, flowerSize, 0, Math.PI * 2);
                 ctx.fill();
            });
        }
    }
}

// --- ADDED: Seed Class ---
class Seed {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.prevY = y; // Store previous Y for collision detection
        this.vx = -0.06 + Math.random() * 0.12;
        this.vy = 0.03 + Math.random() * 0.06;
        this.landed = false;
        this.size = 2 + Math.random();
        this.color = '#a0522d';
    }

    update(delta) {
        if (this.landed) return;

        this.prevY = this.y;
        this.x += this.vx * delta;
        this.y += this.vy * delta;

        // --- Check for ground collision FIRST ---
        if (!this.landed && this.y >= canvas.height) {
            this.landed = true;
            this.y = canvas.height;
            if (Math.random() < 0.25) {
                const initialAngle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
                const initialLength = gridCellSize * (2 + Math.random() * 3);
                vines.push(new VineSegment(this.x, this.y, initialAngle, initialLength));
                treeCount++;
                updateTreeCount();
            }
            return;
        }
        // --- End Ground Check ---

        // Check for collision with horizontal sticks (only if not already landed on ground)
        for (const stick of sticks) {
            // Ensure stick is horizontal AND stick is clearly ABOVE the seed's CURRENT position
            if (stick.startY === stick.endY && stick.startY < (this.y - 1)) {
                 // Check if seed crossed the stick's Y level this frame
                 if (this.prevY < stick.startY && this.y >= stick.startY) {
                     if (this.x >= Math.min(stick.startX, stick.endX) && this.x <= Math.max(stick.startX, stick.endX)) { // Bounds check
                         this.landed = true;
                         this.y = stick.startY;
                         if (Math.random() < 0.25) {
                             const initialAngle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
                             const initialLength = gridCellSize * (2 + Math.random() * 3);
                             vines.push(new VineSegment(this.x, this.y, initialAngle, initialLength));
                             treeCount++;
                             updateTreeCount();
                         }
                         return;
                     }
                 }
            }
        }
        
        // Fallback check if seed fell way off screen
        if (!this.landed && this.y > canvas.height + 50) {
            this.landed = true;
        }
    }
    
    draw() {
        if (this.landed) return; // Don't draw landed/inactive seeds

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Drawing Functions ---

function drawInitialPile() {
    // Only draw pile if buildStage is 'initial' and no manual sticks added
    if (buildStage === 'initial' && manualStickCount === 0) {
        ctx.fillStyle = '#D2B48C'; // Light brown for pile representation
        ctx.beginPath();
        ctx.arc(stickPile.x, stickPile.y, stickPile.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8B4513';
        ctx.font = '12px Space Mono';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Sticks', stickPile.x, stickPile.y);
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw initial pile if applicable
    drawInitialPile();

    // Draw sticks (grid elements)
    sticks.forEach(stick => stick.draw());

    // Draw vines IF THEY EXIST
    if (vines.length > 0) {
        vines.forEach(vine => vine.draw());
    }
    
    // Draw seeds IF THEY EXIST
    if (seeds.length > 0) {
         seeds.forEach(seed => seed.draw());
    }
}

// --- Animation Loop ---

function animate(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Clear canvas implicitly via draw() at the start

    // Update elements
    // Scaffold building is handled by requestAnimationFrame within buildFullScaffold/buildNextLayer

    // Update vines if they exist
    if (vines.length > 0) {
        // Update existing vines (which might create seeds)
        vines.forEach(vine => vine.update(delta));
    }
    
    // Update seeds if they exist
    if (seeds.length > 0) {
         // Update seeds (which might create vines)
        seeds.forEach(seed => seed.update(delta));
        
        // Optional: Clean up landed seeds periodically
        // seeds = seeds.filter(seed => !seed.landed);
    }
    
    // Draw everything
    draw(); 

    // Keep animation running if building or if there are active vines/seeds
    // Need a better condition to stop eventually if everything is idle
    const isAnythingActive = buildStage === 'building' || vines.length > 0 || seeds.filter(s => !s.landed).length > 0;
    if (isAnythingActive) { // Continue if building or active vines/seeds
        requestAnimationFrame(animate);
    } else {
         // Reset timestamp if stopping, so delta is correct on restart
         lastTimestamp = 0; 
    }
}

// --- Control Functions ---

// Helper to get coordinates for a specific grid element index
// Index progresses bottom-up, left-to-right, adding vertical then horizontal per cell
function getGridStickCoords(index) {
    const elementsPerCell = 2; // Vertical + Horizontal
    const cellIndex = Math.floor(index / elementsPerCell);
    const isVertical = index % elementsPerCell === 0;

    const targetCol = cellIndex % gridNumCols;
    const targetRow = gridNumRows - 1 - Math.floor(cellIndex / gridNumCols);

    if (targetRow < 0) return null; // Index out of bounds

    const baseX = gridOffsetX + targetCol * gridCellSize;
    const baseY = canvas.height - (gridNumRows - targetRow) * gridCellSize;
    const topY = baseY - gridCellSize;
    const rightX = baseX + gridCellSize;

    if (isVertical) {
        // Vertical stick on left side of cell
        if (topY >= 0) {
            return { startX: baseX, startY: baseY, endX: baseX, endY: topY };
        }
    } else {
        // Horizontal stick on bottom side of cell
        if (rightX <= canvas.width) {
            return { startX: baseX, startY: baseY, endX: rightX, endY: baseY };
        }
    }
    return null; // Return null if stick is out of bounds or invalid
}

function addStick() {
    // Return current count if limit is already reached
    if (manualStickCount >= STICK_LIMIT_MANUAL) return manualStickCount;

    let needsAnimationStart = false;
    if (buildStage === 'initial') {
        buildStage = 'building';
        needsAnimationStart = true; // Flag to start the loop
        lastTimestamp = 0; // Reset timestamp for loop start
        calculateGridParams(); // Ensure grid params are set
        sticks = []; // Clear any potential initial state if restarting
    }

    // --- Calculate coords for the Nth manual stick near the center --- 
    let coords = null;
    const r = gridNumRows - 1; // Bottom row index
    const centerCol = Math.floor(gridNumCols / 2);
    const baseY = canvas.height - (gridNumRows - r) * gridCellSize;
    const topY = baseY - gridCellSize;

    try {
        switch (manualStickCount) {
            case 0: { // Vertical stick at left column (centerCol - 1)
                const leftCol = centerCol - 1;
                if (leftCol >= 0) {
                    const x = gridOffsetX + leftCol * gridCellSize;
                    coords = { startX: x, startY: canvas.height, endX: x, endY: canvas.height - gridCellSize };
                }
                break;
            }
            case 1: { // Vertical stick at center column
                const x = gridOffsetX + centerCol * gridCellSize;
                coords = { startX: x, startY: canvas.height, endX: x, endY: canvas.height - gridCellSize };
                break;
            }
            case 2: { // Horizontal stick bridging the above two vertical sticks
                const leftX = gridOffsetX + (centerCol - 1) * gridCellSize;
                const rightX = gridOffsetX + centerCol * gridCellSize;
                coords = { startX: leftX, startY: canvas.height - gridCellSize, endX: rightX, endY: canvas.height - gridCellSize };
                break;
            }
            case 3: { // Vertical stick at right column (centerCol + 1)
                const rightCol = centerCol + 1;
                if (rightCol < gridNumCols) {
                    const x = gridOffsetX + rightCol * gridCellSize;
                    coords = { startX: x, startY: canvas.height, endX: x, endY: canvas.height - gridCellSize };
                }
                break;
            }
            case 4: { // Horizontal stick on top of the vertical at right column, going left
                const rightCol = centerCol + 1;
                if (rightCol < gridNumCols) {
                    const x = gridOffsetX + rightCol * gridCellSize;
                    coords = { startX: x - gridCellSize, startY: canvas.height - gridCellSize, endX: x, endY: canvas.height - gridCellSize };
                }
                break;
            }
        }
    } catch (e) {
        console.error("Error calculating manual stick coords:", e);
    }
    // --- End of coord calculation ---

    if (coords) {
        // Check if stick already exists (simple check based on coords)
        const exists = sticks.some(stick => 
            stick.startX === coords.startX && stick.startY === coords.startY && 
            stick.endX === coords.endX && stick.endY === coords.endY
        );
        if (!exists) {
            sticks.push(new Stick(coords.startX, coords.startY, coords.endX, coords.endY));
        }
         manualStickCount++; // Increment even if skipped to proceed
    } else {
        // Still increment count to prevent getting stuck if boundary stick is skipped
        manualStickCount++;
    }

    // Start animation loop ONLY if it wasn't running before (first stick added)
    if (needsAnimationStart) {
        requestAnimationFrame(animate); // Start the animation loop
    } else if (buildStage === 'building') {
        // If loop is already running (during manual phase), redraw manually for instant feedback
        draw();
    }

    return manualStickCount; // Return current count
}

function buildFullScaffold() {
    buildStage = 'building'; // Ensure stage is correct
    sticks = []; // Clear previous manual sticks
    manualStickCount = 0; // Reset count
    vines = []; // Clear any previous vines if rebuilding

    calculateGridParams(); // Ensure grid params are current

    const centerCol = Math.floor(gridNumCols / 2);

    // --- Extended Grid Parameters ---
    const HORIZONTAL_PADDING_CELLS = 10; // Number of cells to extend horizontally on each side
    const effectiveGridNumCols = gridNumCols + 2 * HORIZONTAL_PADDING_CELLS;
    const effectiveGridOffsetX = gridOffsetX - HORIZONTAL_PADDING_CELLS * gridCellSize;
    const effectiveCenterCol = Math.floor(effectiveGridNumCols / 2);
    // --- End Extended Grid Parameters ---

    // State for batch processing
    let buildState = {
        currentRow: gridNumRows, // Start one row BELOW the visible bottom (r = gridNumRows - 1)
        currentOffset: 0,      // Start at the effective center column
        centerCol: effectiveCenterCol,
        addedIndices: new Set() // Keep track of added H/V sticks via index to avoid duplicates
    };

    // Helper function to add sticks for a specific cell (row, col)
    function addCellSticks(state, r, c, currentEffectiveGridOffsetX, currentEffectiveGridNumCols) {
        // Calculate base coordinates using EFFECTIVE offset
        // Note: r=gridNumRows-1 is bottom visible, r=0 is top visible
        // r=gridNumRows is one below screen, r=-1 is one above, r=-2 is two above
        const baseY = canvas.height - (gridNumRows - 1 - r) * gridCellSize; // Adjusted baseY calc relative to visible grid bottom
        const topY = baseY - gridCellSize;
        const baseX = currentEffectiveGridOffsetX + c * gridCellSize; // Base X using effective offset
        const rightX = baseX + gridCellSize;

        // Use unique string keys for indices based on absolute position (r, c)
        const leftVerticalIndex = `v_${r}_${c}`;      // Vertical stick at (r, c) left edge
        const topHorizontalIndex = `h_${r}_${c}`;     // Horizontal stick at (r, c) top edge
        const rightVerticalIndex = `v_${r}_${c+1}`;  // Vertical stick at (r, c) right edge (same as left edge of c+1)

        // --- Vertical stick (left side: starts at column c) ---
        if (!state.addedIndices.has(leftVerticalIndex)) {
             sticks.push(new Stick(baseX, baseY, baseX, topY));
             state.addedIndices.add(leftVerticalIndex);
        }

        // --- Horizontal stick (TOP side of cell r,c) ---
        if (!state.addedIndices.has(topHorizontalIndex)) {
             sticks.push(new Stick(baseX, topY, rightX, topY));
             state.addedIndices.add(topHorizontalIndex);
        }

        // --- Vertical stick on the RIGHT side (only add if it's the last column overall) ---
        // This ensures the absolute right-most edge of the effective scaffold is drawn
         if (c === currentEffectiveGridNumCols - 1) {
            if (!state.addedIndices.has(rightVerticalIndex)) {
                sticks.push(new Stick(rightX, baseY, rightX, topY));
                state.addedIndices.add(rightVerticalIndex);
            }
         }
    }

    function buildNextLayer(state) {
        if (state.currentRow < -2) { // Base case: finished all rows (incl. 2 above screen)
            buildStage = 'vine-growing'; // Set stage only when scaffold structure is done
            growVines(); // Start growing vines AFTER scaffold is fully built
            return;
        }

        const r = state.currentRow;
        const offset = state.currentOffset;
        const center = state.centerCol; // Effective center

        let rowDone = true; // Assume row is done until proven otherwise

        // Add center cell sticks first if offset is 0
        if (offset === 0) {
            addCellSticks(state, r, center, effectiveGridOffsetX, effectiveGridNumCols);
            // Row not done if there's space left/right AND center is not the only col
            if (center > 0 || center < effectiveGridNumCols - 1) rowDone = false;
        } else {
            // Add sticks for left and right cells based on offset
            const leftCol = center - offset;
            const rightCol = center + offset;

            let addedLeft = false;
            if (leftCol >= 0) {
                addCellSticks(state, r, leftCol, effectiveGridOffsetX, effectiveGridNumCols);
                addedLeft = true;
            }
            let addedRight = false;
            if (rightCol < effectiveGridNumCols) { // Check against EFFECTIVE bounds
                addCellSticks(state, r, rightCol, effectiveGridOffsetX, effectiveGridNumCols);
                addedRight = true;
            }
            // Row is done if we didn't add left OR right (meaning offset exceeded bounds)
             rowDone = !addedLeft && !addedRight; 
        }

        draw(); // Redraw the canvas with the new sticks

        // Move to next state
        if (rowDone) {
            state.currentRow--;      // Move to the row above
            state.currentOffset = 0; // Reset offset for the new row
        } else {
            state.currentOffset++;   // Expand outwards on the current row
        }

        // Schedule the next layer addition
        requestAnimationFrame(() => buildNextLayer(state));
    }

    // Start the grid building process
    lastTimestamp = 0; // Reset timestamp for animation loop if needed
    requestAnimationFrame(() => buildNextLayer(buildState));
}

function growVines() {
    const horizontalSticks = sticks.filter(stick => stick.startY === stick.endY);

    // Target Y coordinate for the lowest visible horizontal sticks
    const targetStartY = canvas.height - gridCellSize;

    // Filter for horizontal sticks at the target Y level
    const startingPoints = horizontalSticks.filter(stick => Math.abs(stick.startY - targetStartY) < 1);

    if(startingPoints.length === 0 && sticks.length > 0){
        return;
    }
    
    vines = []; // Clear existing vines before adding new ones

    const numVines = Math.min(Math.max(1, Math.floor(startingPoints.length / 4)), 10); // Start vines on ~1/4 of bottom sticks, max 10

    for(let i=0; i < numVines && startingPoints.length > 0; i++){
        // Pick a random starting stick from the available bottom ones
        const startIndex = Math.floor(Math.random() * startingPoints.length);
        const startStick = startingPoints.splice(startIndex, 1)[0]; // Pick and remove

        // Start vine from a random point along that horizontal stick
        const startX = startStick.startX + Math.random() * (startStick.endX - startStick.startX);
        const startY = startStick.startY;

        const initialAngle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 6); // Mostly upwards
        const initialLength = 50 + Math.random() * 50;
        vines.push(new VineSegment(startX, startY, initialAngle, initialLength));
    }
}

// --- Initialization ---

function startScaffolding() {
    calculateGridParams(); // Calculate initial grid parameters
    resizeCanvas(); // Set initial size and draw pile
}

// Export necessary functions
export { startScaffolding, addStick, buildFullScaffold };

function updateTreeCount() {
    const treeCountElement = document.getElementById('treeCountDisplay');
    if (treeCountElement) {
        treeCountElement.textContent = `Trees grown: ${treeCount}`;
    }
    // console.log("Total trees: " + treeCount);
} 