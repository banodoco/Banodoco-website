### Project structure (quick reference)

This repo is a **Vite + React + TypeScript** site with a **single snap-scroll homepage** and the ability to add more pages via **React Router**.

### Top-level layout

- **`src/main.tsx`**: React entrypoint.
- **`src/App.tsx`**: Router + route table.
- **`src/layouts/MainLayout.tsx`**: Shared layout wrapper.
  - For `/`: uses the **scroll container + snap** wrapper and renders the page content + `Footer`.
  - For non-`/`: uses a normal `Header + main + Footer` layout.

### Pages

- **`src/pages/Home.tsx`**: The homepage, composed of “sections” rendered in order.

To add a new page:
- Create a new file in `src/pages/` (e.g. `About.tsx`)
- Add a `<Route />` in `src/App.tsx`

### Sections (homepage building blocks)

Homepage content lives in **`src/components/sections/`**. Each section is typically one “screen” (many use `h-screen snap-start`).

#### Section folder convention (preferred)

For non-trivial sections, use a folder:

```
src/components/sections/SomeSection/
├── index.tsx        # exports `SomeSection` (the section component)
├── data.ts          # optional: static data arrays/constants
├── config.ts        # optional: config/constants
├── utils.ts         # optional: pure helper functions
├── useXxx.ts        # optional: hooks (stateful logic, fetching, observers)
└── ChildThing.tsx   # optional: subcomponents
```

Current examples:
- **`Ecosystem/`**: `config.ts`, `utils.ts`, `RiverVisualization.tsx`, `TimelineScrubber.tsx`, `index.tsx`
- **`Community/`**: `useCommunityTopics.ts`, `MediaGallery.tsx`, `TopicCard.tsx`, `types.ts`, `utils.ts`, `index.tsx`
- **`Ownership/`**: `useProfilePics.ts`, `ProfileImage.tsx`, `config.ts`, `utils.ts`, `index.tsx`
- **`Events/`**: `data.ts`, `types.ts`, `EventContent.tsx`, `EventSelector.tsx`, `Polaroid.tsx`, `index.tsx`
- **`ArcaGidan/`**: `data.ts`, `useVideoPreview.ts`, `VideoPreviewCard.tsx`, `index.tsx`
- **`Reigh/`**: `data.ts`, `useInViewStart.ts`, `useTravelAutoAdvance.ts`, `TravelSelector.tsx`, `index.tsx`

#### “Barrel import” expectation

Imports throughout the app generally assume:

```ts
import { Ecosystem } from '@/components/sections/Ecosystem';
```

That works because each section folder exports from `index.tsx`.

### Layout components

- **`src/components/layout/Header.tsx`**
- **`src/components/layout/Footer.tsx`**

Note: On `/`, the `Header` is currently rendered **inside `src/components/sections/Hero.tsx`** so it belongs to the first snap section.

### Shared utilities

- **`src/lib/utils.ts`**: shared helpers like `cn(...)`.
- **`src/index.css`**: Tailwind layers + global styles + shared keyframes (e.g. Reigh animations).

> Note: If you need shared UI primitives (button, card, etc.), create `src/components/ui/` and add them there.

### Data / Supabase

- **`src/lib/supabase.ts`**: Supabase client setup.
- Sections that fetch data should prefer:
  - A **hook** (`useXxx`) for fetching/transforms
  - A **presentational component** for rendering (keeps UI clean)

### Conventions / tips

- **Keep sections focused**: `index.tsx` should orchestrate; move heavy logic into hooks/utilities.
- **Prefer static data in `data.ts`** over embedding large arrays inside the main component file.
- **Avoid nested scroll containers** on the homepage; `/` is intentionally one scroll container for snap behavior.


