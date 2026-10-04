// organism/hero-spores-worker.js — the prelude's own thread. Everything it
// runs lives in ./hero-spores.js (preludeWorker): the same field, integrator,
// ground and drawing core the page's main-thread path uses. See the note
// above preludeWorker for why the prelude draws from here.
import { preludeWorker } from './hero-spores.js';

preludeWorker(self);
