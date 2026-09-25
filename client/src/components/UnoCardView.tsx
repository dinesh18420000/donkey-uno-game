import React from 'react';
import type { UnoCard, UnoColor } from '../types';

interface UnoCardViewProps {
  card: UnoCard;
  isSelected?: boolean;
  isValid?: boolean;
  isCompact?: boolean;
  onClick?: () => void;
}

const COLOR_CLASSES: Record<UnoColor, {
  bg: string;
  faceText: string;
  cornerText: string;
  badge: string;
  glow: string;
}> = {
  red: {
    bg: 'bg-gradient-to-br from-[#ff2a4b] via-[#e60026] to-[#990014]',
    faceText: 'text-[#e60026]',
    cornerText: 'text-white',
    badge: 'bg-[#ff2a4b] text-white',
    glow: 'shadow-[0_0_15px_rgba(255,42,75,0.7)]'
  },
  blue: {
    bg: 'bg-gradient-to-br from-[#00b4d8] via-[#0099ff] to-[#0052cc]',
    faceText: 'text-[#0077cc]',
    cornerText: 'text-white',
    badge: 'bg-[#0099ff] text-white',
    glow: 'shadow-[0_0_15px_rgba(0,153,255,0.7)]'
  },
  green: {
    bg: 'bg-gradient-to-br from-[#2ed573] via-[#00c853] to-[#007e33]',
    faceText: 'text-[#008f39]',
    cornerText: 'text-white',
    badge: 'bg-[#00c853] text-white',
    glow: 'shadow-[0_0_15px_rgba(0,200,83,0.7)]'
  },
  yellow: {
    bg: 'bg-gradient-to-br from-[#ffd000] via-[#ffaa00] to-[#e67e00]',
    faceText: 'text-[#cc7000]',
    cornerText: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]',
    badge: 'bg-[#ffaa00] text-slate-950 font-black',
    glow: 'shadow-[0_0_15px_rgba(255,170,0,0.7)]'
  },
  wild: {
    bg: 'bg-gradient-to-br from-[#1a103c] via-[#0d1326] to-[#050811]',
    faceText: 'text-white',
    cornerText: 'text-amber-300',
    badge: 'bg-purple-600 text-white',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.7)]'
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
  const isWild = card.color === 'wild';

  // Corner Short Symbol
  const getCornerSymbol = () => {
    switch (card.type) {
      case 'number':
        return card.value?.toString() || '0';
      case 'draw2':
        return '+2';
      case 'reverse_draw2':
        return '⇄+2';
      case 'draw4':
        return '+4';
      case 'wild_draw6':
        return '+6';
      case 'wild_draw10':
        return '+10';
      case 'wild_reverse_draw4':
        return '⇄+4';
      case 'discard_all':
        return 'ALL';
      case 'skip_everyone':
        return '⊘';
      case 'skip':
        return '⊘';
      case 'reverse':
        return '⇄';
      case 'pass_0':
        return '0';
      case 'swap_7':
        return '7';
      case 'wild':
        return '★';
      default:
        return '★';
    }
  };

  // Center Content
  const renderCenterContent = () => {
    switch (card.type) {
      case 'number':
        return (
          <span className={`font-black text-3xl sm:text-4xl italic tracking-tighter ${theme.faceText} drop-shadow-sm`}>
            {card.value}
          </span>
        );
      case 'draw2':
        return <span className={`font-black text-2xl sm:text-3xl ${theme.faceText}`}>+2</span>;
      case 'reverse_draw2':
        return (
          <div className="flex flex-col items-center leading-none">
            <span className={`font-black text-xl sm:text-2xl ${theme.faceText}`}>⇄+2</span>
            <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-tight ${theme.faceText} mt-0.5`}>
              REV +2
            </span>
          </div>
        );
      case 'draw4':
        return <span className={`font-black text-2xl sm:text-3xl ${theme.faceText}`}>+4</span>;
      case 'wild_draw6':
        return (
          <div className="flex flex-col items-center leading-none">
            <span className="font-black text-2xl sm:text-3xl text-amber-300 drop-shadow">+6</span>
            <span className="text-[8px] font-black text-amber-200 uppercase tracking-widest mt-0.5">WILD</span>
          </div>
        );
      case 'wild_draw10':
        return (
          <div className="flex flex-col items-center leading-none animate-pulse">
            <span className="font-black text-2xl sm:text-3xl text-red-400 drop-shadow">+10</span>
            <span className="text-[8px] font-black text-red-200 uppercase tracking-widest mt-0.5">NO MERCY</span>
          </div>
        );
      case 'wild_reverse_draw4':
        return (
          <div className="flex flex-col items-center leading-none">
            <span className="font-black text-lg sm:text-xl text-cyan-300">⇄+4</span>
            <span className="text-[8px] font-black text-cyan-200 uppercase tracking-widest mt-0.5">REV WILD</span>
          </div>
        );
      case 'discard_all':
        return (
          <div className="flex flex-col items-center leading-none">
            <span className="text-xl sm:text-2xl">🗑️</span>
            <span className={`font-black text-[9px] sm:text-[10px] uppercase tracking-tighter ${theme.faceText} mt-0.5`}>
              DISCARD ALL
            </span>
          </div>
        );
      case 'skip_everyone':
        return (
          <div className="flex flex-col items-center leading-none">
            <span className="text-2xl sm:text-3xl leading-none">🚫</span>
            <span className={`font-black text-[8px] sm:text-[9px] uppercase tracking-widest ${theme.faceText} mt-0.5`}>
              SKIP ALL
            </span>
          </div>
        );
      case 'skip':
        return <span className={`font-black text-3xl sm:text-4xl leading-none ${theme.faceText}`}>⊘</span>;
      case 'reverse':
        return <span className={`font-black text-3xl sm:text-4xl leading-none ${theme.faceText}`}>⇄</span>;
      case 'pass_0':
        return (
          <div className="flex flex-col items-center leading-none">
            <span className={`font-black text-xl sm:text-2xl ${theme.faceText}`}>0 ↷</span>
            <span className={`font-bold text-[8px] uppercase tracking-tighter ${theme.faceText}`}>PASS</span>
          </div>
        );
      case 'swap_7':
        return (
          <div className="flex flex-col items-center leading-none">
            <span className={`font-black text-xl sm:text-2xl ${theme.faceText}`}>7 ⇄</span>
            <span className={`font-bold text-[8px] uppercase tracking-tighter ${theme.faceText}`}>SWAP</span>
          </div>
        );
      case 'wild':
        return (
          <div className="flex flex-col items-center justify-center">
            {/* 4-Color Quadrant Wheel */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 shadow-md border-2 border-white/60 mb-0.5">
              <div className="bg-[#ff2a4b]" />
              <div className="bg-[#0099ff]" />
              <div className="bg-[#ffaa00]" />
              <div className="bg-[#00c853]" />
            </div>
            <span className="font-black text-[9px] sm:text-[10px] text-white tracking-widest">WILD</span>
          </div>
        );
      default:
        return null;
    }
  };

  const cornerSym = getCornerSymbol();
  const cardLabel = `${card.color} ${card.type.replace('_', ' ')} ${card.value ?? ''}`.trim();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isValid && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  if (isCompact) {
    return (
      <div
        role="button"
        tabIndex={isValid ? 0 : -1}
        aria-label={cardLabel}
        onClick={isValid ? onClick : undefined}
        onKeyDown={handleKeyDown}
        className={`w-12 h-16 min-w-[44px] min-h-[44px] rounded-xl ${theme.bg} border-2 shadow-lg p-1 flex flex-col items-center justify-between select-none ${
          isSelected ? '-translate-y-3 ring-4 ring-amber-400 border-amber-300' : ''
        } ${
          isValid
            ? 'cursor-pointer active:scale-95 border-white/80'
            : 'opacity-60 brightness-[0.6] border-slate-600/60 cursor-not-allowed shadow-none pointer-events-none'
        }`}
      >
        <span className={`text-[10px] font-black leading-none ${theme.cornerText}`}>{cornerSym}</span>
        <div className="flex items-center justify-center">{renderCenterContent()}</div>
        <span className={`text-[10px] font-black leading-none rotate-180 ${theme.cornerText}`}>{cornerSym}</span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={isValid ? 0 : -1}
      aria-label={cardLabel}
      onClick={isValid ? onClick : undefined}
      onKeyDown={handleKeyDown}
      className={`relative w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 min-w-[48px] min-h-[64px] rounded-2xl ${theme.bg} border-[2.5px] shadow-xl p-1.5 flex flex-col justify-between select-none transition-all duration-150 overflow-hidden ${
        isSelected
          ? '-translate-y-4 ring-4 ring-amber-400 shadow-amber-400/80 shadow-2xl z-40 border-amber-300 scale-105'
          : ''
      } ${
        isValid
          ? 'cursor-pointer hover:-translate-y-1.5 active:scale-95 hover:shadow-2xl border-white/95'
          : 'opacity-65 brightness-[0.55] border-slate-500/50 cursor-not-allowed shadow-none pointer-events-none'
      }`}
    >
      {/* Gloss reflection overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* DISABLED OVERLAY */}
      {!isValid && (
        <div className="absolute inset-0 z-30 rounded-2xl bg-black/35 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[3px] border-red-400/80 flex items-center justify-center">
            <div className="w-full h-[3px] bg-red-400/80 rounded-full transform -rotate-45" />
          </div>
        </div>
      )}

      {/* Top Left Corner Pip */}
      <div className={`relative z-10 text-xs sm:text-sm font-black leading-none tracking-tight ${theme.cornerText}`}>
        {cornerSym}
      </div>

      {/* Center Oval Emblem */}
      <div className="absolute inset-x-2 inset-y-3.5 my-auto flex items-center justify-center pointer-events-none">
        <div
          className={`w-[84%] h-[74%] rounded-[50%] transform -rotate-12 flex items-center justify-center shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)] ${
            isWild
              ? 'bg-slate-950/90 border border-white/20'
              : 'bg-white/95 border border-white/40'
          }`}
        >
          <div className="transform rotate-12 flex items-center justify-center">
            {renderCenterContent()}
          </div>
        </div>
      </div>

      {/* Bottom Right Inverted Corner Pip */}
      <div className={`relative z-10 text-xs sm:text-sm font-black leading-none tracking-tight self-end rotate-180 ${theme.cornerText}`}>
        {cornerSym}
      </div>

      {/* Wild 4-color Accent Quadrant Dots */}
      {isWild && (
        <div className="absolute top-1 right-1 flex gap-0.5 z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff2a4b] shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#0099ff] shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#ffaa00] shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#00c853] shadow-sm" />
        </div>
      )}
    </div>
  );
};
