import React from 'react';
import type { UnoCard, UnoColor } from '../types';
import { Ban, RotateCcw, Trash2, ArrowLeftRight, Flame, Sparkles } from 'lucide-react';

interface UnoCardViewProps {
  card: UnoCard;
  isSelected?: boolean;
  isValid?: boolean;
  isCompact?: boolean;
  isTableCard?: boolean;
  onClick?: () => void;
}

const COLOR_CLASSES: Record<UnoColor, {
  bg: string;
  faceText: string;
  cornerText: string;
  badge: string;
  glow: string;
  border: string;
}> = {
  red: {
    bg: 'bg-gradient-to-br from-[#ff1744] via-[#d50000] to-[#880e4f]',
    faceText: 'text-[#d50000]',
    cornerText: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]',
    badge: 'bg-[#ff1744] text-white',
    glow: 'shadow-[0_0_22px_rgba(255,23,68,0.75)]',
    border: 'border-white/95'
  },
  blue: {
    bg: 'bg-gradient-to-br from-[#00b0ff] via-[#0091ea] to-[#01579b]',
    faceText: 'text-[#0091ea]',
    cornerText: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]',
    badge: 'bg-[#0091ea] text-white',
    glow: 'shadow-[0_0_22px_rgba(0,176,255,0.75)]',
    border: 'border-white/95'
  },
  green: {
    bg: 'bg-gradient-to-br from-[#00e676] via-[#00c853] to-[#1b5e20]',
    faceText: 'text-[#00c853]',
    cornerText: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]',
    badge: 'bg-[#00c853] text-white',
    glow: 'shadow-[0_0_22px_rgba(0,230,118,0.75)]',
    border: 'border-white/95'
  },
  yellow: {
    bg: 'bg-gradient-to-br from-[#ffea00] via-[#ffd600] to-[#ff6f00]',
    faceText: 'text-[#e65100]',
    cornerText: 'text-slate-950 font-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]',
    badge: 'bg-[#ffd600] text-slate-950 font-black',
    glow: 'shadow-[0_0_22px_rgba(255,214,0,0.75)]',
    border: 'border-white/95'
  },
  wild: {
    bg: 'bg-gradient-to-br from-[#180b2b] via-[#0f172a] to-[#05060f]',
    faceText: 'text-white',
    cornerText: 'text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]',
    badge: 'bg-purple-700 text-white',
    glow: 'shadow-[0_0_25px_rgba(234,179,8,0.8)]',
    border: 'border-amber-400/90'
  }
};

export const UnoCardView: React.FC<UnoCardViewProps> = ({
  card,
  isSelected,
  isValid = true,
  isCompact = false,
  isTableCard = false,
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

  // Center Content with clean typography and zero overlap
  const renderCenterContent = () => {
    switch (card.type) {
      case 'number':
        return (
          <span className={`font-black text-2xl sm:text-3xl md:text-4xl italic tracking-tighter ${theme.faceText} drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] select-none`}>
            {card.value}
          </span>
        );
      case 'draw2':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className={`font-black text-xl sm:text-2xl md:text-3xl ${theme.faceText} tracking-tight drop-shadow`}>
              +2
            </span>
            <div className="flex gap-0.5 mt-0.5 opacity-90">
              <div className="w-2 h-3 rounded-xs bg-current border border-white/60 shadow-xs" />
              <div className="w-2 h-3 rounded-xs bg-current border border-white/60 shadow-xs -ml-1" />
            </div>
          </div>
        );
      case 'reverse_draw2':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className={`font-black text-lg sm:text-xl md:text-2xl ${theme.faceText} drop-shadow`}>
              ⇄+2
            </span>
            <span className={`text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-tight ${theme.faceText} mt-0.5 whitespace-nowrap`}>
              REV +2
            </span>
          </div>
        );
      case 'draw4':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className={`font-black text-xl sm:text-2xl md:text-3xl ${theme.faceText} drop-shadow`}>
              +4
            </span>
            <div className="flex gap-0.5 mt-0.5 opacity-90">
              <div className="w-1.5 h-2.5 rounded-xs bg-[#ff1744] border border-white shadow-xs" />
              <div className="w-1.5 h-2.5 rounded-xs bg-[#0091ea] border border-white shadow-xs -ml-0.5" />
              <div className="w-1.5 h-2.5 rounded-xs bg-[#ffd600] border border-white shadow-xs -ml-0.5" />
              <div className="w-1.5 h-2.5 rounded-xs bg-[#00c853] border border-white shadow-xs -ml-0.5" />
            </div>
          </div>
        );
      case 'wild_draw6':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="font-black text-xl sm:text-2xl md:text-3xl text-amber-300 drop-shadow-[0_0_8px_#f59e0b]">
              +6
            </span>
            <span className="text-[6.5px] sm:text-[7.5px] font-black text-amber-200 uppercase tracking-wider mt-0.5 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-400/50 whitespace-nowrap">
              WILD
            </span>
          </div>
        );
      case 'wild_draw10':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <div className="flex items-center gap-0.5">
              <Flame className="w-3 h-3 fill-red-500 text-amber-300" />
              <span className="font-black text-xl sm:text-2xl md:text-3xl text-red-400 drop-shadow-[0_0_10px_#ef4444]">
                +10
              </span>
            </div>
            <span className="text-[6px] sm:text-[7px] font-black text-red-200 uppercase tracking-tight mt-0.5 bg-red-950/90 px-1 py-0.2 rounded border border-red-500 whitespace-nowrap">
              NO MERCY
            </span>
          </div>
        );
      case 'wild_reverse_draw4':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="font-black text-lg sm:text-xl md:text-2xl text-cyan-300 drop-shadow-[0_0_8px_#06b6d4]">
              ⇄+4
            </span>
            <span className="text-[6px] sm:text-[7px] font-black text-cyan-200 uppercase tracking-tight mt-0.5 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-400/50 whitespace-nowrap">
              REV WILD
            </span>
          </div>
        );
      case 'discard_all':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5] drop-shadow" />
            <span className={`font-black text-[6.5px] sm:text-[7.5px] uppercase tracking-tight ${theme.faceText} mt-0.5 whitespace-nowrap`}>
              DISCARD
            </span>
          </div>
        );
      case 'skip_everyone':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <Ban className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5] drop-shadow" />
            <span className={`font-black text-[6px] sm:text-[7px] uppercase tracking-tight ${theme.faceText} mt-0.5 bg-slate-900/60 px-1 py-0.2 rounded whitespace-nowrap`}>
              SKIP ALL
            </span>
          </div>
        );
      case 'skip':
        return <Ban className={`w-6 h-6 sm:w-8 sm:h-8 ${theme.faceText} stroke-[2.8] drop-shadow`} />;
      case 'reverse':
        return <RotateCcw className={`w-6 h-6 sm:w-8 sm:h-8 ${theme.faceText} stroke-[2.8] drop-shadow`} />;
      case 'pass_0':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className={`font-black text-xl sm:text-2xl ${theme.faceText} drop-shadow`}>
              0 ↷
            </span>
            <span className={`font-black text-[6.5px] sm:text-[7.5px] uppercase tracking-tight ${theme.faceText} whitespace-nowrap`}>
              PASS ALL
            </span>
          </div>
        );
      case 'swap_7':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <div className="flex items-center gap-0.5">
              <span className={`font-black text-xl sm:text-2xl ${theme.faceText} drop-shadow`}>
                7
              </span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
            <span className={`font-black text-[6.5px] sm:text-[7.5px] uppercase tracking-tight ${theme.faceText} whitespace-nowrap`}>
              SWAP
            </span>
          </div>
        );
      case 'wild':
        return (
          <div className="flex flex-col items-center justify-center">
            {/* 4-Color Quadrant Wheel with gloss & depth */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 shadow-[0_3px_8px_rgba(0,0,0,0.5)] border-2 border-white mb-0.5">
              <div className="bg-[#ff1744]" />
              <div className="bg-[#0091ea]" />
              <div className="bg-[#ffd600]" />
              <div className="bg-[#00c853]" />
            </div>
            <span className="font-black text-[8px] sm:text-[9px] text-white tracking-widest drop-shadow">
              WILD
            </span>
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
        className={`w-13 h-19 sm:w-15 sm:h-22 min-w-[48px] min-h-[64px] rounded-xl ${theme.bg} border-2 border-white/90 shadow-lg p-1 flex items-center justify-center select-none relative overflow-hidden ${
          isSelected ? '-translate-y-3 ring-4 ring-amber-400 border-amber-300' : ''
        } ${
          isTableCard || isValid
            ? 'opacity-100 brightness-100 cursor-pointer active:scale-95'
            : 'opacity-55 brightness-[0.55] border-slate-600/60 cursor-not-allowed shadow-none pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-black/20 pointer-events-none" />
        {/* Top Left Corner Pip only */}
        <span className={`absolute top-1 left-1.5 text-[9px] sm:text-[10px] font-black leading-none ${theme.cornerText} z-10`}>
          {cornerSym}
        </span>
        <div className="flex items-center justify-center z-10 scale-85">{renderCenterContent()}</div>
      </div>
    );
  }

  const isTable = isTableCard;
  const cardSizeClass = isTable
    ? 'w-12 h-17 sm:w-13 sm:h-19 min-w-[46px] min-h-[64px] rounded-xl border-2'
    : 'w-16 h-24 sm:w-20 sm:h-28 md:w-22 md:h-32 min-w-[56px] min-h-[80px] rounded-2xl border-[2.5px]';

  return (
    <div
      role="button"
      tabIndex={isValid ? 0 : -1}
      aria-label={cardLabel}
      onClick={isValid ? onClick : undefined}
      onKeyDown={handleKeyDown}
      className={`relative ${cardSizeClass} ${theme.bg} ${theme.border} shadow-[0_8px_18px_rgba(0,0,0,0.65)] p-1 sm:p-1.5 flex flex-col justify-start select-none transition-all duration-150 overflow-hidden ${
        isSelected
          ? '-translate-y-4 ring-4 ring-amber-400 shadow-amber-400/80 shadow-2xl z-40 border-amber-300 scale-105'
          : ''
      } ${
        isTableCard
          ? 'opacity-100 brightness-100 shadow-[0_8px_20px_rgba(0,0,0,0.7)]'
          : isValid
          ? 'opacity-100 brightness-100 cursor-pointer hover:-translate-y-1.5 active:scale-95 hover:shadow-2xl'
          : 'opacity-55 brightness-[0.5] border-slate-500/50 cursor-not-allowed shadow-none pointer-events-none'
      }`}
    >
      {/* Gloss Reflection Sheen Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none z-20" />

      {/* Subtle Inner Card Border */}
      <div className="absolute inset-1 rounded-lg border border-white/25 pointer-events-none z-10" />

      {/* DISABLED OVERLAY (Never show on table/discard cards) */}
      {!isTableCard && !isValid && (
        <div className="absolute inset-0 z-30 rounded-2xl bg-black/40 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[3px] border-red-400/80 flex items-center justify-center">
            <div className="w-full h-[3px] bg-red-400/80 rounded-full transform -rotate-45" />
          </div>
        </div>
      )}

      {/* Top Left Corner Pip Only (Right-bottom numbers removed) */}
      <div className={`absolute top-1 left-1.5 sm:top-1.5 sm:left-2 z-20 ${isTable ? 'text-[9px] sm:text-[10px]' : 'text-[11px] sm:text-xs'} font-black leading-none tracking-tight ${theme.cornerText}`}>
        {cornerSym}
      </div>

      {/* Authentic Tilted Center Oval Emblem */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-1 py-1">
        <div
          className={`w-[84%] h-[74%] rounded-[50%] transform -rotate-16 flex items-center justify-center shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_2px_5px_rgba(0,0,0,0.15)] border ${
            isWild
              ? 'bg-slate-950/95 border-amber-400/40'
              : 'bg-white/98 border-white/80'
          }`}
        >
          <div className={`transform rotate-16 flex flex-col items-center justify-center w-full px-1 max-h-[85%] text-center overflow-hidden ${isTable ? 'scale-75 sm:scale-80' : ''}`}>
            {renderCenterContent()}
          </div>
        </div>
      </div>

      {/* Wild 4-color Accent Quadrant Dots */}
      {isWild && (
        <div className="absolute top-1.5 right-1.5 flex gap-1 z-20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff1744] shadow-sm border border-white/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#0091ea] shadow-sm border border-white/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#ffd600] shadow-sm border border-white/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#00c853] shadow-sm border border-white/60" />
        </div>
      )}
    </div>
  );
};

/**
 * Authentic UNO Card Back:
 * High-definition black/maroon card back with classic tilted "UNO" logo,
 * used for the Draw Pile and cards flying from deck to hand.
 */
export const UnoCardBackView: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'table';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const isTable = size === 'table';
  const sizeClasses =
    isTable
      ? 'w-12 h-17 sm:w-13 sm:h-19 min-w-[46px] min-h-[64px] rounded-xl border-2'
      : size === 'sm'
      ? 'w-13 h-19 sm:w-15 sm:h-22 min-w-[48px] min-h-[64px] rounded-xl border-2'
      : size === 'lg'
      ? 'w-20 h-30 sm:w-24 sm:h-36 min-w-[76px] min-h-[114px] rounded-2xl border-[2.5px]'
      : 'w-16 h-24 sm:w-20 sm:h-28 min-w-[56px] min-h-[80px] rounded-2xl border-[2.5px]';

  return (
    <div
      className={`relative ${sizeClasses} bg-gradient-to-br from-[#1c080e] via-[#0f0205] to-[#040002] border-amber-400/90 shadow-[0_8px_18px_rgba(0,0,0,0.85)] p-1 flex flex-col items-center justify-center select-none overflow-hidden ${className}`}
    >
      {/* Gloss Reflection Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none z-20" />

      {/* Inner Double Rim */}
      <div className="absolute inset-1 rounded-lg border border-red-500/40 pointer-events-none z-10" />

      {/* Mini Corner UNO pips */}
      <div className="absolute top-1 left-1 text-[6px] sm:text-[7px] font-black text-amber-400 tracking-tighter z-10">
        UNO
      </div>
      <div className="absolute bottom-1 right-1 text-[6px] sm:text-[7px] font-black text-amber-400 tracking-tighter rotate-180 z-10">
        UNO
      </div>

      {/* Center Tilted UNO Oval Badge */}
      <div className="w-[84%] h-[74%] rounded-[50%] bg-gradient-to-br from-[#ff1744] via-[#d50000] to-[#b71c1c] border border-amber-300 transform -rotate-16 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)] z-10">
        <span className={`font-black italic ${isTable ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl md:text-3xl'} text-yellow-300 tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transform rotate-16`}>
          UNO
        </span>
      </div>
    </div>
  );
};
