# Resources Page — Design Brief

## Branch & Repo

- **Repo:** https://github.com/banodoco/Banodoco-website
- **Branch:** `art-picks-section`

Run `npm install && npm run dev` and visit `/resources` to see the current state.

## What exists right now

The `/resources` page has three sections:

1. **Community News** — recent updates
2. **Things People Made** — a filterable grid of LoRAs and workflows shared by the community
3. **Art From The Community** — weekly "top art picks" (new, placeholder data only)

It all works but it looks flat and kind of lifeless. The structure is there — the soul isn't.

## What I want

I want this page to feel like a **premium community magazine**. Something that makes you go "wow, there's a lot going on here" the moment you land on it.

The community behind this is genuinely exciting — people are doing interesting technical work (training LoRAs, building workflows), creating beautiful art with AI video tools, and pushing the boundaries of what's possible. The page should communicate that energy. It should feel **alive**, **legitimate**, and **big** — like you've stumbled into the home of a thriving creative community, not a flat list of resources.

Specifically:

- **Easy to parse.** Someone should be able to glance at the page and immediately understand what's here: community news, tools people made, art highlights. The hierarchy should be obvious.
- **Exciting to browse.** The art picks especially should feel curated and beautiful, not like a grid of grey boxes. Think editorial layout — featured pieces, visual rhythm, breathing room.
- **Feels premium.** Typography, spacing, subtle details. It shouldn't feel like a dashboard or a docs page. It should feel like something you'd want to scroll through.
- **Communicates scale.** There are ~2 years of weekly art picks, a growing library of community-built tools, and active news. The design should hint at that depth without overwhelming.

## Key areas to think through

1. **Overall page composition** — How do the three sections flow together? What's the visual hierarchy? Does it need a hero or can the sections speak for themselves?
2. **Art picks section** — This is the most visual part. Right now it's a featured card + 2x2 grid. How do you make this feel editorial and curated? How do you hint at the archive of 100+ weeks?
3. **Things People Made grid** — Currently a straightforward card grid with filters. How do you make browsing community resources feel interesting rather than utilitarian?
4. **Community News** — Small section at the top. Does it earn its placement? Should it be integrated differently?
5. **Detail pages** — Each week of art picks has its own page with ~10 videos. How should that read?

## Constraints

- Dark theme (dark bg, light text) — this is consistent with the rest of the site
- Responsive — needs to work on mobile through wide desktop
- The data model is flexible — if the design calls for different data (e.g. a pull quote per video, categories, tags), we can add it
- Content is all placeholder right now — design for what it could be, not what's there today
