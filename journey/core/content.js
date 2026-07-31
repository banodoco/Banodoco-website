// Content model for the Mushroom Anatomy Journey.
// Single source of truth for chapter copy, node copy, contributor profiles,
// and footer links. See CONTRACT.md → "Content model" for the fixed shape
// and node ids. Do not rename export or node ids — chapters and core read
// this object directly.

export const CONTENT = {
  chapters: {
    mission: {
      nav: 'Mission',
      heading: 'We’re working to help the open-source AI art ecosystem thrive.',
      sub: 'Banodoco builds tools, spaces, and shared infrastructure for the open-source AI art ecosystem.',
    },
    equip: {
      nav: 'Equip',
      heading: 'Equip the ecosystem.',
      sub: 'Banodoco builds tools that help the community push open models further — expanding what is possible and what remains open.',
    },
    connect: {
      nav: 'Connect',
      heading: 'Connect the ecosystem.',
      sub: 'Banodoco brings together artists, builders, and shared knowledge to grow a living network for open-source AI art.',
    },
    inspire: {
      nav: 'Inspire',
      heading: 'Inspire and empower.',
      sub: 'Banodoco helps people push open models beyond their expected limits through challenges, compute, and rigorous research, turning breakthrough ideas into a thriving commons.',
    },
    owned: {
      nav: 'Owned',
      heading: 'Owned by the people who build it.',
      sub: '<strong>100% shared.</strong> Granted at 1% per month — split between artists, core engineers, and knowledge creators.',
    },
    final: {
      nav: 'Final',
      heading: 'We’re working to accelerate the second renaissance.',
      sub: 'Banodoco exists to help new tools, communities, and ideas spread — so one thriving ecosystem becomes many.',
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
          'Arnold is Banodoco’s planning layer — the tool that turns an idea into graphical structure: the steps, dependencies, and decisions a creative process actually needs.',
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
          'Astrid is Banodoco’s creative-exploration engine — built to push open image and video models toward their actual artistic limits, not just their default settings.',
          'It’s where artists go to explore the edges of what a model can do: chaining techniques together, experimenting with motion and time, and finding results a single prompt would never surface on its own.',
          'Like Arnold, Astrid runs on PYPE’s shared infrastructure, so every exploration benefits from the same underlying pipeline.',
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

    community: {
      label: 'Community',
      short: 'The connected commons.',
      card: {
        title: 'Community',
        body: [
          'Community is the connected commons underneath everything else — the shared space where artists, builders, and curious newcomers overlap, exchange work, and keep each other going.',
          'It’s not one channel or one event; it’s the lattice of smaller groups and conversations that, together, hold the ecosystem up.',
        ],
      },
    },
    ados: {
      label: 'ADOS',
      short: 'Where online becomes in-person.',
      card: {
        title: 'ADOS',
        body: [
          'ADOS is where the network converges. It’s the point where online relationships — the threads, the DMs, the shared projects — become real, in-person collaboration.',
          'A few days together turns a community into a community that has actually met, and that changes what people build next.',
        ],
      },
    },
    hivemind: {
      label: 'Hivemind',
      short: 'Persistent shared memory.',
      card: {
        title: 'Hivemind',
        body: [
          'Hivemind is Banodoco’s persistent shared memory — the record that keeps a discovery useful long after the conversation that produced it has moved on.',
          'Techniques, workflows, and hard-won answers get captured once and stay searchable, so the community doesn’t have to keep rediscovering the same things.',
        ],
      },
    },

    arca: {
      label: 'Arca Gidan Prize',
      short: 'A competition pushing open-source AI art further.',
      spotlight: {
        title: 'Arca Gidan Prize',
        body: [
          'The Arca Gidan Prize is a competition built to push open-source AI art further — rewarding work that stretches what open models and open tools can do.',
          'It gives ambitious artists a reason to take real creative risks with open technology, and gives the resulting work a stage.',
        ],
        link: { label: 'Learn more', href: 'https://banodoco.ai' },
      },
    },
    artcompute: {
      label: 'ArtCompute',
      short: 'Practical compute for ambitious creators.',
      spotlight: {
        title: 'ArtCompute',
        body: [
          'ArtCompute exists to solve a practical problem: ambitious creative work needs compute, and compute is expensive. ArtCompute gives artists real access to it.',
          'It’s infrastructure in service of art — the resource that turns an idea worth pursuing into one that’s actually possible to finish.',
        ],
        link: { label: 'Learn more', href: 'https://banodoco.ai' },
      },
    },
    tworp: {
      label: '2RP',
      short: 'Rigorous research in AI art.',
      spotlight: {
        title: '2RP',
        body: [
          '2RP is Banodoco’s publication for rigorous research in AI art — writing that treats the field with the same seriousness as the work it studies.',
          'It exists to move the conversation past hype, documenting what’s actually being discovered at the edge of open models and open practice.',
        ],
        link: { label: 'Read the publication', href: 'https://banodoco.ai/2rp' },
      },
    },

    'pod-shared': {
      label: '100% shared',
      short: 'The dominant principle.',
      card: {
        title: '100% shared',
        body: [
          'Ownership of Banodoco is entirely shared with the people who build it. Not a majority stake, not an option pool on the side — 100%, held by the community that makes the ecosystem what it is.',
          'This is the dominant principle behind everything else in this layer: the organism belongs to the people growing it.',
        ],
      },
    },
    'pod-monthly': {
      label: 'Granted 1% per month',
      short: 'Gradual distribution over time.',
      card: {
        title: 'Granted 1% per month',
        body: [
          'Ownership isn’t handed out all at once. It’s granted gradually — 1% per month — so that stewardship builds up alongside real, sustained contribution over time.',
          'Gradual distribution keeps ownership tied to the people actually showing up, month after month.',
        ],
      },
    },
    'pod-split': {
      label: 'Split between groups',
      short: 'Artists, core engineers, knowledge creators.',
      card: {
        title: 'Split between groups',
        body: [
          'Shared ownership is split between the different kinds of people who make the ecosystem work: artists, core engineers, and knowledge creators.',
          'Each group contributes differently — creative work, technical infrastructure, documented knowledge — and each is recognized as an owner because of it.',
        ],
      },
    },
  },

  contributors: [
    {
      id: 'person-0',
      name: 'A motion artist',
      role: 'Artist',
      blurb: 'This node stands in for a motion artist. A real profile — name, work, and story — appears here only with the contributor’s explicit consent.',
      consent: false,
      seed: 3,
    },
    {
      id: 'person-1',
      name: 'A generative painter',
      role: 'Artist',
      blurb: 'A placeholder for a generative painter. Real profiles are published only with explicit consent.',
      consent: false,
      seed: 11,
    },
    {
      id: 'person-2',
      name: 'A sound-reactive visual artist',
      role: 'Artist',
      blurb: 'This node represents a contributor working at the intersection of sound and image. The profile appears once consent is confirmed.',
      consent: false,
      seed: 19,
    },
    {
      id: 'person-3',
      name: 'A live-performance artist',
      role: 'Artist',
      blurb: 'A stand-in for an artist bringing open AI tools into live performance. Real details appear only with consent.',
      consent: false,
      seed: 27,
    },
    {
      id: 'person-4',
      name: 'A collage and compositing artist',
      role: 'Artist',
      blurb: 'This node holds space for a collage and compositing artist. Name, photo, and story require explicit consent to publish.',
      consent: false,
      seed: 35,
    },
    {
      id: 'person-5',
      name: 'A pipeline engineer',
      role: 'Core Engineer',
      blurb: 'A placeholder for a pipeline engineer. A real profile appears here once the contributor consents.',
      consent: false,
      seed: 8,
    },
    {
      id: 'person-6',
      name: 'A rendering engineer',
      role: 'Core Engineer',
      blurb: 'This node stands in for a rendering engineer. Real profiles are published only with explicit consent.',
      consent: false,
      seed: 16,
    },
    {
      id: 'person-7',
      name: 'A tools and infrastructure engineer',
      role: 'Core Engineer',
      blurb: 'A stand-in for an engineer who builds shared infrastructure. Profile pending the contributor’s consent.',
      consent: false,
      seed: 24,
    },
    {
      id: 'person-8',
      name: 'A model-integration engineer',
      role: 'Core Engineer',
      blurb: 'This node represents a contributor who connects new open models into the ecosystem’s tools. Profile appears with consent.',
      consent: false,
      seed: 32,
    },
    {
      id: 'person-9',
      name: 'A community moderator',
      role: 'Knowledge Creator',
      blurb: 'A placeholder for a community moderator. A real profile appears here once consent is confirmed.',
      consent: false,
      seed: 5,
    },
    {
      id: 'person-10',
      name: 'A documentation writer',
      role: 'Knowledge Creator',
      blurb: 'This node stands in for a writer who turns hard-won knowledge into documentation others can actually use. Profile pending consent.',
      consent: false,
      seed: 13,
    },
    {
      id: 'person-11',
      name: 'A workflow researcher',
      role: 'Knowledge Creator',
      blurb: 'A stand-in for a contributor who tests, documents, and shares workflows. Real details appear only with consent.',
      consent: false,
      seed: 21,
    },
    {
      id: 'person-12',
      name: 'A tutorial creator',
      role: 'Knowledge Creator',
      blurb: 'This node holds space for someone who teaches the ecosystem’s tools through tutorials. Profile appears once they’ve consented.',
      consent: false,
      seed: 29,
    },
    {
      id: 'person-13',
      name: 'A dataset and archive curator',
      role: 'Knowledge Creator',
      blurb: 'A placeholder for a curator of the datasets, references, and archives the community draws on. Profile pending consent.',
      consent: false,
      seed: 37,
    },
  ],

  footer: {
    links: [
      { label: 'GitHub', href: 'https://github.com/banodoco' },
      { label: '2RP — Publication', href: 'https://banodoco.ai/2rp' },
      { label: 'About Banodoco', href: 'https://banodoco.ai' },
      { label: 'Contact', href: 'mailto:hello@banodoco.ai' },
    ],
    social: [
      { label: 'Discord', href: 'https://discord.gg/eKQm3uHKx2' },
      { label: 'GitHub', href: 'https://github.com/banodoco' },
    ],
    legal: '© 2026 Banodoco. Ownership: 100% shared, granted at 1% per month, split between artists, core engineers, and knowledge creators.',
  },
};
