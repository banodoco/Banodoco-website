// Version E, slide 2: "scattered across thousands of repos and threads" as a
// field you can feel, quietly: it should reward noticing, not demand it.
// We fly slowly forward through an endless field of models, LoRAs, repos,
// workflows, threads and guides: each appears faint at the vanishing point,
// grows as it nears, slides past the edges and comes round again far ahead.
// Whatever approaches nearest the middle carries its name. The mouse steers a
// little (near things shift more than far ones) and scrolling flies you through
// it, forward or back, as far as you like; hovering a dot shows what it is,
// clicking pulls it forward. Project and model names are real; files,
// LoRAs and threads are illustrative. Arriving from slide 1, its films come
// apart into motes of their own colours that fly at us and become the field.
(() => {
  const root = document.querySelector('[data-scatter-field]');
  if (!root) return;
  const slide = root.closest('.slide');
  const stage = root.querySelector('.sf-stage');
  const canvas = root.querySelector('.sf-dust');
  const legend = root.querySelector('.sf-legend');
  const card = root.querySelector('.sf-card');
  const labels = [...root.querySelectorAll('.sf-whisper')];
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // share = each kind's slice of the long-tail dust.
  const TYPES = {
    model: { label: 'Models', color: '#e0ab5e', share: 0.07 },
    lora: { label: 'LoRAs', color: '#c89fb5', share: 0.33 },
    repo: { label: 'Repos & nodes', color: '#9fc8a6', share: 0.18 },
    workflow: { label: 'Workflows', color: '#9fb5c8', share: 0.18 },
    thread: { label: 'Threads', color: '#c7b9ed', share: 0.17 },
    guide: { label: 'Guides & papers', color: '#d9b98f', share: 0.07 },
  };

  // [kind, where it lives, name, what you find when you open it]
  const ITEMS = [
    ['model', 'huggingface.co', 'Wan-AI/Wan2.1-I2V-14B-720P', 'Image-to-video, 14B. Wants 24GB+, or an fp8 build.'],
    ['model', 'huggingface.co', 'Wan-AI/Wan2.2-T2V-A14B', 'Two experts, high-noise and low-noise. Load both.'],
    ['model', 'huggingface.co', 'Lightricks/LTX-Video', 'Fast video model. Which version does that workflow need?'],
    ['model', 'huggingface.co', 'tencent/HunyuanVideo', '13B video model. bf16, fp8 or GGUF?'],
    ['model', 'huggingface.co', 'genmo/mochi-1-preview', '10B video model. Runs, eventually.'],
    ['model', 'huggingface.co', 'THUDM/CogVideoX-5b', 'Video model with its own LoRA format.'],
    ['model', 'huggingface.co', 'black-forest-labs/FLUX.1-dev', 'Image model. Read the licence first.'],
    ['model', 'huggingface.co', 'black-forest-labs/FLUX.1-Kontext-dev', 'Edit images by instruction.'],
    ['model', 'huggingface.co', 'stabilityai/stable-diffusion-xl-base-1.0', 'The base thousands of LoRAs were trained on.'],
    ['model', 'huggingface.co', 'stabilityai/stable-video-diffusion-img2vid-xt', 'Image-to-video, 25 frames.'],
    ['model', 'huggingface.co', 'Qwen/Qwen-Image-Edit', 'Image editing, 20B.'],
    ['model', 'huggingface.co', 'lllyasviel/ControlNet-v1-1', 'Pose, depth, edges. Pick the right preprocessor.'],
    ['model', 'huggingface.co', 'h94/IP-Adapter', 'Style from a reference image. Which checkpoint matches your base?'],
    ['model', 'huggingface.co', 'guoyww/animatediff', 'Motion modules: v2, v3, or the LCM one?'],
    ['model', 'huggingface.co', 'depth-anything/Depth-Anything-V2-Large', 'Depth maps to drive ControlNet.'],
    ['model', 'huggingface.co', 'facebook/sam2-hiera-large', 'Segmentation: masks for inpainting.'],

    ['lora', 'civitai.com', '16mm film grain', 'Wan 14B. Strength 0.6–0.8, trigger word "16mm".'],
    ['lora', 'civitai.com', 'VHS tape artefacts', 'LTX. Works best at half strength.'],
    ['lora', 'civitai.com', 'claymation style', 'Hunyuan. Trained on forty clips.'],
    ['lora', 'huggingface.co', 'ink-wash animation', 'Wan 1.3B. Only on the creator’s page.'],
    ['lora', 'civitai.com', 'orbit camera move', 'Motion LoRA for image-to-video.'],
    ['lora', 'civitai.com', 'dolly zoom', 'Motion LoRA, AnimateDiff v3.'],
    ['lora', 'civitai.com', 'anamorphic lens flare', 'FLUX. Trigger word is in the comments.'],
    ['lora', 'civitai.com', 'Kodachrome 64', 'SDXL. v2 fixed the skin tones.'],
    ['lora', 'civitai.com', 'pixel-art sprite sheet', 'FLUX. Pair with the 4-step LoRA.'],
    ['lora', 'huggingface.co', '4-step distill', 'Speed LoRA. Stack it last.'],
    ['lora', 'civitai.com', 'consistent character v3', 'v2 had the hands.'],
    ['lora', 'civitai.com', 'watercolour bloom', 'SDXL. Pairs with the paper texture one.'],
    ['lora', 'civitai.com', 'rotoscope linework', 'Wan 14B, image-to-video.'],
    ['lora', 'huggingface.co', 'risograph print', 'FLUX. Two-colour presets in the README.'],

    ['repo', 'github.com', 'comfyanonymous/ComfyUI', 'The node graph most of this runs in.'],
    ['repo', 'github.com', 'kijai/ComfyUI-WanVideoWrapper', 'Wan nodes. Updates most days.'],
    ['repo', 'github.com', 'kijai/ComfyUI-KJNodes', 'Utility nodes everyone ends up needing.'],
    ['repo', 'github.com', 'Kosinkadink/ComfyUI-VideoHelperSuite', 'Load and save video frames.'],
    ['repo', 'github.com', 'Kosinkadink/ComfyUI-AnimateDiff-Evolved', 'AnimateDiff with context windows.'],
    ['repo', 'github.com', 'Fannovel16/ComfyUI-Frame-Interpolation', 'RIFE and FILM: 24 → 60fps.'],
    ['repo', 'github.com', 'cubiq/ComfyUI_IPAdapter_plus', 'IP-Adapter nodes.'],
    ['repo', 'github.com', 'ltdrdata/ComfyUI-Manager', 'Installs the missing nodes. Usually.'],
    ['repo', 'github.com', 'ltdrdata/ComfyUI-Impact-Pack', 'Detailers and detectors.'],
    ['repo', 'github.com', 'rgthree/rgthree-comfy', 'Quality-of-life nodes.'],
    ['repo', 'github.com', 'kohya-ss/sd-scripts', 'LoRA training. Many, many flags.'],
    ['repo', 'github.com', 'ostris/ai-toolkit', 'LoRA training for FLUX and video.'],
    ['repo', 'github.com', 'tdrussell/diffusion-pipe', 'Video LoRA training.'],
    ['repo', 'github.com', 'lllyasviel/FramePack', 'Long video on smaller GPUs.'],
    ['repo', 'github.com', 'banodoco/Steerable-Motion', 'Steer video with batches of images.'],
    ['repo', 'github.com', 'huggingface/diffusers', 'The Python library underneath.'],
    ['repo', 'github.com', 'xinntao/Real-ESRGAN', 'Upscaling.'],
    ['repo', 'github.com', 'AUTOMATIC1111/stable-diffusion-webui', 'Where a lot of people started.'],

    ['workflow', 'shared in #showcase', 'workflow_final_v7_FIXED.json', 'Needs fourteen custom nodes. Three are missing.'],
    ['workflow', 'shared in a thread', 'wan_i2v_720p_upscale.json', 'Rebuilt from a screenshot.'],
    ['workflow', 'shared in #flux', 'flux_kontext_restyle (2).json', 'The (1) didn’t work.'],
    ['workflow', 'shared in #animatediff', 'animatediff_lcm_loop.json', 'Set context to 16. Don’t ask why.'],
    ['workflow', 'shared in #ltx', 'ltx_long_video_chunked.json', 'Stitches chunks. Watch the seams.'],
    ['workflow', 'shared in #help', 'vace_inpaint_v3_WORKING.json', 'Working, on one machine.'],
    ['workflow', 'github.com', 'steerable_motion_batch.json', 'Keyframes in, video out.'],
    ['workflow', 'shared in #hunyuan', 'hunyuan_lora_test_DONT_USE.json', 'Someone used it.'],
    ['workflow', 'shared in a DM', 'depth_controlnet_dolly.json', 'A camera move from a depth map.'],
    ['workflow', 'shared in #showcase', 'upscale_then_interp_60fps.json', 'Four hours on a 3090.'],
    ['workflow', 'a Google Drive link', 'my_settings_dont_touch.json', 'Nobody remembers why.'],
    ['workflow', 'shared in #resources', 'ipadapter_style_transfer_v12.json', 'v1 to v11 are in a thread somewhere.'],

    ['thread', 'Discord · #wan-video', 'anyone got the new lora working w/ 14B?', '“Use the fp8 branch, set shift to 5, see pinned.”'],
    ['thread', 'Discord · #comfyui', 'which pinned 😭', 'Forty pinned messages.'],
    ['thread', 'Discord · #ltx', 'OOM at 97 frames on 24GB?', '“Lower the tile size.” “Which one?”'],
    ['thread', 'Reddit · r/StableDiffusion', 'consistent characters, finally (workflow inside)', 'The workflow link is dead.'],
    ['thread', 'Discord · #training', 'rank 32 or 64 for a style LoRA?', 'Dozens of replies, no consensus.'],
    ['thread', 'Discord · #help', 'ERROR: torch 2.4 required…', '“Fresh venv, reinstall everything.”'],
    ['thread', 'Discord · #resources', 'updated my node pack: breaking changes', 'Old workflows now open red.'],
    ['thread', 'Discord · #showcase', 'made this with 3 LoRAs + an upscale', '“Which three?” No reply.'],
    ['thread', 'Discord · #flux', 'Kontext keeps shifting my colours', 'Three fixes, all different.'],
    ['thread', 'Discord · #hunyuan', 'fp8 vs GGUF, side by side', 'The comparison images expired.'],
    ['thread', 'Discord · #help', 'it worked yesterday', 'A node updated overnight.'],

    ['guide', 'youtube.com', 'Install Wan 2.2 in ComfyUI, step by step', 'Forty minutes long. Already out of date.'],
    ['guide', 'youtube.com', 'The custom nodes you actually need', 'Half of them were renamed.'],
    ['guide', 'arxiv.org', 'LoRA: Low-Rank Adaptation of Large Language Models', 'The idea behind every LoRA here.'],
    ['guide', 'arxiv.org', 'Adding Conditional Control to Text-to-Image Diffusion Models', 'The ControlNet paper.'],
    ['guide', 'arxiv.org', 'Wan: Open and Advanced Large-Scale Video Generative Models', 'The Wan technical report.'],
    ['guide', 'rentry.org', 'the unofficial VACE guide', 'Maintained by one person, in their spare time.'],
    ['guide', 'docs.google.com', 'LoRA training notes', 'Comment access only.'],
    ['guide', 'github.com wiki', 'Troubleshooting: CUDA out of memory', 'Eleven suggestions. Try them in order.'],
  ];

  // Seeded, so the field has the same shape on every visit.
  let seed = 20261015;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;

  // World units: the camera looks down +z; a body at depth z and offset (x, y)
  // lands x / z focal lengths from the vanishing point.
  const NEAR = 0.32, FAR = 7, SPREAD = 1.8;
  const scatter = (o, z) => {
    const r = SPREAD * Math.sqrt(rnd()) + 0.08, a = rnd() * Math.PI * 2;
    o.x = r * Math.cos(a); o.y = r * Math.sin(a) * 0.8; o.z = z;
    return o;
  };

  const kinds = Object.keys(TYPES);
  const named = ITEMS.map(([type, where, name, detail]) =>
    scatter({ type, where, name, detail, sx: 0, sy: 0, p: 1, a: 0, vis: false, score: 0, rest: 0, rad: 3 },
      NEAR + rnd() * (FAR - NEAR)));
  const dust = kinds.flatMap((type) =>
    Array.from({ length: Math.round(2400 * TYPES[type].share) }, () => scatter({ type }, NEAR + rnd() * (FAR - NEAR))));
  const SIZE = { model: 1.5, repo: 1.15, guide: 1.1 }; // bigger bodies for the bigger things

  const keys = kinds.map((type) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sf-key';
    b.dataset.type = type;
    b.style.setProperty('--c', TYPES[type].color);
    b.textContent = TYPES[type].label;
    legend.appendChild(b);
    return b;
  });
  const more = document.createElement('span');
  more.className = 'sf-more';
  more.textContent = 'and thousands more';
  legend.appendChild(more);

  const fill = (el, item, withDetail) => {
    el.style.setProperty('--c', TYPES[item.type].color);
    el.querySelector('.sf-where').textContent = item.where;
    el.querySelector('.sf-name').textContent = item.name;
    if (withDetail) el.querySelector('.sf-detail').textContent = item.detail;
  };
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

  let w = 0, h = 0, dpr = 1, F = 1, cx = 0, cy = 0;
  let speed = 1, boost = 0, glide = 0, since = 9, roll = 0, camX = 0, camY = 0, steerX = 0, steerY = 0, leadX = 0, leadY = 0, settled = 1;
  // Arriving from slide 1 the vanishing point starts at the collage, holds, then glides home.
  let shift = { x: 0, y: 0, age: 9 };
  let pointer = null, touched = false, hot = null, front = null, f = 0, shown = null, keyHover = null, keyLock = null, lastLit;
  let featured = null, held = 0, live = 0, clock = 0, running = false, last = 0, frameRaf = 0;
  const tags = labels.map((el) => ({ el, item: null }));

  // Names and cards live in the lower screen: below the headline (floor) and
  // above the legend (ceil), never behind either.
  const text = slide.querySelector('.split > :first-child');
  let floor = 0, ceil = 0;
  const measure = () => {
    const s = stage.getBoundingClientRect(), t = text && text.getBoundingClientRect(), l = legend.getBoundingClientRect();
    floor = Math.max(h * 0.48, t && t.height ? t.bottom - s.top + h * 0.06 : h * 0.5);
    ceil = l.height ? l.top - s.top - 10 : h - 40;
  };
  const resize = () => {
    const nextW = stage.clientWidth, nextH = stage.clientHeight;
    const nextDpr = Math.min(2, devicePixelRatio || 1);
    const pixelW = Math.round(nextW * nextDpr), pixelH = Math.round(nextH * nextDpr);
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW; canvas.height = pixelH;
    }
    w = nextW; h = nextH; dpr = nextDpr;
    measure();
  };
  if (text) new ResizeObserver(measure).observe(text); // fonts landing reflow the headline
  window.deckOnResize(() => {
    if (!slide.classList.contains('on')) return;
    const oldW = w, oldH = h;
    resize();
    if (oldW && oldH) {
      const sx = w / oldW, sy = h / oldH;
      shift.x *= sx; shift.y *= sy;
      for (const m of motes) { m.sx0 *= sx; m.sy0 *= sy; m.cw *= sx; m.ch *= sy; }
      if (pointer) { pointer.x *= sx; pointer.y *= sy; }
    }
    if (motes.length) {
      motes = [];
      glide = 0; boost = 0; since = 9; settled = 1;
      shift = { x: 0, y: 0, age: 9 };
      collageSlide?.classList.remove('vc-dissolve');
      slide.classList.remove('sf-arrive');
    }
    aim();
    scheduleFrame();
  });

  // E: the field opens in the right half beside the text. F: below the text, full width.
  const below = () => document.documentElement.dataset.ver === 'f' || w <= 760;
  const aim = () => {
    if (below()) { cx = w / 2; cy = h * 0.68; F = Math.min(w * 0.42, h * 0.62) * 0.75; }
    else { cx = w * 0.7; cy = h * 0.48; F = Math.min(w * 0.5, h) * 0.38; }
    // The glide home is one unhurried curve: it sets off with no jolt (zero
    // speed and acceleration), peaks gently about a second in, and fades out
    // over a long tail, so the heading drifts into place rather than turning.
    const g = shift.age * 1.8;
    const k = shift.age < 0 ? 1 : (1 + g + g * g / 2) * Math.exp(-g);
    cx += shift.x * k; cy += shift.y * k;
    cosR = Math.cos(roll); sinR = Math.sin(roll);
  };

  // Project a body; a is its visibility: it fades in out of the distance and
  // out again just before it would touch the lens.
  const P = { x: 0, y: 0, p: 1, a: 0 };
  let cosR = 1, sinR = 0;
  const place = (o) => {
    const x = o.x * cosR - o.y * sinR - camX, y = o.x * sinR + o.y * cosR - camY;
    const p = 1 / o.z;
    P.x = cx + x * p * F; P.y = cy + y * p * F; P.p = p;
    P.a = clamp((FAR - o.z) / 1.8) * clamp((o.z - NEAR) / 0.35);
    return P;
  };
  // Past the camera, or slid well off the edge: round again, far ahead. Flying
  // backwards, whatever recedes past the far plane comes round close behind us.
  const travel = (o, dz) => {
    o.z -= dz;
    if (dz >= 0 && (o.z < NEAR || P.x < -80 || P.x > w + 80 || P.y < -80 || P.y > h + 80)) scatter(o, FAR - rnd() * 0.5);
    else if (o.z > FAR) scatter(o, NEAR + 0.3 + rnd() * 1.2);
  };

  const frame = (now) => {
    frameRaf = 0;
    if (!running) return;
    if (!still) frameRaf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!w || !h) return;
    const ease = (rate) => 1 - Math.exp(-rate * dt);

    const wantSpeed = still ? 0 : front ? 0.08 : hot ? 0.04 : 1;
    speed += (wantSpeed - speed) * ease(2.5);
    boost *= Math.exp(-2.2 * dt); // scroll momentum settles back to the drift
    // The arrival rush: the burst past slide 1's films is quick, then it eases
    // off more slowly, so slowing down and the heading's glide home settle together.
    since += dt;
    glide *= Math.exp(-(2.2 - 1.25 * (t => t * t * (3 - 2 * t))(clamp((since - 0.6) / 0.8))) * dt);
    const dz = dt * 0.36 * (speed + boost + glide);
    clock += dt; held += dt; shift.age += dt;
    roll += dt * 0.025 * speed;
    // Steering stays where the mouse left it; no snap back to centre. It eases
    // in two stages (no lurch when the mouse first moves), and just after an
    // arrival it wakes gradually, so the flight settles before the hand steers.
    settled = Math.min(1, settled + dt / 2.5);
    if (pointer) { steerX = (pointer.x / w - 0.5) * 0.9; steerY = (pointer.y / h - 0.5) * 0.6; }
    const sr = 3.2 * settled * settled * (3 - 2 * settled);
    leadX += (steerX - leadX) * ease(sr); camX += (leadX - camX) * ease(sr);
    leadY += (steerY - leadY) * ease(sr); camY += (leadY - camY) * ease(sr);
    // Labels and hovering stay in the lower screen, clear of the headline.
    const low = below();
    const clear = (n) => (low ? n.sy > floor + 6 : n.sx > w * 0.5);
    aim();
    const grain = Math.sqrt(F / 240);

    for (const n of named) {
      let q = place(n);
      travel(n, dz);
      q = place(n);
      n.sx = q.x; n.sy = q.y; n.p = q.p; n.a = q.a; n.vis = q.a > 0.05;
    }
    // Hover: the dot under the pointer, nearer bodies winning ties. Not while
    // still arriving: a pointer resting where it clicked shouldn't brake the flight.
    hot = null;
    if (pointer && settled > 0.7) {
      let best = Infinity;
      for (const n of named) {
        if (!n.vis || !clear(n)) continue;
        const reach = 10 + n.rad;
        const dd = (n.sx - pointer.x) ** 2 + (n.sy - pointer.y) ** 2;
        if (dd < reach * reach && dd - n.p * 60 < best) { best = dd - n.p * 60; hot = n; }
      }
    }
    slide.style.cursor = hot ? 'pointer' : '';

    const lit = keyHover || keyLock || (hot && hot.type) || null;
    if (lit !== lastLit) {
      keys.forEach((k) => k.classList.toggle('is-lit', k.dataset.type === lit));
      lastLit = lit;
    }
    const calm = front ? 0.45 : 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let paint = null;
    for (const o of dust) {
      place(o);
      travel(o, dz);
      const q = place(o);
      if (q.a <= 0) continue;
      if (o.type !== paint) { paint = o.type; ctx.fillStyle = TYPES[paint].color; ctx.strokeStyle = TYPES[paint].color; }
      const kin = lit ? (o.type === lit ? 1.8 : 0.3) : 1;
      ctx.globalAlpha = clamp((0.09 + 0.6 * clamp(q.p / 1.6)) * q.a * kin * calm);
      const s = clamp(1.7 * q.p, 0.45, 4) * grain;
      // Near motes streak faintly outward: the sense of moving forward.
      const sx = q.x, sy = q.y, streak = Math.min(90, q.p * q.p * Math.abs(speed + boost + glide) * 1.6);
      if (streak > 1.4) {
        const k = streak / Math.hypot(sx - cx, sy - cy || 1);
        ctx.lineWidth = s * 0.7;
        ctx.beginPath(); ctx.moveTo(sx - (sx - cx) * k, sy - (sy - cy) * k); ctx.lineTo(sx, sy); ctx.stroke();
      } else ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
    }
    if (motes.length) {
      const left = [];
      let ink = null;
      for (const m of motes) {
        m.age += dt;
        const go = clamp((m.age - m.delay) / 0.9); // 0: still part of the picture; 1: a star in the field
        if (go > 0) m.z -= dz; // released, it flies with the field
        const q = place(m);
        if (m.z < NEAR || (go >= 1 && (q.x < -60 || q.x > w + 60 || q.y < -60 || q.y > h + 60))) continue;
        const e = go * go * (3 - 2 * go);
        const star = clamp(1.7 * q.p, 0.45, 4) * grain;
        const mw = m.cw + (star - m.cw) * e, mh = m.ch + (star - m.ch) * e;
        const x = m.sx0 + (q.x - m.sx0) * e, y = m.sy0 + (q.y - m.sy0) * e;
        const glow = 1 + ((0.09 + 0.6 * clamp(q.p / 1.6)) - 1) * e;
        const alpha = glow * q.a * clamp((5.6 - m.age) / 2);
        if (alpha <= 0.01) continue;
        ctx.globalAlpha = alpha;
        if (m.color !== ink) { ink = m.color; ctx.fillStyle = ink; }
        ctx.fillRect(x - mw / 2, y - mh / 2, mw, mh);
        left.push(m);
      }
      motes = left;
      ctx.globalAlpha = 1;
    }
    named.sort((a, b) => b.z - a.z);
    ctx.lineWidth = 1;
    for (const n of named) {
      if (!n.vis) continue;
      const kin = lit ? (n.type === lit ? 1.6 : 0.3) : 1;
      n.rad = clamp(4.6 * n.p * (SIZE[n.type] || 1), 0.9, 15) * grain;
      const glow = clamp(n.p / 2.5);
      ctx.fillStyle = TYPES[n.type].color;
      ctx.globalAlpha = (0.05 + 0.1 * glow) * n.a * kin * calm;
      ctx.beginPath(); ctx.arc(n.sx, n.sy, n.rad * 2.6, 0, 7); ctx.fill();
      ctx.globalAlpha = clamp((0.25 + 0.75 * glow) * n.a * kin * calm);
      ctx.beginPath(); ctx.arc(n.sx, n.sy, n.rad, 0, 7); ctx.fill();
      if (n === hot || n === front || (n === featured && live > 0.5)) {
        ctx.globalAlpha = (n === hot || n === front ? 0.9 : 0.5 * live) * n.a;
        ctx.strokeStyle = TYPES[n.type].color;
        ctx.beginPath(); ctx.arc(n.sx, n.sy, n.rad + 5, 0, 7); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // The name belongs to whichever body is approaching nearest the middle.
    // It holds a moment before handing over, so the label never flickers, and
    // gives way after a couple of seconds so the names keep turning over at
    // an even, unhurried beat.
    const tired = held > 2.6;
    let best = null, bestScore = 0;
    for (const n of named) {
      n.score = 0;
      // A name needs room above its dot, under the headline and over the
      // legend; a new one needs a little more, so it can travel before it must go.
      const room = n === featured ? 0 : h * 0.05;
      if (!n.vis || n.a < 0.6 || n.z > 3.2 || !clear(n) || (low ? n.sy - n.rad - 62 - room < floor || n.sy > ceil - room : n.sx < w * 0.53) || (n.rest > clock && n !== featured)) continue;
      const dx = (n.sx - cx) / (F * 0.55), dy = (n.sy - cy) / (F * 0.55);
      n.score = n.p * Math.exp(-(dx * dx + dy * dy));
      if (n.score > bestScore && !(tired && n === featured)) { bestScore = n.score; best = n; }
    }
    const keep = featured && !tired && featured.score > 0.05 && (featured.score > bestScore * 0.5 || held < 1.6);
    if (!keep && best !== featured && (best || held > 1.6)) {
      if (featured) featured.rest = clock + 14; // let others have a turn
      featured = best; held = 0;
      tags.push(tags.shift()); // the old label fades where it is; the new one takes over
      if (featured) fill(tags[0].el, featured, false);
      tags[0].item = featured;
    }
    const quiet = !hot && !front && !motes.length; // no names while the films come apart
    live += ((quiet && featured ? 1 : 0) - live) * ease(3);
    tags.forEach((tag, i) => {
      const it = tag.item;
      tag.el.classList.toggle('is-on', i === 0 && quiet && !!it && it.vis);
      if (!it || !it.vis) return;
      // Centred above its dot, nudged inside the field rather than cut off.
      const half = tag.el.offsetWidth / 2 + 6;
      const lo = low ? half : w * 0.5 + half;
      const x = clamp(it.sx, lo, Math.max(lo, w - half));
      const y = Math.max((low ? floor + 2 : 4) + tag.el.offsetHeight, it.sy - it.rad - 8);
      tag.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${(0.9 + 0.12 * clamp(it.p / 2)).toFixed(3)})`;
    });

    // The card: beside a hovered dot, or drawn to the centre when clicked.
    f += ((front ? 1 : 0) - f) * ease(6);
    const target = front || (f > 0.02 ? shown : hot);
    if (target !== shown) { if (target) fill(card, target, true); shown = target; }
    card.classList.toggle('is-on', !!target);
    card.classList.toggle('is-front', !!front);
    if (target) {
      const e = f * f * (3 - 2 * f);
      const flip = target.sx > (low ? w * 0.6 : w * 0.78);
      const gap = target.rad + 12;
      const bx = target.sx + (flip ? -gap : gap), by = target.sy;
      const x = bx + (cx - bx) * e, scale = 0.92 + 0.2 * e, half = (card.offsetHeight * scale) / 2;
      let y = by + (cy - by) * e;
      if (low) y = Math.max(floor + half, Math.min(y, h - half - 8)); // the card's top never rises behind the text
      const px = (flip ? -100 : 0) + (flip ? 50 : -50) * e;
      card.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${px.toFixed(1)}%, -50%) scale(${scale.toFixed(3)})`;
    }
  };
  const scheduleFrame = () => {
    if (!running || frameRaf) return;
    if (still) last = 0;
    frameRaf = requestAnimationFrame(frame);
  };

  // Slide 1's films come apart: each tile is sampled into a grid of motes in
  // its own colours, placed in the world exactly where the camera sees the
  // tile now, then released (edges first) to fly at us and thin into stars.
  const collage = document.querySelector('[data-collage]');
  const collageSlide = collage && collage.closest('.slide');
  // Start decoding the posters now, so an early flight keeps the tile's colours.
  const posters = new Map();
  for (const v of collage ? collage.querySelectorAll('video[poster]') : []) {
    if (!v.poster || posters.has(v.poster)) continue;
    const poster = new Image();
    poster.src = v.poster;
    posters.set(v.poster, poster);
  }
  const sampler = document.createElement('canvas');
  const sctx = sampler.getContext('2d', { willReadFrequently: true });
  let motes = [];
  const dissolve = () => {
    collageSlide.classList.add('vc-dissolve'); // both slides hold still while they cross
    slide.classList.add('sf-arrive');
    const clear = () => { collageSlide.classList.remove('vc-dissolve'); slide.classList.remove('sf-arrive'); };
    const timer = setTimeout(clear, 900);
    window.deckNav?.signal?.addEventListener('abort', () => { clearTimeout(timer); clear(); }, { once: true });
    resize(); aim();
    const base = stage.getBoundingClientRect();
    // The collage's centre, which the picture bursts outward from.
    const boxes = [...collage.querySelectorAll('.vc-tile')].map((t) => t.getBoundingClientRect()).filter((r) => r.width);
    const mid = boxes.length ? {
      x: (Math.min(...boxes.map((r) => r.left)) + Math.max(...boxes.map((r) => r.right))) / 2 - base.left,
      y: (Math.min(...boxes.map((r) => r.top)) + Math.max(...boxes.map((r) => r.bottom))) / 2 - base.top,
    } : { x: cx, y: cy };
    // We fly into the collage: for a moment the field opens from its centre.
    shift = { x: 0, y: 0, age: 9 };
    aim();
    shift = { x: mid.x - cx, y: mid.y - cy, age: -0.6 };
    aim();
    motes = [];
    for (const tile of collage.querySelectorAll('.vc-tile')) {
      const r = tile.getBoundingClientRect(), v = tile.querySelector('video');
      if (!r.width || !r.height) continue;
      const cols = Math.max(4, Math.round(r.width / 8)), rows = Math.max(4, Math.round(r.height / 8));
      let px = null;
      if (v.readyState >= 2 && v.videoWidth) {
        const [ox, oy] = getComputedStyle(v).objectPosition.split(' ').map((n) => parseFloat(n) / 100);
        const ta = r.width / r.height;
        let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
        if (sw / sh > ta) { sw = sh * ta; sx = (v.videoWidth - sw) * ox; } else { sh = sw / ta; sy = (v.videoHeight - sh) * oy; }
        sampler.width = cols; sampler.height = rows;
        try { sctx.drawImage(v, sx, sy, sw, sh, 0, 0, cols, rows); px = sctx.getImageData(0, 0, cols, rows).data; } catch { px = null; }
      } else {
        const poster = posters.get(v.poster);
        if (poster && poster.complete && poster.naturalWidth) {
          const [ox, oy] = getComputedStyle(v).objectPosition.split(' ').map((n) => parseFloat(n) / 100);
          const ta = r.width / r.height;
          let sw = poster.naturalWidth, sh = poster.naturalHeight, sx = 0, sy = 0;
          if (sw / sh > ta) { sw = sh * ta; sx = (poster.naturalWidth - sw) * ox; } else { sh = sw / ta; sy = (poster.naturalHeight - sh) * oy; }
          sampler.width = cols; sampler.height = rows;
          try { sctx.drawImage(poster, sx, sy, sw, sh, 0, 0, cols, rows); px = sctx.getImageData(0, 0, cols, rows).data; } catch { px = null; }
        }
      }
      const cw = r.width / cols, ch = r.height / rows;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = (j * cols + i) * 4;
          const sx0 = r.left - base.left + (i + 0.5) * cw, sy0 = r.top - base.top + (j + 0.5) * ch;
          // Most motes sit close, so they stream past us; a few sit deep and stay on as stars.
          const z = 1.2 + Math.pow(rnd(), 2) * 3;
          const xr = ((sx0 - cx) / F) * z + camX, yr = ((sy0 - cy) / F) * z + camY;
          motes.push({
            x: xr * cosR + yr * sinR, y: -xr * sinR + yr * cosR, z, sx0, sy0, cw: cw + 0.6, ch: ch + 0.6, age: 0,
            color: px ? `rgb(${px[k] | 7},${px[k + 1] | 7},${px[k + 2] | 7})` : TYPES.model.color, // a little coarse, so colours repeat
            delay: 0.05 + Math.hypot(i / cols - 0.5, j / rows - 0.5) * 0.5 + rnd() * 0.3,
          });
        }
      }
    }
    motes.sort((a, b) => (a.color < b.color ? -1 : a.color > b.color ? 1 : 0)); // draw colour by colour
  };

  // Where the field's dots and some of its dust are on screen right now, for
  // the next slide to pick up (slide 3 in F flies them into its chart).
  root.snapshot = () => {
    const b = stage.getBoundingClientRect();
    const on = (x, y) => x > 0 && x < w && y > 0 && y < h;
    const dots = named.filter((n) => n.vis && n.a > 0.3 && on(n.sx, n.sy))
      .map((n) => ({ x: n.sx + b.left, y: n.sy + b.top, p: n.p, r: n.rad, color: TYPES[n.type].color }));
    const specks = [];
    for (let i = 0; i < 260; i++) {
      const o = dust[Math.floor(rnd() * dust.length)];
      const q = place(o);
      if (q.a > 0.2 && on(q.x, q.y)) specks.push({ x: q.x + b.left, y: q.y + b.top, color: TYPES[o.type].color });
    }
    return { named: dots, dust: specks };
  };

  const start = (arriving) => {
    if (running || !slide.classList.contains('on') || document.hidden || document.getElementById('overview')?.classList.contains('on')) return;
    resize();
    running = true; last = 0;
    if (arriving && !still) { glide = 3.5; boost = 0; since = 0; settled = 0; } // arriving, we fly in past slide 1's collage
    else { glide = 0; boost = 0; since = 9; settled = 1; shift = { x: 0, y: 0, age: 9 }; motes = []; aim(); }
    scheduleFrame();
  };
  const stop = () => { running = false; pointer = null; if (frameRaf) cancelAnimationFrame(frameRaf); frameRaf = 0; };
  const watch = new MutationObserver((records) => {
    if (!slide.classList.contains('on')) { stop(); return; }
    if (running) return;
    const fromCollage = collageSlide && !collageSlide.classList.contains('on') && records.some((r) => r.target === collageSlide);
    if (fromCollage && !still && !window.deckNav?.rest) dissolve();
    start(!window.deckNav?.rest);
  });
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (collageSlide) watch.observe(collageSlide, { attributes: true, attributeFilter: ['class'] });
  const syncMotion = () => {
    if (document.hidden || document.getElementById('overview')?.classList.contains('on')) stop();
    else if (slide.classList.contains('on')) start(false);
  };
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('deck-overview', syncMotion);

  // Mouse and pen steer; on touch a tap is the hover. The field is the slide's
  // backdrop, so it listens on the slide itself.
  const locate = (e) => {
    const r = stage.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  slide.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') { locate(e); if (still) scheduleFrame(); } });
  slide.addEventListener('pointerdown', (e) => { touched = e.pointerType === 'touch'; if (touched) { locate(e); if (still) scheduleFrame(); } });
  slide.addEventListener('pointerleave', () => { pointer = null; if (still) scheduleFrame(); });
  // Scroll to fly: down goes forward, up goes back, with momentum. If the
  // slide itself has to scroll (a short window), scrolling stays scrolling.
  slide.addEventListener('wheel', (e) => {
    if (slide.scrollHeight > slide.clientHeight + 1) return;
    e.preventDefault();
    const lines = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? h : 1;
    boost = clamp(boost + e.deltaY * lines * 0.006, -8, 12);
  }, { passive: false });
  legend.addEventListener('pointerover', (e) => { keyHover = e.target.closest('.sf-key')?.dataset.type || null; if (still) scheduleFrame(); });
  legend.addEventListener('pointerleave', () => { keyHover = null; if (still) scheduleFrame(); });

  // Clicks on a dot, a key or an open card stay here; anywhere else the deck
  // turns the slide as usual.
  slide.addEventListener('click', (e) => {
    const key = e.target.closest('.sf-key');
    if (key) {
      e.stopPropagation();
      keyLock = keyLock === key.dataset.type ? null : key.dataset.type;
      keys.forEach((k) => k.classList.toggle('is-on', k.dataset.type === keyLock));
      if (still) scheduleFrame();
      return;
    }
    let pick = hot;
    if (!pick && touched && pointer) { // a tap lands before the next frame has looked
      let best = 28 * 28;
      for (const n of named) {
        if (!n.vis || (below() ? n.sy < floor + 6 : n.sx < w * 0.5)) continue;
        const dd = (n.sx - pointer.x) ** 2 + (n.sy - pointer.y) ** 2;
        if (dd < best) { best = dd; pick = n; }
      }
    }
    if (!pick && !front) return;
    e.stopPropagation();
    front = pick && pick !== front ? pick : null;
    if (still) scheduleFrame();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && running) front = null; });

  resize();
  start();
})();
