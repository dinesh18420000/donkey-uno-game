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

  if (isCompact) {
    return (
      <div
        onClick={isValid ? onClick : undefined}
        className={`w-14 h-20 rounded-xl bg-white border-2 border-slate-300 shadow-md p-1 flex flex-col justify-between select-none transition-all ${
          isSelected ? '-translate-y-2 ring-4 ring-yellow-400' : ''
        } ${isValid ? 'cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed'}`}
      >
        <div className={`text-base font-black leading-none ${textColor}`}>
          {card.value}
          <div className="text-xs">{suitSymbol}</div>
        </div>
        <div className={`text-center text-xl ${textColor}`}>{suitSymbol}</div>
      </div>
    );
  }

  return (
    <div
      onClick={isValid ? onClick : undefined}
      className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-2xl bg-gradient-to-b from-white via-slate-50 to-slate-100 border-2 shadow-2xl p-2 flex flex-col justify-between select-none transition-all duration-150 ${
        isSelected
          ? '-translate-y-4 ring-4 ring-yellow-400 shadow-yellow-400/70 shadow-2xl'
          : ''
      } ${
        isValid
          ? 'cursor-pointer hover:-translate-y-2 active:scale-95 border-amber-300 ring-2 ring-amber-400/60 hover:ring-amber-400 shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
          : 'opacity-40 grayscale-[40%] border-slate-300 cursor-not-allowed'
      }`}
    >
      {/* Top Left Value & Suit - LARGE & BOLD */}
      <div className={`flex flex-col items-center w-fit leading-none ${textColor}`}>
        <span className="text-xl sm:text-2xl font-black tracking-tight">{card.value}</span>
        <span className="text-sm sm:text-base font-extrabold mt-0.5">{suitSymbol}</span>
      </div>

      {/* Center Giant Suit Icon */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${textColor}`}>
        <span className="text-3xl sm:text-4xl opacity-85 filter drop-shadow-sm">{suitSymbol}</span>
      </div>

      {/* Bottom Right Value & Suit (Inverted) */}
      <div className={`flex flex-col items-center w-fit self-end leading-none rotate-180 ${textColor}`}>
        <span className="text-xl sm:text-2xl font-black tracking-tight">{card.value}</span>
        <span className="text-sm sm:text-base font-extrabold mt-0.5">{suitSymbol}</span>
      </div>
    </div>
  );
};
