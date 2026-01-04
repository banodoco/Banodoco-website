import { useEffect } from 'react';

// =============================================================================
// Emotional Emphasis Styles
// =============================================================================

const emphasisStyles = `
  /* Glow - warm, hopeful, inspiring */
  .emphasis-glow {
    color: rgb(252 211 77);
    text-shadow: 0 0 10px rgb(252 211 77 / 0.5), 0 0 20px rgb(252 211 77 / 0.3);
  }
  
  /* Pulse - attention-grabbing, urgent, alive */
  @keyframes emphasisPulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
  .emphasis-pulse {
    color: rgb(251 113 133);
    animation: emphasisPulse 1.5s ease-in-out infinite;
  }
  
  /* Gradient - mechanical, industrial (orange/amber/red) */
  @keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .emphasis-gradient {
    background: linear-gradient(90deg, rgb(251 146 60), rgb(245 158 11), rgb(239 68 68), rgb(251 146 60));
    background-size: 300% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: gradientShift 8s ease-in-out infinite;
  }
  
  /* Shake - intense, urgent, can't ignore */
  @keyframes gentleShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-1px); }
    75% { transform: translateX(1px); }
  }
  .emphasis-shake {
    color: rgb(248 113 113);
    display: inline-block;
    animation: gentleShake 0.3s ease-in-out infinite;
  }
  
  /* Breathe - alive, organic, contemplative */
  @keyframes breathe {
    0%, 100% { 
      opacity: 0.8;
      letter-spacing: 0em;
    }
    50% { 
      opacity: 1;
      letter-spacing: 0.02em;
    }
  }
  .emphasis-breathe {
    color: rgb(147 197 253);
    animation: breathe 3s ease-in-out infinite;
  }
  
  /* Spark - electric, tech, AI-like (cyan/electric blue) */
  @keyframes sparkle {
    0%, 100% { 
      text-shadow: 0 0 8px rgb(34 211 238 / 0.6);
      color: rgb(34 211 238);
    }
    50% { 
      text-shadow: 0 0 16px rgb(56 189 248 / 0.8);
      color: rgb(125 211 252);
    }
  }
  .emphasis-spark {
    animation: sparkle 6s ease-in-out infinite;
  }
  
  /* Weight - important, strong, definitive */
  .emphasis-weight {
    font-weight: 600;
    color: rgb(255 255 255);
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
  }
  
  /* Whisper - intimate, soft, personal */
  .emphasis-whisper {
    font-size: 0.95em;
    color: rgb(255 255 255 / 0.6);
    font-style: italic;
    letter-spacing: 0.01em;
  }
  
  /* Rise - hopeful, ascending, optimistic */
  @keyframes rise {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
  .emphasis-rise {
    color: rgb(134 239 172);
    display: inline-block;
    animation: rise 2s ease-in-out infinite;
  }
  
  /* Burn - passionate, fierce, determined */
  @keyframes burn {
    0%, 100% { 
      color: rgb(251 146 60);
      text-shadow: 0 0 8px rgb(251 146 60 / 0.5);
    }
    50% { 
      color: rgb(248 113 113);
      text-shadow: 0 0 12px rgb(248 113 113 / 0.6);
    }
  }
  .emphasis-burn {
    animation: burn 1s ease-in-out infinite;
  }
  
  /* Dream - cosmic, space-like (deep purple/indigo with star glow) */
  @keyframes cosmicGlow {
    0%, 100% { 
      text-shadow: 0 0 20px rgb(99 102 241 / 0.5), 0 0 40px rgb(139 92 246 / 0.3);
    }
    50% { 
      text-shadow: 0 0 25px rgb(139 92 246 / 0.6), 0 0 50px rgb(99 102 241 / 0.4);
    }
  }
  .emphasis-dream {
    color: rgb(165 180 252);
    font-style: italic;
    animation: cosmicGlow 4s ease-in-out infinite;
  }
  
  /* Question - thought-provoking, curious */
  @keyframes tilt {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-1deg); }
    75% { transform: rotate(1deg); }
  }
  .emphasis-question {
    color: rgb(147 197 253);
    display: inline-block;
    animation: tilt 2s ease-in-out infinite;
  }
  
  /* Highlight - colored marker highlight */
  .emphasis-highlight {
    background: linear-gradient(120deg, rgb(251 191 36 / 0.4) 0%, rgb(251 191 36 / 0.4) 100%);
    background-repeat: no-repeat;
    background-size: 100% 40%;
    background-position: 0 90%;
    padding: 0 0.1em;
  }
  
  /* Highlight Pink variant */
  .emphasis-highlight-pink {
    background: linear-gradient(120deg, rgb(244 114 182 / 0.4) 0%, rgb(244 114 182 / 0.4) 100%);
    background-repeat: no-repeat;
    background-size: 100% 40%;
    background-position: 0 90%;
    padding: 0 0.1em;
  }
  
  /* Highlight Rainbow - playful, joyful */
  @keyframes rainbowShift {
    0% { background-position: 0% 90%; }
    100% { background-position: 200% 90%; }
  }
  .emphasis-highlight-rainbow {
    background: linear-gradient(
      90deg,
      rgb(248 113 113 / 0.5),
      rgb(251 191 36 / 0.5),
      rgb(74 222 128 / 0.5),
      rgb(96 165 250 / 0.5),
      rgb(167 139 250 / 0.5),
      rgb(244 114 182 / 0.5),
      rgb(248 113 113 / 0.5)
    );
    background-repeat: repeat;
    background-size: 200% 40%;
    background-position: 0 90%;
    padding: 0 0.1em;
    animation: rainbowShift 3s linear infinite;
  }
  
  /* Highlight Blue variant */
  .emphasis-highlight-blue {
    background: linear-gradient(120deg, rgb(96 165 250 / 0.4) 0%, rgb(96 165 250 / 0.4) 100%);
    background-repeat: no-repeat;
    background-size: 100% 40%;
    background-position: 0 90%;
    padding: 0 0.1em;
  }
  
  /* Highlight Green variant */
  .emphasis-highlight-green {
    background: linear-gradient(120deg, rgb(74 222 128 / 0.4) 0%, rgb(74 222 128 / 0.4) 100%);
    background-repeat: no-repeat;
    background-size: 100% 40%;
    background-position: 0 90%;
    padding: 0 0.1em;
  }
  
  /* Chaos - subtly unstable feel with gentle blur shifts */
  @keyframes chaosBlur {
    0%, 100% { 
      text-shadow: 
        1px 0 0 rgb(248 113 113 / 0.5),
        -1px 0 0 rgb(96 165 250 / 0.5),
        0 0 6px rgb(255 255 255 / 0.3);
    }
    25% { 
      text-shadow: 
        -1px 1px 0 rgb(167 139 250 / 0.5),
        1px -1px 0 rgb(251 191 36 / 0.5),
        0 0 8px rgb(248 113 113 / 0.3);
    }
    50% { 
      text-shadow: 
        1px -1px 0 rgb(251 191 36 / 0.5),
        -1px 1px 0 rgb(167 139 250 / 0.5),
        0 0 6px rgb(96 165 250 / 0.3);
    }
    75% { 
      text-shadow: 
        -1px 0 0 rgb(96 165 250 / 0.5),
        1px 0 0 rgb(248 113 113 / 0.5),
        0 0 8px rgb(167 139 250 / 0.3);
    }
  }
  .emphasis-chaos {
    font-weight: 600;
    color: rgb(255 255 255);
    animation: chaosBlur 1.5s ease-in-out infinite;
  }
`;

// Inject styles once
let stylesInjected = false;
const injectStyles = () => {
  if (stylesInjected || typeof document === 'undefined') return;
  const styleEl = document.createElement('style');
  styleEl.textContent = emphasisStyles;
  document.head.appendChild(styleEl);
  stylesInjected = true;
};

// =============================================================================
// Emphasis Types
// =============================================================================
export type EmphasisType = 
  | 'glow'            // Warm, hopeful, inspiring
  | 'pulse'           // Attention-grabbing, urgent
  | 'gradient'        // Dynamic, modern, flowing
  | 'shake'           // Intense, urgent, can't ignore
  | 'breathe'         // Alive, organic, contemplative
  | 'spark'           // Magical, special, delightful
  | 'weight'          // Important, strong, definitive
  | 'whisper'         // Intimate, soft, personal
  | 'rise'            // Hopeful, ascending, optimistic
  | 'burn'            // Passionate, fierce, determined
  | 'dream'           // Ethereal, aspirational
  | 'question'        // Thought-provoking, curious
  | 'highlight'         // Yellow marker highlight
  | 'highlight-pink'    // Pink marker highlight
  | 'highlight-blue'    // Blue marker highlight
  | 'highlight-green'   // Green marker highlight
  | 'highlight-rainbow' // Rainbow marker highlight
  | 'chaos';            // Chaotic, staggered blur

// =============================================================================
// Emphasis Component
// =============================================================================
interface EmphasisProps {
  children: React.ReactNode;
  type: EmphasisType;
}

export const Emphasis = ({ children, type }: EmphasisProps) => {
  useEffect(() => {
    injectStyles();
  }, []);

  return (
    <span className={`emphasis-${type}`}>
      {children}
    </span>
  );
};

