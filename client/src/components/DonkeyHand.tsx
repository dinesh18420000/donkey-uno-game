import React, { useState } from 'react';
import type { DonkeyCard, Suit } from '../types';
import { DonkeyCardView } from './DonkeyCardView';
import { Columns, LayoutGrid } from 'lucide-react';
import { sounds } from '../utils/audio';

interface DonkeyHandProps {
  hand: DonkeyCard[];
  leadSuit?: Suit;
  isMyTurn: boolean;
  isFirstTrick?: boolean;
  selectedCardId?: string | null;
  onSelectCard: (card: DonkeyCard) => void;
  onPlayCard: (card: DonkeyCard) => void;
  onInvalidMove?: (error: { message: string; card: DonkeyCard; symbol: string }) => void;
}

const SUITS: { suit: Suit; label: string; symbol: string; color: string; borderSlot: string; bgSlot: string }[] = [
  {
    suit: 'SPADES',
    label: 'Spades',
    symbol: '♠',
    color: 'text-slate-950',
    borderSlot: 'border-slate-500/50',
    bgSlot: 'bg-purple-950/40'
  },
  {
    suit: 'HEARTS',
    label: 'Hearts',
    symbol: '♥',
    color: 'text-red-600',
    borderSlot: 'border-red-500/50',
    bgSlot: 'bg-purple-950/40'
  },
  {
    suit: 'CLUBS',
    label: 'Clubs',
    symbol: '♣',
    color: 'text-slate-950',
    borderSlot: 'border-emerald-500/50',
    bgSlot: 'bg-purple-950/40'
  },
  {
    suit: 'DIAMONDS',
    label: 'Diamonds',
    symbol: '♦',
    color: 'text-red-600',
    borderSlot: 'border-amber-500/50',
    bgSlot: 'bg-purple-950/40'
  }
];

export const DonkeyHand: React.FC<DonkeyHandProps> = ({
  hand,
  leadSuit,
  isMyTurn,
  isFirstTrick,
  selectedCardId,
  onSelectCard,
  onPlayCard,
  onInvalidMove
}) => {
  const [viewMode, setViewMode] = useState<'columns' | 'grid'>('columns');
  const [shakingCardId, setShakingCardId] = useState<string | null>(null);

  const hasLeadSuit = leadSuit ? hand.some(c => c.suit === leadSuit) : false;

  const getInvalidReason = (card: DonkeyCard): string | null => {
    if (!isMyTurn) {
      return "⏳ It's not your turn! Please wait for your turn.";
    }
    if (isFirstTrick) {
      if (!(card.suit === 'SPADES' && card.value === 'A')) {
        return "♠ Ace of Spades (♠ A) must lead the first trick! Please play ♠ A.";
      }
    }
    if (leadSuit && hasLeadSuit && card.suit !== leadSuit) {
      const leadSym = leadSuit === 'SPADES' ? '♠ Spades' : leadSuit === 'HEARTS' ? '♥ Hearts' : leadSuit === 'CLUBS' ? '♣ Clubs' : '♦ Diamonds';
      const cardSym = card.suit === 'SPADES' ? '♠' : card.suit === 'HEARTS' ? '♥' : card.suit === 'CLUBS' ? '♣' : '♦';
      return `⚠️ Lead suit is ${leadSym}! You hold ${leadSym} in hand, so you cannot play ${cardSym} ${card.value}.`;
    }
    return null;
  };

  const isCardValid = (card: DonkeyCard): boolean => {
    return getInvalidReason(card) === null;
  };

  const handleCardClick = (card: DonkeyCard) => {
    sounds.playCardSelect();
    const errorMsg = getInvalidReason(card);
    if (errorMsg) {
      setShakingCardId(card.id);
      setTimeout(() => setShakingCardId(null), 500);
      const symbol = card.suit === 'SPADES' ? '♠' : card.suit === 'HEARTS' ? '♥' : card.suit === 'CLUBS' ? '♣' : '♦';
      if (onInvalidMove) {
        onInvalidMove({ message: errorMsg, card, symbol });
      }
      return;
    }

    if (selectedCardId === card.id) {
      onPlayCard(card);
    } else {
      onSelectCard(card);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-2 pb-1 select-none">
      {/* Hand Header Bar: Cards count, Lead Suit Info & View Mode Switcher */}
      <div className="flex items-center justify-between px-1 mb-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-black text-amber-300">
            Hand ({hand.length} cards)
          </span>
          {leadSuit && (
            <span className="text-[10px] bg-slate-900/90 border border-amber-400/40 px-2 py-0.5 rounded-full text-amber-200 font-bold">
              Lead: {leadSuit === 'SPADES' ? '♠ Spades' : leadSuit === 'HEARTS' ? '♥ Hearts' : leadSuit === 'CLUBS' ? '♣ Clubs' : '♦ Diamonds'}
            </span>
          )}
          {isMyTurn && (
            <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-md">
              YOUR TURN
            </span>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode('columns')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'columns'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-purple-200 hover:text-white'
            }`}
            title="Suit Columns View"
          >
            <Columns className="w-3 h-3" />
            <span>Suits</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-purple-200 hover:text-white'
            }`}
            title="Grid View (Show All Cards)"
          >
            <LayoutGrid className="w-3 h-3" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* GRID VIEW: Wraps every card into clear rows with zero overlap! */
        <div className="w-full max-h-56 sm:max-h-64 overflow-y-auto p-2 rounded-2xl bg-black/40 border border-purple-500/30 backdrop-blur-md no-scrollbar">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {[...hand]
              .sort((a, b) => {
                const suitOrder: Record<Suit, number> = { SPADES: 1, HEARTS: 2, CLUBS: 3, DIAMONDS: 4 };
                if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
                return a.rank - b.rank;
              })
              .map(card => (
                <DonkeyCardView
                  key={card.id}
                  card={card}
                  isSelected={selectedCardId === card.id}
                  isValid={isCardValid(card)}
                  onClick={() => handleCardClick(card)}
                />
              ))}
          </div>
        </div>
      ) : (
        /* SUIT COLUMNS VIEW (4 Columns with high-contrast, fully visible numbers!) */
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 items-end">
          {SUITS.map(({ suit, symbol, color, borderSlot, bgSlot }) => {
            // Sort ascending: 2, 3 ... 10, J, Q, K, A
            const suitCards = hand
              .filter(c => c.suit === suit)
              .sort((a, b) => a.rank - b.rank);

            const isColumnLead = leadSuit === suit;
            const canCut = isMyTurn && leadSuit && !hasLeadSuit && suitCards.length > 0;
            const count = suitCards.length;

            // Height and spacing tuned so EVERY card number is 100% visible, perfectly fitting above footer
            const containerHeight = Math.max(130, Math.min(170, count > 0 ? (count - 1) * 16 + 50 : 130));
            const cardHeight = 48;
            const stepOffset = count > 1 ? (containerHeight - cardHeight) / (count - 1) : 0;

            return (
              <div
                key={suit}
                className={`relative flex flex-col rounded-2xl p-1 sm:p-1.5 transition-all border-2 backdrop-blur-md shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),0_6px_16px_rgba(0,0,0,0.4)] ${bgSlot} ${borderSlot} ${
                  isColumnLead ? 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.85)]' : ''
                } ${canCut ? 'ring-4 ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.85)] animate-pulse' : ''}`}
              >
                {/* Top Header of the Column: Symbol & Card Count with 3D Pill */}
                <div className="flex items-center justify-between px-1 mb-1 text-xs font-black text-white">
                  <span className={`text-base font-black ${color === 'text-red-600' ? 'text-red-400' : 'text-slate-100'} filter drop-shadow`}>
                    {symbol}
                  </span>
                  <span className="bg-gradient-to-b from-slate-900 to-black px-1.5 py-0.2 rounded-full text-[10px] sm:text-[11px] text-amber-300 font-mono font-black border border-white/20 shadow-inner">
                    {count}
                  </span>
                </div>

                {/* Faint Suit Watermark Outline in slot background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 overflow-hidden">
                  <span className={`text-6xl sm:text-7xl font-black select-none ${color}`}>{symbol}</span>
                </div>

                {/* Cascade Stack Container */}
                <div
                  className="relative w-full overflow-visible z-10"
                  style={{ height: `${containerHeight}px` }}
                >
                  {count > 0 ? (
                    suitCards.map((card, idx) => {
                      const isSelected = selectedCardId === card.id;
                      const isLastCard = idx === count - 1;
                      const topPos = idx * stepOffset;
                      const isShaking = shakingCardId === card.id;

                      return (
                        <div
                          key={card.id}
                          onClick={() => handleCardClick(card)}
                          style={{
                            position: 'absolute',
                            top: `${isSelected ? Math.max(0, topPos - 14) : topPos}px`,
                            left: 0,
                            right: 0,
                            height: isLastCard ? `${cardHeight}px` : `${stepOffset + 14}px`,
                            zIndex: isSelected ? 100 : idx + 5
                          }}
                          className={`rounded-xl bg-gradient-to-b from-white via-[#fcfdfe] to-[#edf2f7] border-t-2 border-t-white border-l border-l-white/90 border-r-2 border-r-slate-300 border-b-2 border-b-slate-400 shadow-[0_4px_10px_rgba(0,0,0,0.35)] transition-all duration-150 select-none overflow-hidden cursor-pointer ${
                            isSelected
                              ? 'ring-4 ring-yellow-400 bg-amber-50 shadow-[0_16px_32px_rgba(250,204,21,0.9),0_8px_16px_rgba(0,0,0,0.5)] -translate-y-3.5 scale-105 z-50 border-amber-400'
                              : 'hover:z-40 hover:-translate-y-1.5 hover:scale-102 active:scale-95 active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] border-slate-300 hover:border-amber-400'
                          } ${
                            isShaking
                              ? 'animate-card-shake ring-4 ring-red-500 bg-red-50'
                              : ''
                          }`}
                        >
                          {/* 3D Gloss Sheen */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />

                          {/* Card Header Strip: 100% PROMINENT & TOP-ANCHORED */}
                          <div className="h-6 px-1.5 flex items-center justify-between bg-gradient-to-b from-white via-white to-slate-100/90 border-b border-slate-200 relative z-10">
                            <div className={`flex items-center gap-1 ${color} leading-none filter drop-shadow-sm`}>
                              <span className="text-sm sm:text-base font-black tracking-tight">{card.value}</span>
                              <span className="text-xs sm:text-sm font-extrabold">{symbol}</span>
                            </div>
                          </div>

                          {/* On the bottom-most card of the stack, display the iconic suit emblem */}
                          {isLastCard && (
                            <div className={`w-full h-6 flex items-center justify-center ${color} relative z-10`}>
                              <span className="text-xl filter drop-shadow leading-none font-black">{symbol}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    /* Empty Suit Placeholder with faint watermark */
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/30 border-2 border-dashed border-white/20 rounded-xl relative shadow-inner">
                      <span className="text-3xl opacity-50 filter drop-shadow">{symbol}</span>
                      <span className="text-[10px] font-bold mt-1 uppercase opacity-50 tracking-wider">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
