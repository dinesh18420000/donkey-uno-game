import React from 'react';
import type { DonkeyCard, Suit } from '../types';

interface DonkeyHandProps {
  hand: DonkeyCard[];
  leadSuit?: Suit;
  isMyTurn: boolean;
  isFirstTrick?: boolean;
  selectedCardId?: string | null;
  onSelectCard: (card: DonkeyCard) => void;
  onPlayCard: (card: DonkeyCard) => void;
}

const SUITS: { suit: Suit; label: string; symbol: string; color: string; borderSlot: string; bgSlot: string }[] = [
  {
    suit: 'SPADES',
    label: 'Spades',
    symbol: '♠',
    color: 'text-slate-950',
    borderSlot: 'border-amber-400',
    bgSlot: 'bg-amber-400/10'
  },
  {
    suit: 'HEARTS',
    label: 'Hearts',
    symbol: '♥',
    color: 'text-red-600',
    borderSlot: 'border-blue-400',
    bgSlot: 'bg-blue-500/10'
  },
  {
    suit: 'CLUBS',
    label: 'Clubs',
    symbol: '♣',
    color: 'text-slate-950',
    borderSlot: 'border-fuchsia-400',
    bgSlot: 'bg-fuchsia-500/10'
  },
  {
    suit: 'DIAMONDS',
    label: 'Diamonds',
    symbol: '♦',
    color: 'text-red-600',
    borderSlot: 'border-emerald-400',
    bgSlot: 'bg-emerald-500/10'
  }
];

export const DonkeyHand: React.FC<DonkeyHandProps> = ({
  hand,
  leadSuit,
  isMyTurn,
  isFirstTrick,
  selectedCardId,
  onSelectCard,
  onPlayCard
}) => {
  const hasLeadSuit = leadSuit ? hand.some(c => c.suit === leadSuit) : false;

  const isCardValid = (card: DonkeyCard): boolean => {
    if (!isMyTurn) return false;
    if (isFirstTrick) {
      return card.suit === 'SPADES' && card.value === 'A';
    }
    if (!leadSuit) return true;
    if (hasLeadSuit) return card.suit === leadSuit;
    return true; // Can cut with any card
  };

  return (
    <div className="w-full max-w-lg mx-auto px-2 pb-1 select-none">
      {/* 4 Suit Columns Grid (Ensures ALL cards are visible simultaneously) */}
      <div className="grid grid-cols-4 gap-2 items-end">
        {SUITS.map(({ suit, symbol, color, borderSlot, bgSlot }) => {
          // Sort ascending: 2, 3 ... 10, J, Q, K, A
          const suitCards = hand
            .filter(c => c.suit === suit)
            .sort((a, b) => a.rank - b.rank);

          const isColumnLead = leadSuit === suit;
          const canCut = isMyTurn && leadSuit && !hasLeadSuit && suitCards.length > 0;
          const count = suitCards.length;

          // Height of container and step offset for cascade (Proportioned to prevent overlapping)
          const containerHeight = 170; // 170px total column height
          const cardHeight = 60;       // 60px card height
          const stepOffset = count > 1 ? Math.min(22, Math.max(14, (containerHeight - cardHeight) / (count - 1))) : 0;

          return (
            <div
              key={suit}
              className={`relative flex flex-col rounded-2xl p-1.5 transition-all border-2 backdrop-blur-md ${bgSlot} ${borderSlot} ${
                isColumnLead ? 'ring-4 ring-amber-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : ''
              } ${canCut ? 'ring-4 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse' : ''}`}
            >
              {/* Top Header of the Column: Symbol & Card Count */}
              <div className="flex items-center justify-between px-1 mb-1 text-xs font-black text-white">
                <span className={`text-base ${color === 'text-red-600' ? 'text-red-400' : 'text-slate-100'}`}>
                  {symbol}
                </span>
                <span className="bg-black/60 px-2 py-0.5 rounded-full text-[11px] text-amber-300 font-mono font-bold">
                  {count}
                </span>
              </div>

              {/* Cascade Stack Container */}
              <div
                className="relative w-full overflow-visible"
                style={{ height: `${containerHeight}px` }}
              >
                {count > 0 ? (
                  suitCards.map((card, idx) => {
                    const valid = isCardValid(card);
                    const isSelected = selectedCardId === card.id;
                    const isLastCard = idx === count - 1;
                    const topPos = idx * stepOffset;

                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          if (!valid) return;
                          onSelectCard(card);
                        }}
                        style={{
                          position: 'absolute',
                          top: `${isSelected ? Math.max(0, topPos - 14) : topPos}px`,
                          left: 0,
                          right: 0,
                          height: isLastCard ? `${cardHeight}px` : `${stepOffset + 12}px`,
                          zIndex: isSelected ? 100 : idx + 5
                        }}
                        className={`rounded-xl bg-white border-2 shadow-md transition-all duration-150 select-none overflow-hidden ${
                          isSelected
                            ? 'ring-4 ring-yellow-400 bg-amber-50 shadow-[0_0_20px_rgba(250,204,21,0.9)] -translate-y-2'
                            : ''
                        } ${
                          valid
                            ? 'cursor-pointer border-amber-400 ring-2 ring-amber-400/80 hover:brightness-105 active:scale-95'
                            : 'opacity-50 grayscale-[30%] border-slate-300 cursor-not-allowed'
                        } ${
                          valid && isFirstTrick && card.suit === 'SPADES' && card.value === 'A'
                            ? 'ring-4 ring-amber-400 animate-bounce'
                            : ''
                        }`}
                      >
                        {/* Card Header Strip (Exposed for EVERY card in the cascade!) */}
                        <div className="flex items-center justify-between px-1.5 py-0.5 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
                          <div className={`flex items-center gap-1 ${color} leading-none`}>
                            <span className="text-base sm:text-lg font-black tracking-tight">{card.value}</span>
                            <span className="text-xs sm:text-sm font-bold">{symbol}</span>
                          </div>
                          {valid && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </div>

                        {/* On the bottom-most card of the stack, display the giant iconic suit emblem */}
                        {isLastCard && (
                          <div className={`w-full h-10 flex items-center justify-center ${color}`}>
                            <span className="text-3xl filter drop-shadow-sm leading-none">{symbol}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  /* Empty Suit Placeholder */
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/30 border-2 border-dashed border-white/20 rounded-xl">
                    <span className="text-3xl">{symbol}</span>
                    <span className="text-[10px] font-bold mt-1 uppercase">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
