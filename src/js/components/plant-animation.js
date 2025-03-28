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
}

resizeCanvas();
let baseSize = { width: canvas.width, height: canvas.height };

window.addEventListener('resize', () => {
    resizeCanvas();
    // If animation hasn't started, update the baseline; once started, keep baseSize fixed
    if (!animationStarted) {
        baseSize = { width: canvas.width, height: canvas.height };
    }
});

class Branch {
    constructor(startX, startY, length, angle, branchWidth, depth) {
        this.startX = startX;
        this.startY = startY;
        this.length = length;
        this.angle = angle;
        this.branchWidth = branchWidth;
        this.depth = depth;
        this.grown = 0;
        this.finished = false;
        this.floweringProgress = 0;
        this.flowered = false;
        this.flowerColor = `hsl(${Math.random() * 360}, 70%, 85%)`;
        this.flowerPosition = 0.6 + Math.random() * 0.4; // Between 60% and 100% of branch length
    }

    update() {
        if (this.grown < this.length) {
            this.grown += this.length / 150;
        } else if (!this.finished && this.depth > 0) {
            const branchesCount = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < branchesCount; i++) {
                setTimeout(() => {
                    const newAngle = this.angle + (Math.random() * 60 - 30);
                    const newLength = this.length * (0.9 + Math.random() * 0.2);
                    const newWidth = this.branchWidth * 0.75;
                    branches.push(new Branch(
                        this.startX + Math.sin(this.angle * Math.PI / 180) * -this.length,
                        this.startY + Math.cos(this.angle * Math.PI / 180) * -this.length,
                        newLength, newAngle, newWidth, this.depth - 1
                    ));
                }, Math.random() * 600 + 200); // delay randomly between 200ms and 800ms
            }
            this.finished = true;
        }

        if (this.depth <= 2 && !this.flowered && this.grown >= this.length && Math.random() > 0.7) {
            this.flowered = true;
            this.startFlowering();
        }

        this.draw();
    }

    startFlowering() {
        if (this.floweringProgress < 1) {
            this.floweringProgress += 0.01;
            setTimeout(() => this.startFlowering(), 100);
        } else {
            setTimeout(() => {
                // Use the flower position to determine where the seed comes from
                const seedX = this.startX + Math.sin(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
                const seedY = this.startY + Math.cos(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
                seeds.push(new Seed(seedX, seedY));
            }, 1000 + Math.random() * 5000);
        }
    }

    draw() {
        const scaleX = canvas.width / baseSize.width;
        const scaleY = canvas.height / baseSize.height;
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

        // Only draw flowers when floweringProgress is greater than 0
        if (this.floweringProgress > 0) {
            const flowerX = this.startX + Math.sin(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
            const flowerY = this.startY + Math.cos(this.angle * Math.PI / 180) * -this.length * this.flowerPosition;
            const effectiveFlowerX = flowerX * scaleX;
            const effectiveFlowerY = flowerY * scaleY;
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
        this.vx = Math.random() * 2 - 1;
        this.speed = Math.random() * 1 + 0.5;
        this.planted = false;
        this.hasCheckedGrowth = false;
    }

    update() {
        if (this.y < canvas.height - 5) {
            this.x += this.vx;
            this.y += this.speed;
        } else if (!this.planted && !this.hasCheckedGrowth) {
            this.hasCheckedGrowth = true;
            // Only create a new branch if we haven't reached the maximum number of trees
            if (Math.random() < 0.02 && treeCount < MAX_TREES) {
                branches.push(new Branch(this.x, canvas.height, canvas.height / 6, 0, 8, 5));
                treeCount++; // Increment the tree counter
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

function animate() {
    // Instead of clearing the canvas to transparent which may default to black, fill it with a background color
    ctx.fillStyle = '#fbf8ef'; // match the body background color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    branches.forEach(branch => branch.update());
    seeds.forEach(seed => seed.update());
    requestAnimationFrame(animate);
}

function startGrowth(startX, startY) {
    animationStarted = true;
    
    // Start the branch slightly behind the sapling position
    // This creates the effect of the plant growing from behind the sapling
    // instead of replacing it
    
    // Create the upward growing branch (reduced height by 40%)
    branches.push(new Branch(startX, startY + 5, canvas.height / 7.5, 0, 10, 7));
    treeCount++; // Increment tree counter for the main upward branch
    
    // Create a downward growing branch (root) - extend all the way to the bottom
    const rootBranch = new Branch(startX, startY + 5, (canvas.height - startY - 5), 180, 10, 0);
    // Prevent the root from flowering by setting floweringProgress to -1
    rootBranch.floweringProgress = -1;
    rootBranch.flowered = true; // Mark as already flowered to prevent future flowering
    branches.push(rootBranch);
    // We don't count the root as a separate tree
    
    animate();
}

// Export the necessary functions
export { startGrowth }; 