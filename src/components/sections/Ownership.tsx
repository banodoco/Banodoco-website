import { useState, useEffect, useCallback, useRef } from 'react';

// Profile pic filenames - these community members help build the open source ecosystem
const PROFILE_PICS = [
  '0xmacbeth', '14mv1k70r', '2kpr', '3zm4n', '_andromed4_', '_nablah', '_nic_h',
  'ace2duce', 'aigod', 'akatz_ai', 'akumetsu971', 'alanhuang', 'aleksej623',
  'amli_art', 'andrewdeltag', 'andrometa', 'andyxr', 'anime_is_real', 'antzuu',
  'arc37us', 'artchan', 'atomp', 'badcrc', 'baronvonnift33', 'benjaminpaine',
  'bennykok', 'bluedangerx', 'boldtron', 'brbbbq', 'butchersbrain', 'byarlooo',
  'byronimo', 'cainisable', 'cerspense', 'chinese_dream', 'citizenplain',
  'comfyanon', 'consumption_', 'cristghazarian', 'cubey', 'cyncratic', 'darkbyte',
  'datarevised', 'daxtoncaylor', 'dkamacho', 'dooart', 'drakenza', 'dre108',
  'drex15704080', 'drltdata', 'earthstorm', 'emmacatnip', 'enigmatic_e',
  'exponentialml', 'extrafuzzy_', 'fabdream', 'fabian3000', 'fakeitorleaveit',
  'fannovel16', 'felixturner', 'fictiverse', 'fizzledorf', 'gasidech',
  'habibigonemad', 'hannahsubmarine', 'happyj', 'harrowed', 'headofoliver',
  'honestabe37', 'huemin', 'huntersfreud', 'huwhitememes', 'hypereikon', 'ian_101',
  'iemesowum', 'imcybearpunk', 'impactframes', 'inductorai', 'infinitevibes',
  'ingierlingsson', 'iskarioto', 'itsb34stw4rs', 'itspoidaman', 'jackg', 'jags111',
  'jasblack', 'jboogxcreative', 'jerrydavos', 'jfischoff', 'jimblug', 'johndopamine',
  'joviex', 'juxtapoz', 'kairos4463', 'kajukabla', 'kanto', 'kewk', 'kijai',
  'klinter', 'kobaeth', 'konzuko', 'kosinkadink', 'kytrai', 'latent_spacer',
  'lh7986', 'lilien86', 'lone_samurai', 'lovisio', 'lumifel', 'machinedelusions',
  'makeitrad', 'manshoety', 'markitzeroo', 'martin_h9804__109577507',
  'material_rabbit', 'matt3o', 'mcxi', 'melih35x', 'melliotzucc', 'melmass',
  'mgfxer', 'mhgenerate', 'mickmumpitz', 'midjourneyman', 'minelauvart', 'mrboofy',
  'mrdravcan', 'mrforexample', 'murelismurelius', 'n1nz0r', 'nebsh', 'neggles',
  'neofuturist', 'nikweberai', 'nopeburger', 'organoids', 'ostriscom', 'oumoumad',
  'pajaritaflora', 'palpapalpa', 'paratect', 'pbpbpb5795', 'piligrim1', 'pln1',
  'pollyannain4d', 'pom_i_moq', 'ptmarks', 'purzbeats', 'pxlpshr', 'question_ak',
  'rainbowpilot', 'realsammyt', 'redstrawberries', 'relicvisuals', 'remycoup',
  'renderstorm', 'roman_anderson', 'ryanontheinside', 'sagansagansagans', 'sandman4',
  'scruntee', 'semixd', 'sim6685', 'siraevvis', 'siraj', 'solus_fx', 'sorrymary',
  'stefanulll', 'syntaxdiffusion', 'tarkan', 'tarokit', 'teslanaut', 'the_shadow_nyc',
  'thedorbrothers', 'thibaudteti', 'thibaudz', 'thitwo', 'tiesto7878', 'timhannan',
  'tobowers', 'tonon', 'traxxas25', 'trenthunter', 'tristan22', 'twistedmesses',
  'udart', 'veko2023', 'visualfrisson', 'wasasquatch', 'wyzborrero', 'x2866',
  'xander6270', 'yo9otatara', 'yuvraj108c', 'yvann_ba', 'zlikwid', 'zukakipiani',
  'zuko4230'
];

const GRID_SIZE = 102;
const FLICKER_INTERVAL = 50; // ms between flickers

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate pastel color for fallback
const getRandomPastelColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 80%)`;
};

// Single profile image component with flickering hover effect
const ProfileImage = ({ 
  initialPic, 
  allPics, 
  usedPicsRef,
  onSwap
}: { 
  initialPic: string; 
  allPics: string[];
  usedPicsRef: React.MutableRefObject<Set<string>>;
  onSwap: (oldPic: string, newPic: string) => void;
}) => {
  const [currentPic, setCurrentPic] = useState(initialPic);
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fallbackColor = useRef(getRandomPastelColor());
  const flickerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalPicRef = useRef(initialPic);

  const stopFlickering = useCallback(() => {
    if (flickerIntervalRef.current) {
      clearInterval(flickerIntervalRef.current);
      flickerIntervalRef.current = null;
    }
  }, []);

  const getRandomUnusedPic = useCallback((excludePic: string) => {
    const availablePics = allPics.filter(pic => !usedPicsRef.current.has(pic) || pic === excludePic);
    if (availablePics.length > 1) {
      const otherPics = availablePics.filter(pic => pic !== excludePic);
      return otherPics[Math.floor(Math.random() * otherPics.length)];
    }
    // Fallback: just pick any random pic
    return allPics[Math.floor(Math.random() * allPics.length)];
  }, [allPics, usedPicsRef]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    originalPicRef.current = currentPic;
    
    // Immediately show a different image (don't wait for first interval)
    const firstFlickerPic = allPics[Math.floor(Math.random() * allPics.length)];
    setCurrentPic(firstFlickerPic);
    
    // Continue flickering endlessly until mouse leaves
    flickerIntervalRef.current = setInterval(() => {
      const flickerPic = allPics[Math.floor(Math.random() * allPics.length)];
      setCurrentPic(flickerPic);
    }, FLICKER_INTERVAL);
  }, [currentPic, allPics]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    stopFlickering();
    // Settle on a final random pic
    const finalPic = getRandomUnusedPic(originalPicRef.current);
    onSwap(originalPicRef.current, finalPic);
    setCurrentPic(finalPic);
  }, [getRandomUnusedPic, onSwap, stopFlickering]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopFlickering();
  }, [stopFlickering]);

  if (hasError) {
    return (
      <div 
        className="w-full aspect-square transition-all duration-200"
        style={{ backgroundColor: fallbackColor.current }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    );
  }

  return (
    <div 
      className="relative w-full aspect-square overflow-hidden group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={`/profile_pics/${currentPic}.jpg`}
        alt=""
        className="w-full h-full object-cover transition-[filter] duration-100"
        style={{
          filter: isHovered ? 'brightness(1.15)' : 'brightness(1)',
        }}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export const Ownership = () => {
  const [selectedPics, setSelectedPics] = useState<string[]>([]);
  const usedPicsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const shuffled = shuffleArray(PROFILE_PICS);
    const selected = shuffled.slice(0, GRID_SIZE);
    setSelectedPics(selected);
    usedPicsRef.current = new Set(selected);
  }, []);

  const handleSwap = useCallback((oldPic: string, newPic: string) => {
    usedPicsRef.current.delete(oldPic);
    usedPicsRef.current.add(newPic);
  }, []);

  return (
    <section id="ownership" className="snap-start bg-[#0a0a0a] text-white overflow-hidden">
      {/* Full-width image grid - truly edge-to-edge */}
      <div className="w-full overflow-hidden">
        <div 
          className="ownership-grid"
          style={{
            display: 'grid',
            gap: '2px',
            width: '100%',
          }}
        >
          {selectedPics.map((pic, idx) => (
            <ProfileImage
              key={`${pic}-${idx}`}
              initialPic={pic}
              allPics={PROFILE_PICS}
              usedPicsRef={usedPicsRef}
              onSwap={handleSwap}
            />
          ))}
        </div>
      </div>

      {/* Text content - two column layout */}
      <div className="px-6 md:px-12 lg:px-16 py-10 md:py-14 lg:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 lg:gap-16 items-start">
            {/* Left: Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-light tracking-tight leading-tight">
              We're sharing 100% of our company's ownership with people who help the open source ecosystem succeed
            </h2>
            
            {/* Right: Description + Link */}
            <div className="flex flex-col gap-5">
              <p className="text-base md:text-lg text-white/60 leading-relaxed">
                Aside from investor dilution, open source contributors will own all of our company. We believe that a company that's built with the community should belong to the community.
              </p>
              <a 
                href="#" 
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors group text-base"
              >
                <span className="border-b border-white/30 group-hover:border-white/60 transition-colors pb-0.5">
                  Learn how it works
                </span>
                <svg 
                  className="w-4 h-4 transition-transform group-hover:translate-x-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .ownership-grid {
          /* Mobile (<480px): 12 columns */
          grid-template-columns: repeat(12, 1fr);
        }
        
        @media (min-width: 480px) {
          /* Small tablets (480-767px): 14 columns */
          .ownership-grid {
            grid-template-columns: repeat(14, 1fr);
          }
        }
        
        @media (min-width: 768px) {
          /* Tablets (768-991px): 18 columns */
          .ownership-grid {
            grid-template-columns: repeat(18, 1fr);
          }
        }
        
        @media (min-width: 992px) {
          /* Small desktop (992-1199px): 18 columns */
          .ownership-grid {
            grid-template-columns: repeat(18, 1fr);
          }
        }
        
        @media (min-width: 1200px) {
          /* Large desktop (≥1200px): ~34 columns for 3 rows with all 102 visible */
          .ownership-grid {
            grid-template-columns: repeat(34, 1fr);
          }
        }
      `}</style>
    </section>
  );
};
