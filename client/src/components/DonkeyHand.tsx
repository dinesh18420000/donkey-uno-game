import React, { useState } from 'react';
import type { DonkeyCard, Suit } from '../types';
import { DonkeyCardView } from './DonkeyCardView';
import { CardSuitIcon } from './CardSuitIcon';
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
  onQuickChat?: (msg: string) => void;
}

const SUITS: { suit: Suit; label: string; symbol: string; color: string; borderSlot: string; bgSlot: string }[] = [
  {
    suit: 'SPADES',
    label: 'Spades',
    symbol: '♠',
    color: 'text-slate-950',
    borderSlot: 'border-white/15',
    bgSlot: 'bg-black/20'
  },
  {
    suit: 'HEARTS',
    label: 'Hearts',
    symbol: '♥',
    color: 'text-rose-600',
    borderSlot: 'border-white/15',
    bgSlot: 'bg-black/20'
  },
  {
    suit: 'CLUBS',
    label: 'Clubs',
    symbol: '♣',
    color: 'text-slate-950',
    borderSlot: 'border-white/15',
    bgSlot: 'bg-black/20'
  },
  {
    suit: 'DIAMONDS',
    label: 'Diamonds',
    symbol: '♦',
    color: 'text-rose-600',
    borderSlot: 'border-white/15',
    bgSlot: 'bg-black/20'
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
  onInvalidMove,
  onQuickChat
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
      {/* Hand Header Bar: Cards count, Lead Suit Info, Play Fast Pill, & View Mode Switcher */}
      <div className="flex items-center justify-between px-1 mb-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-black text-amber-300">
            Hand ({hand.length})
          </span>
          {leadSuit && (
            <span className="text-[10px] bg-slate-900/90 border border-cyan-400/40 px-2 py-0.5 rounded-full text-cyan-200 font-bold">
              Lead: {leadSuit === 'SPADES' ? '♠ Spades' : leadSuit === 'HEARTS' ? '♥ Hearts' : leadSuit === 'CLUBS' ? '♣ Clubs' : '♦ Diamonds'}
            </span>
          )}
          {isMyTurn && (
            <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-md">
              YOUR TURN
            </span>
          )}
        </div>

        {/* Floating Quick Action: Play Fast 💬 (From YouTube Video Reference) */}
        <button
          onClick={() => {
            sounds.playCardSelect();
            if (onQuickChat) onQuickChat('Play Fast! ⏱️');
          }}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] sm:text-[11px] shadow-[0_2px_8px_rgba(250,204,21,0.5)] border border-white hover:scale-105 active:scale-95 transition-transform"
          title="Prompt other players to play fast"
        >
          <span>Play Fast</span>
          <span className="text-[11px]">💬</span>
        </button>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode('columns')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'columns'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-cyan-200 hover:text-white'
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
                : 'text-cyan-200 hover:text-white'
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
        <div className="w-full max-h-56 sm:max-h-64 overflow-y-auto p-2 rounded-2xl bg-black/40 border border-cyan-500/30 backdrop-blur-md no-scrollbar">
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
        /* SUIT COLUMNS VIEW (4 Columns with equal card distance and enlarged symbols) */
        (() => {
          // Compute max card count across all 4 suits to ensure UNIFORM equal distance across all columns
          const maxSuitCards = Math.max(1, ...SUITS.map(({ suit }) => hand.filter(c => c.suit === suit).length));
          const CARD_HEIGHT = 90;
          // Fixed uniform step distance for EVERY card in EVERY column (strictly equal)
          const uniformStep = maxSuitCards > 5 ? Math.max(18, Math.floor((198 - CARD_HEIGHT) / (maxSuitCards - 1))) : 25;
          const containerHeight = Math.max(145, Math.min(210, (maxSuitCards - 1) * uniformStep + CARD_HEIGHT));

          return (
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 items-end">
              {SUITS.map(({ suit, label, color }) => {
                // Sort ascending: 2, 3 ... 10, J, Q, K, A
                const suitCards = hand
                  .filter(c => c.suit === suit)
                  .sort((a, b) => a.rank - b.rank);

                const isColumnLead = leadSuit === suit;
                const canCut = isMyTurn && leadSuit && !hasLeadSuit && suitCards.length > 0;
                const count = suitCards.length;

                return (
                  <div
                    key={suit}
                    className={`relative flex flex-col rounded-2xl p-1 transition-all border ${
                      isColumnLead
                        ? 'border-amber-400 bg-amber-400/10 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                        : canCut
                        ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse'
                        : 'border-white/10 bg-black/15'
                    }`}
                  >
                    {/* Subtle Column Header: Small Suit Icon & Count Badge */}
                    <div className="flex items-center justify-between px-1 mb-1 text-xs">
                      <div className="flex items-center gap-1">
                        <CardSuitIcon suit={suit} size={16} />
                        <span className="text-[11px] font-bold text-slate-200 hidden sm:inline">{label}</span>
                      </div>
                      <span className="bg-black/60 px-1.5 py-0.2 rounded-full text-[10px] text-amber-300 font-mono font-black border border-white/20">
                        {count}
                      </span>
                    </div>

                    {/* Cascade Stack Container (Uniform height & strictly equal card distances) */}
                    <div
                      className="relative w-full overflow-visible z-10"
                      style={{ height: `${containerHeight}px` }}
                    >
                      {count > 0 ? (
                        suitCards.map((card, idx) => {
                          const isSelected = selectedCardId === card.id;
                          const isLastCard = idx === count - 1;
                          // Exact equal distance spacing for every card
                          const topPos = idx * uniformStep;
                          const isShaking = shakingCardId === card.id;
                          const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
                          const rankColor = isRed ? 'text-[#ea1d2c]' : 'text-[#0f172a]';

                          return (
                            <div
                              key={card.id}
                              onClick={() => handleCardClick(card)}
                              style={{
                                position: 'absolute',
                                top: `${isSelected ? Math.max(0, topPos - 16) : topPos}px`,
                                left: 0,
                                right: 0,
                                height: `${CARD_HEIGHT}px`,
                                zIndex: isSelected ? 100 : idx + 5
                              }}
                              className={`rounded-xl bg-white border border-slate-200/90 shadow-[0_4px_10px_rgba(0,0,0,0.32)] transition-all duration-150 select-none overflow-hidden cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'ring-4 ring-yellow-400 bg-amber-50 shadow-[0_16px_32px_rgba(250,204,21,0.9),0_8px_16px_rgba(0,0,0,0.5)] -translate-y-3.5 scale-105 z-50 border-amber-400'
                                  : 'hover:z-40 hover:-translate-y-1.5 hover:scale-102 active:scale-95 active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] hover:border-amber-400'
                              } ${
                                isShaking
                                  ? 'animate-card-shake ring-4 ring-red-500 bg-red-50'
                                  : ''
                              }`}
                            >
                              {/* Card Header Strip: Bold Rank on Left, Small Suit Icon on Right (Exact Donkey Master Match) */}
                              <div className="h-6 sm:h-7 px-1.5 sm:px-2 pt-0.5 flex items-center justify-between leading-none relative z-10">
                                <span className={`text-lg sm:text-xl font-[900] tracking-tight ${rankColor} drop-shadow-[0_0.5px_0_currentColor] select-none`}>
                                  {card.value}
                                </span>
                                <CardSuitIcon suit={card.suit} size={17} />
                              </div>

                              {/* Center of Bottom Card: Giant 3D Glossy Suit Emblem (Exact Donkey Master Match) */}
                              {isLastCard && (
                                <div className="w-full flex-1 flex items-center justify-center pt-0.5 pb-1 relative z-10">
                                  <CardSuitIcon suit={card.suit} size={54} glossy={true} />
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        /* Empty Suit Placeholder with subtle dashed border and faint 3D suit icon */
                        <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl relative">
                          <CardSuitIcon suit={suit} size={44} className="opacity-30" />
                          <span className="text-[10px] font-bold mt-1 uppercase text-white/40 tracking-wider">Empty</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </div>
  );
};
