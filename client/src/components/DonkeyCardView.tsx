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
        } ${isValid ? 'cursor-pointer active:scale-95 hover:-translate-y-1 hover:shadow-lg' : 'opacity-20 grayscale-[80%] brightness-40 cursor-not-allowed pointer-events-none shadow-none'}`}
      >
        <div className="flex items-center justify-between w-full leading-none relative z-10 px-0.5">
          <span className={`text-base sm:text-lg font-[900] tracking-tight ${textColor} drop-shadow-[0_0.5px_0_currentColor] select-none`}>{card.value}</span>
          <CardSuitIcon suit={card.suit} size={15} />
        </div>
        <div className="w-full flex items-center justify-center my-auto relative z-10">
          <CardSuitIcon suit={card.suit} size={38} glossy={true} />
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
          : 'opacity-20 grayscale-[80%] brightness-40 cursor-not-allowed pointer-events-none shadow-none'
      }`}
    >
      {/* Top Header Row: Left = Bold Rank, Right = Small Vector Suit (Exact match to screenshot) */}
      <div className="flex items-center justify-between w-full leading-none relative z-10 px-0.5">
        <span className={`text-xl sm:text-2xl font-[900] tracking-tight ${textColor} drop-shadow-[0_0.5px_0_currentColor] select-none`}>
          {card.value}
        </span>
        <CardSuitIcon suit={card.suit} size={20} />
      </div>

      {/* Center: Huge 3D Glossy Suit Emblem */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <CardSuitIcon suit={card.suit} size={62} glossy={true} />
      </div>

      {/* Bottom Header Row: Inverted Left = Rank, Right = Suit */}
      <div className="flex items-center justify-between w-full leading-none rotate-180 relative z-10 px-0.5">
        <span className={`text-xl sm:text-2xl font-[900] tracking-tight ${textColor} drop-shadow-[0_0.5px_0_currentColor] select-none`}>
          {card.value}
        </span>
        <CardSuitIcon suit={card.suit} size={20} />
      </div>
    </div>
  );
};
