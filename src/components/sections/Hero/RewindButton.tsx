interface RewindButtonProps {
  onClick: () => void;
  isRewinding: boolean;
  showRewindButton: boolean;
  showThumbsUp: boolean;
  variant: 'mobile' | 'desktop';
  style?: React.CSSProperties;
}

export const RewindButton = ({
  onClick,
  isRewinding,
  showRewindButton,
  showThumbsUp,
  variant,
  style,
}: RewindButtonProps) => {
  const isVisible = showRewindButton || isRewinding;

  if (variant === 'mobile') {
    return (
      <>
        {isVisible && (
          <button
            onClick={onClick}
            disabled={isRewinding}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-all"
          >
            <RewindIcon spinning={isRewinding} />
            <span className="text-sm font-medium">
              {isRewinding ? 'Rewinding...' : 'Rewind'}
            </span>
          </button>
        )}
        {showThumbsUp && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white/20 text-white rounded-lg backdrop-blur-sm">
            <span className="text-xl">👍</span>
          </div>
        )}
      </>
    );
  }

  // Desktop variant
  return (
    <>
      <button
        onClick={onClick}
        disabled={isRewinding}
        className={`absolute z-10 flex items-center gap-2 px-3 py-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={style}
      >
        <RewindIcon spinning={isRewinding} />
        <span className="text-sm font-medium">
          {isRewinding ? 'Rewinding...' : 'Rewind'}
        </span>
      </button>

      <div
        className={`absolute z-10 flex items-center gap-2 px-3 py-2 bg-black/60 text-white rounded-lg backdrop-blur-sm transition-all duration-300 ${
          showThumbsUp ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
        }`}
        style={style}
      >
        <span className="text-xl">👍</span>
      </div>
    </>
  );
};

const RewindIcon = ({ spinning }: { spinning: boolean }) => (
  <svg
    className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
    />
  </svg>
);

