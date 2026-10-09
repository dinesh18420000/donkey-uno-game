import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { UnoCard, UnoColor } from '../types';
import { canPlayUnoCard } from '../types';
import { UnoCardView } from './UnoCardView';
import { sounds } from '../utils/audio';
import { Layers, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface UnoHandProps {
  hand: UnoCard[];
  activeCard?: UnoCard;
  activeColor?: UnoColor;
  drawStackCount: number;
  isMyTurn: boolean;
  selectedCard: UnoCard | null;
  hiddenCardId?: string | null;
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
  hiddenCardId,
  onSelectCard,
  onPlayCard
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [isGroupedMode, setIsGroupedMode] = useState<boolean>(false);
  const [sortByColor, setSortByColor] = useState<boolean>(true);

  // Measure container width responsively with ResizeObserver
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Check if a card is currently playable respecting +4/+2 stack rules
  const checkCardPlayable = useCallback(
    (card: UnoCard): boolean => {
      if (!activeCard || !activeColor) return false;
      return canPlayUnoCard(card, activeCard, activeColor, drawStackCount);
    },
    [activeCard, activeColor, drawStackCount]
  );

  // Helper to sort an array of cards based on player's chosen sort preference (Color vs Value)
  const sortCardList = useCallback(
    (cards: UnoCard[]) => {
      const list = [...cards];
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
    },
    [sortByColor]
  );

  // Natural sorting based on player's chosen sort preference (Color vs Value)
  const sortedHand = useMemo(() => {
    return sortCardList(hand);
  }, [hand, sortCardList]);

  // Grouped cards: playable groups first, then unplayable groups, preserving internal sort
  const groupedCards = useMemo(() => {
    const groups: { card: UnoCard; count: number; isValid: boolean }[] = [];
    sortedHand.forEach(card => {
      const existing = groups.find(
        g => g.card.color === card.color && g.card.type === card.type && g.card.value === card.value
      );
      if (existing) {
        existing.count++;
      } else {
        groups.push({
          card,
          count: 1,
          isValid: isMyTurn && checkCardPlayable(card)
        });
      }
    });
    return groups;
  }, [sortedHand, checkCardPlayable, isMyTurn]);

  // Card Dimensions & Spacing Formula (clamped between minSpacing and maxSpacing)
  const cardWidth = 64; // w-16 = 64px
  const minSpacing = 24; // enough to show the corner icon clearly
  const maxSpacing = Math.round(cardWidth * 0.6); // 38px (~60% of card width)
  const naturalGap = 8;
  const count = sortedHand.length;

  // Horizontal padding and outside navigation button dimensions
  const horizontalPadding = 16;
  const arrowButtonReserved = 40; // 32px button + margins

  // Determine if scrolling will be needed
  const baseAvailableWidth = Math.max(120, containerWidth - horizontalPadding * 2);
  const scrollAvailableWidth = Math.max(100, containerWidth - horizontalPadding * 2 - arrowButtonReserved * 2);

  const wouldOverflowAtMin = count > 1 && (count - 1) * minSpacing + cardWidth > baseAvailableWidth;
  const availableWidth = wouldOverflowAtMin ? scrollAvailableWidth : baseAvailableWidth;

  // spacing = (availableWidth - cardWidth) / (cardCount - 1), clamped between minSpacing and maxSpacing
  const spacing = useMemo(() => {
    if (count <= 1) return cardWidth;
    const rawSpacing = (availableWidth - cardWidth) / (count - 1);
    return Math.min(maxSpacing, Math.max(minSpacing, rawSpacing));
  }, [count, availableWidth, cardWidth, minSpacing, maxSpacing]);

  const totalHandWidth = useMemo(() => {
    if (count <= 1) return cardWidth;
    return (count - 1) * spacing + cardWidth;
  }, [count, spacing, cardWidth]);

  const needsScroll = totalHandWidth > availableWidth;

  // Grouped view width and scroll check
  const groupedNaturalWidth = groupedCards.length * (cardWidth + naturalGap);
  const needsGroupedScroll = groupedNaturalWidth > availableWidth;
  const shouldShowScrollButtons = isGroupedMode ? needsGroupedScroll : needsScroll;

  // Lock ref to prevent double-click or rapid multi-card submission
  const isPlayDebouncedRef = useRef<boolean>(false);

  // Reset debounce lock if turn changes
  useEffect(() => {
    if (!isMyTurn) {
      isPlayDebouncedRef.current = false;
    }
  }, [isMyTurn]);

  // Two-tap Play Handler with double-click guard and tap blocking on unplayable cards
  const handleCardClick = (card: UnoCard) => {
    if (isPlayDebouncedRef.current) return;

    // Block taps on unplayable cards
    const isValid = checkCardPlayable(card);
    if (!isValid) return;

    if (!isMyTurn) {
      onSelectCard(card);
      return;
    }

    if (selectedCard?.id === card.id) {
      // Second tap on already selected card -> PLAY CARD!
      isPlayDebouncedRef.current = true;
      onSelectCard(null); // Clear selection immediately
      onPlayCard(card);
      setTimeout(() => {
        isPlayDebouncedRef.current = false;
      }, 1200);
    } else {
      // First tap -> SELECT CARD (raises by 20px, brings to front)
      onSelectCard(card);
      sounds.playCardDeal();
    }
  };

  const handleScroll = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

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
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-600 text-slate-300 text-[11px] font-bold transition shadow cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span>{sortByColor ? 'Color' : 'Value'}</span>
          </button>

          {/* GROUPED TOGGLE */}
          <button
            onClick={() => setIsGroupedMode(!isGroupedMode)}
            aria-label="Toggle grouped card mode"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition active:scale-95 shadow cursor-pointer ${
              isGroupedMode
                ? 'bg-amber-500 text-slate-950 border-amber-300 font-black'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Grouped</span>
          </button>
        </div>
      </div>

      {/* Main Hand Display: Arrow buttons OUTSIDE the card track with left/right padding */}
      <div className="relative w-full flex items-center justify-center px-1 sm:px-2">
        {/* Left Scroll Navigation Arrow - OUTSIDE card area */}
        {shouldShowScrollButtons && (
          <button
            onClick={() => handleScroll(-180)}
            aria-label="Scroll hand left"
            className="flex-shrink-0 z-30 w-8 h-8 rounded-full bg-slate-900/95 border border-amber-400/50 text-amber-300 hover:text-white flex items-center justify-center hover:bg-slate-800 active:scale-90 shadow-xl mr-1 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Scrolling or Overlapping Container with safe padding */}
        <div
          ref={scrollRef}
          id="uno-hand-area"
          className={`flex-1 overflow-x-auto overflow-y-visible py-4 px-4 scrollbar-none touch-pan-x flex items-center ${
            (isGroupedMode ? needsGroupedScroll : needsScroll) ? 'justify-start snap-x snap-mandatory' : 'justify-center'
          }`}
          style={{ minHeight: '135px', WebkitOverflowScrolling: 'touch' }}
        >
          {isGroupedMode ? (
            /* GROUPED VIEW: Clean single-row horizontal scrollable track */
            <div className="flex items-center gap-2.5 justify-start sm:justify-center flex-nowrap min-w-max px-2">
              {groupedCards.map(({ card, count: groupCount, isValid }) => {
                const isSelected = selectedCard?.id === card.id;

                return (
                  <div
                    key={card.id}
                    id={`uno-hand-card-${card.id}`}
                    className={`relative flex-shrink-0 snap-start transition-all duration-200 ${
                      hiddenCardId === card.id ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                    style={{
                      transform: isSelected ? 'translateY(-20px)' : 'translateY(0)',
                      zIndex: isSelected ? 100 : 10
                    }}
                  >
                    <UnoCardView
                      card={card}
                      isSelected={isSelected}
                      isValid={isValid}
                      isMyTurn={isMyTurn}
                      isOverlapped={false}
                      hasLeftSeparator={false}
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
          ) : (
            /* DYNAMIC OVERLAPPING FAN VIEW: Clean Z-Order, fully opaque, left strip only, slide transitions */
            <div
              className="relative h-32 flex-shrink-0 transition-all duration-200"
              style={{
                width: `${totalHandWidth}px`,
                minWidth: `${totalHandWidth}px`
              }}
            >
              {sortedHand.map((card, idx) => {
                const isPlayable = isMyTurn && checkCardPlayable(card);
                const isSelected = selectedCard?.id === card.id;
                const isLastCard = idx === count - 1;
                // Overlapped cards hide border, glow, shadow; last card & selected card show full outline
                const isOverlapped = !isLastCard && !isSelected;
                const hasLeftSeparator = idx > 0;

                return (
                  <div
                    key={card.id}
                    id={`uno-hand-card-${card.id}`}
                    className={`absolute top-2 snap-start transition-all duration-250 ease-out ${
                      hiddenCardId === card.id ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                    style={{
                      left: `${idx * spacing}px`,
                      zIndex: isSelected ? 100 : idx + 10,
                      transform: isSelected ? 'translateY(-20px)' : 'translateY(0)',
                      pointerEvents: 'auto'
                    }}
                  >
                    <UnoCardView
                      card={card}
                      isSelected={isSelected}
                      isValid={isPlayable}
                      isMyTurn={isMyTurn}
                      isOverlapped={isOverlapped}
                      hasLeftSeparator={hasLeftSeparator}
                      onClick={() => handleCardClick(card)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Scroll Navigation Arrow - OUTSIDE card area */}
        {shouldShowScrollButtons && (
          <button
            onClick={() => handleScroll(180)}
            aria-label="Scroll hand right"
            className="flex-shrink-0 z-30 w-8 h-8 rounded-full bg-slate-900/95 border border-amber-400/50 text-amber-300 hover:text-white flex items-center justify-center hover:bg-slate-800 active:scale-90 shadow-xl ml-1 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
