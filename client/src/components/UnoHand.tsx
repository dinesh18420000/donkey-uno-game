import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { UnoCard, UnoColor } from '../types';
import { canPlayUnoCard } from '../types';
import { UnoCardView } from './UnoCardView';
import { sounds } from '../utils/audio';
import { Layers, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, Play } from 'lucide-react';

interface UnoHandProps {
  hand: UnoCard[];
  activeCard?: UnoCard;
  activeColor?: UnoColor;
  drawStackCount: number;
  isMyTurn: boolean;
  selectedCard: UnoCard | null;
  onSelectCard: (card: UnoCard | null) => void;
  onPlayCard: (card: UnoCard) => void;
}

export const UnoHand: React.FC<UnoHandProps> = ({
  hand,
  activeCard,
  activeColor,
  drawStackCount,
  isMyTurn,
  selectedCard,
  onSelectCard,
  onPlayCard
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [isGroupedMode, setIsGroupedMode] = useState<boolean>(false);
  const [sortByColor, setSortByColor] = useState<boolean>(true);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Sorted hand
  const sortedHand = useMemo(() => {
    const list = [...hand];
    const colorOrder: Record<UnoColor, number> = { red: 1, blue: 2, green: 3, yellow: 4, wild: 5 };

    if (sortByColor) {
      list.sort((a, b) => {
        if (colorOrder[a.color] !== colorOrder[b.color]) {
          return colorOrder[a.color] - colorOrder[b.color];
        }
        return (a.value ?? 99) - (b.value ?? 99);
      });
    } else {
      list.sort((a, b) => {
        const valA = a.type === 'number' ? (a.value ?? 0) : 100;
        const valB = b.type === 'number' ? (b.value ?? 0) : 100;
        if (valA !== valB) return valA - valB;
        return colorOrder[a.color] - colorOrder[b.color];
      });
    }
    return list;
  }, [hand, sortByColor]);

  // Card Dimensions in px
  const cardWidth = 64; // w-16
  const minStep = 18; // min visible strip
  const naturalGap = 6;
  const count = sortedHand.length;

  // Overlap calculation formula:
  // step = max(minStep, (handWidth - cardWidth) / (count - 1))
  const availableWidth = Math.max(100, containerWidth - 24);
  const naturalWidth = count * (cardWidth + naturalGap);
  const needsOverlap = naturalWidth > availableWidth;

  const step = useMemo(() => {
    if (count <= 1) return cardWidth;
    if (!needsOverlap) return cardWidth + naturalGap;
    const computed = (availableWidth - cardWidth) / (count - 1);
    return Math.max(minStep, computed);
  }, [count, needsOverlap, availableWidth]);

  // Auto-switch recommendation when cards exceed fit
  const canFitAll = step >= minStep || isGroupedMode;

  // Grouped cards calculation
  const groupedCards = useMemo(() => {
    const groups: { card: UnoCard; count: number }[] = [];
    sortedHand.forEach(card => {
      const existing = groups.find(
        g => g.card.color === card.color && g.card.type === card.type && g.card.value === card.value
      );
      if (existing) {
        existing.count++;
      } else {
        groups.push({ card, count: 1 });
      }
    });
    return groups;
  }, [sortedHand]);

  // Two-tap Play Handler
  const handleCardClick = (card: UnoCard) => {
    if (!isMyTurn || !activeCard || !activeColor) {
      onSelectCard(card);
      return;
    }

    const isValid = canPlayUnoCard(card, activeCard, activeColor, drawStackCount);
    if (!isValid) {
      sounds.playCardPlay();
      return;
    }

    if (selectedCard?.id === card.id) {
      // Second tap on already selected card -> PLAY CARD!
      onPlayCard(card);
    } else {
      // First tap -> SELECT CARD
      onSelectCard(card);
      sounds.playCardDeal();
    }
  };

  const handleScroll = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const selectedIsValid =
    selectedCard &&
    activeCard &&
    activeColor &&
    canPlayUnoCard(selectedCard, activeCard, activeColor, drawStackCount);

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center select-none pb-1">
      {/* Hand Status Bar & Actions */}
      <div className="w-full flex items-center justify-between px-3 py-1 mb-1 text-xs">
        {/* Card Count & Warnings */}
        <div className="flex items-center gap-2">
          <span className="font-black px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-white flex items-center gap-1 shadow">
            <span>🃏</span>
            <span>{count} card{count !== 1 ? 's' : ''}</span>
          </span>

          {count >= 20 && (
            <span className="px-2 py-0.5 rounded-full bg-red-600/90 text-white font-black text-[10px] animate-pulse shadow">
              ⚠️ {count}/25 (Mercy at 25!)
            </span>
          )}

          {count === 1 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] animate-bounce shadow">
              🔥 1 CARD LEFT!
            </span>
          )}
        </div>

        {/* View Controls & Play Button */}
        <div className="flex items-center gap-2">
          {/* SORT BUTTON */}
          <button
            onClick={() => setSortByColor(!sortByColor)}
            aria-label={`Sort cards by ${sortByColor ? 'value' : 'color'}`}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-600 text-slate-300 text-[11px] font-bold transition shadow"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span>{sortByColor ? 'Color' : 'Value'}</span>
          </button>

          {/* GROUPED TOGGLE */}
          <button
            onClick={() => setIsGroupedMode(!isGroupedMode)}
            aria-label="Toggle grouped card mode"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition active:scale-95 shadow ${
              isGroupedMode
                ? 'bg-amber-500 text-slate-950 border-amber-300 font-black'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Grouped</span>
          </button>

          {/* CONFIRM PLAY BUTTON (Second way to play selected card) */}
          {selectedCard && (
            <button
              onClick={() => handleCardClick(selectedCard)}
              disabled={!selectedIsValid || !isMyTurn}
              aria-label="Play selected card"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs shadow-lg transition duration-150 ${
                selectedIsValid && isMyTurn
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white animate-pulse active:scale-95 ring-2 ring-emerald-300'
                  : 'bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>PLAY CARD</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Hand Display */}
      <div className="relative w-full flex items-center justify-center">
        {/* Left Scroll Navigation Arrow */}
        {needsOverlap && !isGroupedMode && (
          <button
            onClick={() => handleScroll(-180)}
            aria-label="Scroll hand left"
            className="absolute left-1 z-30 w-8 h-8 rounded-full bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 active:scale-90 shadow-md"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Scrolling or Overlapping Container */}
        <div
          ref={scrollRef}
          className="w-full overflow-x-auto overflow-y-visible py-4 px-8 scrollbar-none flex justify-center items-center"
          style={{ minHeight: '110px' }}
        >
          {isGroupedMode ? (
            /* GROUPED VIEW */
            <div className="flex items-center gap-2 justify-center flex-wrap">
              {groupedCards.map(({ card, count: groupCount }) => {
                const isValid =
                  activeCard && activeColor
                    ? canPlayUnoCard(card, activeCard, activeColor, drawStackCount)
                    : false;
                const isSelected = selectedCard?.id === card.id;

                return (
                  <div key={card.id} className="relative flex-shrink-0">
                    <UnoCardView
                      card={card}
                      isSelected={isSelected}
                      isValid={isValid && isMyTurn}
                      onClick={() => handleCardClick(card)}
                    />
                    {groupCount > 1 && (
                      <span className="absolute -top-2 -right-2 z-30 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-md border border-slate-900 pointer-events-none">
                        ×{groupCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : !needsOverlap ? (
            /* NATURAL SIDE-BY-SIDE VIEW */
            <div className="flex items-center gap-2 justify-center">
              {sortedHand.map(card => {
                const isValid =
                  activeCard && activeColor
                    ? canPlayUnoCard(card, activeCard, activeColor, drawStackCount)
                    : false;
                const isSelected = selectedCard?.id === card.id;

                return (
                  <div key={card.id} className="flex-shrink-0">
                    <UnoCardView
                      card={card}
                      isSelected={isSelected}
                      isValid={isValid && isMyTurn}
                      onClick={() => handleCardClick(card)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            /* DYNAMIC OVERLAPPING FAN VIEW */
            <div
              className="relative h-28"
              style={{
                width: `${(count - 1) * step + cardWidth}px`,
                maxWidth: '100%'
              }}
            >
              {sortedHand.map((card, idx) => {
                const isValid =
                  activeCard && activeColor
                    ? canPlayUnoCard(card, activeCard, activeColor, drawStackCount)
                    : false;
                const isSelected = selectedCard?.id === card.id;

                return (
                  <div
                    key={card.id}
                    className="absolute top-0 transition-transform duration-150"
                    style={{
                      left: `${idx * step}px`,
                      zIndex: isSelected ? 50 : idx + 10
                    }}
                  >
                    <UnoCardView
                      card={card}
                      isSelected={isSelected}
                      isValid={isValid && isMyTurn}
                      onClick={() => handleCardClick(card)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Scroll Navigation Arrow */}
        {needsOverlap && !isGroupedMode && (
          <button
            onClick={() => handleScroll(180)}
            aria-label="Scroll hand right"
            className="absolute right-1 z-30 w-8 h-8 rounded-full bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 active:scale-90 shadow-md"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
