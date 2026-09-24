import React from 'react';
import type { DonkeyCard, Suit } from '../types';

interface DonkeyCardViewProps {
  card: DonkeyCard;
  isSelected?: boolean;
  isValid?: boolean;
  isCompact?: boolean;
  onClick?: () => void;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  SPADES: '♠',
  HEARTS: '♥',
  CLUBS: '♣',
  DIAMONDS: '♦'
};

const SUIT_COLORS: Record<Suit, string> = {
  SPADES: 'text-slate-950',
  HEARTS: 'text-red-600',
  CLUBS: 'text-slate-950',
  DIAMONDS: 'text-red-600'
};

export const DonkeyCardView: React.FC<DonkeyCardViewProps> = ({
  card,
  isSelected,
  isValid = true,
  isCompact = false,
  onClick
}) => {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const textColor = SUIT_COLORS[card.suit];
  const isAceOfSpades = card.suit === 'SPADES' && card.value === 'A';

  if (isCompact) {
    return (
      <div
        onClick={isValid ? onClick : undefined}
        className={`w-14 h-20 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100 border-2 border-slate-300 shadow-md p-1.5 flex flex-col justify-between select-none transition-all ${
          isSelected ? '-translate-y-2 ring-4 ring-yellow-400 border-amber-400' : ''
        } ${isValid ? 'cursor-pointer active:scale-95 hover:border-amber-400' : 'opacity-40 cursor-not-allowed'}`}
      >
        <div className={`text-sm font-black leading-none ${textColor}`}>
          {card.value}
          <div className="text-xs">{suitSymbol}</div>
        </div>
        <div className={`text-center text-xl font-bold leading-none ${textColor}`}>{suitSymbol}</div>
      </div>
    );
  }

  return (
    <div
      onClick={isValid ? onClick : undefined}
      className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-2xl bg-gradient-to-b from-white via-[#fcfdfe] to-[#f1f5f9] border-2 shadow-xl p-2 flex flex-col justify-between select-none transition-all duration-150 ring-1 ring-black/10 overflow-hidden ${
        isSelected
          ? '-translate-y-4 ring-4 ring-yellow-400 shadow-yellow-400/70 shadow-2xl border-amber-400'
          : ''
      } ${
        isValid
          ? 'cursor-pointer hover:-translate-y-2 active:scale-95 border-amber-300 ring-2 ring-amber-400/60 hover:ring-amber-400 shadow-[0_6px_20px_rgba(0,0,0,0.35)]'
          : 'opacity-40 grayscale-[40%] border-slate-300 cursor-not-allowed'
      } ${
        isAceOfSpades ? 'ring-2 ring-purple-500 shadow-purple-500/30' : ''
      }`}
    >
      {/* Specular gloss sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />

      {/* Top Left Value & Suit - LARGE & BOLD */}
      <div className={`relative z-10 flex flex-col items-center w-fit leading-none ${textColor}`}>
        <span className="text-xl sm:text-2xl font-black tracking-tight">{card.value}</span>
        <span className="text-sm sm:text-base font-extrabold mt-0.5">{suitSymbol}</span>
      </div>

      {/* Center Giant Suit Icon */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${textColor}`}>
        {isAceOfSpades ? (
          <div className="flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl filter drop-shadow leading-none text-slate-950">♠</span>
            <span className="text-[7px] font-black uppercase tracking-widest text-slate-600 mt-0.5">LEAD</span>
          </div>
        ) : (
          <span className="text-3xl sm:text-4xl opacity-80 filter drop-shadow-sm leading-none">{suitSymbol}</span>
        )}
      </div>

      {/* Bottom Right Value & Suit (Inverted) */}
      <div className={`relative z-10 flex flex-col items-center w-fit self-end leading-none rotate-180 ${textColor}`}>
        <span className="text-xl sm:text-2xl font-black tracking-tight">{card.value}</span>
        <span className="text-sm sm:text-base font-extrabold mt-0.5">{suitSymbol}</span>
      </div>
    </div>
  );
};
