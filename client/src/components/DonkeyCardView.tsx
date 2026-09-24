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
        className={`w-14 h-20 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100 border-t border-t-white border-b-2 border-b-slate-400 border-x border-slate-300 shadow-[0_4px_10px_rgba(0,0,0,0.3)] p-1.5 flex flex-col justify-between select-none transition-all duration-150 relative overflow-hidden ${
          isSelected ? '-translate-y-2 ring-4 ring-yellow-400 shadow-[0_8px_20px_rgba(250,204,21,0.8)] scale-105' : ''
        } ${isValid ? 'cursor-pointer active:scale-95 hover:-translate-y-1 hover:shadow-lg' : 'opacity-40 cursor-not-allowed'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />
        <div className={`text-base font-black leading-none ${textColor} relative z-10`}>
          {card.value}
          <div className="text-sm font-black mt-0.5">{suitSymbol}</div>
        </div>
        <div className={`text-center text-3xl font-black leading-none ${textColor} filter drop-shadow-sm relative z-10`}>{suitSymbol}</div>
      </div>
    );
  }

  return (
    <div
      onClick={isValid ? onClick : undefined}
      className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-2xl bg-gradient-to-b from-white via-[#fbfcfe] to-[#eef2f6] border-t-2 border-t-white border-l border-l-white/90 border-r-2 border-r-slate-300 border-b-3 border-b-slate-400 p-2 flex flex-col justify-between select-none transition-all duration-150 ring-1 ring-black/15 overflow-hidden ${
        isSelected
          ? '-translate-y-4 ring-4 ring-yellow-400 shadow-[0_22px_36px_-6px_rgba(250,204,21,0.85),0_12px_22px_rgba(0,0,0,0.6)] scale-105 z-50'
          : 'shadow-[0_8px_18px_-3px_rgba(0,0,0,0.45),0_3px_6px_rgba(0,0,0,0.3)]'
      } ${
        isValid
          ? 'cursor-pointer hover:-translate-y-2.5 hover:scale-102 hover:shadow-[0_14px_28px_rgba(0,0,0,0.5)] active:scale-95 active:shadow-[0_2px_6px_rgba(0,0,0,0.4)]'
          : 'opacity-40 grayscale-[40%] cursor-not-allowed'
      } ${
        isAceOfSpades ? 'ring-2 ring-purple-500 shadow-purple-500/40' : ''
      }`}
    >
      {/* 3D Specular Glass Gloss Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/45 to-transparent pointer-events-none" />
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-white/20 rounded-full blur-sm pointer-events-none" />

      {/* Top Left Value & Suit - LARGE & BOLD */}
      <div className={`relative z-10 flex flex-col items-center w-fit leading-none ${textColor} filter drop-shadow-sm`}>
        <span className="text-xl sm:text-2xl font-black tracking-tight">{card.value}</span>
        <span className="text-base sm:text-lg font-black mt-0.5">{suitSymbol}</span>
      </div>

      {/* Center Giant Suit Icon with 3D drop-shadow */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${textColor}`}>
        {isAceOfSpades ? (
          <div className="flex flex-col items-center justify-center">
            <span className="text-5xl sm:text-6xl filter drop-shadow-md leading-none text-slate-950 font-black">♠</span>
            <span className="text-[7px] font-black uppercase tracking-widest text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-full shadow-sm mt-0.5">LEAD</span>
          </div>
        ) : (
          <span className="text-5xl sm:text-6xl opacity-90 filter drop-shadow-md leading-none font-black">{suitSymbol}</span>
        )}
      </div>

      {/* Bottom Right Value & Suit (Inverted) */}
      <div className={`relative z-10 flex flex-col items-center w-fit self-end leading-none rotate-180 ${textColor} filter drop-shadow-sm`}>
        <span className="text-xl sm:text-2xl font-black tracking-tight">{card.value}</span>
        <span className="text-base sm:text-lg font-black mt-0.5">{suitSymbol}</span>
      </div>
    </div>
  );
};
