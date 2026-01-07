import { useRef } from 'react';
import { Section } from '@/components/layout/Section';
import { ArrowDownIcon } from '@/components/ui/icons';

/**
 * Hero section - the landing/above-the-fold section.
 * 
 * Premium design: confident contrast, clean gradient overlay,
 * strong typography, and brand-accent CTA.
 */
export const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);

  const scrollToNextSection = () => {
    const nextSection = sectionRef.current?.nextElementSibling;
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Section 
      ref={sectionRef} 
      id="hero" 
      className="relative"
    >
      {/* Top edge fog - extends across the full width + top right corner accent */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse 120% 50% at 100% 0%,
              rgba(252, 250, 245, 0.5) 0%,
              rgba(252, 250, 245, 0.3) 30%,
              rgba(252, 250, 245, 0.1) 60%,
              transparent 80%
            ),
            linear-gradient(
              to bottom,
              rgba(252, 250, 245, 0.7) 0%,
              rgba(252, 250, 245, 0.4) 8%,
              rgba(252, 250, 245, 0.15) 15%,
              transparent 25%
            )
          `,
        }}
      />
      
      {/* Base overlay - cleaner, tighter gradient for sharper tech-forward feel */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            to right,
            rgba(252, 250, 245, 0.85) 0%,
            rgba(252, 250, 245, 0.75) 20%,
            rgba(252, 250, 245, 0.5) 35%,
            rgba(250, 249, 247, 0.2) 50%,
            transparent 65%
          )`,
          maskImage: 'linear-gradient(to bottom, black 0%, black 70%, rgba(0,0,0,0.7) 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, rgba(0,0,0,0.7) 85%, transparent 100%)',
        }}
      />
      
      {/* Warm accent glow - subtle, refined */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            /* Core warmth - tighter, more defined */
            radial-gradient(
              ellipse 50% 60% at -10% 15%,
              rgba(255, 160, 60, 0.18) 0%,
              rgba(255, 140, 40, 0.08) 50%,
              transparent 75%
            ),
            /* Outer accent - subtle */
            radial-gradient(
              ellipse 90% 90% at -15% 10%,
              rgba(255, 190, 100, 0.1) 0%,
              transparent 60%
            )
          `,
          maskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
        }}
      />
      
      {/* Subtle film grain texture for premium feel */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Hero content */}
      <div className="h-full px-6 md:px-20 lg:px-24 flex items-center relative z-10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col space-y-5 md:space-y-6 max-w-[520px] md:max-w-[580px] lg:max-w-[620px]">
            {/* Headline - confident, near-black, medium weight */}
            <h1 
              className="text-[2.25rem] md:text-5xl lg:text-[3.5rem] font-medium leading-[1.1] tracking-[-0.02em]"
              style={{ color: '#141414' }}
            >
              We're working to help the open source AI art ecosystem thrive
            </h1>

            {/* Subhead - softer gray, readable */}
            <p 
              className="text-base md:text-lg lg:text-xl leading-relaxed max-w-[520px]"
              style={{ color: '#3A3A3A' }}
            >
              Tools, community, resources, and initiatives to support the ecosystem.
            </p>

            {/* CTA */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={scrollToNextSection}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition-all hover:gap-3 hover:shadow-lg hover:scale-[1.02]"
                style={{ 
                  color: '#1a1a1a',
                  background: 'linear-gradient(135deg, rgba(255, 195, 115, 0.9) 0%, rgba(255, 170, 80, 0.85) 100%)',
                  boxShadow: '0 2px 8px rgba(255, 170, 80, 0.3)',
                }}
              >
                Learn more
                <ArrowDownIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};
