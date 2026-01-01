### Project structure (quick reference)

This repo is a **Vite + React + TypeScript** site with a **single snap-scroll homepage** and the ability to add more pages via **React Router**.

### Top-level layout

- **`src/main.tsx`**: React entrypoint.
- **`src/App.tsx`**: Router + route table. Uses lazy loading for non-critical pages.
- **`src/layouts/MainLayout.tsx`**: Shared layout wrapper.
  - For `/`: uses the **scroll container + snap** wrapper and renders the page content + `Footer`.
  - For non-`/`: uses a normal `Header + main + Footer` layout.

### Pages

- **`src/pages/Home.tsx`**: The homepage, composed of "sections" rendered in order.
- **`src/pages/OwnershipPage.tsx`**: Detailed ownership/equity explanation page (lazy loaded).
- **`src/pages/NotFound.tsx`**: 404 page for unknown routes (lazy loaded).

To add a new page:
- Create a new file in `src/pages/` (e.g. `About.tsx`)
- Add a `<Route />` in `src/App.tsx`

### Sections (homepage building blocks)

Homepage content lives in **`src/components/sections/`**. Each section is typically one "screen" (many use `h-screen snap-start`).

#### Section folder convention

All sections use a folder structure:

```
src/components/sections/SomeSection/
├── index.tsx        # exports `SomeSection` (the section component)
├── data.ts          # optional: static data arrays/constants
├── config.ts        # optional: config/constants
├── utils.ts         # optional: pure helper functions
├── useXxx.ts        # optional: hooks (stateful logic, fetching, observers)
└── ChildThing.tsx   # optional: subcomponents
```

Current sections:
- **`Hero/`**: `config.ts`, `useHeroVideo.ts`, `HeroVideo.tsx`, `RewindButton.tsx`, `index.tsx`
- **`Community/`**: `useCommunityTopics.ts`, `MediaGallery.tsx`, `TopicCard.tsx`, `types.ts`, `utils.ts`, `index.tsx`
- **`Reigh/`**: `data.ts`, `useInViewStart.ts`, `useTravelAutoAdvance.ts`, `TravelSelector.tsx`, `index.tsx`
- **`ArcaGidan/`**: `data.ts`, `useVideoPreview.ts`, `VideoPreviewCard.tsx`, `index.tsx`
- **`ADOS/`**: `data.ts`, `types.ts`, `EventContent.tsx`, `EventSelector.tsx`, `Polaroid.tsx`, `useEventsAutoAdvance.ts`, `index.tsx`
- **`Ecosystem/`**: `config.ts`, `eventConfig.ts`, `utils.ts`, `RiverVisualization.tsx`, `TimelineScrubber.tsx`, `index.tsx`
- **`Ownership/`**: `useOwnershipData.ts`, `useProfilePics.ts`, `ProfileImage.tsx`, `config.ts`, `data.ts`, `utils.ts`, `index.tsx`

#### "Barrel import" expectation

Imports throughout the app generally assume:

```ts
import { Ecosystem } from '@/components/sections/Ecosystem';
```

That works because each section folder exports from `index.tsx`.

### Layout components

- **`src/components/layout/Header.tsx`**
- **`src/components/layout/Footer.tsx`**
- **`src/components/layout/Section.tsx`**: Shared section wrapper for snap-scroll behavior.

Note: On `/`, the `Header` is rendered by `MainLayout` **inside the home scroll container** (and is `md:fixed`), so it overlays all snap sections.

### Shared utilities

- **`src/lib/utils.ts`**: shared helpers like `cn(...)`.
- **`src/lib/device.ts`**: device detection utilities (`isIOS()`, `shouldPreloadVideos()`).
- **`src/lib/preloadAssets.ts`**: asset preloading for better perceived performance.
- **`src/lib/supabase.ts`**: Supabase client setup.
- **`src/index.css`**: Tailwind layers + global styles + shared keyframes.

#### Section lifecycle hooks

These hooks provide unified, stable visibility + pause/resume behavior across sections:

- **`src/lib/useSectionVisibility.ts`**: Low-level IntersectionObserver hook with **hysteresis + exit debounce** to prevent flicker during layout shifts. Options: `threshold`, `exitThreshold`, `exitDelayMs`, `rootMargin`.

- **`src/lib/useSectionRuntime.ts`**: Higher-level hook built on `useSectionVisibility`. Returns `{ ref, isActive, hasStarted }` with sensible defaults. Use this in sections that need to pause/resume content.

- **`src/lib/useAutoPauseVideo.ts`**: Video-specific pause/resume hook. Handles common edge cases:
  - `isActive` / `hasStarted` — from section visibility
  - `canResume` — blocking conditions (e.g., `!showLightbox`)
  - `pauseOnly` — for hover-triggered videos (don't auto-resume)
  - `pauseDelayMs` — debounce pause to avoid play/pause thrash on fast scroll
  - `retryDelayMs` / `maxRetries` — retry play attempts for mobile browser flakiness
  - `onPause` / `onBeforeResume` — callbacks for cleanup and “prepare before play” (seek/rate/etc.). Return `false` from `onBeforeResume` to abort.

  Notes:
  - `useAutoPauseVideo` is best for **single-video** or “one video per card” patterns. For more complex flows (multiple videos where only one is active, audio + rewind animations, mixed image/video carousels with timers), keep the section’s bespoke logic or build a dedicated hook for that subsystem.
  - Always remember to attach the returned `ref` from `useSectionRuntime` to the section wrapper (e.g. `<Section ref={ref} />`), otherwise visibility will never become active.

Example usage:
```ts
// Simple case
const { ref, isActive } = useSectionRuntime();
// <Section ref={ref}> ... </Section>
useAutoPauseVideo(videoRef, { isActive });

// With blocking condition + start offset
useAutoPauseVideo(videoRef, {
  isActive,
  canResume: !showLightbox,
  startOffset: 2,
  loopToOffset: true,
});

// Hover-triggered video (only pause on scroll-away)
useAutoPauseVideo(videoRef, { isActive, pauseOnly: true });
```

> Note: If you need shared UI primitives (button, card, etc.), create `src/components/ui/` and add them there.

### Conventions / tips

- **Keep sections focused**: `index.tsx` should orchestrate; move heavy logic into hooks/utilities.
- **Prefer static data in `data.ts`** over embedding large arrays inside the main component file.
- **Avoid nested scroll containers** on the homepage; `/` is intentionally one scroll container for snap behavior.
- **Use `src/lib/device.ts`** for device detection instead of inline checks.
