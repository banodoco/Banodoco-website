import * as THREE from 'three';

// Map to store animation instances by container element
const animationInstances = new Map();

// --- Animation Instance Class ---
class MellonAnimationInstance {
  constructor(container) {
    this.container = container;
    if (!this.container) {
      console.error('Mellon animation container not found for instance!');
    return;
  }

    this.width = 0;
    this.height = 0;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mellonLabel = null; // Keep label specific to Mellon instance
    this.capabilitiesLabel = null;
    this.creationsLabel = null;
    this.lineMeshes = [];
    this.lines = [];
    this.pulses = [];
    this.activeDots = [];
    this.explosionParticles = []; // Add array for explosion particles
    this.globalTime = 0;
    this.resizeObserver = null;
    this.animationFrameId = null;
    this.lastTimestamp = 0; // Added for delta time calculation
    this.suppressTemporaryText = false; // Flag to control text display

    this.init();
  }

  init() {
    // Setup Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // Get initial dimensions
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    if (this.width === 0 || this.height === 0) {
      console.warn("Mellon Animation Script: Initial container dimensions are zero for instance. Ensure CSS provides size.");
    }

    // Setup Camera
    this.camera = new THREE.OrthographicCamera(
      this.width / -2, this.width / 2, this.height / 2, this.height / -2, 0.1, 1000
  );
    this.camera.position.z = 10;

    // Setup Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Add Labels (Only add Mellon label if it's the #mellon-animation-container)
    if (this.container.id === 'mellon-animation-container') {
      this.mellonLabel = document.createElement('div');
      this.mellonLabel.id = 'mellon-label'; // Keep the ID for specific styling
      // Use innerHTML to add image and text
      this.mellonLabel.innerHTML = `
        <img src="assets/logos/mellon.svg" alt="Mellon Logo" style="display: block; margin: 0 auto; height: 43px; width: auto;">
      `;
      // this.mellonLabel.textContent = 'Mellon'; // Replaced by innerHTML
      this.container.appendChild(this.mellonLabel);
    }

    // Add Background Labels (Common to both)
    this.capabilitiesLabel = document.createElement('div');
    this.capabilitiesLabel.className = 'background-label background-label-capabilities';
    this.capabilitiesLabel.textContent = 'Capabilities';
    this.container.appendChild(this.capabilitiesLabel);

    this.creationsLabel = document.createElement('div');
    this.creationsLabel.className = 'background-label background-label-creations';
    this.creationsLabel.textContent = 'Creations';
    this.container.appendChild(this.creationsLabel);

    // Setup Resize Observer
    this.resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      const newWidth = entry.contentRect.width;
      const newHeight = entry.contentRect.height;
        if (newWidth === 0 || newHeight === 0) continue;

        this.width = newWidth;
        this.height = newHeight;

        this.camera.left = this.width / -2;
        this.camera.right = this.width / 2;
        this.camera.top = this.height / 2;
        this.camera.bottom = this.height / -2;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);

        this.updateSceneGeometry();
        this.positionBackgroundLabels();
    }
  });
    this.resizeObserver.observe(this.container);

    // Store the instance
    animationInstances.set(this.container, this);

    // Initial setup and start animation
    this.updateSceneGeometry();
    this.positionBackgroundLabels();
    this.lastTimestamp = performance.now(); // Initialize last timestamp
    this.animate();
  }

  positionBackgroundLabels() {
    if (this.width === 0 || this.height === 0) return;
    const fontSize = Math.max(20, Math.min(this.width, this.height) * 0.06);
    const yPosition = '50%';

    this.capabilitiesLabel.style.left = `${this.width * 0.25}px`;
    this.capabilitiesLabel.style.top = yPosition;
    this.capabilitiesLabel.style.fontSize = `${fontSize}px`;

    this.creationsLabel.style.left = `${this.width * 0.75}px`;
    this.creationsLabel.style.top = yPosition;
    this.creationsLabel.style.fontSize = `${fontSize}px`;

    // Position Mellon label if it exists for this instance
    if (this.mellonLabel) {
        this.mellonLabel.style.left = '50%';
        this.mellonLabel.style.top = '50%';
        // Font size is styled via CSS with its ID
    }
  }

  updateSceneGeometry() {
    this.lineMeshes.forEach(mesh => {
         if (mesh.geometry) mesh.geometry.dispose();
         if (mesh.material) mesh.material.dispose();
      this.scene.remove(mesh);
     });
    this.pulses.forEach(p => p.remove(this.scene)); // Pass scene to remove method
    this.lineMeshes = [];
    this.lines.length = 0;
    this.pulses.length = 0;
    this.createAllLines();
  }

  createAllLines() {
    const capabilitiesStartAngle = Math.PI * 0.7;
    const capabilitiesEndAngle = Math.PI * 1.3;
    const artStartAngle = -Math.PI * 0.3;
    const artEndAngle = Math.PI * 0.3;
    const angleStep = Math.PI / 40;
    const centerX = 0;
    const centerY = 0;
    const startX = 0;
    const startY = 0; 

    const createLineSegment = (angle, lineColor, lineType) => {
      const endX = centerX + Math.cos(angle) * (this.width * 0.95 / 2);
      const endY = centerY + Math.sin(angle) * (this.height * 0.99 / 2);
      const numPoints = 20;
      const positions = new Float32Array(numPoints * 3);
      for (let i = 0; i < numPoints; i++) {
        let t = i / (numPoints - 1);
        positions[i * 3] = startX + t * (endX - startX);
        positions[i * 3 + 1] = startY + t * (endY - startY);
        positions[i * 3 + 2] = 0;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.65
      });
      const line = new THREE.Line(geometry, material);
      line.userData.squigglyData = {
        startX, startY, endX, endY,
        wiggleAmplitude: 3 + Math.random() * 4,
        wiggleFrequency: 0.5 + Math.random() * 1,
        wigglePhase: Math.random() * Math.PI * 2,
        numPoints: numPoints
      };
      this.scene.add(line);
      this.lineMeshes.push(line);
      this.lines.push({
        startX, startY, endX, endY,
        type: lineType,
        color: lineColor,
        wiggleAmplitude: line.userData.squigglyData.wiggleAmplitude,
        wiggleFrequency: line.userData.squigglyData.wiggleFrequency,
        wigglePhase: line.userData.squigglyData.wigglePhase,
        lastSpawnTime: 0
      });
    };

    for (let angle = capabilitiesStartAngle; angle <= capabilitiesEndAngle; angle += angleStep) {
      createLineSegment(angle, 0x4285F4, 'capabilities');
    }
    for (let angle = artStartAngle; angle <= artEndAngle; angle += angleStep) {
      createLineSegment(angle, 0xFF9800, 'art');
    }
  }

  displayTemporaryText(text, position3D, type, duration = 800) {
    // Check the suppression flag first
    if (this.suppressTemporaryText) {
        return;
    }

    if (!this.container || !document.body.contains(this.container) || this.width === 0 || this.height === 0) {
      return;
    }
    const tempVec = new THREE.Vector3(position3D.x, position3D.y, position3D.z);
    tempVec.project(this.camera);
    const screenX = (tempVec.x * 0.5 + 0.5) * this.width;
    const screenY = (-tempVec.y * 0.5 + 0.5) * this.height;

    const textBox = document.createElement('div');
    textBox.className = 'pulse-text-box';
    if (type === "start") {
      textBox.classList.add('pulse-text-box-start');
    } else if (type === "end") {
      textBox.classList.add('pulse-text-box-end');
    } else {
      textBox.style.backgroundColor = 'rgba(0,0,0,0.6)';
    }
    textBox.textContent = text;
    textBox.style.left = `${screenX}px`;
    textBox.style.top = `${screenY}px`;
    if (type === 'start') {
      textBox.style.transform = 'translate(5px, -50%)';
    } else if (type === 'end') {
      textBox.style.transform = 'translate(-100%, -50%)';
    } else {
      textBox.style.transform = 'translate(5px, -50%)';
    }
    this.container.appendChild(textBox);
    void textBox.offsetWidth;
    textBox.style.opacity = '1';

    setTimeout(() => {
      textBox.style.opacity = '0';
      setTimeout(() => {
        if (textBox.parentNode === this.container) {
          this.container.removeChild(textBox);
        }
      }, 300);
    }, duration);

    // Use a slightly brighter color for the dot based on type
    const baseColor = (type === "start") ? new THREE.Color(0x4285F4) : new THREE.Color(0xFF9800);
    const dotColor = baseColor.lerp(new THREE.Color(0xffffff), 0.3).getHex(); // Brighter version

    const dot = new Dot(this.scene, new THREE.Vector3(position3D.x, position3D.y, position3D.z), dotColor, 6, duration);
    this.activeDots.push(dot);
  }

  spawnInwardPulse() {
    let capabilitiesLines = this.lines.filter(line => line.type === 'capabilities');
    if (capabilitiesLines.length === 0) return;

    // If text is suppressed (sneak peek active), filter for bottom 6 lines
    if (this.suppressTemporaryText) {
      const totalCapabilities = capabilitiesLines.length;
      if (totalCapabilities > 6) {
        capabilitiesLines = capabilitiesLines.slice(totalCapabilities - 6); // Take the last 6
      } 
      // If 6 or fewer exist, use all of them - no need to filter further
    }
    
    // If after filtering, no lines are available (shouldn't happen if total > 0), exit
    if (capabilitiesLines.length === 0) return;

    // Select a random line from the (potentially filtered) list
    const line = capabilitiesLines[Math.floor(Math.random() * capabilitiesLines.length)];
    
    // Cooldown and spawning logic (unchanged)
    const currentTime = performance.now();
    const cooldown = line ? (line.lastSpawnTime ? 3000 : 0) : 3000;
    if (currentTime - (line?.lastSpawnTime ?? 0) > cooldown) {
      // Pass 'this' (the instance) to the Pulse constructor
      const pulse = new Pulse(this.scene, this, line, 0.8 + Math.random() * 1.5, 'inward', this.displayTemporaryText.bind(this));
      this.pulses.push(pulse);
      if (line) line.lastSpawnTime = currentTime;
    }
  }

  spawnOutwardPulse() {
    let artLines = this.lines.filter(line => line.type === 'art');
    if (artLines.length === 0) return;

    // If text is suppressed (sneak peek active), filter for top 6 lines
    if (this.suppressTemporaryText) {
      const totalArt = artLines.length;
      if (totalArt > 6) {
        artLines = artLines.slice(totalArt - 6); // Take the LAST 6 for TOP right
      }
      // If 6 or fewer exist, use all of them
    }

    // If after filtering, no lines are available, exit
    if (artLines.length === 0) return;

    // Select a random line from the (potentially filtered) list
    const line = artLines[Math.floor(Math.random() * artLines.length)];
    
    // Cooldown and spawning logic (unchanged)
    const currentTime = performance.now();
    const cooldown = line ? (line.lastSpawnTime ? 3000 : 0) : 3000;
    if (currentTime - (line?.lastSpawnTime ?? 0) > cooldown) {
      // Pass 'this' (the instance) to the Pulse constructor
      const pulse = new Pulse(this.scene, this, line, 0.8 + Math.random() * 1.5, 'outward', this.displayTemporaryText.bind(this));
      this.pulses.push(pulse);
      if (line) line.lastSpawnTime = currentTime;
    }
  }
  
  triggerExplosion(position, color) {
    const particleCount = 25 + Math.floor(Math.random() * 15); // 25-40 particles
    const baseSpeed = 0.8 + Math.random() * 0.7; // Base speed variation
    const lifetime = 500 + Math.random() * 400; // 500-900ms lifetime

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = baseSpeed * (0.7 + Math.random() * 0.6); // Individual speed variation
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0 // Keep them flat for now, z is set in particle
      );
      const particleLifetime = lifetime * (0.8 + Math.random() * 0.4); // Individual lifetime variation
      // Use a slightly brighter, desaturated version of the pulse color
      const particleColor = color; // Use the original pulse color directly

      this.explosionParticles.push(
        new ExplosionParticle(this.scene, position, particleColor, velocity, particleLifetime)
      );
    }
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    // --- Visibility Check ---
    if (document.hidden) {
      // If tab is hidden, skip update/render for this frame.
      // requestAnimationFrame will pause automatically.
      // We reset lastTimestamp when it becomes visible again (implicitly by capping deltaTime)
      return;
    }
    // --- End Visibility Check ---

    if (!this.container || !document.body.contains(this.container)) {
      this.stopAnimation();
      return;
    }

    const currentTime = performance.now();
    let deltaTime = currentTime - this.lastTimestamp;

    // --- Delta Time Capping ---
    const maxDeltaTime = 1000 / 30; // Limit updates to roughly 30 FPS equivalent max step
    deltaTime = Math.min(deltaTime, maxDeltaTime);
    // --- End Delta Time Capping ---

    this.lastTimestamp = currentTime; // Update last timestamp for the next frame

    // Update global time using capped deltaTime
    this.globalTime += deltaTime * 0.0005; // Adjust speed factor if needed

    // Update line wiggles using globalTime
    this.lineMeshes.forEach(lineMesh => {
      if (!lineMesh.userData.squigglyData) return;
      const sd = lineMesh.userData.squigglyData;
      const positions = lineMesh.geometry.attributes.position.array;
      const dx = sd.endX - sd.startX;
      const dy = sd.endY - sd.startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;
      const perpX = -dy / len;
      const perpY = dx / len;
      for (let i = 0; i < sd.numPoints; i++) {
        let t = i / (sd.numPoints - 1);
        let baseX = sd.startX + t * dx;
        let baseY = sd.startY + t * dy;
        // Use this.globalTime for consistent wiggle speed
        let offset = sd.wiggleAmplitude * Math.sin(2 * Math.PI * sd.wiggleFrequency * t + this.globalTime + sd.wigglePhase) * Math.sin(Math.PI * t);
        positions[i * 3] = baseX + perpX * offset;
        positions[i * 3 + 1] = baseY + perpY * offset;
      }
      lineMesh.geometry.attributes.position.needsUpdate = true;
    });

    // Update pulses using deltaTime
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      // Pass deltaTime and globalTime to update
      if (this.pulses[i].update(deltaTime, this.globalTime)) {
        this.pulses[i].remove(this.scene);
        this.pulses.splice(i, 1);
      }
    }

    // Update explosion particles using deltaTime
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      if (this.explosionParticles[i].update(deltaTime)) { // Pass deltaTime
        this.explosionParticles[i].remove(this.scene);
        this.explosionParticles.splice(i, 1);
      }
    }

    // Update active dots using deltaTime
    for (let i = this.activeDots.length - 1; i >= 0; i--) {
      if (this.activeDots[i].update(deltaTime)) { // Pass deltaTime
        this.activeDots[i].remove(this.scene);
        this.activeDots.splice(i, 1);
      }
    }

    // Spawn pulses based on deltaTime to make probability frame-rate independent
    let baseSpawnChance = 0.6; // Base chance per second
    // Increase spawn chance if sneak peek is active
    if (this.suppressTemporaryText) {
      baseSpawnChance *= 3;
    }
    const spawnProbability = baseSpawnChance * (deltaTime / 1000);

    if (Math.random() < spawnProbability) { this.spawnInwardPulse(); }
    if (Math.random() < spawnProbability) { this.spawnOutwardPulse(); }

    this.renderer.render(this.scene, this.camera);
  }

  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    // Clean up THREE resources
    this.pulses.forEach(p => p.remove(this.scene));
    this.lineMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
      this.scene.remove(mesh);
    });
    this.activeDots.forEach(d => d.remove(this.scene));
    // Clean up explosion particles
    this.explosionParticles.forEach(p => p.remove(this.scene));
    this.explosionParticles = [];
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    // Remove labels
    if (this.mellonLabel && this.mellonLabel.parentNode === this.container) {
      this.container.removeChild(this.mellonLabel);
    }
    if (this.capabilitiesLabel && this.capabilitiesLabel.parentNode === this.container) {
      this.container.removeChild(this.capabilitiesLabel);
    }
    if (this.creationsLabel && this.creationsLabel.parentNode === this.container) {
      this.container.removeChild(this.creationsLabel);
    }
    // console.log("Mellon animation instance stopped and cleaned up.");
  }
}
// --- End Animation Instance Class ---

// --- Dot Class --- (Needs scene passed to constructor and remove)
class Dot {
  constructor(scene, position, color, maxSize = 6, duration = 800) {
      this.scene = scene;
      this.position = position;
      this.color = new THREE.Color(color);
      this.maxSize = maxSize;
      this.duration = duration; // Total duration in ms
      this.age = 0; // Current age in ms
      this.phase = 'growing';
      this.mesh = null;
      this.createMesh();
  }

  createMesh() {
      const geometry = new THREE.CircleGeometry(1, 32);
      const material = new THREE.MeshBasicMaterial({
          color: this.color,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide
      });
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.position.set(this.position.x, this.position.y, this.position.z + 0.2);
      this.scene.add(this.mesh);
  }

  update(deltaTime) { // Accept deltaTime
      if (this.phase === 'done') return true;

      this.age += deltaTime; // Increment age

      const halfDuration = this.duration / 2;
      let scale = 0;
      let opacity = 0;

      if (this.age <= halfDuration) {
          this.phase = 'growing';
          const progress = this.age / halfDuration;
          scale = this.maxSize * progress;
          opacity = progress;
      } else if (this.age <= this.duration) {
          this.phase = 'shrinking';
          const progress = (this.age - halfDuration) / halfDuration;
          scale = this.maxSize * (1 - progress);
          opacity = 1 - progress;
      } else {
          this.phase = 'done';
          scale = 0;
          opacity = 0;
          return true; // Signal removal
      }

      if (this.mesh) {
          this.mesh.scale.set(scale, scale, 1);
          this.mesh.material.opacity = Math.max(0, Math.min(1, opacity));
          this.mesh.material.needsUpdate = true;
      }
      return false; // Not done yet
  }

  remove() {
      if (this.mesh) {
          this.scene.remove(this.mesh);
          if (this.mesh.geometry) this.mesh.geometry.dispose();
          if (this.mesh.material) this.mesh.material.dispose();
          this.mesh = null;
      }
      this.phase = 'done';
  }
}
// --- End Dot Class ---

// --- Helper: Create Soft Circle Texture ---
function createSoftCircleTexture(size = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2;

    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); // Center (slightly less intense than pure white)
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');   // Edge is transparent

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true; // Ensure texture is ready
    return texture;
}
// --- End Helper ---

// --- ExplosionParticle Class (Mist version) ---
class ExplosionParticle {
    constructor(scene, position, color, velocity, lifetime) {
        this.scene = scene;
        this.initialPosition = new THREE.Vector3(position.x, position.y, 0.05); // Start slightly in front of lines
        this.color = new THREE.Color(color);
        this.velocity = velocity;
        this.lifetime = lifetime; // total lifetime in milliseconds
        this.age = 0; // current age in milliseconds
        this.baseSize = 8 + Math.random() * 6; // Base size of the mist puff
        this.sprite = null;
        this.texture = createSoftCircleTexture(); // Create the texture
        this.createMesh();
    }

    createMesh() {
        const material = new THREE.SpriteMaterial({
            map: this.texture,
            color: this.color,
            transparent: true,
            opacity: 0.7, // Start semi-transparent
            blending: THREE.NormalBlending, // Use NormalBlending for accurate color
            depthWrite: false, // Important for transparency
            sizeAttenuation: true // Scale with distance (though ortho camera makes this less relevant)
        });

        this.sprite = new THREE.Sprite(material);
        this.sprite.position.copy(this.initialPosition);
        this.sprite.scale.set(0, 0, 1); // Start invisible
        this.scene.add(this.sprite);
    }

    update(deltaTime) { // Accept deltaTime
        this.age += deltaTime; // Increment age

        if (this.age >= this.lifetime) {
            return true; // Signal to remove
        }

        const progress = this.age / this.lifetime;

        // Update position based on age and initial velocity
        // No need to use deltaTime here directly, as age accumulates it
        const currentPos = this.initialPosition.clone().addScaledVector(this.velocity, this.age * 0.035);
        this.sprite.position.copy(currentPos);

        // Update scale based on progress (age / lifetime)
        const growDuration = 0.3; // Grow in first 30% of life
        let currentScale;
        if (progress < growDuration) {
            currentScale = this.baseSize * (progress / growDuration);
        } else {
            currentScale = this.baseSize; // Hold size after growing
        }
        this.sprite.scale.set(currentScale, currentScale, 1);

        // Update opacity based on progress (age / lifetime)
        const fadeInDuration = 0.1;
        const fadeOutStart = 0.5;

        if (progress < fadeInDuration) {
            this.sprite.material.opacity = 0.7 * (progress / fadeInDuration);
        } else if (progress > fadeOutStart) {
            this.sprite.material.opacity = 0.7 * Math.max(0, (1 - (progress - fadeOutStart) / (1 - fadeOutStart)));
        } else {
            this.sprite.material.opacity = 0.7;
        }
        this.sprite.material.needsUpdate = true;

        return false; // Not yet done
    }

    remove() {
        if (this.sprite) {
            this.scene.remove(this.sprite);
            if (this.sprite.material.map) {
                 this.sprite.material.map.dispose(); // Dispose texture
            }
            if (this.sprite.material) {
                this.sprite.material.dispose(); // Dispose material
            }
            this.sprite = null;
        }
        // Ensure texture is disposed even if sprite wasn't added (belt-and-suspenders)
        if (this.texture) {
            this.texture.dispose();
            this.texture = null;
        }
    }
}
// --- End ExplosionParticle Class ---

// --- Pulse Class (Needs scene passed to constructor and remove, plus displayTemporaryText func) ---
  class Pulse {
  constructor(scene, instance, lineData, speed, direction, displayTemporaryTextFunc) {
    this.scene = scene;
    this.instance = instance; // Store the instance reference
        this.lineData = lineData;
        this.speed = speed;
        this.direction = direction;
    this.displayTemporaryText = displayTemporaryTextFunc;
        this.t = (direction === 'inward') ? 1 : 0;
    this.lineLength = 0.15;
    this.pulseWidth = 3 + Math.random() * 2;
        this.color = lineData.color;
        this.mesh = null;
        this.opacity = 0;
        this.completed = false;
    this.endTextDisplayed = false;
    this.numPulsePoints = 15;
        this.createMesh();

        // --- TRIGGER EXPLOSION FOR OUTWARD PULSE --- 
        if (this.direction === 'outward' && this.instance) {
            const centerPosition = { x: this.lineData.startX, y: this.lineData.startY, z: 0.05 }; // Use z=0.05 for explosion origin
            this.instance.triggerExplosion(centerPosition, this.color); // Use pulse color (orange)
        }
        // --- END TRIGGER EXPLOSION FOR OUTWARD PULSE ---

        if (this.direction === 'inward') {
            const startPos = { x: lineData.endX, y: lineData.endY, z: 0 };
      const randomLength = Math.floor(Math.random() * 21) + 5;
            const randomText = 'X'.repeat(randomLength);
      this.displayTemporaryText(randomText, startPos, 'start', 800);
        }
      }
      
      computePosition(t, globalTime) { // Accept globalTime for wiggle
        const { startX, startY, endX, endY, wiggleAmplitude, wiggleFrequency, wigglePhase } = this.lineData;
        const baseX = startX + t * (endX - startX);
        const baseY = startY + t * (endY - startY);
        const dx = endX - startX;
        const dy = endY - startY;
        const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: baseX, y: baseY, perpX: 0, perpY: 0 };
        const perpX = -dy / len;
        const perpY = dx / len;
        // Use globalTime for consistent wiggle calculation
        const offset = wiggleAmplitude * Math.sin(2 * Math.PI * wiggleFrequency * t + globalTime + wigglePhase) * Math.sin(Math.PI * t);
        return { 
          x: baseX + perpX * offset, 
          y: baseY + perpY * offset,
          perpX: perpX,
          perpY: perpY
        };
      }
      
  createMesh(globalTime) { // Pass global time for computePosition
        const vertices = [];
        const triangles = [];
        const headT = this.t;
        const tailT = this.t + (this.direction === 'inward' ? this.lineLength : -this.lineLength);
        const clampedTailT = Math.max(0, Math.min(1, tailT));
        const clampedHeadT = Math.max(0, Math.min(1, headT));

        if ((this.direction === 'inward' && clampedHeadT === 0) || (this.direction === 'outward' && clampedTailT === 1)) {
      if (this.mesh) this.scene.remove(this.mesh);
             this.mesh = null;
             return;
        }
        
        const points = [];
        for (let i = 0; i < this.numPulsePoints; i++) {
          const segmentT = i / (this.numPulsePoints - 1);
          const currentT = clampedTailT + (clampedHeadT - clampedTailT) * segmentT;
      if (currentT >= 0 && currentT <= 1) {
        // Pass globalTime to computePosition
        points.push(this.computePosition(currentT, globalTime));
           }
        }
        
        if (points.length >= 2) {
          const halfWidth = this.pulseWidth / 2;
          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const widthFactor = Math.sin(Math.PI * i / (points.length - 1)); 
            const currentWidth = halfWidth * widthFactor;
            vertices.push(
          p.x + p.perpX * currentWidth, p.y + p.perpY * currentWidth, 0.1,
              p.x - p.perpX * currentWidth, p.y - p.perpY * currentWidth, 0.1
            );
            if (i < points.length - 1) {
              const baseIndex = i * 2;
              triangles.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex + 1, baseIndex + 3, baseIndex + 2
              );
            }
          }
        }
        
        if (vertices.length > 0 && triangles.length > 0) {
          if (!this.mesh) {
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.MeshBasicMaterial({
              color: this.color,
              transparent: true,
              opacity: this.opacity,
              side: THREE.DoubleSide
            });
            this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
          }
          this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          this.mesh.geometry.setIndex(triangles);
          this.mesh.geometry.attributes.position.needsUpdate = true;
      this.mesh.geometry.computeBoundingSphere();
          this.mesh.material.opacity = this.opacity;
          this.mesh.material.needsUpdate = true;
        } else if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
          this.mesh = null;
        }
      }
      
  update(deltaTime, globalTime) { // Accept deltaTime and globalTime
    // Calculate movement step based on deltaTime (adjust speed factor if needed)
    // Aiming for roughly the same speed as before at 60fps (16.67ms)
    const speedFactor = 0.003 * (60 / 1); // ~0.18
    const deltaT = this.speed * speedFactor * (deltaTime / 1000); // Scale by deltaTime in seconds

        if (this.direction === 'inward') {
      this.t = Math.max(-this.lineLength, this.t - deltaT); // Use calculated deltaT
        } else {
      this.t = Math.min(1 + this.lineLength, this.t + deltaT); // Use calculated deltaT
        }

        const progress = (this.direction === 'inward') ? (1 - this.t) : this.t;
    const fadeDuration = 0.2;
    if (progress < fadeDuration) {
            this.opacity = Math.min(1, progress / fadeDuration);
    } else if (this.direction === 'inward' && progress > 1.0 - fadeDuration) { 
        // Only fade out if moving INWARD
        this.opacity = Math.max(0, (1.0 - progress) / fadeDuration);
    } else {
            this.opacity = 1;
        }

    this.createMesh(globalTime); // Pass global time for wiggle calculation

    // --- DISPLAY TEXT AT END FOR OUTWARD PULSE (EARLIER) --- NEW LOGIC HERE ---
    if (this.direction === 'outward' && !this.endTextDisplayed && this.t >= 0.93) {
        const endPos = { x: this.lineData.endX, y: this.lineData.endY, z: 0 };
        const randomLength = Math.floor(Math.random() * 21) + 5;
        const randomText = 'X'.repeat(randomLength);
        this.displayTemporaryText(randomText, endPos, 'end', 800);
        this.endTextDisplayed = true;
    }
    // --- END DISPLAY TEXT AT END FOR OUTWARD PULSE (EARLIER) ---
        
    if ((this.direction === 'inward' && this.t <= -this.lineLength) ||
        (this.direction === 'outward' && this.t >= 1 + this.lineLength) ||
          (this.opacity <= 0 && (progress <= 0 || progress >= 1))) {

        // --- TRIGGER EXPLOSION FOR INWARD PULSE ---
        if (this.direction === 'inward' && this.instance && !this.completed) {
              // Ensure the instance exists and explosion hasn't been triggered yet for this pulse
            const centerPosition = { x: this.lineData.startX, y: this.lineData.startY, z: 0.05 }; // Use z=0.05 for explosion origin
            this.instance.triggerExplosion(centerPosition, this.color); // Use pulse color (blue)
        }
        // --- END TRIGGER EXPLOSION FOR INWARD PULSE ---

        this.completed = true;
      }
    return this.completed;
      }
      
      remove() {
        if (this.mesh) {
      this.scene.remove(this.mesh);
          if (this.mesh.geometry) this.mesh.geometry.dispose();
          if (this.mesh.material) this.mesh.material.dispose();
          this.mesh = null;
        }
      }
    }
// --- End Pulse Class ---

// Exported function to stop a specific animation
export function stopMellonAnimation(containerElement) {
  const instance = animationInstances.get(containerElement);
  if (instance) {
    instance.stopAnimation();
    animationInstances.delete(containerElement); // Clean up map entry
    console.log('Mellon animation stopped for container:', containerElement);
  } else {
    console.warn('Could not find Mellon animation instance to stop for container:', containerElement);
  }
}

// Exported functions to suppress/unsuppress temporary text
export function suppressMellonText(containerElement) {
  const instance = animationInstances.get(containerElement);
  if (instance) {
    instance.suppressTemporaryText = true;

    // Immediately remove existing text boxes from the DOM
    const existingTextBoxes = instance.container.querySelectorAll('.pulse-text-box');
    existingTextBoxes.forEach(box => instance.container.removeChild(box));

    // Immediately remove existing dots from the scene
    instance.activeDots.forEach(dot => dot.remove()); // Call remove on each dot
    instance.activeDots.length = 0; // Clear the array

    console.log('Mellon temporary text suppressed and existing elements removed for container:', containerElement);
  } else {
    console.warn('Could not find Mellon instance to suppress text for:', containerElement);
  }
}

export function unsuppressMellonText(containerElement) {
  const instance = animationInstances.get(containerElement);
  if (instance) {
    instance.suppressTemporaryText = false;
    console.log('Mellon temporary text unsuppressed for container:', containerElement);
  } else {
    console.warn('Could not find Mellon instance to unsuppress text for:', containerElement);
  }
}

// Existing initialization logic (might need adjustment if called differently now)
export function initializeMellonAnimation(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        // --- Robust Cleanup Before Re-initialization ---
        // Remove any existing canvas
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
            container.removeChild(existingCanvas);
        }
        // Remove any existing labels
        const existingLabels = container.querySelectorAll('#mellon-label, .background-label');
        existingLabels.forEach(label => container.removeChild(label));
        // Ensure instance map is clear for this container ( belt-and-suspenders )
        if (animationInstances.has(container)) {
            const oldInstance = animationInstances.get(container);
            if (oldInstance && typeof oldInstance.stopAnimation === 'function') {
                 oldInstance.stopAnimation(); // Ensure loop is stopped if somehow still running
            }
            animationInstances.delete(container);
        }
        // --- End Robust Cleanup ---

        // Now, create the new instance (the check is somewhat redundant now but harmless)
        if (!animationInstances.has(container)) {
            new MellonAnimationInstance(container);
            console.log(`Mellon animation initialized for #${containerId}`);
        } else {
            // This branch should ideally not be reached now
            console.log(`Mellon animation already initialized for #${containerId}`);
        }
    } else {
        console.error(`Container with ID '${containerId}' not found for Mellon animation.`);
    }
}

// Example: Initialize for the main Mellon card
// This assumes the initialization is called from elsewhere, e.g., index.html
// If not, you might call it here or ensure it's called after the DOM is ready.
// initializeMellonAnimation('mellon-animation-container');

// Ensure the container exists before running the script
document.addEventListener('DOMContentLoaded', () => {

  // Add common styles once
  const style = document.createElement('style');
  style.textContent = `
    .pulse-text-box {
      position: absolute;
      color: white;
      padding: 1px 3px;
      border-radius: 3px;
      font-size: 8px;
      font-family: sans-serif;
      pointer-events: none;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      white-space: nowrap;
    }
    .pulse-text-box-start {
        background-color: rgba(66, 133, 244, 0.7); /* Blue #4285F4 */
    }
    .pulse-text-box-end {
        background-color: rgba(255, 152, 0, 0.7); /* Orange #FF9800 */
    }
    #mellon-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #333;
        font-family: sans-serif;
        font-size: 24px;
        font-weight: bold;
        padding: 16px; /* Increased padding for larger circle */
        background-color: rgba(255, 255, 255, 0.75); /* Reduced alpha from 0.9 */
        border-radius: 50%; /* Changed to circle */
        pointer-events: none;
        z-index: 5;
    }
    .background-label {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        font-family: sans-serif;
        font-weight: bold;
        pointer-events: none;
        z-index: 1;
        opacity: 0.35;
        white-space: nowrap;
    }
    .background-label-capabilities {
        color: #4285F4;
    }
    .background-label-creations {
        color: #FF9800;
         }
  `;
  document.head.appendChild(style);

  // Find all host containers
  const animationHosts = document.querySelectorAll('.mellon-animation-host');
  const animationInstances = [];

  if (animationHosts.length === 0) {
    console.warn('No elements with class "mellon-animation-host" found.');
         return; 
      }
      
  // Create an instance for each host
  animationHosts.forEach(hostContainer => {
    animationInstances.push(new MellonAnimationInstance(hostContainer));
  });

  // Optional: Cleanup on window unload (might be overkill)
  // window.addEventListener('beforeunload', () => {
  //   animationInstances.forEach(instance => instance.stopAnimation());
  // });
     
}); 