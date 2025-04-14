const canvas = document.getElementById('plantCanvas');
const ctx = canvas.getContext('2d');

let branches = [];
let seeds = [];
let animationStarted = false;
let treeCount = 0; // Counter to track the number of trees
const MAX_TREES = 100; // Maximum number of trees allowed

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // console.log('resizeCanvas called: canvas dimensions:', canvas.width, canvas.height);
}

resizeCanvas();
let baseSize = { width: canvas.width, height: canvas.height };

window.addEventListener('resize', () => {
  resizeCanvas();
  // Always log the state after resize, regardless of animationStarted
  // console.log('Window resized:', { 
  //   innerWidth: window.innerWidth, 
  //   innerHeight: window.innerHeight, 
  //   canvasWidth: canvas.width, 
  //   canvasHeight: canvas.height, 
  //   baseSize: baseSize,
  //   animationStarted: animationStarted 
  // });
  // If animation hasn't started, update the baseline; once started, keep baseSize fixed
  if (!animationStarted) {
    baseSize = { width: canvas.width, height: canvas.height };
    // console.log('Base size updated because animation not started yet.');
  } else {
    // console.log('Base size NOT updated because animation has started.');
  }
});

// ------------------------------------
// Time-based helpers
// ------------------------------------

// If the old code grew branches over ~150 frames at ~60 FPS,
// that's ~2.5 seconds. So for each branch: total time is 2.5s
// to go from 0 to `length`. => growthRate = length / 2.5s = length / 2500ms
// Adjust to taste if you want a different overall speed.
const GROWTH_DURATION_MS = 2500; 

// Seeds used to move 0.5 to 1.5 px per frame at 60fps => ~30 to 90 px/s
// => 0.03 to 0.09 px/ms. We'll randomly pick speed in that range:
function randomSeedFallSpeed() {
  return 0.03 + Math.random() * 0.06; // 0.03..0.09 px/ms
}

// Seeds drift horizontally ±1 px/frame at 60fps => ±60 px/s => ±0.06 px/ms
function randomSeedDriftSpeed() {
  return -0.06 + Math.random() * 0.12; // -0.06..0.06 px/ms
}

class Branch {
  constructor(startX, startY, length, angle, branchWidth, depth) {
    this.startX = startX;
    this.startY = startY;
    this.length = length;
    this.angle = angle;
    this.branchWidth = branchWidth;
    this.depth = depth;

    // How far this branch has "grown" along its length
    this.grown = 0;
    this.finished = false;

    // Flowering
    this.floweringProgress = 0;
    this.flowered = false;
    this.flowerColor = `hsl(${Math.random() * 360}, 70%, 85%)`;
    this.flowerPosition = 0.6 + Math.random() * 0.4; // 60% - 100% of branch length

    // Precompute the growth rate so we grow from 0..length in ~GROWTH_DURATION_MS
    this.growthRate = this.length / GROWTH_DURATION_MS; // px/ms
  }

  update(delta) {
    // delta is the ms since last frame

    // Grow until fully extended
    if (this.grown < this.length) {
      // Increase grown by growthRate * delta
      const amount = this.growthRate * delta;
      this.grown = Math.min(this.grown + amount, this.length);
    } else if (!this.finished && this.depth > 0) {
      // Once fully grown, spawn new branches directly (removed setTimeout)
      const branchesCount = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < branchesCount; i++) {
        // Create branch immediately instead of using setTimeout
        const newAngle = this.angle + (Math.random() * 60 - 30);
        const newLength = this.length * (0.9 + Math.random() * 0.2);
        const newWidth = this.branchWidth * 0.75;
        branches.push(new Branch(
          this.startX + Math.sin(this.angle * Math.PI / 180) * -this.length,
          this.startY + Math.cos(this.angle * Math.PI / 180) * -this.length,
          newLength, newAngle, newWidth, this.depth - 1
        ));
      }
      this.finished = true;
    }

    // Possibly flower
    if (this.depth <= 2 && !this.flowered && this.grown >= this.length && Math.random() > 0.7) {
      this.flowered = true;
      this.startFlowering(); // keep same setTimeout approach for the flower
    }

    this.draw();
  }

  startFlowering() {
    // Keep your existing approach with setTimeout-based increments
    if (this.floweringProgress < 1) {
      this.floweringProgress += 0.01;
      setTimeout(() => this.startFlowering(), 100);
    } else {
      setTimeout(() => {
        // Only create a seed sometimes (e.g., 50% chance)
        if (Math.random() < 0.5) { 
            // Use the flower position to determine where the seed comes from
            const seedX = this.startX + Math.sin(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
            const seedY = this.startY + Math.cos(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
            seeds.push(new Seed(seedX, seedY));
        }
      }, 1000 + Math.random() * 5000);
    }
  }

  draw() {
    const scaleX = canvas.width / baseSize.width;
    const scaleY = canvas.height / baseSize.height;
    // Log scale factors, perhaps throttle this too if too noisy, but let's try without first
    // REMOVED: console.log('Branch.draw scale factors:', { scaleX, scaleY, canvasWidth: canvas.width, canvasHeight: canvas.height, baseSizeW: baseSize.width, baseSizeH: baseSize.height });

    // Draw the branch
    ctx.lineWidth = this.branchWidth * ((scaleX + scaleY) / 2);
    ctx.strokeStyle = '#8fb996';
    ctx.beginPath();
    const effectiveStartX = this.startX * scaleX;
    const effectiveStartY = this.startY * scaleY;
    const effectiveTipX = effectiveStartX + Math.sin(this.angle * Math.PI / 180) * -this.grown * scaleX;
    const effectiveTipY = effectiveStartY + Math.cos(this.angle * Math.PI / 180) * -this.grown * scaleY;
    ctx.moveTo(effectiveStartX, effectiveStartY);
    ctx.lineTo(effectiveTipX, effectiveTipY);
    ctx.stroke();

    // Draw flower (if floweringProgress > 0)
    if (this.floweringProgress > 0) {
      const flowerX = this.startX + Math.sin(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
      const flowerY = this.startY + Math.cos(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
      const effectiveFlowerX = flowerX * scaleX;
      const effectiveFlowerY = flowerY * scaleY;
      
      // "ease in" the flower size:
      let flowerSize;
      if (this.floweringProgress < 0.33) {
        flowerSize = 1.5 + (1.5 * (this.floweringProgress / 0.33));
      } else if (this.floweringProgress < 0.66) {
        flowerSize = 3 + (1.5 * ((this.floweringProgress - 0.33) / 0.33));
      } else {
        flowerSize = 4.5 + (1.5 * ((this.floweringProgress - 0.66) / 0.34));
      }

      ctx.fillStyle = this.flowerColor;
      ctx.beginPath();
      const effectiveFlowerSize = flowerSize * ((scaleX + scaleY) / 2);
      ctx.arc(effectiveFlowerX, effectiveFlowerY, effectiveFlowerSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

class Seed {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // Convert the per-frame speeds into per-ms speeds:
    this.vx = randomSeedDriftSpeed(); 
    this.vy = randomSeedFallSpeed(); 
    this.planted = false;
    this.hasCheckedGrowth = false;
  }

  update(delta) {
    // Move seeds based on time (ms) passed
    // if they haven't hit the "ground" (y ~ canvas.height)
    const groundY = canvas.height - 5;
    if (this.y < groundY) {
      this.x += this.vx * delta;  // px = px/ms * ms
      this.y += this.vy * delta;  
    } else if (!this.planted && !this.hasCheckedGrowth) {
      this.hasCheckedGrowth = true;
      // only create a new branch sometimes, respecting the max
      if (Math.random() < 0.02 && treeCount < MAX_TREES) {
        branches.push(new Branch(this.x, canvas.height, canvas.height / 6, 0, 8, 5));
        treeCount++;
      }
      this.planted = true;
    }
    this.draw();
  }

  draw() {
    const seedScaleX = canvas.width / baseSize.width;
    const seedScaleY = canvas.height / baseSize.height;
    const avgScale = (seedScaleX + seedScaleY) / 2;
    ctx.fillStyle = '#c9a07a';
    ctx.beginPath();
    ctx.arc(this.x * seedScaleX, this.y * seedScaleY, 1.5 * avgScale, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Track the last timestamp to compute a delta on each frame
let lastTimestamp = 0;
let lastLogTime = 0; // Added for throttling logs in animate
function animate(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = timestamp - lastTimestamp; // milliseconds since last frame
  lastTimestamp = timestamp;

  // Log every frame for the first 5000ms, then throttle to once per second
  if (timestamp < 5000 || timestamp - lastLogTime > 1000) {
    // console.log('animate frame:', { timestamp, delta, canvasWidth: canvas.width, canvasHeight: canvas.height, baseSize });
    lastLogTime = timestamp;
  }

  // Clear (fill) the canvas each frame
  ctx.fillStyle = '#fbf8ef'; // match the body background color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  branches.forEach(branch => branch.update(delta));
  seeds.forEach(seed => seed.update(delta));

  requestAnimationFrame(animate);
}

function startGrowth(startX, startY) {
  // console.log('startGrowth called. Current state:', { 
  //   startX, 
  //   startY, 
  //   canvasWidth: canvas.width, 
  //   canvasHeight: canvas.height, 
  //   baseSize: baseSize, 
  //   branchesLength: branches.length, 
  //   seedsLength: seeds.length, 
  //   animationStarted 
  // });
  
  // Ensure we only start once
  if (animationStarted) return;
  animationStarted = true;
  // console.log('animationStarted set to true.');

  // Reset state if restarting (optional)
  branches = [];

  // Main upward branch
  branches.push(new Branch(startX, startY + 5, canvas.height / 7.5, 0, 10, 7));
  treeCount++;

  // Root (downward branch) to the bottom, set to skip flowering
  const rootBranch = new Branch(startX, startY + 5, (canvas.height - startY - 5), 180, 10, 0);
  rootBranch.floweringProgress = -1; 
  rootBranch.flowered = true;
  branches.push(rootBranch);

  // Start the animation loop
  requestAnimationFrame(animate);
}

// Export the necessary functions
export { startGrowth };
