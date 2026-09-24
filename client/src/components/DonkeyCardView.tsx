import React from 'react';
import type { DonkeyCard } from '../types';
import { CardSuitIcon } from './CardSuitIcon';

interface DonkeyCardViewProps {
  card: DonkeyCard;
  isSelected?: boolean;
  isValid?: boolean;
  isCompact?: boolean;
  onClick?: () => void;
}

export const DonkeyCardView: React.FC<DonkeyCardViewProps> = ({
  card,
  isSelected,
  isValid = true,
  isCompact = false,
  onClick
}) => {
  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const textColor = isRed ? 'text-rose-600' : 'text-slate-950';
  const isAceOfSpades = card.suit === 'SPADES' && card.value === 'A';

  if (isCompact) {
    return (
      <div
        onClick={isValid ? onClick : undefined}
        className={`w-14 h-20 rounded-xl bg-white border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.3)] p-1.5 flex flex-col justify-between select-none transition-all duration-150 relative overflow-hidden ${
          isSelected ? '-translate-y-2 ring-4 ring-yellow-400 shadow-[0_8px_20px_rgba(250,204,21,0.8)] scale-105' : ''
        } ${isValid ? 'cursor-pointer active:scale-95 hover:-translate-y-1 hover:shadow-lg' : 'opacity-40 cursor-not-allowed'}`}
      >
        <div className="flex items-center justify-between w-full leading-none relative z-10 px-0.5">
          <span className={`text-base font-black ${textColor}`}>{card.value}</span>
          <CardSuitIcon suit={card.suit} size={13} />
        </div>
        <div className="w-full flex items-center justify-center my-auto relative z-10">
          <CardSuitIcon suit={card.suit} size={32} glossy={true} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={isValid ? onClick : undefined}
      className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-2xl bg-white border border-slate-200/90 p-2 flex flex-col justify-between select-none transition-all duration-150 ${
        isSelected
          ? '-translate-y-4 ring-4 ring-yellow-400 shadow-[0_22px_36px_-6px_rgba(250,204,21,0.85),0_12px_22px_rgba(0,0,0,0.6)] scale-105 z-50'
          : 'shadow-[0_6px_16px_rgba(0,0,0,0.35)]'
      } ${
        isValid
          ? 'cursor-pointer hover:-translate-y-2.5 hover:scale-102 hover:shadow-[0_14px_28px_rgba(0,0,0,0.5)] active:scale-95'
          : 'opacity-40 grayscale-[40%] cursor-not-allowed'
      } ${
        isAceOfSpades ? 'ring-2 ring-purple-500 shadow-purple-500/40' : ''
      }`}
    >
      {/* Top Header Row: Left = Bold Rank, Right = Small Vector Suit (Exact match to screenshot) */}
      <div className="flex items-center justify-between w-full leading-none relative z-10 px-0.5">
        <span className={`text-xl sm:text-2xl font-black tracking-tight ${textColor}`}>
          {card.value}
        </span>
        <CardSuitIcon suit={card.suit} size={18} />
      </div>

      {/* Center: Huge 3D Glossy Suit Emblem */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isAceOfSpades ? (
          <div className="flex flex-col items-center justify-center">
            <CardSuitIcon suit="SPADES" size={54} glossy={true} />
            <span className="text-[7px] font-black uppercase tracking-widest text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-full shadow-sm mt-0.5">
              LEAD
            </span>
          </div>
        ) : (
          <CardSuitIcon suit={card.suit} size={54} glossy={true} />
        )}
      </div>

      {/* Bottom Header Row: Inverted Left = Rank, Right = Suit */}
      <div className="flex items-center justify-between w-full leading-none rotate-180 relative z-10 px-0.5">
        <span className={`text-xl sm:text-2xl font-black tracking-tight ${textColor}`}>
          {card.value}
        </span>
        <CardSuitIcon suit={card.suit} size={18} />
      </div>
    </div>
  );
};
