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
    bg: 'bg-gradient-to-br from-[#ff334b] via-[#d90429] to-[#990000]',
    faceText: 'text-[#d90429]',
    cornerText: 'text-white',
    badge: 'bg-red-600 text-white',
    glow: 'shadow-[0_0_15px_rgba(220,38,38,0.7)]'
  },
  blue: {
    bg: 'bg-gradient-to-br from-[#00b4d8] via-[#0077b6] to-[#03045e]',
    faceText: 'text-[#0077b6]',
    cornerText: 'text-white',
    badge: 'bg-blue-600 text-white',
    glow: 'shadow-[0_0_15px_rgba(37,99,235,0.7)]'
  },
  green: {
    bg: 'bg-gradient-to-br from-[#52b788] via-[#2d6a4f] to-[#081c15]',
    faceText: 'text-[#2d6a4f]',
    cornerText: 'text-white',
    badge: 'bg-emerald-600 text-white',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.7)]'
  },
  yellow: {
    bg: 'bg-gradient-to-br from-[#ffbe0b] via-[#fb8500] to-[#d46a00]',
    faceText: 'text-[#d46a00]',
    cornerText: 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]',
    badge: 'bg-amber-500 text-slate-950 font-black',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.7)]'
  },
  wild: {
    bg: 'bg-gradient-to-br from-[#2e1065] via-[#0f172a] to-[#020617]',
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

  // Center Emblem Content
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
            <span className="font-black text-lg sm:text-xl text-cyan-300">REV +4</span>
            <span className="text-[8px] font-black text-cyan-200 uppercase tracking-widest mt-0.5">WILD</span>
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
            <span className={`font-bold text-[8px] uppercase tracking-tighter ${theme.faceText}`}>PASS HAND</span>
          </div>
        );
      case 'swap_7':
        return (
          <div className="flex flex-col items-center leading-none">
            <span className={`font-black text-xl sm:text-2xl ${theme.faceText}`}>7 ⇄</span>
            <span className={`font-bold text-[8px] uppercase tracking-tighter ${theme.faceText}`}>SWAP HAND</span>
          </div>
        );
      case 'wild':
        return (
          <div className="flex flex-col items-center justify-center">
            {/* 4-Color Wheel */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 shadow-md border border-white/40 mb-0.5">
              <div className="bg-red-500" />
              <div className="bg-blue-500" />
              <div className="bg-yellow-400" />
              <div className="bg-emerald-500" />
            </div>
            <span className="font-black text-[10px] text-white tracking-widest">WILD</span>
          </div>
        );
      default:
        return null;
    }
  };

  const cornerSym = getCornerSymbol();

  if (isCompact) {
    return (
      <div
        onClick={isValid ? onClick : undefined}
        className={`w-12 h-16 rounded-xl ${theme.bg} border-2 border-white/80 shadow-lg p-1 flex flex-col items-center justify-between select-none ${
          isSelected ? '-translate-y-2 ring-4 ring-yellow-400' : ''
        } ${isValid ? 'cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed'}`}
      >
        <span className={`text-[11px] font-black leading-none ${theme.cornerText}`}>{cornerSym}</span>
        <div className="flex items-center justify-center">{renderCenterContent()}</div>
        <span className={`text-[11px] font-black leading-none rotate-180 ${theme.cornerText}`}>{cornerSym}</span>
      </div>
    );
  }

  return (
    <div
      onClick={isValid ? onClick : undefined}
      className={`relative w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-2xl ${theme.bg} border-[2.5px] border-white/95 shadow-xl p-1.5 flex flex-col justify-between select-none transition-all duration-150 overflow-hidden ${
        isSelected
          ? '-translate-y-4 ring-4 ring-yellow-400 shadow-yellow-400/80 shadow-2xl z-40'
          : ''
      } ${
        isValid
          ? 'cursor-pointer hover:-translate-y-1.5 active:scale-95 hover:shadow-2xl'
          : 'opacity-40 grayscale-[40%] cursor-not-allowed'
      }`}
    >
      {/* Gloss reflection overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Top Left Corner Pip */}
      <div className={`relative z-10 text-xs sm:text-sm font-black leading-none tracking-tight ${theme.cornerText}`}>
        {cornerSym}
      </div>

      {/* Center Iconic UNO Oval */}
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

      {/* Wild 4-color Accent Dots on Top-Right */}
      {isWild && (
        <div className="absolute top-1 right-1 flex gap-0.5 z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
        </div>
      )}
    </div>
  );
};
