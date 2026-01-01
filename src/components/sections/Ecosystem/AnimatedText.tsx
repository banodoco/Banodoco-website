import { useEffect, useRef, useState } from 'react';

interface AnimatedTextProps {
  value: string;
  className?: string;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({ 
  value, 
  className = '' 
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const prevValueRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevValue = prevValueRef.current;
    
    if (value === prevValue) return;
    
    // Determine direction based on value comparison
    // For years, compare numerically; for months, just use up
    const prevNum = parseInt(prevValue, 10);
    const newNum = parseInt(value, 10);
    if (!isNaN(prevNum) && !isNaN(newNum)) {
      setDirection(newNum > prevNum ? 'up' : 'down');
    } else {
      setDirection('up');
    }
    
    setIsAnimating(true);
    
    // Update display value after half the animation (when old value has slid away)
    timeoutRef.current = setTimeout(() => {
      setDisplayValue(value);
      prevValueRef.current = value;
    }, 100);
    
    // End animation after full duration
    const endTimeout = setTimeout(() => {
      setIsAnimating(false);
    }, 200);
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearTimeout(endTimeout);
    };
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <span 
      className={`inline-block overflow-hidden ${className}`}
      style={{ lineHeight: 1.1 }}
    >
      <span 
        className="inline-block transition-transform duration-200 ease-out"
        style={{ 
          transform: isAnimating 
            ? direction === 'up' 
              ? 'translateY(-15%)' 
              : 'translateY(15%)'
            : 'translateY(0)',
          opacity: isAnimating ? 0.7 : 1,
        }}
      >
        {displayValue}
      </span>
    </span>
  );
};


