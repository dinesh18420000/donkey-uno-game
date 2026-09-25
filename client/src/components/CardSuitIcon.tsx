import React from 'react';
import type { Suit } from '../types';

interface CardSuitIconProps {
  suit: Suit;
  className?: string;
  size?: number | string;
  glossy?: boolean;
}

const CardSuitIconComponent: React.FC<CardSuitIconProps> = ({
  suit,
  className = '',
  size = 24,
  glossy = false
}) => {
  const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
  const fillColor = isRed ? '#e11d48' : '#0f172a';

  if (suit === 'HEARTS') {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`inline-block select-none overflow-visible ${className}`}
      >
        <defs>
          <linearGradient id="heartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff2a5f" />
            <stop offset="60%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>
          <radialGradient id="heartGlow" cx="35%" cy="30%" r="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Base Heart Shape */}
        <path
          d="M 50 88 C 46 84 12 56 12 35 C 12 18 25 10 38 10 C 45 10 49 13 50 18 C 51 13 55 10 62 10 C 75 10 88 18 88 35 C 88 56 54 84 50 88 Z"
          fill={glossy ? 'url(#heartGrad)' : fillColor}
        />
        {/* Glossy Curved Highlight on Left Lobe (matching user screenshot) */}
        {glossy && (
          <>
            <ellipse
              cx="33"
              cy="25"
              rx="13"
              ry="7"
              fill="url(#heartGlow)"
              transform="rotate(-28 33 25)"
            />
            <path
              d="M 24 22 C 22 28 23 38 29 44 C 27 38 26 28 32 22 C 29 21 26 21 24 22 Z"
              fill="#ffffff"
              opacity="0.32"
            />
          </>
        )}
      </svg>
    );
  }

  if (suit === 'DIAMONDS') {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`inline-block select-none overflow-visible ${className}`}
      >
        <defs>
          <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff3366" />
            <stop offset="60%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>
          <linearGradient id="diamondSheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Diamond Shape */}
        <polygon
          points="50,6 88,50 50,94 12,50"
          fill={glossy ? 'url(#diamondGrad)' : fillColor}
        />
        {/* Glossy Top-Left Facet Highlight */}
        {glossy && (
          <polygon
            points="50,6 12,50 50,50"
            fill="url(#diamondSheen)"
          />
        )}
      </svg>
    );
  }

  if (suit === 'SPADES') {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`inline-block select-none overflow-visible ${className}`}
      >
        <defs>
          <linearGradient id="spadeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2d3748" />
            <stop offset="45%" stopColor="#1a202c" />
            <stop offset="100%" stopColor="#0a0f1d" />
          </linearGradient>
          <radialGradient id="spadeGlow" cx="38%" cy="40%" r="35%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Spade Blade Body & Stem */}
        <path
          d="M 50 8 C 42 22 16 42 16 60 C 16 73 27 82 39 82 C 45 82 48 78 50 75 C 52 78 55 82 61 82 C 73 82 84 73 84 60 C 84 42 58 22 50 8 Z"
          fill={glossy ? 'url(#spadeGrad)' : fillColor}
        />
        <path
          d="M 47 72 C 48 83 43 92 36 95 L 64 95 C 57 92 52 83 53 72 Z"
          fill={glossy ? 'url(#spadeGrad)' : fillColor}
        />
        {/* Glossy Left Lobe Highlight */}
        {glossy && (
          <>
            <ellipse
              cx="35"
              cy="52"
              rx="12"
              ry="7"
              fill="url(#spadeGlow)"
              transform="rotate(-30 35 52)"
            />
            <path
              d="M 48 18 C 42 28 32 38 27 48 C 26 40 34 28 44 20 Z"
              fill="#ffffff"
              opacity="0.22"
            />
          </>
        )}
      </svg>
    );
  }

  // CLUBS
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`inline-block select-none overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id="clubGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2d3748" />
          <stop offset="45%" stopColor="#1a202c" />
          <stop offset="100%" stopColor="#0a0f1d" />
        </linearGradient>
        <radialGradient id="clubGlow" cx="45%" cy="35%" r="35%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 3 Circular Lobes */}
      {/* Top Lobe */}
      <circle cx="50" cy="30" r="18" fill={glossy ? 'url(#clubGrad)' : fillColor} />
      {/* Left Lobe */}
      <circle cx="31" cy="54" r="18" fill={glossy ? 'url(#clubGrad)' : fillColor} />
      {/* Right Lobe */}
      <circle cx="69" cy="54" r="18" fill={glossy ? 'url(#clubGrad)' : fillColor} />
      {/* Center Filler */}
      <circle cx="50" cy="48" r="14" fill={glossy ? 'url(#clubGrad)' : fillColor} />
      {/* Stem Base */}
      <path
        d="M 47 54 C 48 70 42 88 35 94 L 65 94 C 58 88 52 70 53 54 Z"
        fill={glossy ? 'url(#clubGrad)' : fillColor}
      />
      {/* Glossy Top & Left Lobe Highlights */}
      {glossy && (
        <>
          <ellipse
            cx="46"
            cy="24"
            rx="8"
            ry="4.5"
            fill="url(#clubGlow)"
            transform="rotate(-20 46 24)"
          />
          <ellipse
            cx="27"
            cy="48"
            rx="8"
            ry="4.5"
            fill="url(#clubGlow)"
            transform="rotate(-30 27 48)"
          />
        </>
      )}
    </svg>
  );
};

export const CardSuitIcon = React.memo(CardSuitIconComponent);
