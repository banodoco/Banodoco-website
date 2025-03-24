/**
 * Self-contained Three.js ecosystem simulation (Improved Version with Console Logs).
 *
 * Usage in your HTML:
 *
 *   <script type="module">
 *     import { runEcosystem } from './ecosystem.js';
 *     runEcosystem();
 *   </script>
 *
 * By default, this appends the entire "ecosystem layout" into the <body>.
 * If you'd like to attach it to a specific container, pass a DOM element:
 *
 *   const container = document.getElementById('myContainer');
 *   runEcosystem(container);
 */

import * as THREE from 'https://unpkg.com/three@0.151.3/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.151.3/examples/jsm/controls/OrbitControls.js';

export function runEcosystem(appendToEl = document.body) {

  // ---------------------------------------------------------------------
  // 0a. Basic Config Constants
  // ---------------------------------------------------------------------
  const VIEW_SIZE = 385;          // Used for Orthographic camera dimensions
  const DOT_FADE_DURATION = 200;  // How quickly new orbiting dots fade in
  const MAX_DOTS_PER_CLICK = 20;  // Max dots user can add at once from the UI

  // (Optional) If you want to later clean up intervals, store them:
  let intervals = [];

  // Function to generate UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, 
            v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ---------------------------------------------------------------------
  // 0b. Container Setup
  // ---------------------------------------------------------------------
  const rootContainer = appendToEl;

  let simulationContainer = rootContainer.querySelector('.ecosystem-visualization');
  if (!simulationContainer) {
    simulationContainer = document.createElement('div');
    simulationContainer.className = 'ecosystem-visualization';
    rootContainer.appendChild(simulationContainer);
  }

  // Attempt to find or create #three-container
  let threeContainer = simulationContainer.querySelector('#three-container');
  if (!threeContainer) {
    // Instead of error/return, let's create it automatically:
    threeContainer = document.createElement('div');
    threeContainer.id = 'three-container';
    simulationContainer.appendChild(threeContainer);
  }

  // Grab/hide control panel elements (they'll remain functional but hidden)
  const nodeSelectEl = simulationContainer.querySelector('#control-panel #node-select');
  const dotsInputEl = simulationContainer.querySelector('#control-panel #dots-input');
  const addButtonEl = simulationContainer.querySelector('#control-panel #add-dots-button');
  const controlPanel = simulationContainer.querySelector('#control-panel');
  if (controlPanel) {
    controlPanel.style.display = 'none';
  }

  // ---------------------------------------------------------------------
  // 0c. Inject Required Styles
  // ---------------------------------------------------------------------
  const styleContent = `
    /* ----- Three.js ecosystem styles ----- */
    body, html {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
      background-color: #f5f5f5;
    }
    .ecosystem-layout {
      display: flex;
      width: 100vw;
      height: 100vh;
    }
    .ecosystem-text {
      flex: 1;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-color: #f5f5f5;
    }
    .ecosystem-visualization {
      flex: 1;
      position: relative;
    }
    .ecosystem-visualization #three-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    #control-panel {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 8px 10px;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.25);
      display: flex;
      gap: 8px;
      z-index: 10;
      align-items: center;
    }
    #control-panel label {
      font-size: 0.85rem;
    }
    #control-panel select, #control-panel input {
      padding: 2px 4px;
      font-size: 0.85rem;
    }
    #control-panel button {
      background: #2196f3;
      border: none;
      color: white;
      padding: 6px 10px;
      font-size: 0.85rem;
      border-radius: 4px;
      cursor: pointer;
    }
    #control-panel button:hover {
      background: #1976d2;
    }
    .popup-message {
      position: absolute;
      padding: 4px 8px;
      background: #fff;
      border: 2px solid #ff9800;
      border-radius: 8px;
      text-align: center;
      font-size: 0.8rem;
      pointer-events: none;
      transform: translate(-50%, -50%);
      white-space: nowrap;
    }
    .node-label {
      position: absolute;
      transform: translateX(-50%);
      background-color: rgba(255, 255, 255, 0.8);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      text-align: center;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      z-index: 20;
    }
    #legend {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(255,255,255,0.8);
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-family: sans-serif;
      font-size: 0.9rem;
      z-index: 200;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .legend-line {
      width: 40px;
      height: 6px;
      margin-right: 8px;
      border-radius: 3px;
    }
    .legend-line.inspire {
      background: #FF9800;
    }
    .legend-line.equip {
      background: linear-gradient(to right, #4285F4 0%, #4285F4 20%, #9C27B0 20%, #9C27B0 40%, #F44336 40%, #F44336 60%, #00BCD4 60%, #00BCD4 80%, #4CAF50 80%, #4CAF50 100%);
    }
  `;
  const style = document.createElement('style');
  style.textContent = styleContent;
  document.head.appendChild(style);

  // ---------------------------------------------------------------------
  // 1. Core Data
  // ---------------------------------------------------------------------
  let animationFrame = 0;

  // "Sections" are the main node/hub data
  let sections = [
    { id: 'modelTinkerers',         name: 'Fine-Tuners & Trainers',      dots: 10, x: -300, y: -50 },
    { id: 'mlArchitects',           name: 'Base Model Architects',       dots: 10, x: 0,    y: -200 },
    { id: 'artists',                name: 'Artists',                     dots: 12, x: 300,  y: -50 },
    { id: 'artToolBuilders',        name: 'Tool Builders',               dots: 10, x: 200,  y: 200 },
    { id: 'experimenters',          name: 'Workflow Creators',           dots: 10, x: -50,  y: 300 },
    { id: 'infrastructureBuilders', name: 'Infrastructure Engineers',    dots: 10, x: -250, y: 150 }
  ];

  let connections = [
    // Red connections (inform & inspire)
    { from: 'artists', to: 'modelTinkerers', type: 'red', label: 'Inform & inspire', thickness: 1 },
    { from: 'artists', to: 'mlArchitects',   type: 'red', label: 'Inform & inspire', thickness: 1 },
    { from: 'artists', to: 'artToolBuilders',type: 'red', label: 'Inform & inspire', thickness: 1 },
    { from: 'artists', to: 'experimenters',  type: 'red', label: 'Inform & inspire', thickness: 1 },
    { from: 'artists', to: 'infrastructureBuilders', type: 'red', label: 'Inform & inspire', thickness: 1 },
    // Extra
    { from: 'mlArchitects', to: 'modelTinkerers', type: 'red', label: 'Make stuff for', thickness: 1 },
    { from: 'modelTinkerers', to: 'infrastructureBuilders', type: 'red', label: 'Make stuff for', thickness: 1 },
    // Green connections
    { from: 'infrastructureBuilders', to: 'experimenters', type: 'green', label: 'Make stuff for', thickness: 1 },
    { from: 'experimenters', to: 'artToolBuilders', type: 'green', label: 'Make stuff for', thickness: 1 },
    { from: 'artToolBuilders', to: 'artists', type: 'green', label: 'Make stuff for', thickness: 1 }
  ];

  // Build adjacency lists
  const adjacency = {};
  sections.forEach(s => { adjacency[s.id] = []; });
  connections.forEach(conn => {
    if (!adjacency[conn.from].includes(conn.to)) {
      adjacency[conn.from].push(conn.to);
    }
    if (!adjacency[conn.to].includes(conn.from)) {
      adjacency[conn.to].push(conn.from);
    }
  });

  // Track orbit parameters (keyed by "dotId") for each orbiting dot
  let dotOffsets = {};

  // Arrays for pulses, popups, expansions
  let pulseDots = [];
  let popupTexts = [];
  let nodeExpansions = [];

  // For the (hidden) top control panel
  let selectedNode = 'all';
  let dotsToAdd = 1;

  // Color scheme
  const sectionColors = {
    'modelTinkerers':        '#4285F4',
    'mlArchitects':          '#9C27B0',
    'artists':               '#FF9800',
    'artToolBuilders':       '#F44336',
    'experimenters':         '#00BCD4',
    'infrastructureBuilders': '#4CAF50'
  };

  // Three.js items
  let scene, camera, renderer, controls, raycaster, mouse;
  let nodeMeshes = [];
  let connectionMeshes = [];
  let orbitingDotMeshes = {}; // { sectionId: [Mesh, Mesh, ...], ... }
  let pulseLineMeshes = [];

  // ---------------------------------------------------------------------
  // 2a. Initialize Three.js
  // ---------------------------------------------------------------------
  function initThree() {
    const width = threeContainer.clientWidth;
    const height = threeContainer.clientHeight;

    scene = new THREE.Scene();
    scene.background = null; // Transparent background

    const aspect = width / height;
    const isMobile = window.innerWidth <= 768;
    const mobileScale = isMobile ? 1.5 : 1;
    const VIEW_SIZE_ADJUSTED = VIEW_SIZE * mobileScale;

    camera = new THREE.OrthographicCamera(
      -VIEW_SIZE_ADJUSTED * aspect,
       VIEW_SIZE_ADJUSTED * aspect,
       VIEW_SIZE_ADJUSTED,
      -VIEW_SIZE_ADJUSTED,
      -1000,
       1000
    );
    camera.position.set(0, 0, 10);

    const panX = isMobile ? -20 : -30; // Less pan on mobile
    const panY = isMobile ? 30 : 50;   // Less pan on mobile

    camera.left += panX;
    camera.right += panX;
    camera.top += panY;
    camera.bottom += panY;
    camera.updateProjectionMatrix();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // transparent
    renderer.sortObjects = true;
    threeContainer.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false;
    controls.enablePan = !isMobile; // Disable panning on mobile
    controls.enableZoom = false;
    controls.addEventListener('change', renderNodeLabels);
    
    // Fix for mobile scrolling - disable OrbitControls from capturing all touch events
    if (isMobile) {
      controls.enabled = false; // fully disable on mobile to allow page scroll
    }

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener('resize', onWindowResize);
    
    // On mobile, interpret a short touch as a "tap"
    if (isMobile) {
      let touchStartY = 0;
      let touchStartX = 0;
      let touchMoved = false;
      const touchMoveThreshold = 10; // px

      renderer.domElement.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) return;
        touchStartY = event.touches[0].clientY;
        touchStartX = event.touches[0].clientX;
        touchMoved = false;
      }, { passive: true });
      
      renderer.domElement.addEventListener('touchmove', (event) => {
        if (event.touches.length !== 1) return;
        const touchY = event.touches[0].clientY;
        const touchX = event.touches[0].clientX;
        const deltaY = Math.abs(touchY - touchStartY);
        const deltaX = Math.abs(touchX - touchStartX);
        if (deltaY > touchMoveThreshold || deltaX > touchMoveThreshold) {
          touchMoved = true;
        }
      }, { passive: true });
      
      renderer.domElement.addEventListener('touchend', (event) => {
        // Only process taps, not scrolls
        if (touchMoved) return;
        onTouchStart(event);
      }, { passive: true });

    } else {
      // Desktop pointer
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
    }
  }

  function onWindowResize() {
    const width = threeContainer.clientWidth;
    const height = threeContainer.clientHeight;
    const aspect = width / height;
    const isMobile = window.innerWidth <= 768;
    const mobileScale = isMobile ? 1.5 : 1;
    const VIEW_SIZE_ADJUSTED = VIEW_SIZE * mobileScale;

    camera.left = -VIEW_SIZE_ADJUSTED * aspect;
    camera.right = VIEW_SIZE_ADJUSTED * aspect;
    camera.top = VIEW_SIZE_ADJUSTED;
    camera.bottom = -VIEW_SIZE_ADJUSTED;

    const panX = isMobile ? -20 : -30;
    const panY = isMobile ? 30 : 50;

    camera.left += panX;
    camera.right += panX;
    camera.top += panY;
    camera.bottom += panY;

    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderNodeLabels();
  }

  function onTouchStart(event) {
    // For mobile: handle the touch end event to detect taps
    if (event.changedTouches && event.changedTouches.length !== 1) return;
    
    const touch = event.changedTouches ? event.changedTouches[0] : event.touches[0];
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    mouse.set(x, y);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (!intersects.length) return;

    const first = intersects[0].object;
    if (first.userData && first.userData.type === 'sectionNode') {
      handleSectionClick(first.userData.sectionId);
      return;
    }

    if (first.userData && first.userData.type === 'connectionLine') {
      const clickPos = intersects[0].point;
      handleConnectionClick(first.userData.connIndex, clickPos.x, clickPos.y);
    }
  }

  function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    mouse.set(x, y);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (!intersects.length) return;

    const first = intersects[0].object;
    if (first.userData && first.userData.type === 'sectionNode') {
      handleSectionClick(first.userData.sectionId);
      return;
    }

    if (first.userData && first.userData.type === 'connectionLine') {
      const clickPos = intersects[0].point;
      handleConnectionClick(first.userData.connIndex, clickPos.x, clickPos.y);
    }
  }

  // ---------------------------------------------------------------------
  // 2b. Scene Building (Nodes & Connections)
  // ---------------------------------------------------------------------
  function rebuildSceneObjects() {
    // Remove old
    nodeMeshes.forEach(obj => scene.remove(obj.mesh));
    connectionMeshes.forEach(obj => scene.remove(obj.mesh));
    nodeMeshes = [];
    connectionMeshes = [];

    // Build connections (straight lines)
    connections.forEach((conn, idx) => {
      const fromS = sections.find(s => s.id === conn.from);
      const toS   = sections.find(s => s.id === conn.to);
      if (!fromS || !toS) return;

      const points = [
        new THREE.Vector3(fromS.x, fromS.y, 0),
        new THREE.Vector3(toS.x, toS.y, 0)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: sectionColors[conn.from] || '#2196F3',
        linewidth: conn.thickness,
        opacity: 0.7,
        transparent: true
      });
      const line = new THREE.Line(geometry, material);
      line.position.z = 0;
      line.renderOrder = 1;
      // Store index so we can handle clicks
      line.userData = { connIndex: idx, type: 'connectionLine' };
      scene.add(line);
      connectionMeshes.push({ mesh: line, connIndex: idx });
    });

    // Build node circles
    sections.forEach(sec => {
      const radius = 15;
      const geometry = new THREE.CircleGeometry(radius, 32);
      const material = new THREE.MeshBasicMaterial({
        color: sectionColors[sec.id],
        transparent: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(sec.x, sec.y, 1);
      mesh.renderOrder = 10;
      mesh.userData = { type: 'sectionNode', sectionId: sec.id };
      scene.add(mesh);

      nodeMeshes.push({ id: sec.id, mesh, sectionId: sec.id });
    });
  }

  // ---------------------------------------------------------------------
  // 2c. **Revised** Orbiting Dots (with extra logs)
  // ---------------------------------------------------------------------
  /**
   * Instead of relying on `section.dots`, we use the data in `dotOffsets`.
   * This avoids discarding a dot that's currently in transit or otherwise
   * not reflected by the plain `section.dots` count.
   */
  function buildOrbitingDots() {
    console.log('[buildOrbitingDots] Rebuilding all orbiting dots from dotOffsets...');

    // Remove old
    Object.values(orbitingDotMeshes).forEach(array => {
      array.forEach(mesh => scene.remove(mesh));
    });
    orbitingDotMeshes = {};

    // Initialize arrays per section
    sections.forEach(section => {
      orbitingDotMeshes[section.id] = [];
    });

    // For each offset/dot, create a mesh in the correct section group
    Object.keys(dotOffsets).forEach(dotId => {
      const offset = dotOffsets[dotId];
      const secId = offset.homeSectionId;

      if (!orbitingDotMeshes[secId]) {
        // In case something is off
        console.warn(`[buildOrbitingDots] Creating a new array for section ${secId}`);
        orbitingDotMeshes[secId] = [];
      }

      // Build the mesh
      const geometry = new THREE.CircleGeometry(4, 16);
      const material = new THREE.MeshBasicMaterial({
        color: sectionColors[secId],
        opacity: 0, // start invisible, fade in
        transparent: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 5;
      mesh.userData.dotId = dotId;
      mesh.userData.fadeCreated = Date.now();

      scene.add(mesh);
      orbitingDotMeshes[secId].push(mesh);
    });
  }

  /**
   * If you want to explicitly create a mesh for a new dot
   * right after calling `handleSectionClick()`,
   * you can call this. It no longer uses `section.dots`
   * to decide how many to add—just the new `dotId`.
   */
  function createSingleDotMesh(dotId) {
    const offset = dotOffsets[dotId];
    if (!offset) {
      console.warn(`[createSingleDotMesh] No offset found for dotId=${dotId}`);
      return;
    }
    const secId = offset.homeSectionId;
    if (!orbitingDotMeshes[secId]) {
      orbitingDotMeshes[secId] = [];
    }

    const geometry = new THREE.CircleGeometry(4, 16);
    const material = new THREE.MeshBasicMaterial({
      color: sectionColors[secId],
      opacity: 0,
      transparent: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 5;
    mesh.userData.dotId = dotId;
    mesh.userData.fadeCreated = Date.now();

    scene.add(mesh);
    orbitingDotMeshes[secId].push(mesh);

    console.log(`[createSingleDotMesh] Created mesh for ${dotId} in section ${secId}.`);
  }

  // ---------------------------------------------------------------------
  // 2d. Pulses (traveling segments)
  // ---------------------------------------------------------------------
  function createPulseMesh(x1, y1, x2, y2, thickness, color, opacity = 0.8, glowOpacity = 0.2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return [];

    const normX = dx / length;
    const normY = dy / length;
    const perpX = -normY;
    const perpY = normX;

    // Main segment
    const halfT = thickness * 0.5;
    const vertices = [
      x1 + perpX * halfT, y1 + perpY * halfT, 0,
      x1 - perpX * halfT, y1 - perpY * halfT, 0,
      x2 + perpX * halfT, y2 + perpY * halfT, 0,
      x2 + perpX * halfT, y2 + perpY * halfT, 0,
      x1 - perpX * halfT, y1 - perpY * halfT, 0,
      x2 - perpX * halfT, y2 - perpY * halfT, 0
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false
    });
    const segmentMesh = new THREE.Mesh(geometry, material);
    segmentMesh.renderOrder = 2;

    // Glow
    const glowT = thickness * 1.5;
    const glowVertices = [
      x1 + perpX * glowT, y1 + perpY * glowT, 0,
      x1 - perpX * glowT, y1 - perpY * glowT, 0,
      x2 + perpX * glowT, y2 + perpY * glowT, 0,
      x2 + perpX * glowT, y2 + perpY * glowT, 0,
      x1 - perpX * glowT, y1 - perpY * glowT, 0,
      x2 - perpX * glowT, y2 - perpY * glowT, 0
    ];
    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(glowVertices, 3));
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      opacity: glowOpacity,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.renderOrder = 2;

    return [segmentMesh, glowMesh];
  }

  function calculatePulseSegment(pulse) {
    const dx = pulse.endX - pulse.startX;
    const dy = pulse.endY - pulse.startY;
    const lineLength = Math.sqrt(dx * dx + dy * dy);
    if (lineLength === 0) return { valid: false };

    // The traveling segment
    const segmentPercentage = Math.min(
      0.15 + ((pulse.sourceNodeDots - 10) * 0.01),
      0.35
    );
    const segmentLength = lineLength * segmentPercentage;
    const totalProgress = pulse.progress * (lineLength + segmentLength);

    // Segment start & end
    const startSegment = Math.max(0, totalProgress - segmentLength);
    const endSegment = Math.min(lineLength, totalProgress);

    // Check if it's out of range
    if (startSegment >= lineLength || endSegment <= 0) {
      return { valid: false };
    }

    // Trigger expansion once if it's reached the end
    if (endSegment >= lineLength && !pulse.hasTriggeredExpansion) {
      const targetSection = sections.find(
        s => s.x === pulse.endX && s.y === pulse.endY
      );
      if (targetSection) {
        createNodeExpansion(targetSection.id, pulse.color, pulse.thickness);
        pulse.hasTriggeredExpansion = true;
      }
    }

    const ratio1 = startSegment / lineLength;
    const ratio2 = endSegment / lineLength;
    const x1 = pulse.startX + dx * ratio1;
    const y1 = pulse.startY + dy * ratio1;
    const x2 = pulse.startX + dx * ratio2;
    const y2 = pulse.startY + dy * ratio2;

    return { valid: true, x1, y1, x2, y2 };
  }

  function rebuildPulseLines() {
    // Remove old
    pulseLineMeshes.forEach(m => scene.remove(m));
    pulseLineMeshes = [];

    // Build new
    pulseDots.forEach(pulse => {
      const seg = calculatePulseSegment(pulse);
      if (!seg.valid) return;

      const baseThickness = pulse.thickness * 1.2;
      const currentThickness = baseThickness * (0.5 + 0.5 * pulse.progress);

      // Create main & glow
      const [segmentMesh, glowMesh] = createPulseMesh(
        seg.x1, seg.y1,
        seg.x2, seg.y2,
        currentThickness,
        pulse.color,
        0.8,
        0.2
      );
      scene.add(segmentMesh);
      scene.add(glowMesh);

      pulseLineMeshes.push(segmentMesh, glowMesh);
    });
  }

  // ---------------------------------------------------------------------
  // 2e. Node Expansions
  // ---------------------------------------------------------------------
  function createNodeExpansion(sectionId, color, pulseThickness) {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const expansionId = `expansion-${Date.now()}`;
    const duration = 1000;
    const baseScale = 1.5;
    let additional = 0;
    if (pulseThickness !== undefined) {
      additional = (pulseThickness - 1) * 0.5;
    }
    const expansionData = {
      id: expansionId,
      x: section.x,
      y: section.y,
      color,
      startTime: Date.now(),
      duration,
      maxScale: baseScale + additional,
      expansionRatio: 0.3,
      mesh: null
    };

    // Create circle
    const geometry = new THREE.CircleGeometry(15, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      depthTest: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(section.x, section.y, 0.8);
    mesh.renderOrder = 8;
    scene.add(mesh);

    expansionData.mesh = mesh;
    nodeExpansions.push(expansionData);

    // Remove after done
    setTimeout(() => {
      nodeExpansions = nodeExpansions.filter(exp => exp.id !== expansionId);
      scene.remove(mesh);
    }, duration);
  }

  function updateNodeExpansion(expansion) {
    const now = Date.now();
    const elapsed = now - expansion.startTime;
    const progress = Math.min(1, elapsed / expansion.duration);

    // Easing
    const easeOutBack = t => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const expansionRatio = expansion.expansionRatio || 0.5;
    const startingScale = 0.5; // start smaller
    let scale;
    if (progress < expansionRatio) {
      const expandProgress = progress / expansionRatio;
      scale =
        startingScale +
        (expansion.maxScale - startingScale) * easeOutBack(expandProgress);
    } else {
      const shrinkProgress = (progress - expansionRatio) / (1 - expansionRatio);
      scale =
        startingScale +
        (expansion.maxScale - startingScale) *
          (1 - shrinkProgress * shrinkProgress);
    }

    if (expansion.mesh) {
      expansion.mesh.scale.set(scale, scale, 1);
      const fade = 0.7 * (1 - progress);
      expansion.mesh.material.opacity = fade;
    }
  }

  // ---------------------------------------------------------------------
  // 2f. Automatic Pulse Spawning
  // ---------------------------------------------------------------------
  function setupPulseSpawning() {
    function createPulses() {
      const totalDots = sections.reduce((sum, s) => sum + s.dots, 0);

      // Separate connections by source
      const artistConnections = connections.filter(conn => conn.from === 'artists');
      const nonArtistConnections = connections.filter(conn => conn.from !== 'artists');

      let connectionLimit;
      if (totalDots > 100) {
        connectionLimit = 3;
      } else if (totalDots > 50) {
        connectionLimit = 6;
      } else {
        connectionLimit = nonArtistConnections.length;
      }
      const shuffledNonArtist = [...nonArtistConnections].sort(() => Math.random() - 0.5);
      const selectedNonArtist = shuffledNonArtist.slice(0, connectionLimit);

      function createPulseObj(conn, idx, prefix) {
        const fromSection = sections.find(s => s.id === conn.from);
        const toSection   = sections.find(s => s.id === conn.to);
        if (!fromSection || !toSection) return null;
        const dotCount = fromSection.dots;
        const pulseDuration = Math.max(3000 - (dotCount - 10) * 75, 1500);
        const thicknessBoost = Math.min(2 + Math.floor((dotCount - 10) / 4), 5);

        return {
          id: `${prefix}-${idx}-${Date.now()}`,
          startX: fromSection.x,
          startY: fromSection.y,
          endX: toSection.x,
          endY: toSection.y,
          color: sectionColors[conn.from] || '#2196F3',
          progress: 0,
          thickness: conn.thickness + thicknessBoost,
          duration: pulseDuration * 1.5,
          sourceNodeDots: dotCount
        };
      }

      // Create pulses for artist connections
      const artistPulses = artistConnections
        .map((conn, idx) => createPulseObj(conn, idx, 'pulse-artist'))
        .filter(Boolean);

      // Create pulses for selected non-artist connections
      const nonArtistPulses = selectedNonArtist
        .map((conn, idx) => createPulseObj(conn, idx, 'pulse-nonartist'))
        .filter(Boolean);

      const newPulses = [...artistPulses, ...nonArtistPulses];
      pulseDots = [...pulseDots, ...newPulses];

      // Schedule removal
      newPulses.forEach(pulse => {
        setTimeout(() => {
          pulseDots = pulseDots.filter(p => p.id !== pulse.id);
        }, pulse.duration);
      });
    }

    function getPulseInterval() {
      const totalDots = sections.reduce((sum, s) => sum + s.dots, 0);
      const avgDotCount = totalDots / sections.length;
      let interval = Math.max(2000 - (avgDotCount - 10) * 60, 800);
      if (totalDots > 100) interval = 2500;
      if (totalDots > 150) interval = 3000;
      return interval * 1.5;
    }

    // Initial pulses
    createPulses();
    // Repeated pulses
    const pulseIntervalId = setInterval(createPulses, getPulseInterval());
    intervals.push(pulseIntervalId);
  }

  // Pulse progress increment
  const pulseIncrementId = setInterval(() => {
    pulseDots = pulseDots.map(pulse => {
      const baseIncrement = 0.02;
      const speedFactor = 3000 / (pulse.duration || 3000);
      const increment = baseIncrement * speedFactor;
      return { ...pulse, progress: Math.min(1, pulse.progress + increment) };
    });
  }, 50);
  intervals.push(pulseIncrementId);

  // ---------------------------------------------------------------------
  // 2g. Orbital Math + Random Re-routing
  // ---------------------------------------------------------------------
  function calcInTransitPosition(offset) {
    const now = Date.now();
    const progress = (now - offset.inTransitStartTime) / offset.inTransitDuration;
    const t = Math.min(1, progress);
    const x = offset.oldX + (offset.newX - offset.oldX) * t;
    const y = offset.oldY + (offset.newY - offset.oldY) * t;
    return { x, y, progress: t };
  }

  function calcOrbitPosition(section, offset, elapsed) {
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    let baseDistance = offset.distance;
    if (elapsed < offset.flightDuration) {
      const t = elapsed / offset.flightDuration;
      const e = easeOut(t);
      baseDistance = offset.initialDistance + (offset.distance - offset.initialDistance) * e;
    }

    // Drift
    const drift = offset.driftAmplitude * Math.sin(offset.driftSpeed * elapsed);
    const actualDistance = baseDistance + drift;

    // revolve
    const angle = elapsed * offset.speed * offset.direction + offset.phase;
    const xPos = section.x + Math.cos(angle) * actualDistance;
    const yPos = section.y + Math.sin(angle) * actualDistance;

    return { x: xPos, y: yPos };
  }

  function maybeMoveToAnotherHub(dotId, offset) {
    if (offset.isInTransit) {
      // Additional logging to catch "already in transit" attempts
      // (Should not happen with the guard below, but let's keep a log.)
      // console.log(`[maybeMoveToAnotherHub] Dot ${dotId} is already inTransit. Skipping re-move.`);
      return;
    }
    const moveChance = 0.00005; // small chance each frame
    if (Math.random() < moveChance) {
      console.log(`[maybeMoveToAnotherHub] Dot ${dotId} from ${offset.homeSectionId} is deciding to move...`);
      const homeId = offset.homeSectionId;
      const neighbors = adjacency[homeId] || [];

      let candidateSectionId;
      const roll = Math.random();
      if (neighbors.length > 0 && roll < 0.7) {
        candidateSectionId = neighbors[Math.floor(Math.random() * neighbors.length)];
      } else {
        const otherSections = sections.filter(s => s.id !== homeId);
        candidateSectionId = otherSections[Math.floor(Math.random() * otherSections.length)].id;
      }
      if (candidateSectionId === homeId) return;

      console.log(`[maybeMoveToAnotherHub] Dot ${dotId} => wants to go to section ${candidateSectionId}`);
      offset.isInTransit = true;
      offset.inTransitStartTime = Date.now();
      offset.inTransitDuration  = 2000;

      offset.oldX = sections.find(s => s.id === homeId)?.x || 0;
      offset.oldY = sections.find(s => s.id === homeId)?.y || 0;
      offset.newX = sections.find(s => s.id === candidateSectionId)?.x || 0;
      offset.newY = sections.find(s => s.id === candidateSectionId)?.y || 0;
      offset.newSectionId = candidateSectionId;

      offset.fromColor = new THREE.Color(sectionColors[homeId]);
      offset.toColor   = new THREE.Color(sectionColors[candidateSectionId]);
    }
  }

  function finalizeTransit(dotId, offset) {
    offset.isInTransit = false;
    if (!offset.newSectionId) return;

    const oldSectionId = offset.homeSectionId;
    const newId = offset.newSectionId;
    offset.newSectionId = null;

    console.log(`[finalizeTransit] Dot ${dotId} finishing transit from section ${oldSectionId} to ${newId}`);

    const newSec = sections.find(s => s.id === newId);
    if (!newSec) {
      console.warn(`[finalizeTransit] Dot ${dotId} new section ${newId} not found in 'sections'.`);
      return;
    }

    // Keep the section counts in sync (for display or pulse logic, etc.)
    const oldSec = sections.find(s => s.id === oldSectionId);
    if (oldSec) {
      oldSec.dots = Math.max(0, oldSec.dots - 1);
    }
    newSec.dots++;

    // Re-assign the dot's mesh from old group to new group
    const oldArray = orbitingDotMeshes[oldSectionId];
    if (!oldArray) {
      console.warn(`[finalizeTransit] orbitingDotMeshes[${oldSectionId}] does not exist! Dot ${dotId} might be orphaned!`);
    } else {
      const idx = oldArray.findIndex(m => m.userData.dotId === dotId);
      if (idx === -1) {
        console.warn(`[finalizeTransit] Dot ${dotId} not found in orbitingDotMeshes[${oldSectionId}] array!`);
      } else {
        const [dotMesh] = oldArray.splice(idx, 1);
        if (!orbitingDotMeshes[newId]) {
          console.warn(`[finalizeTransit] orbitingDotMeshes[${newId}] doesn't exist yet. Creating it now...`);
          orbitingDotMeshes[newId] = [];
        }
        orbitingDotMeshes[newId].push(dotMesh);
        console.log(`[finalizeTransit] Dot ${dotId} re-assigned from orbitingDotMeshes[${oldSectionId}] to orbitingDotMeshes[${newId}]`);
      }
    }

    // Finish updating offset to the new "home" section
    offset.homeSectionId = newId;
    offset.startTime = Date.now();
    offset.flightDuration = 1000;
    offset.initialDistance = 0;
    offset.distance = 50 + Math.random() * 50;

    const dx = offset.newX - newSec.x;
    const dy = offset.newY - newSec.y;
    offset.phase = Math.atan2(dy, dx);
  }

  // ---------------------------------------------------------------------
  // 2h. User Interactions (clicks, UI input)
  // ---------------------------------------------------------------------
  function handleConnectionClick(connIndex, eventX, eventY) {
    connections[connIndex].thickness += 0.5;
    const conn = connections[connIndex];
    const fromSec = sections.find(s => s.id === conn.from);
    const toSec   = sections.find(s => s.id === conn.to);

    const messages = [
      'Connection strengthened!',
      `${fromSec?.name} → ${toSec?.name}`,
      'Relationship growing!',
      'Building bridges!',
      'Stronger together!'
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    const newPopup = {
      id: Date.now(),
      x: eventX,
      y: eventY,
      text: msg
    };
    popupTexts.push(newPopup);

    setTimeout(() => {
      popupTexts = popupTexts.filter(p => p.id !== newPopup.id);
    }, 2000);

    // Rebuild lines only, no orb rebuild
    rebuildSceneObjects();
  }

  function handleSectionClick(sectionId) {
    console.log(`[handleSectionClick] Adding a new dot to section ${sectionId}`);
    const targetSection = sections.find(s => s.id === sectionId);
    if (!targetSection) return;

    const newDotIndex = targetSection.dots;
    targetSection.dots += 1;

    const randomDist = 50 + Math.random() * 50;
    const speed       = 0.0005 + (newDotIndex % 5) * 0.0002;
    const direction   = newDotIndex % 2 === 0 ? 1 : -1;
    const phase       = (newDotIndex / targetSection.dots) * Math.PI * 2;

    const initialDistance = 500;
    const flightDuration  = 1000;
    const startTime       = Date.now();

    const driftAmplitude = 10 + Math.random() * 30;
    const driftSpeed = 0.001 + Math.random() * 0.002;

    const newDotId = generateUUID();
    dotOffsets[newDotId] = {
      homeSectionId: sectionId,
      distance: randomDist,
      speed,
      phase,
      direction,
      startTime,
      flightDuration,
      initialDistance,
      driftAmplitude,
      driftSpeed,
      isInTransit: false
    };

    // Create the mesh for this single new dot
    createSingleDotMesh(newDotId);
  }

  function handleAddDots() {
    const val = parseInt(dotsInputEl.value, 10);
    dotsToAdd = isNaN(val) ? 1 : Math.min(MAX_DOTS_PER_CLICK, Math.max(1, val));

    if (selectedNode === 'all') {
      // Distribute across all sections
      const batchSize = 3;
      sections.forEach((section, sectionIndex) => {
        const numBatches = Math.ceil(dotsToAdd / batchSize);
        for (let b = 0; b < numBatches; b++) {
          const countThisBatch = Math.min(batchSize, dotsToAdd - b * batchSize);
          const batchDelay = sectionIndex * 300 + b * 500;

          setTimeout(() => {
            for (let i = 0; i < countThisBatch; i++) {
              handleSectionClick(section.id);
            }
          }, batchDelay);
        }
      });
    } else {
      // Add all to one selected node
      const batchSize = 5;
      const numBatches = Math.ceil(dotsToAdd / batchSize);
      for (let b = 0; b < numBatches; b++) {
        const countThisBatch = Math.min(batchSize, dotsToAdd - b * batchSize);
        const batchDelay = b * 500;

        setTimeout(() => {
          for (let i = 0; i < countThisBatch; i++) {
            handleSectionClick(selectedNode);
          }
        }, batchDelay);
      }
    }
  }

  // ---------------------------------------------------------------------
  // 2i. Animation & Rendering
  // ---------------------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    animationFrame++;

    // Orbiting dot positions
    Object.keys(orbitingDotMeshes).forEach(sectionId => {
      orbitingDotMeshes[sectionId].forEach(mesh => {
        const dotId = mesh.userData.dotId;
        const offset = dotOffsets[dotId];
        if (!offset) {
          mesh.position.set(0, 0, 0.5);
          return;
        }

        // We can check for stuck in-transit
        if (offset.isInTransit) {
          const timeSinceTransit = Date.now() - offset.inTransitStartTime;
          if (timeSinceTransit > (offset.inTransitDuration * 2)) {
            console.warn(`[animate] Dot ${dotId} has been in transit for too long (${timeSinceTransit}ms). Check if something is blocking finalizeTransit().`);
          }

          const { x, y, progress } = calcInTransitPosition(offset);
          // color fade
          if (offset.fromColor && offset.toColor) {
            const c = offset.fromColor.clone().lerp(offset.toColor, progress);
            mesh.material.color.set(c);
          }
          mesh.position.set(x, y, 0.5);

          // if arrived
          if (progress >= 1) {
            finalizeTransit(dotId, offset);
          }
        } else {
          // normal orbit
          maybeMoveToAnotherHub(dotId, offset);

          const now = Date.now();
          const elapsed = now - offset.startTime;
          const homeSec = sections.find(s => s.id === offset.homeSectionId);
          if (!homeSec) return;

          const { x, y } = calcOrbitPosition(homeSec, offset, elapsed);
          mesh.position.set(x, y, 0.5);

          // Ensure color matches new home
          mesh.material.color.set(sectionColors[offset.homeSectionId] || '#ffffff');
        }

        // Fade in newly created dots
        if (mesh.userData.fadeCreated) {
          const fadeElapsed = Date.now() - mesh.userData.fadeCreated;
          if (fadeElapsed < DOT_FADE_DURATION) {
            mesh.material.opacity = 0.7 * (fadeElapsed / DOT_FADE_DURATION);
          } else {
            mesh.material.opacity = 0.7;
            delete mesh.userData.fadeCreated;
          }
        }
      });
    });

    // Rebuild pulses
    rebuildPulseLines();

    // Update expansions
    nodeExpansions.forEach(updateNodeExpansion);

    controls.update();
    renderer.render(scene, camera);

    renderPopups();
    renderNodeLabels();
  }

  function renderPopups() {
    document.querySelectorAll('.popup-message').forEach(el => el.remove());

    popupTexts.forEach(popup => {
      const vec = new THREE.Vector3(popup.x, popup.y, 0);
      vec.project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      const screenX = vec.x * halfWidth + halfWidth + rect.left;
      const screenY = -vec.y * halfHeight + halfHeight + rect.top;

      const div = document.createElement('div');
      div.className = 'popup-message';
      div.style.left = screenX + 'px';
      div.style.top = screenY + 'px';
      div.textContent = popup.text;
      document.body.appendChild(div);
    });
  }

  function renderNodeLabels() {
    simulationContainer.querySelectorAll('.node-label').forEach(el => el.remove());
    sections.forEach(section => {
      const vec = new THREE.Vector3(section.x, section.y, 1);
      vec.project(camera);

      const rect = simulationContainer.getBoundingClientRect();
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      const screenX = vec.x * halfWidth + halfWidth;
      const screenY = -vec.y * halfHeight + halfHeight;

      const label = document.createElement('div');
      label.className = 'node-label';
      label.textContent = section.name;
      label.style.backgroundColor = 'rgba(255,255,255,0.5)';
      label.style.left = screenX + 'px';
      label.style.top = (screenY + 25) + 'px';
      simulationContainer.appendChild(label);
    });
  }

  // ---------------------------------------------------------------------
  // 3. Hook up UI, init, start
  // ---------------------------------------------------------------------
  initThree();

  // Populate node dropdown if it exists
  if (nodeSelectEl) {
    // Remove leftover <option> besides "all"
    Array.from(nodeSelectEl.options).forEach(opt => {
      if (opt.value !== 'all') nodeSelectEl.remove(opt);
    });
    sections.forEach(sec => {
      const opt = document.createElement('option');
      opt.value = sec.id;
      opt.textContent = sec.name;
      nodeSelectEl.appendChild(opt);
    });
    nodeSelectEl.addEventListener('change', e => {
      selectedNode = e.target.value;
    });
  }

  if (dotsInputEl) {
    dotsInputEl.addEventListener('change', e => {
      const val = parseInt(e.target.value, 10);
      dotsToAdd = isNaN(val) ? 1 : Math.min(MAX_DOTS_PER_CLICK, Math.max(1, val));
      dotsInputEl.value = dotsToAdd;
    });
  }

  if (addButtonEl) {
    addButtonEl.addEventListener('click', handleAddDots);
  }

  // Initialize offsets for existing dots
  function initializeDotOffsets() {
    sections.forEach(section => {
      for (let i = 0; i < section.dots; i++) {
        const id = generateUUID();
        if (!dotOffsets[id]) {
          const randomDist = 50 + Math.random() * 50;
          const driftAmplitude = 10 + Math.random() * 30;
          const driftSpeed = 0.001 + Math.random() * 0.002;
          const speed = 0.0005 + (i % 5) * 0.0002;
          const phase = (i / section.dots) * Math.PI * 2;
          const direction = i % 2 === 0 ? 1 : -1;

          const initialDistance = 500;
          const flightDuration = 1000;
          const startTime = Date.now();

          dotOffsets[id] = {
            homeSectionId: section.id,
            distance: randomDist,
            speed,
            phase,
            direction,
            startTime,
            flightDuration,
            initialDistance,
            driftAmplitude,
            driftSpeed,
            isInTransit: false
          };
        }
      }
    });
  }

  initializeDotOffsets();

  // Create pulses occasionally
  setupPulseSpawning();

  // Build the scene & orbits exactly once at startup
  rebuildSceneObjects();
  buildOrbitingDots();

  // Start rendering
  animate();
}

// Auto-run when imported (comment out if you don't want auto-start)
runEcosystem();
