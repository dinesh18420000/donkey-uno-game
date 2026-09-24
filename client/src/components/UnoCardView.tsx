import React from 'react';
import { UnoCard, UnoColor } from '../types';

interface UnoCardViewProps {
  card: UnoCard;
  isSelected?: boolean;
  isValid?: boolean;
  isCompact?: boolean;
  onClick?: () => void;
}

const COLOR_CLASSES: Record<UnoColor, { bg: string; text: string; border: string; glow: string }> = {
  red: {
    bg: 'bg-gradient-to-br from-red-600 to-rose-700',
    text: 'text-white',
    border: 'border-red-400',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.6)]'
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-600 to-indigo-700',
    text: 'text-white',
    border: 'border-blue-400',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.6)]'
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-600 to-green-700',
    text: 'text-white',
    border: 'border-emerald-400',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]'
  },
  yellow: {
    bg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    text: 'text-slate-950',
    border: 'border-yellow-200',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]'
  },
  wild: {
    bg: 'bg-gradient-to-br from-purple-900 via-rose-900 to-slate-950',
    text: 'text-amber-300',
    border: 'border-amber-400',
    glow: 'shadow-[0_0_15px_rgba(234,179,8,0.7)]'
  }
};

export const UnoCardView: React.FC<UnoCardViewProps> = ({
  card,
  isSelected,
  isValid = true,
  isCompact = false,
  onClick
}) => {
  const theme = COLOR_CLASSES[card.color] || COLOR_CLASSES.wild;

  const renderCardContent = () => {
    switch (card.type) {
      case 'number':
        return <span className="font-black text-2xl sm:text-3xl">{card.value}</span>;
      case 'draw2':
        return <span className="font-black text-xl sm:text-2xl">+2</span>;
      case 'draw4':
        return <span className="font-black text-xl sm:text-2xl">+4</span>;
      case 'wild_draw6':
        return <span className="font-black text-xl sm:text-2xl text-yellow-300">+6</span>;
      case 'wild_draw10':
        return <span className="font-black text-lg sm:text-xl text-red-400 animate-pulse">+10</span>;
      case 'wild_reverse_draw4':
        return <span className="font-black text-sm sm:text-base text-cyan-300">REV +4</span>;
      case 'discard_all':
        return <span className="font-black text-xs sm:text-sm tracking-tighter">DISCARD ALL</span>;
      case 'skip_everyone':
        return <span className="font-black text-xs sm:text-sm tracking-tighter">SKIP ALL</span>;
      case 'skip':
        return <span className="font-black text-2xl sm:text-3xl">🚫</span>;
      case 'reverse':
        return <span className="font-black text-2xl sm:text-3xl">🔄</span>;
      case 'pass_0':
        return <span className="font-black text-xs sm:text-sm">0 PASS</span>;
      case 'swap_7':
        return <span className="font-black text-xs sm:text-sm">7 SWAP</span>;
      case 'wild':
        return <span className="font-black text-sm sm:text-base text-yellow-300">WILD</span>;
      default:
        return null;
    }
  };

  if (isCompact) {
    return (
      <div
        onClick={isValid ? onClick : undefined}
        className={`w-12 h-16 rounded-lg ${theme.bg} ${theme.border} border-2 shadow-md p-1 flex flex-col items-center justify-center select-none ${
          isValid ? 'cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed'
        }`}
      >
        <div className={`font-black ${theme.text}`}>{renderCardContent()}</div>
      </div>
    );
  }

  return (
    <div
      onClick={isValid ? onClick : undefined}
      className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl ${theme.bg} ${theme.border} border-2 shadow-xl p-1.5 flex flex-col justify-between select-none transition-all duration-150 ${
        isSelected ? '-translate-y-4 ring-4 ring-yellow-400 shadow-yellow-400/60 shadow-2xl' : ''
      } ${
        isValid
          ? 'cursor-pointer hover:-translate-y-2 active:scale-95 hover:shadow-2xl'
          : 'opacity-40 grayscale-[50%] cursor-not-allowed'
      }`}
    >
      {/* Top Left Mini Label */}
      <div className={`text-xs font-black leading-none ${theme.text}`}>
        {card.type === 'number' ? card.value : card.type.replace('wild_', '').toUpperCase()}
      </div>

      {/* Center Oval Emblem */}
      <div className="absolute inset-2 my-auto h-12 sm:h-14 rounded-full bg-slate-950/40 border border-white/20 backdrop-blur-sm flex items-center justify-center text-center px-1">
        <div className={theme.text}>{renderCardContent()}</div>
      </div>

      {/* Bottom Right Mini Label (Inverted) */}
      <div className={`text-xs font-black leading-none self-end rotate-180 ${theme.text}`}>
        {card.type === 'number' ? card.value : card.type.replace('wild_', '').toUpperCase()}
      </div>

      {/* Wild 4-color Corner Accent */}
      {card.color === 'wild' && (
        <div className="absolute top-1 right-1 flex gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        </div>
      )}
    </div>
  );
};
