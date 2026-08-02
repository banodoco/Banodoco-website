// Spike A — extension lens look-development (task W2-A, gate G2a).
// Boots the UNTOUCHED hero scene with the hero page's exact desktop
// parameters, then attaches: the adapted GradePass (lens.js), the three
// Inspire spore exits on the rear rim (plumes.js), the dense Connect
// colonnade (connect-frame.js), the orbit director and the budget HUD.
// Review states: [1] hero pose · [2] Inspire rest · [3] Connect frame ·
// [space] play the orbit · [g] raw/finished · [e] streak exit · [h] HUD.
import { createScene } from '../../mushroom-scene.js';
import { createLens } from './lens.js';
import { createPlumes } from './plumes.js';
import { createConnectFrame } from './connect-frame.js';
import { createDirector } from './director.js';
import { createBudgets } from './budgets.js';

// exact hero desktop boot (golden-mushroom-page.html, mode `desktop`),
// intro skipped — the spike judges the resting material, not the entry
const sceneApi = createScene({
  panX: -2.4, camY: 2.25, camZ: 10.4, targetY: 2.6, fov: 38,
  container: document.getElementById('stage'),
  tiltX: -0.14,
  bg: 0x1c160b,
  quiet: { x: -5.2, z: 4.2, rx: 4.8, rz: 3.4, strength: 0.7 },
  intro: 0,
});
window.sceneApi = sceneApi; // measurement hook, like the hero's ?dbg=1

const lens = createLens(sceneApi);
const plumes = createPlumes(sceneApi);
const connectFrame = createConnectFrame(sceneApi);
const director = createDirector(sceneApi, plumes, connectFrame, lens);
const budgets = createBudgets(sceneApi, plumes, connectFrame);
window.__spike = { sceneApi, lens, plumes, connectFrame, director, budgets };

// URL params: ?pose=hero|inspire|connect  ?grade=0  ?tier=2
const q = new URLSearchParams(location.search);
if (q.get('grade') === '0') lens.setEnabled(false);
if (q.get('tier') === '2') plumes.setTier(2);
const pose = q.get('pose');
if (pose === 'inspire') {
  director.toInspire();
  plumes.setReveal(1, 1, 1);
  plumes.snap();
} else if (pose === 'connect') director.toConnect();
else director.toHero();
