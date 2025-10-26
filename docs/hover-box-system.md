# Hover-Box System Documentation

## Overview
The **hover-box system** lets any in-page element (for example, the coloured key-phrases in *16-frames.html*) summon a small floating panel that displays extra media or information when the user

* hovers the mouse cursor (desktop) **or**
* taps once (touch devices).

The panel automatically positions itself so it never bleeds off-screen, features subtle fade / slide animations, and hides itself again when the pointer leaves the trigger or the panel.

---

## Quick Anatomy
1. **Trigger element** – Any element with the attribute `data-hover-box` plus extra `data-*` attributes that describe what to show.
2. **Hover-box container** – The single `<div id="key-phrase-hover-box">` placed near the end of the document.  Its content is re-created on every interaction.
3. **JavaScript controller** – Functions defined in the bottom of *16-frames.html*:
   * `initializeHoverBox()` – one-time setup.
   * `showHoverBox()` – build & reveal the panel.
   * `moveHoverBox()` – follow the cursor (non-static mode).
   * `hideHoverBox()` – fade out & clean up.
4. **CSS** – Styles/animations for `.hover-box-item`, `.info-box-video`, `.frame-number`, etc.

---

## Declaring a Trigger
```html
<span class="key-phrase"
      data-hover-box                    
      data-hover-type="info-box"       
      data-hover-image="assets/16-frames/coachella.gif" 
      data-overlay-text="On stage at Coachella 2024 …">
  stages
</span>
```
Add **one** attribute group per trigger:

| Attribute                | Purpose                                                                        |
|--------------------------|--------------------------------------------------------------------------------|
| `data-hover-type`        | `info-box` • `static-info-box` • `video` • *grid* (omitted ⇒ frame grid)        |
| `data-hover-image`       | Path to a single image / GIF (info-box modes)                                   |
| `data-hover-video`       | Path to a video file (video mode)                                               |
| `data-hover-html`        | Raw HTML string to inject next to the image/video (info-box modes)              |
| `data-image-path`        | Template path for frame grids – e.g. `assets/frames/frame_{{i}}.png`            |
| `data-frames`            | Total frame count for grids                                                     |
| `data-padding`           | Zero-padding for frame numbers (e.g. `3` ⇒ `004`)                               |
| `data-columns`           | Grid columns (defaults to **4**)                                               |
| `data-overlay-text`      | Caption that appears over an image                                             |

`static-info-box` behaves like `info-box` but the panel stays fixed where the cursor entered (useful for links that users might want to click inside the panel).

---

## Life-Cycle in Detail
1. **Initialisation** – `initializeHoverBox()`
   * Selects *all* `[data-hover-box]` elements.
   * For desktop it wires **mouseenter / mouseleave / mousemove**.
   * For touch devices it wires **click** so a single tap opens, outside-tap closes.
   * Adds listeners to the hover-box itself so moving into the panel keeps it open.

2. **On enter → `showHoverBox(event, dataset, el)`**
   1. Cancels pending hide timers.
   2. Determines *static* vs *dynamic* panel (`hoverType` or touch device).
   3. Empties the container then builds content:
      * **Info-box** – optional custom text (`hoverHtml`) + still image/GIF (`hoverImage`).  Uses a *loading spinner* until the asset is ready.  GIFs are pre-loaded via the global `preloadHoverGifs()` list so instant playback is likely.
      * **Video** – muted, looping `<video>` element.  On mobile the first frame is shown and playback starts only after a tap to avoid auto-play restrictions.
      * **Frame grid** – uses `imagePath`, `frames`, `padding`, `columns` to create small tiles each with a labelled `.frame-number`.  Each tile has its own spinner while loading.
   4. Applies `visible` classes after 10 ms so CSS transitions animate.
   5. Positions the box:
      * **Dynamic** → `moveHoverBox()` every `mousemove` (offset + viewport clamping).
      * **Static** → `positionStaticHoverBox(el)` once, centred around the cursor entry point, but adjusted so it never spills outside the viewport.
   6. On touch devices extra listeners (`touchstart` + `scroll`) are registered so tapping elsewhere or scrolling hides the panel.

3. **While hovering → `moveHoverBox(event)`** (dynamic only)
   * Calculates position `x + 15`, `y + 15` but flips to the opposite side if it would overflow right/bottom edges.

4. **On leave → `hideHoverBox()`**
   * The container fades out (`visible` removed) and after 200 ms its innerHTML is cleared (unless the cursor moved into the panel).
   * Resets GIFs by temporarily blanking their `src` so the next hover always starts from the first frame.
   * Detaches mobile outside-tap / scroll listeners.

---

## Pre-loading GIFs
```js
const preloadedGifs = new Map();
function preloadHoverGifs() {
  [
    'assets/16-frames/coachella.gif',
    'assets/16-frames/evolution.gif',
    // …
  ].forEach(path => {
    const img = new Image();
    img.onload  = () => preloadedGifs.set(path, true);
    img.onerror = () => preloadedGifs.set(path, 'error');
    img.src = path;
  });
}
```
`showHoverBox` checks that map: if `true` the GIF is injected directly (no spinner); if `'error'` a fallback text is shown; otherwise it loads on demand with a spinner.

---

## Touch Device Behaviour
* Touch devices can’t rely on *hover*; instead a **single tap** opens the panel in *static* mode.
* Extra listeners close the panel when the user taps elsewhere (`touchstart`) or scrolls.
* Videos are paused by default and show their first frame until the user taps again.

---

## CSS Highlights
* `.hover-box-item`, `.frame-number` – staggered `transition-delay` create the cascading reveal for grids.
* `.info-box-video`, `.info-box-wrapper img` – fade & scale-in on visibility.
* `.key-phrase[data-hover-box]:hover` – dotted underline + subtle background gradient to indicate interactivity.
* `.floating-emoji` / custom animations (`floatUp/floatUpQuickly`) – unrelated to hover-box, but share CSS space.

---

## Extending / Customising
1. **Add new content types** – modify `showHoverBox` switch-logic and add corresponding CSS.
2. **Change animations** – tweak keyframes or the `.visible` class transitions.
3. **Limit panel width/height** – adjust max-width / max-height in `#key-phrase-hover-box` CSS.
4. **Global enable/disable** – wrap `initializeHoverBox()` call in a feature flag.

---

## File Locations
| File                                   | Relevant Sections                                                  |
|----------------------------------------|--------------------------------------------------------------------|
| `16-frames.html`                       | All markup, CSS and JS (search for `initializeHoverBox`)           |
| *(future refactor idea)* `src/js/...`  | Move the JS into a standalone module for reuse across pages        |
| `docs/hover-box-system.md` (this file) | High-level documentation                                           |

---

## Troubleshooting
* **Panel opens but instantly closes** – likely the trigger element is too small; add `pointer-events: auto` or increase padding.
* **Mobile panel won’t close** – ensure outside-tap listener isn’t being stopped by another element with `e.stopPropagation()`.
* **Images jump / re-flow** – specify width/height or max-width in `imagePath` grids so layout is reserved.

---

## Credits
System originally crafted by *POM* for the 16-Frames story page and refined with community feedback. 