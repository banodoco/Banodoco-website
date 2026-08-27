// GENERATED FIXTURE — S02 (2026-08-21-elegance-run-01).
//
// This file was produced by IMPORTING journey/route.js, journey/symbols.js,
// journey/constants.js, journey/structure.js and journey/navigation.js and
// serializing exactly what they export/return TODAY — not hand-transcribed
// from reading source. Purpose: pin every exported route value, chapter geometry, rest-stop table and transit-table signature in journey/route.js so a later order that removes
// a competing/duplicate source of route, copy, symbol or constant data (the
// F-series) is caught immediately if it changes a value, rather than at a
// capture gate.
//
// TO REGENERATE DELIBERATELY (only when a value legitimately changed):
//   node docs/code-health/evidence/2026-08-21-elegance-run-01/s02/generate-snapshot.mjs
// Then record the before/after in the run ledger. See the re-baselining
// protocol in docs/code-health/evidence/2026-08-21-elegance-run-01/c01/
// limitations.md §10 (this fixture follows the same convention) and this
// generator's own header. Do NOT hand-edit the assertions below to make them
// pass — regenerate, or transcription error creeps back in.

import assert from 'node:assert/strict';
import {
  DEFAULT_STOP, ROUTE, TERMINAL_P, TRANSIT_S, FORWARD_BRAKE_TAIL_S,
  DESKTOP_TRANSIT_CAP_S, CHAPTERS, CHAPTER_IDS, SEGMENTS, REST_STOPS,
  REST_OWNER, transitSeconds, forwardBrakeTailSeconds, desktopTransitCapSeconds,
  chapterAt, localProgress, startOf, endOf, restProgress,
} from '../../journey/route.js';

assert.equal(DEFAULT_STOP, 0.5, '[route fixture] DEFAULT_STOP drifted');
assert.deepEqual(ROUTE, [
  {
    "id": "mission",
    "span": 14,
    "nav": "Intro",
    "stops": [
      0
    ],
    "scrollVh": 3.5
  },
  {
    "id": "inspire",
    "span": 24,
    "nav": "Inspire",
    "scrollVh": 6.7,
    "segVh": [
      3.5,
      3.2
    ]
  },
  {
    "id": "connect",
    "span": 22,
    "nav": "Connect",
    "stops": [
      0.65
    ],
    "scrollVh": 10.85,
    "segVh": [
      8,
      2.85
    ],
    "shape": {
      "seg": 0,
      "k": [
        1.1,
        1
      ]
    }
  },
  {
    "id": "owned",
    "span": 25,
    "nav": "Owned",
    "scrollVh": 9.27,
    "segVh": [
      2.27,
      7
    ],
    "shape": {
      "seg": 1,
      "k": [
        1.6,
        0.877
      ]
    }
  },
  {
    "id": "final",
    "span": 15,
    "nav": null,
    "stops": [
      0.8
    ],
    "scrollVh": 10.6,
    "segVh": [
      10,
      0.6
    ],
    "shape": {
      "seg": 0,
      "k": [
        1.305,
        0.7
      ]
    }
  }
], '[route fixture] ROUTE drifted');
assert.equal(TERMINAL_P, 1, '[route fixture] TERMINAL_P drifted');
assert.deepEqual(TRANSIT_S, {
  "inspire>connect": {
    "fwd": 2.5,
    "back": 1.6
  },
  "owned>final": 1.5
}, '[route fixture] TRANSIT_S drifted');
assert.deepEqual(FORWARD_BRAKE_TAIL_S, {
  "mission>inspire": 0.35,
  "inspire>connect": 0.35,
  "connect>owned": 0.35
}, '[route fixture] FORWARD_BRAKE_TAIL_S drifted');
assert.deepEqual(DESKTOP_TRANSIT_CAP_S, {
  "mission>inspire": {
    "fwd": 1.8
  },
  "inspire>connect": {
    "fwd": 0.75
  },
  "connect>owned": {
    "fwd": 1.35
  }
}, '[route fixture] DESKTOP_TRANSIT_CAP_S drifted');

const chaptersSnapshot = CHAPTERS.map((c) => ({
  id: c.id, start: c.start, end: c.end, nav: c.nav, scrollVh: c.scrollVh,
  segVh: c.segVh, shape: c.shape, stopsLocal: c.stopsLocal, stops: c.stops, rest: c.rest,
}));
assert.deepEqual(chaptersSnapshot, [
  {
    "id": "mission",
    "start": 0,
    "end": 0.14,
    "nav": "Intro",
    "scrollVh": 3.5,
    "segVh": null,
    "shape": null,
    "stopsLocal": [
      0
    ],
    "stops": [
      0
    ],
    "rest": 0
  },
  {
    "id": "inspire",
    "start": 0.14,
    "end": 0.38,
    "nav": "Inspire",
    "scrollVh": 6.7,
    "segVh": [
      3.5,
      3.2
    ],
    "shape": null,
    "stopsLocal": [
      0.5
    ],
    "stops": [
      0.26
    ],
    "rest": 0.5
  },
  {
    "id": "connect",
    "start": 0.38,
    "end": 0.6,
    "nav": "Connect",
    "scrollVh": 10.85,
    "segVh": [
      8,
      2.85
    ],
    "shape": {
      "seg": 0,
      "k": [
        1.1,
        1
      ]
    },
    "stopsLocal": [
      0.65
    ],
    "stops": [
      0.523
    ],
    "rest": 0.65
  },
  {
    "id": "owned",
    "start": 0.6,
    "end": 0.85,
    "nav": "Owned",
    "scrollVh": 9.27,
    "segVh": [
      2.27,
      7
    ],
    "shape": {
      "seg": 1,
      "k": [
        1.6,
        0.877
      ]
    },
    "stopsLocal": [
      0.5
    ],
    "stops": [
      0.725
    ],
    "rest": 0.5
  },
  {
    "id": "final",
    "start": 0.85,
    "end": 1,
    "nav": null,
    "scrollVh": 10.6,
    "segVh": [
      10,
      0.6
    ],
    "shape": {
      "seg": 0,
      "k": [
        1.305,
        0.7
      ]
    },
    "stopsLocal": [
      0.8
    ],
    "stops": [
      0.97
    ],
    "rest": 0.8
  }
], '[route fixture] CHAPTERS drifted');

const segmentsSnapshot = SEGMENTS.map((s) => ({ id: s.id, end: s.end, vh: s.vh, k: s.k }));
assert.deepEqual(segmentsSnapshot, [
  {
    "id": "mission",
    "end": 0.14,
    "vh": 3.5,
    "k": null
  },
  {
    "id": "inspire",
    "end": 0.26,
    "vh": 3.5,
    "k": null
  },
  {
    "id": "inspire",
    "end": 0.38,
    "vh": 3.2,
    "k": null
  },
  {
    "id": "connect",
    "end": 0.523,
    "vh": 8,
    "k": [
      1.1,
      1
    ]
  },
  {
    "id": "connect",
    "end": 0.6,
    "vh": 2.85,
    "k": null
  },
  {
    "id": "owned",
    "end": 0.725,
    "vh": 2.27,
    "k": null
  },
  {
    "id": "owned",
    "end": 0.85,
    "vh": 7,
    "k": [
      1.6,
      0.877
    ]
  },
  {
    "id": "final",
    "end": 0.97,
    "vh": 10,
    "k": [
      1.305,
      0.7
    ]
  },
  {
    "id": "final",
    "end": 1,
    "vh": 0.6,
    "k": null
  }
], '[route fixture] SEGMENTS drifted');

assert.deepEqual(CHAPTER_IDS, [
  "mission",
  "inspire",
  "connect",
  "owned",
  "final"
], '[route fixture] CHAPTER_IDS drifted');
assert.deepEqual(REST_STOPS, [
  0,
  0.26,
  0.523,
  0.725,
  0.97
], '[route fixture] REST_STOPS drifted');
assert.deepEqual(REST_OWNER, [
  "mission",
  "inspire",
  "connect",
  "owned",
  "final"
], '[route fixture] REST_OWNER drifted');

// ---- function signatures (name, arity) ----
assert.deepEqual(
  { name: transitSeconds.name, length: transitSeconds.length },
  {
  "name": "transitSeconds",
  "length": 2
},
  '[route fixture] transitSeconds signature drifted',
);
assert.deepEqual(
  { name: forwardBrakeTailSeconds.name, length: forwardBrakeTailSeconds.length },
  {
  "name": "forwardBrakeTailSeconds",
  "length": 2
},
  '[route fixture] forwardBrakeTailSeconds signature drifted',
);
assert.deepEqual(
  { name: desktopTransitCapSeconds.name, length: desktopTransitCapSeconds.length },
  {
  "name": "desktopTransitCapSeconds",
  "length": 2
},
  '[route fixture] desktopTransitCapSeconds signature drifted',
);
assert.deepEqual(
  { name: chapterAt.name, length: chapterAt.length },
  {
  "name": "chapterAt",
  "length": 1
},
  '[route fixture] chapterAt signature drifted',
);
assert.deepEqual(
  { name: localProgress.name, length: localProgress.length },
  {
  "name": "localProgress",
  "length": 2
},
  '[route fixture] localProgress signature drifted',
);
assert.deepEqual(
  { name: startOf.name, length: startOf.length },
  {
  "name": "startOf",
  "length": 1
},
  '[route fixture] startOf signature drifted',
);
assert.deepEqual(
  { name: endOf.name, length: endOf.length },
  {
  "name": "endOf",
  "length": 1
},
  '[route fixture] endOf signature drifted',
);
assert.deepEqual(
  { name: restProgress.name, length: restProgress.length },
  {
  "name": "restProgress",
  "length": 1
},
  '[route fixture] restProgress signature drifted',
);

// ---- representative input -> output pairs, computed exhaustively over ----
// ---- every REST_STOPS pair (both directions) rather than hand-picked  ----
for (const { lo, hi, dir, out } of [
  {
    "lo": 0.26,
    "hi": 0.523,
    "dir": 0,
    "out": 2.5
  },
  {
    "lo": 0.26,
    "hi": 0.523,
    "dir": 1,
    "out": 2.5
  },
  {
    "lo": 0.26,
    "hi": 0.523,
    "dir": -1,
    "out": 1.6
  },
  {
    "lo": 0.523,
    "hi": 0.26,
    "dir": 0,
    "out": 2.5
  },
  {
    "lo": 0.523,
    "hi": 0.26,
    "dir": 1,
    "out": 2.5
  },
  {
    "lo": 0.523,
    "hi": 0.26,
    "dir": -1,
    "out": 1.6
  },
  {
    "lo": 0.725,
    "hi": 0.97,
    "dir": 0,
    "out": 1.5
  },
  {
    "lo": 0.725,
    "hi": 0.97,
    "dir": 1,
    "out": 1.5
  },
  {
    "lo": 0.725,
    "hi": 0.97,
    "dir": -1,
    "out": 1.5
  },
  {
    "lo": 0.97,
    "hi": 0.725,
    "dir": 0,
    "out": 1.5
  },
  {
    "lo": 0.97,
    "hi": 0.725,
    "dir": 1,
    "out": 1.5
  },
  {
    "lo": 0.97,
    "hi": 0.725,
    "dir": -1,
    "out": 1.5
  }
]) {
  assert.equal(transitSeconds(lo, hi, dir), out,
    `[route fixture] transitSeconds(${lo}, ${hi}, ${dir}) drifted`);
}
for (const { lo, hi, dir, out } of [
  {
    "lo": 0,
    "hi": 0.26,
    "dir": 0,
    "out": 0.35
  },
  {
    "lo": 0,
    "hi": 0.26,
    "dir": 1,
    "out": 0.35
  },
  {
    "lo": 0.26,
    "hi": 0,
    "dir": 0,
    "out": 0.35
  },
  {
    "lo": 0.26,
    "hi": 0,
    "dir": 1,
    "out": 0.35
  },
  {
    "lo": 0.26,
    "hi": 0.523,
    "dir": 0,
    "out": 0.35
  },
  {
    "lo": 0.26,
    "hi": 0.523,
    "dir": 1,
    "out": 0.35
  },
  {
    "lo": 0.523,
    "hi": 0.26,
    "dir": 0,
    "out": 0.35
  },
  {
    "lo": 0.523,
    "hi": 0.26,
    "dir": 1,
    "out": 0.35
  },
  {
    "lo": 0.523,
    "hi": 0.725,
    "dir": 0,
    "out": 0.35
  },
  {
    "lo": 0.523,
    "hi": 0.725,
    "dir": 1,
    "out": 0.35
  },
  {
    "lo": 0.725,
    "hi": 0.523,
    "dir": 0,
    "out": 0.35
  },
  {
    "lo": 0.725,
    "hi": 0.523,
    "dir": 1,
    "out": 0.35
  }
]) {
  assert.equal(forwardBrakeTailSeconds(lo, hi, dir), out,
    `[route fixture] forwardBrakeTailSeconds(${lo}, ${hi}, ${dir}) drifted`);
}
for (const { lo, hi, dir, out } of [
  {
    "lo": 0,
    "hi": 0.26,
    "dir": 0,
    "out": 1.8
  },
  {
    "lo": 0,
    "hi": 0.26,
    "dir": 1,
    "out": 1.8
  },
  {
    "lo": 0.26,
    "hi": 0,
    "dir": 0,
    "out": 1.8
  },
  {
    "lo": 0.26,
    "hi": 0,
    "dir": 1,
    "out": 1.8
  },
  {
    "lo": 0.26,
    "hi": 0.523,
    "dir": 0,
    "out": 0.75
  },
  {
    "lo": 0.26,
    "hi": 0.523,
    "dir": 1,
    "out": 0.75
  },
  {
    "lo": 0.523,
    "hi": 0.26,
    "dir": 0,
    "out": 0.75
  },
  {
    "lo": 0.523,
    "hi": 0.26,
    "dir": 1,
    "out": 0.75
  },
  {
    "lo": 0.523,
    "hi": 0.725,
    "dir": 0,
    "out": 1.35
  },
  {
    "lo": 0.523,
    "hi": 0.725,
    "dir": 1,
    "out": 1.35
  },
  {
    "lo": 0.725,
    "hi": 0.523,
    "dir": 0,
    "out": 1.35
  },
  {
    "lo": 0.725,
    "hi": 0.523,
    "dir": 1,
    "out": 1.35
  }
]) {
  assert.equal(desktopTransitCapSeconds(lo, hi, dir), out,
    `[route fixture] desktopTransitCapSeconds(${lo}, ${hi}, ${dir}) drifted`);
}
// null-result branches (span not in the table; lo/hi off the rest-stop list)
assert.equal(transitSeconds(0, 0.26, 0), null,
  '[route fixture] transitSeconds null-branch drifted');
assert.equal(forwardBrakeTailSeconds(0.26, 0.523, -1), null,
  '[route fixture] forwardBrakeTailSeconds null-branch drifted');
assert.equal(desktopTransitCapSeconds(0.725, 0.97, 0), null,
  '[route fixture] desktopTransitCapSeconds null-branch drifted');
assert.equal(transitSeconds(0.5, 0.9, 0), null,
  '[route fixture] transitSeconds off-rest-stop lookup drifted');

for (const { p, out } of [
  {
    "p": 0,
    "out": "mission"
  },
  {
    "p": 0.05,
    "out": "mission"
  },
  {
    "p": 0.14,
    "out": "mission"
  },
  {
    "p": 0.2,
    "out": "inspire"
  },
  {
    "p": 0.38,
    "out": "inspire"
  },
  {
    "p": 0.5,
    "out": "connect"
  },
  {
    "p": 0.6,
    "out": "connect"
  },
  {
    "p": 0.7,
    "out": "owned"
  },
  {
    "p": 0.85,
    "out": "owned"
  },
  {
    "p": 0.9,
    "out": "final"
  },
  {
    "p": 1,
    "out": "final"
  }
]) {
  assert.equal(chapterAt(p).id, out, `[route fixture] chapterAt(${p}) drifted`);
}
for (const { p, out } of [
  {
    "p": -0.1,
    "chapterId": "inspire",
    "out": 0
  },
  {
    "p": 0,
    "chapterId": "inspire",
    "out": 0
  },
  {
    "p": 0.05,
    "chapterId": "inspire",
    "out": 0
  },
  {
    "p": 0.1,
    "chapterId": "inspire",
    "out": 0
  },
  {
    "p": 0.2,
    "chapterId": "inspire",
    "out": 0.25
  },
  {
    "p": 0.3,
    "chapterId": "inspire",
    "out": 0.6666666666666666
  },
  {
    "p": 1,
    "chapterId": "inspire",
    "out": 1
  },
  {
    "p": 1.5,
    "chapterId": "inspire",
    "out": 1
  }
]) {
  assert.equal(localProgress(p, CHAPTERS[1]), out, `[route fixture] localProgress(${p}, CHAPTERS[1]) drifted`);
}
for (const { id, start, end, rest } of [
  {
    "id": "mission",
    "start": 0,
    "end": 0.14,
    "rest": 0
  },
  {
    "id": "inspire",
    "start": 0.14,
    "end": 0.38,
    "rest": 0.26
  },
  {
    "id": "connect",
    "start": 0.38,
    "end": 0.6,
    "rest": 0.523
  },
  {
    "id": "owned",
    "start": 0.6,
    "end": 0.85,
    "rest": 0.725
  },
  {
    "id": "final",
    "start": 0.85,
    "end": 1,
    "rest": 0.97
  },
  {
    "id": "nonexistent-chapter",
    "start": 0,
    "end": 0,
    "rest": 0
  }
]) {
  assert.equal(startOf(id), start, `[route fixture] startOf('${id}') drifted`);
  assert.equal(endOf(id), end, `[route fixture] endOf('${id}') drifted`);
  assert.equal(restProgress(id), rest, `[route fixture] restProgress('${id}') drifted`);
}

console.log('route compat fixture: ok');
