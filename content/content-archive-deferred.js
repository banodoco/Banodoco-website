// DEFERRED PHASE — not imported by the active build.
//
// Per journey-v6-plan/13-content-ops.md and 06-mission-preservation.md
// (MP-4 / decision D6), Equip and its three tools (PYPE, Arnold, Astrid)
// are deferred out of v6's active five-chapter journey (Mission, Inspire,
// Connect, Owned, Final). The "02 EQUIP — coming soon" on-mushroom callout
// stays as a passive tease only — no route, no preload, no scroll space.
//
// This file exists solely to preserve the donor copy for when Equip is
// un-deferred in a future phase. It is copied VERBATIM from
// journey/core/content.js and must not be imported by journey-v6/ code.
// If/when Equip ships, move these entries back into content.js and update
// CONTENT.chapters / CONTENT.nodes accordingly — do not silently diverge
// this archive from what eventually ships.

export const DEFERRED_CONTENT = {
  chapters: {
    equip: {
      nav: 'Equip',
      heading: 'Equip the ecosystem.',
      sub: 'Banodoco builds tools that help the community push open models further — expanding what is possible and what remains open.',
    },
  },

  nodes: {
    pype: {
      label: 'PYPE',
      short: 'The axial infrastructure feeding every tool.',
      drawer: {
        title: 'PYPE',
        body: [
          'PYPE is the connective infrastructure running the length of the organism — the shared plumbing that Arnold and Astrid both draw from, rather than a tool that sits beside them.',
          'It handles the unglamorous, load-bearing work: routing jobs between models, keeping assets and versions in sync, and carrying data across the pipeline so the tools built on top of it can stay focused on their own craft.',
          'Every improvement to PYPE strengthens both Arnold and Astrid at once — built once, in the open, for the whole ecosystem to depend on.',
        ],
        workflows: [
          'Pipeline orchestration across models',
          'Asset and version tracking',
          'Job scheduling and compute routing',
          'Shared state between connected tools',
          'Deployment and environment management',
        ],
        links: [
          { label: 'View GitHub', href: 'https://github.com/banodoco' },
          { label: 'Read docs', href: 'https://banodoco.ai' },
        ],
      },
    },
    arnold: {
      label: 'Arnold',
      short: 'Planning, structure, and model-ready instructions.',
      drawer: {
        title: 'Arnold',
        body: [
          'Every ambitious project starts the same way: an idea, and no map. Arnold draws the map — the steps, dependencies, and decisions a creative process actually needs, laid out as graphical structure.',
          'It breaks ambitious briefs into task graphs and model-ready instructions, so the hard part of a project — figuring out what to do and in what order — doesn’t have to happen from scratch every time.',
          'Built on PYPE’s shared infrastructure, Arnold hands its structured plans straight to the models and tools that execute them.',
        ],
        workflows: [
          'Task decomposition and planning graphs',
          'Structured, model-ready instruction sets',
          'Multi-step creative briefs',
          'Reusable workflow templates',
          'Dependency and sequencing logic',
        ],
        links: [
          { label: 'View GitHub', href: 'https://github.com/banodoco' },
          { label: 'Read docs', href: 'https://banodoco.ai' },
        ],
      },
    },
    astrid: {
      label: 'Astrid',
      short: 'Creative exploration at the edge of open models.',
      drawer: {
        title: 'Astrid',
        body: [
          'Open models have edges nobody has reached yet. Astrid is built for going there — pushing image and video models toward their actual artistic limits, not just their default settings.',
          'It’s where artists go to explore the edges of what a model can do: chaining techniques together, experimenting with motion and time, and finding results a single prompt would never surface on its own.',
        ],
        workflows: [
          'Text-to-image exploration',
          'Image-to-video',
          'Interpolation',
          'Inpainting',
          'Model chaining',
        ],
        links: [
          { label: 'View GitHub', href: 'https://github.com/banodoco' },
          { label: 'Read docs', href: 'https://banodoco.ai' },
        ],
      },
    },
  },
};
