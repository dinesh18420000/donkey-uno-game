import React from 'react';

interface SkipProhibitionIconProps {
  size?: number;
  className?: string;
  showShadow?: boolean;
}

/**
 * Universal Prohibition / Skip Icon matching media_1791105093081.png:
 * High-contrast white disc, thick red circular ring, 45-degree diagonal red line, and subtle ground shadow.
 */
export const SkipProhibitionIcon: React.FC<SkipProhibitionIconProps> = ({
  size = 48,
  className = '',
  showShadow = true
}) => {
  return (
    <div className={`relative flex flex-col items-center justify-center select-none pointer-events-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
      >
        {/* Solid white circular background */}
        <circle cx="50" cy="50" r="44" fill="#ffffff" />
        {/* Bold red outer ring */}
        <circle cx="50" cy="50" r="39" stroke="#ef4444" strokeWidth="10" fill="none" />
        {/* Crisp diagonal red bar */}
        <line
          x1="22.5"
          y1="22.5"
          x2="77.5"
          y2="77.5"
          stroke="#ef4444"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
      {/* Subtle floor shadow if requested */}
      {showShadow && (
        <div
          className="w-3/4 h-1.5 rounded-full bg-black/40 blur-[1px] mt-0.5"
          style={{ width: size * 0.7 }}
        />
      )}
    </div>
  );
};
