import type { ReactNode } from 'react';
import { HoverReveal } from './HoverReveal';
import { Emphasis } from './Emphasis';

// =============================================================================
// Section Types - Define what kinds of layouts are available
// =============================================================================

type BaseSection = {
  id: string; // For navigation/debugging
};

// Paragraph content can be plain text OR JSX (for inline HoverReveal, etc.)
type ParagraphContent = string | ReactNode;

// Simple text section with optional highlighted paragraph
type ContentSection = BaseSection & {
  layout: 'content';
  heading?: string;
  paragraphs: Array<{
    text: ParagraphContent;
    style?: 'normal' | 'highlight' | 'italic-highlight';
  }>;
};

// Two-column with masonry grid on the right
type MasonrySection = BaseSection & {
  layout: 'masonry';
  paragraphs: Array<{
    text: ParagraphContent;
    style?: 'normal' | 'highlight' | 'italic-highlight';
  }>;
  images: Array<{
    label: string;
    aspect: 'portrait' | 'landscape' | 'wide' | 'tall' | 'square';
    gradient: string; // Tailwind gradient classes
  }>;
};

// Two-column with single image on the right
type ImageSection = BaseSection & {
  layout: 'image';
  paragraphs: Array<{
    text: ParagraphContent;
    style?: 'normal' | 'highlight' | 'italic-highlight';
  }>;
  image: {
    label: string;
    caption?: string;
    aspect: string; // e.g., 'aspect-[4/5]'
    gradient: string;
  };
};

// Two-column with video on the left
type VideoSection = BaseSection & {
  layout: 'video';
  heading?: string;
  paragraphs: Array<{
    text: ParagraphContent;
    style?: 'normal' | 'highlight' | 'italic-highlight';
  }>;
  video: {
    src: string;
    poster: string;
  };
};

// Hero/opening section
type HeroSection = BaseSection & {
  layout: 'hero';
  title: string;
  highlightedText: string;
  subtitle?: string;
};

// Final CTA section
type FinalSection = BaseSection & {
  layout: 'final';
  title: string;
  highlightedText: string;
  ctaText: string;
  ctaLink: string;
};

// Custom section for anything that doesn't fit the patterns
type CustomSection = BaseSection & {
  layout: 'custom';
  render: (sectionNumber: number) => ReactNode;
};

export type Section = 
  | ContentSection 
  | MasonrySection 
  | ImageSection 
  | VideoSection
  | HeroSection 
  | FinalSection
  | CustomSection;

// =============================================================================
// SECTIONS DATA - All content in one place, easy to edit and reorder!
// =============================================================================

export const sections: Section[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // Section 1: Hero
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'hero',
    layout: 'hero',
    title: "You might be able to accelerate the beginning of a",
    highlightedText: "'2nd Renaissance'",
    subtitle: "Agency, creativity, and collective ambition in the age of leverage",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 2: The Era
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'the-era',
    layout: 'content',
    paragraphs: [
      {
        text: (
          <>
            We're clearly entering a historically significant era and an interesting question to consider is <Emphasis type="weight">how this time will be known to future generations.</Emphasis>
          </>
        ),
        style: 'highlight',
      },
      {
        text: (
          <>
            For example, AI will continue to leap forward - will history remember an <Emphasis type="spark">"Age of AI"</Emphasis>? Space travel will also become increasingly accessible - perhaps leading to a <Emphasis type="dream">"New Space Age"</Emphasis>? Similar claims could be made for an <Emphasis type="gradient">"Age of Robotics"</Emphasis> and a number of other domains.
          </>
        ),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 3: Technology as means, not end
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'technology-means',
    layout: 'content',
    paragraphs: [
      {
        // Example of using HoverReveal for interactive underlined text with GIF
        text: <>However, as an individual, these futures may feel out of reach—they're defined by technology itself, driven by <HoverReveal gif="/example-video.mp4" style="dotted">centralised</HoverReveal>, mostly closed organisations.</>,
      },
      {
        text: (
          <>
            Additionally, each domain captures a small slice of the future we have in store - <Emphasis type="weight">would it be a good thing if a world in which humans have such leverage becomes defined by the technology itself?</Emphasis>
          </>
        ),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 4: Imagination and delusion
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'imagination',
    layout: 'content',
    paragraphs: [
      {
        text: (
          <>
            Just as imagination enriched childhood playtime, your life may be similarly enriched by <Emphasis type="chaos">a little delusion</Emphasis>. What if, instead of accepting these possible futures, you chose to <Emphasis type="highlight-rainbow">imagine a different kind of world</Emphasis> - one that wasn't defined by domain-specific technology making the world more advanced, but by <Emphasis type="weight">how humans leveraged this technology across multiple disciplines to make the world more beautiful and meaningful?</Emphasis>
          </>
        ),
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 5: The Renaissance parallel (with masonry grid)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'renaissance-parallel',
    layout: 'masonry',
    paragraphs: [
      {
        text: "A historical era being remembered for its beautiful creations may seem far-fetched, but consider our idea of the Renaissance - this was a time when the printing press, mechanical clock, and telescope were invented and when scientists like Copernicus, Galileo, and Vesalius transformed our understanding of the world.",
      },
      {
        text: "However, when we think of the Renaissance, we don't think of any of that. Instead, we think of art like The Mona Lisa, the Birth of Venus, and the Last Supper and artists like Da Vinci, Michelangelo, and Botticelli.",
        style: 'italic-highlight',
      },
    ],
    images: [
      { label: 'Mona Lisa', aspect: 'portrait', gradient: 'from-amber-900/40 to-stone-800/40' },
      { label: 'Birth of Venus', aspect: 'landscape', gradient: 'from-sky-900/40 to-teal-800/40' },
      { label: 'Last Supper', aspect: 'wide', gradient: 'from-orange-900/40 to-red-900/40' },
      { label: 'David', aspect: 'tall', gradient: 'from-stone-700/40 to-zinc-800/40' },
      { label: 'Sistine Chapel', aspect: 'landscape', gradient: 'from-indigo-900/40 to-purple-900/40' },
      { label: 'School of Athens', aspect: 'landscape', gradient: 'from-emerald-900/40 to-cyan-900/40' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 6: What could a 2nd Renaissance be?
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: '2nd-renaissance-definition',
    layout: 'video',
    heading: 'What could a 2nd Renaissance be?',
    paragraphs: [
      {
        text: "A \"2nd Renaissance\" would carry on in this tradition. Technology will still advance across all of those domains, but our era wouldn't be defined by it. Instead, it would be defined by what humans create with it—specifically, the transcendent art they make that transforms our physical world.",
      },
      {
        text: "In this sense, it would carry on the legacy of the 1st Renaissance - a time when humans fused capitalism, belief, technology and creativity to not only advance our world but also to enrich it spiritually and artistically.",
      },
    ],
    video: {
      src: '/2nd-renaissance/the_creation.mp4',
      poster: '/2nd-renaissance/first_frame.png',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 7: The Tools Are Becoming Accessible
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'tools-becoming-accessible',
    layout: 'content',
    paragraphs: [
      {
        text: "What makes this moment different from any other in history is that the tools are becoming accessible to everyone.",
      },
      {
        text: "The most powerful creative technology ever built is being developed in the open—not locked away in corporations, but shared freely for anyone to use, modify, and build upon. The creative potential of AI is so vast that no single company could ever explore it fully. The real breakthroughs will come from inspired individuals going down rabbit holes that no organisation would fund—sharing what they discover for others to build on.",
      },
      {
        text: "Open source AI is the foundation this would be built on—and it's already here.",
        style: 'italic-highlight',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 8: Artists and Patrons
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'artists-patrons',
    layout: 'content',
    paragraphs: [
      {
        text: "Someone using these tools could spend years developing their craft and taste, working without meaningful recognition while their skills compound with every advancement in the technology. The path exists for anyone willing to walk it.",
      },
      {
        text: "Someone else might become a patron—seeing an artist's work and believing in it enough to fund their ambition. In the first Renaissance, the Medicis and Borgias competed to commission the greatest works of their age. That role exists again, at every scale.",
      },
      {
        text: "And then there are the engineers, the researchers, those building the tools themselves. Every contribution to open source AI expands what's possible for every creator who comes after.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 9: The Dome (with single image)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'the-dome',
    layout: 'image',
    paragraphs: [
      {
        text: "Over the past century, work has shifted from pure survival toward increasingly creative and meaning-driven pursuits. This shift is accelerating. Many people whose jobs are displaced by AI will face a choice: reject the technology that displaced them, or learn to use it to build a creative life that wasn't possible before.",
      },
      {
        text: "Perhaps the remarkable work of early pioneers will inspire many of them to choose the latter. Perhaps we'll increasingly value craftsmanship and beauty in everything, creating endless opportunities for those who develop the taste and skill to provide it.",
      },
      {
        text: "I believe this can happen on a far larger scale than ever before—and if it does, it will define this coming era.",
        style: 'italic-highlight',
      },
    ],
    image: {
      label: "Brunelleschi's Dome",
      caption: "World's largest masonry dome, symbol of Renaissance innovation",
      aspect: 'aspect-[4/5]',
      gradient: 'from-amber-800/30 via-orange-900/40 to-red-900/30',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 10: Where we are now
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'current-reality',
    layout: 'content',
    heading: 'Where we are now',
    paragraphs: [
      {
        text: "The spirit that made the Renaissance what it was is alive today, but it's not what's defining our world.",
      },
      {
        text: "The creative industries feel stratified, with a select few able to realise their most ambitious visions. Even for them, the calculus of short-term capitalism drives most of their creativity and puts a check on their ambition. Our cinema line-ups and new megastructures like the Las Vegas Sphere are demonstrations of this—people aren't driven by legacy or ideology, but by box office sales and quarterly revenue.",
      },
      {
        text: "Closed AI companies receive overwhelmingly more funding than open source-oriented ones. Many investors, overlooking the creative potential of AI, are voting with their money for a closed future.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 11: But imagine (with masonry grid)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'vision-future',
    layout: 'masonry',
    paragraphs: [
      {
        text: "But imagine a futuristic version of Florence, where several more Renaissance-level cathedrals are under construction. An animatronic Colossus that walks through Rhodes harbour each day. Orbital holiday destinations—a Ritz Carlton on the moon.",
        style: 'italic-highlight',
      },
      {
        text: "Imagine hundreds of thousands of artists spending their lives working on projects like these, supported by patrons who've grown to understand the importance of art and compete with one another as the Medicis once did.",
        style: 'italic-highlight',
      },
      {
        text: "Imagine a world so wealthy and plentiful that this doesn't seem garish and ostentatious—but good and natural.",
        style: 'italic-highlight',
      },
    ],
    images: [
      { label: 'New Florence Cathedrals', aspect: 'portrait', gradient: 'from-rose-900/40 to-amber-800/40' },
      { label: 'Animatronic Colossus', aspect: 'tall', gradient: 'from-yellow-900/40 to-amber-900/40' },
      { label: 'Lunar Ritz Carlton', aspect: 'landscape', gradient: 'from-slate-800/40 to-blue-900/40' },
      { label: 'Orbital Destinations', aspect: 'wide', gradient: 'from-violet-900/40 to-indigo-900/40' },
      { label: 'Global Artist Collective', aspect: 'landscape', gradient: 'from-emerald-900/40 to-teal-900/40' },
      { label: 'Modern Medici', aspect: 'landscape', gradient: 'from-fuchsia-900/40 to-pink-900/40' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 12: When would it start?
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'when-start',
    layout: 'content',
    heading: 'When would the 2nd Renaissance start?',
    paragraphs: [
      {
        text: "For an age to become known this way, it would need to be glaringly obvious—especially considering the competition from other ways of framing this era. At the beginning of what's perceived to be a 2nd Renaissance, we would need to see a world that's bubbling with beautiful, ambitious creations.",
      },
      {
        text: "That world doesn't exist yet. But it could. And the question becomes: what would it take to bring it into being?",
        style: 'italic-highlight',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 13: How can I help?
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'how-help',
    layout: 'content',
    heading: 'How can I help accelerate its beginning?',
    paragraphs: [
      {
        text: "I believe the most any individual can do with their life's work is accelerate the advent of such an era by a few days.",
      },
      {
        text: "This might not seem significant, but a few days could be the difference between a Da Vinci being born into a world that's ready for their ambition and talent, versus one where they live a life of wasted potential.",
        style: 'italic-highlight',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 14: Choosing to act
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'choosing-to-act',
    layout: 'content',
    paragraphs: [
      {
        text: "If you're reading this, there's probably a path for you to contribute—though I can't tell you what it is. What I can say is that the paths described earlier in this piece exist: the artist developing their craft, the patron funding ambition, the engineer expanding what's possible.",
      },
      {
        text: "In all cases, the common thread is choosing to act based on a wish for how you want the world to become. Choosing to act based on ideology and beauty. By voting with your actions, you are in a small way contributing to this potential future.",
        style: 'italic-highlight',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 15: The delusion
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'the-delusion',
    layout: 'content',
    paragraphs: [
      {
        text: "And though this idea is at heart a delusion, so was everything in this world at one point. This particular delusion can be an empowering one to believe in - not only might believing in it inspire you to develop skills and create useful and beautiful things, but it'll give you a sense of agency: instead of experiencing a pre-determined future as a spectator, you'll find yourself charged with a responsibility to contribute towards a future you can be part of.",
      },
      {
        text: "I, for example, feel this responsibility and it's driven me to develop the first method for animating diffusion models with images, the leading open source AI art community, and generally dedicate my life towards what I believe will be one tiny piece of this era.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 16: Questions
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'questions',
    layout: 'content',
    paragraphs: [
      {
        text: "I can't tell you how you could contribute. Only you can figure that out. However, if you found this even a little bit compelling, I'd ask you to consider:",
      },
    ],
  },

  // We'll handle the questions list specially or as a custom section
  {
    id: 'questions-list',
    layout: 'custom',
    render: (_sectionNumber) => null, // We'll implement this in the renderer
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 17: Final CTA
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'final-cta',
    layout: 'final',
    title: "Could you maybe - if you choose to really believe in it - dedicate your life to accelerating the beginning of the",
    highlightedText: "2nd Renaissance by just a few days?",
    ctaText: "Learn about our work",
    ctaLink: "/",
  },
];

// =============================================================================
// Questions for section 16 (separated for easy editing)
// =============================================================================
export const reflectionQuestions = [
  "What utopian ecosystem could you contribute towards?",
  "How could you support others who are building a piece?",
  "What role could you play?",
  "What skills could you learn that could make yourself useful to it?",
  "What could you create that inspires or enables others to create with AI?",
  "What might the first steps you take towards figuring this out be?",
];

