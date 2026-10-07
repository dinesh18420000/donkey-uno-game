import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import type { ClientGameState, DonkeyCard, TrickPlay } from '../types';
import { getTurnNeighbors } from '../types';
import { socketService } from '../services/socket';
import { DonkeyHand } from './DonkeyHand';
import { RankCardModal } from './RankCardModal';
import { DONKEY_10_DECK_THEMES, rotatePlayersForViewer } from '../utils/donkeyThemes';
import { sounds } from '../utils/audio';
import {
  Volume2,
  VolumeX,
  Smile,
  MessageSquare,
  ChevronsLeft,
  Settings,
  X,
  LogOut,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Crown,
  RotateCcw,
  Flag,
  Timer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CardSuitIcon } from './CardSuitIcon';

interface DonkeyGameScreenProps {
  gameState: ClientGameState;
  onExitToLobby?: () => void;
}

const EMOTE_LIST = ['😂', '🔥', '🫏', '💥', '😱', '👏', '🥳', '😎'];
const QUICK_CHAT_MESSAGES = [
  'Nice move! 👏',
  'Watch out for CUT! 💥',
  'Who has Ace of Spades? ♠',
  'Donkey incoming! 🫏',
  'Good game! 🤝',
  'Hurry up please! ⏱️',
  'Oops! 😂'
];

/**
 * Dynamic sizing for center trick / deck cards based on active player count:
 * - 2 players: Large prominent cards (w-24/28, h-36/42)
 * - 3 players: Spacious cards (w-20/24, h-32/38)
 * - 4 players: Substantially larger cards (w-[72px]/[84px], h-[108px]/[126px])
 * - 5-6 players: Compact cards (w-14/16, h-22/24)
 * - 7-8 players: Mini cards (w-12/13, h-18/20)
 * - 9-10 players: Dense cards (w-10/11, h-15/17)
 */
interface CenterSlotDims {
  slotBox: string;
  rankText: string;
  cornerSuitSize: number;
  centerSuitSize: number;
  innerCircleSize: string;
  slotNumberText: string;
}

const getCenterSlotDims = (count: number): CenterSlotDims => {
  if (count <= 2) {
    return {
      slotBox: 'w-24 sm:w-28 h-36 sm:h-42 shadow-[0_12px_24px_-4px_rgba(0,0,0,0.7),0_4px_8px_rgba(0,0,0,0.5)]',
      rankText: 'text-xl sm:text-2xl font-black',
      cornerSuitSize: 18,
      centerSuitSize: 60,
      innerCircleSize: 'w-7 h-7',
      slotNumberText: 'text-sm sm:text-base font-black',
    };
  }
  if (count <= 3) {
    return {
      slotBox: 'w-20 sm:w-24 h-32 sm:h-38 shadow-[0_12px_24px_-4px_rgba(0,0,0,0.7),0_4px_8px_rgba(0,0,0,0.5)]',
      rankText: 'text-lg sm:text-xl font-black',
      cornerSuitSize: 16,
      centerSuitSize: 52,
      innerCircleSize: 'w-6 h-6',
      slotNumberText: 'text-xs sm:text-sm font-black',
    };
  }
  if (count <= 4) {
    return {
      slotBox: 'w-[72px] sm:w-[84px] h-[108px] sm:h-[126px] shadow-[0_10px_22px_-3px_rgba(0,0,0,0.65),0_4px_6px_rgba(0,0,0,0.4)]',
      rankText: 'text-base sm:text-lg font-black',
      cornerSuitSize: 15,
      centerSuitSize: 44,
      innerCircleSize: 'w-5 h-5',
      slotNumberText: 'text-xs sm:text-sm font-bold',
    };
  }
  if (count <= 6) {
    return {
      slotBox: 'w-14 sm:w-16 h-22 sm:h-24 shadow-[0_8px_16px_-2px_rgba(0,0,0,0.55)]',
      rankText: 'text-sm sm:text-base font-black',
      cornerSuitSize: 13,
      centerSuitSize: 34,
      innerCircleSize: 'w-4 h-4',
      slotNumberText: 'text-xs font-bold',
    };
  }
  if (count <= 8) {
    return {
      slotBox: 'w-12 sm:w-13 h-18 sm:h-20 shadow-[0_6px_12px_rgba(0,0,0,0.5)]',
      rankText: 'text-xs sm:text-sm font-black',
      cornerSuitSize: 12,
      centerSuitSize: 26,
      innerCircleSize: 'w-3 h-3',
      slotNumberText: 'text-[11px] font-bold',
    };
  }
  return {
    slotBox: 'w-10 sm:w-11 h-15 sm:h-17 shadow-[0_5px_10px_rgba(0,0,0,0.5)]',
    rankText: 'text-[11px] sm:text-xs font-black',
    cornerSuitSize: 10,
    centerSuitSize: 22,
    innerCircleSize: 'w-2.5 h-2.5',
    slotNumberText: 'text-[10px] font-bold',
  };
};

interface FlyingCardItem {
  id: string;
  card: DonkeyCard;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startScale?: number;
  startRot?: number;
  midRot?: number;
  arcX?: number;
}

interface SweepCardItem {
  id: string;
  card: DonkeyCard;
  slotX: number;
  slotY: number;
  centerX: number;
  centerY: number;
  victimX: number;
  victimY: number;
  stackRot: number;
}

// Isolated Countdown Badge Component: ticks every 1000ms internally without re-rendering parent DonkeyGameScreen
const TurnCountdownBadge: React.FC<{ expiresAt?: number; isTimeLow: boolean }> = React.memo(({ expiresAt, isTimeLow }) => {
  const [seconds, setSeconds] = useState<number>(() => {
    if (expiresAt && expiresAt > Date.now()) {
      return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    }
    return 30;
  });

  useEffect(() => {
    const updateTime = () => {
      if (expiresAt && expiresAt > Date.now()) {
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setSeconds(remaining);
      } else {
        setSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div
      className={`absolute -top-5 z-30 flex items-center gap-0.5 px-1.5 py-0.2 rounded-full border shadow-md text-[9px] font-black tracking-tight ${
        isTimeLow
          ? 'bg-red-950/95 border-red-500 text-red-300 animate-pulse'
          : 'bg-emerald-950/95 border-emerald-400 text-emerald-300'
      }`}
    >
      <Clock className={`w-2.5 h-2.5 ${isTimeLow ? 'text-red-400 animate-spin' : 'text-emerald-400'}`} />
      <span>{seconds}s</span>
    </div>
  );
});

export const DonkeyGameScreen: React.FC<DonkeyGameScreenProps> = ({ gameState, onExitToLobby }) => {
  const [selectedCard, setSelectedCard] = useState<DonkeyCard | null>(null);
  const [showEmotePicker, setShowEmotePicker] = useState<boolean>(false);
  const [showChatPicker, setShowChatPicker] = useState<boolean>(false);
  const [invalidCardNotice, setInvalidCardNotice] = useState<{ message: string; symbol: string; cardId: string } | null>(null);
  const [activeEmotes, setActiveEmotes] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);

  // Low-time alert (updates only when crossing <= 6s threshold, zero 1-second interval re-renders)
  const [isTimeLow, setIsTimeLow] = useState<boolean>(false);

  // States for Smooth Gameplay Animations
  const [flyingPlayCards, setFlyingPlayCards] = useState<FlyingCardItem[]>([]);
  const [cutSweepAnimation, setCutSweepAnimation] = useState<SweepCardItem[] | null>(null);
  const [hideDeckSlotsUntilNewRound, setHideDeckSlotsUntilNewRound] = useState<boolean>(false);
  const [hiddenHandCardId, setHiddenHandCardId] = useState<string | null>(null);
  // Cards that have completed their flight animation and are now landed face-up on table slots
  const [landedCardIds, setLandedCardIds] = useState<Set<string>>(() => {
    return new Set((gameState.currentTrick || []).map(t => t.card.id));
  });
  const myPlayedCardOriginRef = useRef<{ cardId: string; rect: DOMRect } | null>(null);
  const prevTrickRef = useRef<TrickPlay[]>(gameState.currentTrick || []);
  const lastTrickBeforeClearRef = useRef<TrickPlay[]>([]);
  // Synchronous lock against double-clicking / rapid spamming card plays
  const isPlayLockedRef = useRef<boolean>(false);

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const topAvatarsRef = useRef<HTMLDivElement>(null);
  const deckSlotsRef = useRef<HTMLDivElement>(null);

  const myId = socketService.playerId;
  const me = gameState.players.find(p => p.id === myId);

  // Filter active competing players (Exclude spectators so watchers are not seated as players)
  const rawActive = useMemo(() => gameState.players.filter(p => {
    if (p.isSpectator) return false;
    if (!p.rank && !p.isMercyEliminated) return true;
    if (gameState.currentTrick?.some(t => t.playerId === p.id)) return true;
    return false;
  }), [gameState.players, gameState.currentTrick]);

  const nonSpectatorPlayers = useMemo(() => gameState.players.filter(p => !p.isSpectator), [gameState.players]);
  const activePlayers = useMemo(() => (rawActive.length >= 2 ? rawActive : (nonSpectatorPlayers.length > 0 ? nonSpectatorPlayers : gameState.players)), [rawActive, nonSpectatorPlayers, gameState.players]);

  // CYCLIC / CIRCULAR QUEUE ROTATION:
  // Viewer is ALWAYS displayIndex = 0 (first slot), followed in cyclic order by others.
  const orderedPlayers = useMemo(() => rotatePlayersForViewer(activePlayers, myId), [activePlayers, myId]);
  const totalPlayers = orderedPlayers.length;

  // Safe winners who have already cleared cards (EXCLUDE spectators so watchers are never listed as safe)
  const finishedWinners = useMemo(() => gameState.players
    .filter(p => !p.isSpectator && p.rank && !p.isDonkey && p.cardsCount === 0)
    .sort((a, b) => (a.rank || 0) - (b.rank || 0)), [gameState.players]);

  const isMyTurn = gameState.currentTurnPlayerId === myId;
  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  const isFirstTrick = gameState.roundNumber === 1 && gameState.currentTrick.length === 0 && !gameState.leadSuit;
  const isGameOver = gameState.status === 'game_over';
  const hasPlayerCleared = !!me?.rank && me.cardsCount === 0;

  // Turn order: who plays before me and who plays after me among ACTIVE players
  const { playerBeforeMe, playerAfterMe } = useMemo(() => getTurnNeighbors(activePlayers, myId, 1), [activePlayers, myId]);

  // Animated feedback for Donkey Cut (cards collected from slots, stack in center, sweep to victim profile, and bust)
  const [isCutAnimating, setIsCutAnimating] = useState<boolean>(false);
  const [cutDetails, setCutDetails] = useState<{
    cutterName: string;
    victimName: string;
    cardsCount: number;
    victimId?: string;
  } | null>(null);
  const prevLastActionRef = React.useRef<string>(gameState.lastAction || '');

  useEffect(() => {
    const action = gameState.lastAction || '';
    const hasCut = action.includes('CUT!') || action.includes('picked up') || !!gameState.lastCutVictimId;

    if (hasCut && action !== prevLastActionRef.current) {
      prevLastActionRef.current = action;

      // 1. Identify victim via direct server field or robust regex
      let victimId = gameState.lastCutVictimId;
      let victimPlayer = victimId ? gameState.players.find(p => p.id === victimId) : undefined;

      // Robust regex that correctly captures names with spaces:
      // "💥 CUT! Cutter Name threw SPADES A. Victim Full Name picked up 4 cards!"
      const victimMatch = action.match(/\.\s+(.+?)\s+picked\s+up\s+(\d+)\s+cards/i);
      const cutterMatch = action.match(/CUT!\s+(.+?)\s+threw/i);
      const cutterName = cutterMatch ? cutterMatch[1].trim() : '';
      let victimName = victimPlayer?.name || '';
      const cardsCount = victimMatch ? parseInt(victimMatch[2], 10) : (gameState.currentTrick?.length || 4);

      if (!victimPlayer && victimMatch) {
        const parsedName = victimMatch[1].trim();
        victimPlayer = gameState.players.find(p => p.name.toLowerCase() === parsedName.toLowerCase());
        if (victimPlayer) {
          victimId = victimPlayer.id;
          victimName = victimPlayer.name;
        } else {
          victimName = parsedName;
        }
      }

      setCutDetails({
        cutterName,
        victimName: victimPlayer?.name || victimName,
        cardsCount,
        victimId: victimPlayer?.id || victimId
      });
      setIsCutAnimating(true);
      sounds.playCutMusic();

      // 2. Allow 480ms for the cutting card to complete its flight onto the table slot,
      // then neatly gather all played cards into a center stack before sweeping to victim's profile!
      const sweepTimer = setTimeout(() => {
        const cardsToCollect = (gameState.currentTrick && gameState.currentTrick.length > 0)
          ? gameState.currentTrick
          : lastTrickBeforeClearRef.current;

        if (cardsToCollect && cardsToCollect.length > 0) {
          const containerEl = gameContainerRef.current;
          const cRect = containerEl ? containerEl.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
          const CARD_W = 72;
          const CARD_H = 108;

          const targetVictimId = victimPlayer?.id || victimId;

          // Issue 4 FIX: When local player is the victim, sweep cards to their HAND area (bottom),
          // not the top avatar. When remote player is victim, sweep to their top avatar.
          let victimCenterX: number;
          let victimCenterY: number;

          if (targetVictimId === myId) {
            // Local player is the victim — sweep to their hand area at the bottom of screen
            const handAreaEl = document.getElementById('my-hand-area');
            const botProfileEl = document.getElementById(`bottom-profile-${myId}`);
            const targetEl = handAreaEl || botProfileEl;
            const tgtRect = targetEl?.getBoundingClientRect();
            victimCenterX = tgtRect ? ((tgtRect.left - cRect.left) + tgtRect.width / 2) : (cRect.width / 2);
            victimCenterY = tgtRect ? ((tgtRect.top - cRect.top) + tgtRect.height / 2) : (cRect.height - 120);
          } else {
            // Remote player is the victim — sweep to their top avatar
            const victimEl = targetVictimId ? document.getElementById(`avatar-${targetVictimId}`) : null;
            const vRect = victimEl?.getBoundingClientRect();
            victimCenterX = vRect ? ((vRect.left - cRect.left) + vRect.width / 2) : (cRect.width / 2);
            victimCenterY = vRect ? ((vRect.top - cRect.top) + vRect.height / 2) : 80;
          }

          const tableEl = deckSlotsRef.current;
          const tRect = tableEl?.getBoundingClientRect();
          const tableCenterX = tRect ? ((tRect.left - cRect.left) + tRect.width / 2) : (cRect.width / 2);
          const tableCenterY = tRect ? ((tRect.top - cRect.top) + tRect.height / 2) : (cRect.height * 0.42);

          const centerX = tableCenterX - CARD_W / 2;
          const centerY = tableCenterY - CARD_H / 2;
          const victimX = victimCenterX - CARD_W / 2;
          const victimY = victimCenterY - CARD_H / 2;

          setHideDeckSlotsUntilNewRound(true);

          const sweepItems: SweepCardItem[] = cardsToCollect.map((play, idx) => {
            const slotEl = document.getElementById(`deck-slot-${play.playerId}`);
            const sRect = slotEl?.getBoundingClientRect();
            const slotCenterX = sRect ? ((sRect.left - cRect.left) + sRect.width / 2) : tableCenterX;
            const slotCenterY = sRect ? ((sRect.top - cRect.top) + sRect.height / 2) : tableCenterY;

            const slotX = slotCenterX - CARD_W / 2;
            const slotY = slotCenterY - CARD_H / 2;
            const stackRot = ((idx * 4) % 11) - 5;

            return {
              id: `sweep-${play.card.id}-${idx}`,
              card: play.card,
              slotX,
              slotY,
              centerX,
              centerY,
              victimX,
              victimY,
              stackRot
            };
          });

          setCutSweepAnimation(sweepItems);

          // Sweep animation keyframe: 1400ms duration
          // Phase 1 (0-35%): slot to neat center stack
          // Phase 2 (35-55%): stacked together in center
          // Phase 3 (55-88%): entire stack sweeps to victim profile
          // Phase 4 (88-100%): shrinks into victim deck & disappears
          setTimeout(() => {
            setCutSweepAnimation(null);
          }, 1450);
        }
      }, 380);

      return () => {
        clearTimeout(sweepTimer);
      };
    } else {
      prevLastActionRef.current = action;
    }
  }, [gameState.lastAction, gameState.lastCutVictimId, gameState.players, myId]);

  // Issue 1 FIX: Separate auto-clear timer for BUSTED red highlight.
  // This runs independently of the cut sweep effect so its cleanup won't cancel the timer.
  useEffect(() => {
    if (!isCutAnimating) return;
    const bustedClearTimer = setTimeout(() => {
      setIsCutAnimating(false);
      setCutDetails(null);
    }, 3000);
    return () => clearTimeout(bustedClearTimer);
  }, [isCutAnimating]);

  // Track incoming card plays and trigger smooth hand/profile-to-deck flight animation
  useLayoutEffect(() => {
    const currentTrick = gameState.currentTrick || [];
    const prevTrick = prevTrickRef.current;

    // Reset slot hide & landed cards when new trick begins (table cleared)
    if (currentTrick.length === 0) {
      setHideDeckSlotsUntilNewRound(false);
      setHiddenHandCardId(null);
      setLandedCardIds(new Set());
      isPlayLockedRef.current = false;
    } else if (currentTrick.length < prevTrick.length) {
      // Trick was trimmed or partially cleared — keep only IDs still present
      const curIds = new Set(currentTrick.map(t => t.card.id));
      setLandedCardIds(prev => new Set([...prev].filter(id => curIds.has(id))));
    }

    if (currentTrick.length > prevTrick.length) {
      const newPlays = currentTrick.slice(prevTrick.length);
      const newFlights: FlyingCardItem[] = [];

      const containerEl = gameContainerRef.current;
      const cRect = containerEl ? containerEl.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const CARD_W = 72;
      const CARD_H = 108;

      newPlays.forEach(play => {
        let originCenterX = 0;
        let originCenterY = 0;

        // If local user played this card, launch directly from their hand card position!
        if (play.playerId === myId) {
          if (myPlayedCardOriginRef.current && myPlayedCardOriginRef.current.cardId === play.card.id) {
            const r = myPlayedCardOriginRef.current.rect;
            originCenterX = (r.left - cRect.left) + r.width / 2;
            originCenterY = (r.top - cRect.top) + r.height / 2;
          } else {
            const handCardEl = document.getElementById(`hand-card-${play.card.id}`);
            if (handCardEl) {
              const r = handCardEl.getBoundingClientRect();
              originCenterX = (r.left - cRect.left) + r.width / 2;
              originCenterY = (r.top - cRect.top) + r.height / 2;
            } else {
              originCenterX = cRect.width / 2;
              originCenterY = cRect.height - 180;
            }
          }
          myPlayedCardOriginRef.current = null;
        } else {
          // For remote players, launch from their top avatar profile
          const avatarEl = document.getElementById(`avatar-${play.playerId}`);
          const aRect = avatarEl?.getBoundingClientRect();
          originCenterX = aRect ? ((aRect.left - cRect.left) + aRect.width / 2) : (cRect.width / 2);
          originCenterY = aRect ? ((aRect.top - cRect.top) + aRect.height / 2) : 80;
        }

        const deckSlotEl = document.getElementById(`deck-slot-${play.playerId}`);
        const dRect = deckSlotEl?.getBoundingClientRect();
        const targetCenterX = dRect ? ((dRect.left - cRect.left) + dRect.width / 2) : (cRect.width / 2);
        const targetCenterY = dRect ? ((dRect.top - cRect.top) + dRect.height / 2) : (cRect.height * 0.42);

        const startX = originCenterX - CARD_W / 2;
        const startY = originCenterY - CARD_H / 2;
        const endX = targetCenterX - CARD_W / 2;
        const endY = targetCenterY - CARD_H / 2;

        const isFromHand = play.playerId === myId;
        const isFromLeft = startX < endX - 25;
        const isFromRight = startX > endX + 25;

        const startScale = isFromHand ? 0.92 : 0.75;
        const startRot = isFromLeft ? -4 : isFromRight ? 4 : -1;
        const midRot = isFromLeft ? 1 : isFromRight ? -1 : 0.5;
        const arcX = isFromLeft ? -10 : isFromRight ? 10 : 0;

        newFlights.push({
          id: `flight-${play.card.id}-${Date.now()}-${Math.random()}`,
          card: play.card,
          startX,
          startY,
          endX,
          endY,
          startScale,
          startRot,
          midRot,
          arcX
        });
      });

      if (newFlights.length > 0) {
        setFlyingPlayCards(prev => [...prev, ...newFlights]);
        setTimeout(() => {
          setFlyingPlayCards(prev => prev.filter(f => !newFlights.some(nf => nf.id === f.id)));
          setHiddenHandCardId(null);
          // Mark cards as officially landed — this reveals face-up card in the slot at the exact landing millisecond!
          setLandedCardIds(prev => {
            const next = new Set(prev);
            newPlays.forEach(p => next.add(p.card.id));
            return next;
          });
        }, 460);
      }
    }

    if (currentTrick.length > 0) {
      lastTrickBeforeClearRef.current = currentTrick;
    }
    prevTrickRef.current = currentTrick;
  }, [gameState.currentTrick, myId]);

  // Card slap audio when opponents place cards on the table
  const prevTrickLengthRef = useRef<number>(gameState.currentTrick?.length || 0);
  useEffect(() => {
    const curLen = gameState.currentTrick?.length || 0;
    if (curLen > prevTrickLengthRef.current) {
      const lastPlay = gameState.currentTrick?.[gameState.currentTrick.length - 1];
      if (lastPlay && lastPlay.playerId !== myId) {
        sounds.playCardPlay();
      }
    }
    prevTrickLengthRef.current = curLen;
  }, [gameState.currentTrick, myId]);

  // Victory fanfare celebration when player finishes cards
  const prevClearedRef = useRef<boolean>(false);
  useEffect(() => {
    if (hasPlayerCleared && !prevClearedRef.current) {
      sounds.playVictory();
    }
    prevClearedRef.current = hasPlayerCleared;
  }, [hasPlayerCleared]);

  // Auto-dismiss invalid card small pop tooltip after 1.6s
  useEffect(() => {
    if (!invalidCardNotice) return;
    const timer = setTimeout(() => {
      setInvalidCardNotice(null);
    }, 1600);
    return () => clearTimeout(timer);
  }, [invalidCardNotice]);

  // Low-time alert: triggers audio warning and sets isTimeLow when <= 6s (zero interval re-renders)
  useEffect(() => {
    if (!gameState.turnExpiresAt || gameState.turnExpiresAt <= Date.now()) {
      setIsTimeLow(false);
      return;
    }
    const msRemaining = gameState.turnExpiresAt - Date.now();
    const msUntilLow = msRemaining - 6000;
    if (msUntilLow <= 0) {
      setIsTimeLow(true);
      if (isMyTurn) sounds.playUnoWarning();
      return;
    }
    setIsTimeLow(false);
    const timer = setTimeout(() => {
      setIsTimeLow(true);
      if (isMyTurn) sounds.playUnoWarning();
    }, msUntilLow);
    return () => clearTimeout(timer);
  }, [gameState.currentTurnPlayerId, gameState.turnExpiresAt, isMyTurn]);

  // 10-Minute Total Match Countdown Timer
  const [gameSecondsRemaining, setGameSecondsRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!gameState.gameExpiresAt) {
      setGameSecondsRemaining(null);
      return;
    }
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((gameState.gameExpiresAt! - Date.now()) / 1000));
      setGameSecondsRemaining(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [gameState.gameExpiresAt]);

  const formatGameTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Remote Emote listener
  useEffect(() => {
    const socket = socketService.connect();
    const handleRemoteEmote = ({ playerId, emote }: { playerId: string; emote: string }) => {
      setActiveEmotes(prev => ({ ...prev, [playerId]: emote }));
      setTimeout(() => {
        setActiveEmotes(prev => {
          const copy = { ...prev };
          delete copy[playerId];
          return copy;
        });
      }, 3000);
    };

    socket.on('playerEmote', handleRemoteEmote);
    return () => {
      socket.off('playerEmote', handleRemoteEmote);
    };
  }, []);

  // Reset isWatching when a new round / match starts
  useEffect(() => {
    if (gameState.status === 'playing' && me?.cardsCount && me.cardsCount > 0) {
      setIsWatching(false);
    }
  }, [gameState.status, me?.cardsCount]);

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handlePlayCard = (card: DonkeyCard, originRect?: DOMRect | null) => {
    // Strictly prevent double-play bug: only one card can be played per turn/trick
    if (!isMyTurn || isPlayLockedRef.current) return;
    isPlayLockedRef.current = true;
    sounds.playCardPlay();

    // 1. Instantly hide card from hand so it doesn't show duplicated
    setHiddenHandCardId(card.id);

    // 2. Capture exact screen coordinates of the card in hand
    if (originRect) {
      myPlayedCardOriginRef.current = { cardId: card.id, rect: originRect };
    } else {
      const handEl = document.getElementById(`hand-card-${card.id}`);
      if (handEl) {
        myPlayedCardOriginRef.current = { cardId: card.id, rect: handEl.getBoundingClientRect() };
      }
    }

    socketService.playDonkeyCard(gameState.roomCode, card.id);
    setSelectedCard(null);

    // Auto-unlock safeguard in case server rejects move or network lags
    setTimeout(() => {
      isPlayLockedRef.current = false;
    }, 1200);
  };

  const handleSendEmote = (emote: string) => {
    socketService.sendEmote(gameState.roomCode, emote);
    setShowEmotePicker(false);
    setActiveEmotes(prev => ({ ...prev, [myId]: emote }));
    setTimeout(() => {
      setActiveEmotes(prev => {
        const copy = { ...prev };
        delete copy[myId];
        return copy;
      });
    }, 2500);
  };

  const handleSendQuickChat = (message: string) => {
    socketService.sendQuickChat(gameState.roomCode, message);
    setShowChatPicker(false);
  };

  const handleCheerPlayer = (playerId: string) => {
    sounds.playCardSelect();
    const cheers = ['👏', '🔥', '🎉', '😎', '🥳', '💥', '✨'];
    const cheer = cheers[Math.floor(Math.random() * cheers.length)];
    setActiveEmotes(prev => ({ ...prev, [playerId]: cheer }));
    setTimeout(() => {
      setActiveEmotes(prev => {
        const copy = { ...prev };
        delete copy[playerId];
        return copy;
      });
    }, 2200);
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    setShowSettingsModal(false);
    if (onExitToLobby) {
      onExitToLobby();
    } else {
      socketService.leaveRoom();
    }
  };

  const showClearedModal = hasPlayerCleared && !isWatching && !isGameOver;

  // Carousel scroll helpers for 10 players
  const scrollAvatars = (direction: 'left' | 'right') => {
    if (topAvatarsRef.current) {
      topAvatarsRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
    }
    if (deckSlotsRef.current) {
      deckSlotsRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
    }
  };

  return (
    <div ref={gameContainerRef} className="casino-blue-table relative w-full h-full flex flex-col justify-between overflow-hidden text-white select-none">
      
      {/* 1. TOP HEADER BAR WITH MOBILE SAFE-AREA (Guarantees profile icons never overlap notification bar) */}
      <div className="relative z-25 w-full px-3 safe-top py-1.5 flex items-center justify-between bg-[#040e24]/95 border-b border-cyan-500/30 gap-2 shadow-md">
        {/* Left: Donkey Master Title & Room Code */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xl filter drop-shadow">🫏</span>
          <div className="leading-tight">
            <span className="text-xs sm:text-sm font-black tracking-wider text-amber-300">DONKEY MASTER</span>
            <div className="text-[9px] text-cyan-200 font-mono font-bold">CODE: {gameState.roomCode}</div>
          </div>
        </div>

        {/* Center: Trick Status & Lead Suit & Match Timer */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {gameSecondsRemaining !== null && (
            <div
              title="10-Minute Game Timer (Match ends when time reaches 00:00)"
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border shadow-lg transition-colors flex-shrink-0 ${
                gameSecondsRemaining <= 60
                  ? 'bg-red-950/95 border-red-500 text-red-300 animate-pulse shadow-red-500/50'
                  : gameSecondsRemaining <= 180
                  ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-amber-500/30'
                  : 'bg-slate-900/90 border-cyan-500/50 text-cyan-200'
              }`}
            >
              <Timer className={`w-3 h-3 ${gameSecondsRemaining <= 60 ? 'text-red-400 animate-spin' : 'text-cyan-300'}`} />
              <span className="font-mono font-black">{formatGameTime(gameSecondsRemaining)}</span>
            </div>
          )}
          {gameState.leadSuit && (
            <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/60 px-2 py-0.5 rounded-full text-[10px] font-black text-amber-200 flex-shrink-0">
              <span>Lead:</span>
              <span className="text-xs">
                {gameState.leadSuit === 'SPADES' ? '♠' : gameState.leadSuit === 'HEARTS' ? '♥' : gameState.leadSuit === 'CLUBS' ? '♣' : '♦'}
              </span>
              <span>{gameState.leadSuit}</span>
            </div>
          )}
          <span className="text-[10px] text-slate-300 font-bold bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0">
            Round {gameState.roundNumber}
          </span>
        </div>

        {/* Right: Sound & Settings buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleSound}
            className="w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/20 text-cyan-300 hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/20 text-cyan-300 hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            title="Room Settings & Exit"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. SAFE / FINISHED WINNERS BANNER (When players win/rank out) */}
      {finishedWinners.length > 0 && !isGameOver && (
        <div className="relative z-15 w-full px-3 py-1 flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar bg-[#020b1c]/90 border-b border-cyan-500/30">
          <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <span>🏆</span>
            <span>Safe:</span>
          </span>
          {finishedWinners.map(w => (
            <div
              key={`safe-${w.id}`}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] sm:text-[11px] shadow-md border border-white/60 flex-shrink-0"
            >
              <span>#{w.rank}</span>
              <span className="truncate max-w-[80px]">{w.name}</span>
              <span className="text-[8px] bg-slate-950 text-emerald-300 px-1 py-0.2 rounded-full font-bold">Safe</span>
            </div>
          ))}
        </div>
      )}

      {/* SPECTATOR BADGE (If user joined mid-game to watch as spectator) */}
      {me?.isSpectator && !isGameOver && (
        <div className="relative z-15 w-fit mx-auto px-3.5 py-1 my-1 rounded-full bg-indigo-950/90 border border-indigo-400/80 text-indigo-200 text-xs font-black flex items-center gap-1.5 shadow-lg">
          <Eye className="w-3.5 h-3.5 text-indigo-300" />
          <span>Watching Match Live (Spectator Mode)</span>
        </div>
      )}

      {/* SPECTATOR BADGE (If player cleared hand and is watching) */}
      {!me?.isSpectator && isWatching && !isGameOver && (
        <div className="relative z-15 w-fit mx-auto px-3 py-0.5 my-0.5 rounded-full bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-[11px] font-black flex items-center gap-1.5 animate-pulse">
          <Eye className="w-3.5 h-3.5" />
          <span>Watching Match Live (Rank #{me?.rank} Safe)</span>
        </div>
      )}

      {/* 3. TOP PLAYER AVATARS ROW (Supports up to 10 players, cyclic viewer rotation, NO overlapping) */}
      <div className="relative z-20 w-full max-w-xl mx-auto px-2 pt-0 pb-0">
        <div className="relative flex items-center justify-center">
          {/* Scroll Left Button (if > 5 players) */}
          {totalPlayers > 5 && (
            <button
              onClick={() => scrollAvatars('left')}
              className="absolute -left-1 z-30 w-7 h-7 rounded-full bg-blue-950/90 border border-cyan-400/80 text-amber-300 flex items-center justify-center shadow-lg active:scale-90"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Avatars Container */}
          <div
            ref={topAvatarsRef}
            className="w-full flex items-start justify-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pt-8 pb-2 px-2"
          >
            {orderedPlayers.map((player) => {
              const isTurn = gameState.currentTurnPlayerId === player.id;
              const isSelf = player.displayIndex === 0;
              const isVictim = isCutAnimating && (
                player.id === cutDetails?.victimId ||
                (cutDetails?.victimName && player.name.toLowerCase() === cutDetails.victimName.toLowerCase())
              );

              return (
                <div
                  key={`top-avatar-${player.id}`}
                  id={`avatar-${player.id}`}
                  className="flex flex-col items-center flex-shrink-0 relative transition-transform"
                  style={{ minWidth: totalPlayers <= 4 ? '70px' : totalPlayers <= 7 ? '58px' : '48px' }}
                >
                  {/* BUSTED Stamp Badge & Incoming Toast */}
                  {isVictim && (
                    <div className="absolute -top-10 z-50 flex flex-col items-center pointer-events-none animate-busted-stamp whitespace-nowrap">
                      <div className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-2 border-yellow-300 text-white font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(239,68,68,1)] flex items-center gap-1.5 animate-pulse">
                        <span className="text-base animate-bounce">💥</span>
                        <span className="tracking-wider">BUSTED!</span>
                        <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded-full font-black">+{cutDetails?.cardsCount}</span>
                      </div>
                      <div className="text-[9px] font-black text-yellow-300 bg-black/85 px-2 py-0.5 rounded-full mt-0.5 border border-yellow-400/50 shadow animate-added-to-deck">
                        📥 Added to Deck
                      </div>
                    </div>
                  )}

                  {/* Red fiery shockwave aura when victim */}
                  {isVictim && (
                    <div className="absolute inset-0 -m-3 rounded-full bg-red-600/60 blur-md animate-ping pointer-events-none" />
                  )}

                  {/* Floating Emote */}
                  {activeEmotes[player.id] && (
                    <div className="absolute -top-10 z-40 text-3xl animate-bounce filter drop-shadow">
                      {activeEmotes[player.id]}
                    </div>
                  )}

                  {/* Turn Countdown Badge */}
                  {isTurn && !player.rank && (
                    <TurnCountdownBadge expiresAt={gameState.turnExpiresAt} isTimeLow={isTimeLow} />
                  )}

                  {/* Circular Avatar Container with Active Turn Steady Highlight */}
                  <div
                    onClick={() => handleCheerPlayer(player.id)}
                    className="relative mt-1 cursor-pointer group active:scale-95 transition-transform"
                    title="Tap to Cheer!"
                  >
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 transition-all duration-300 relative ${
                        isVictim
                          ? 'animate-busted-shudder animate-busted-aura'
                          : isTurn
                          ? isTimeLow
                            ? 'animate-gentle-turn-red ring-2 ring-red-500'
                            : 'animate-gentle-turn-green ring-2 ring-emerald-400'
                          : isSelf
                          ? 'ring-2 ring-amber-400 shadow-[0_2px_8px_rgba(250,204,21,0.5)]'
                          : 'ring-2 ring-white/60 shadow-[0_2px_6px_rgba(0,0,0,0.4)]'
                      }`}
                      style={{
                        borderColor: !isTurn && !isVictim ? player.theme.accentHex : undefined
                      }}
                    >
                      {/* Inner Profile Disc: Pure solid theme color! NO symbols, NO letters, NO text, NO profile images */}
                      <div
                        className={`w-full h-full rounded-full ${player.theme.deckBackGradient} border-2 border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),0_2px_6px_rgba(0,0,0,0.35)] relative overflow-hidden`}
                      >
                        {/* 3D Gloss Sheen */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />
                        <div className="absolute top-1 left-1.5 w-3 h-1.5 rounded-full bg-white/60 blur-[0.5px] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Colored Nameplate Pill */}
                  <div
                    className={`mt-1 px-1.5 py-0.2 rounded-md font-black shadow-md truncate text-center text-[9px] sm:text-[10px] max-w-[64px] sm:max-w-[72px] border ${player.theme.pillBg} ${player.theme.pillText} ${player.theme.pillBorder}`}
                  >
                    {player.name}
                  </div>

                  {/* "(You)" indicator for the local viewer */}
                  {isSelf && (
                    <span className="text-[9px] font-black text-amber-300 drop-shadow mt-0.2 leading-none">
                      (You)
                    </span>
                  )}

                  {/* Safe Rank Badge if Cleared */}
                  {player.rank && !player.isDonkey && (
                    <span className="text-[8px] font-black bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 px-1 py-0.1 rounded-full mt-0.5 shadow-sm">
                      #{player.rank} Safe
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Scroll Right Button (if > 5 players) */}
          {totalPlayers > 5 && (
            <button
              onClick={() => scrollAvatars('right')}
              className="absolute -right-1 z-30 w-7 h-7 rounded-full bg-blue-950/90 border border-cyan-400/80 text-amber-300 flex items-center justify-center shadow-lg active:scale-90"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. CENTER 3D CARD ARENA TABLE (Felt Stadium Mat with 3D Depth, Neon Edge, & Slots) */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-2 py-1 my-auto flex flex-col items-center">
        {/* 3D Oval Felt Table Surface (Shakes and turns red during cut strike) */}
        <div
          className={`relative w-full rounded-[28px] sm:rounded-[36px] p-2.5 sm:p-3.5 bg-gradient-to-b from-[#0a2f6e]/95 via-[#061e47]/98 to-[#03112b] border-2 transition-[border-color,box-shadow] duration-200 ${
            isCutAnimating
              ? 'animate-cut-shake border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.7),inset_0_4px_22px_rgba(239,68,68,0.4)]'
              : 'border-cyan-400/40 shadow-[inset_0_4px_22px_rgba(6,182,212,0.25),0_15px_35px_rgba(0,0,0,0.6)]'
          } flex flex-col items-center overflow-hidden`}
        >
          {/* Subtle Top Table Felt Spotlight Glow */}
          <div className="absolute inset-x-8 top-0 h-20 bg-gradient-to-b from-cyan-400/30 via-blue-500/10 to-transparent rounded-t-[28px] pointer-events-none" />

          <div className="relative w-full flex items-center justify-center">
            {/* Left Arrow Button for Deck Slots */}
            {totalPlayers > 5 && (
              <button
                onClick={() => scrollAvatars('left')}
                className="absolute -left-1 z-30 w-7 h-7 rounded-full bg-black/70 border border-white/50 text-white flex items-center justify-center shadow-lg active:scale-90 hover:bg-black/90"
                title="Scroll Decks Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Slots Container with permanent colors & player's card / deck */}
            <div
              ref={deckSlotsRef}
              className={`flex items-center justify-center ${
                totalPlayers <= 3 ? 'gap-4 sm:gap-6' : totalPlayers <= 4 ? 'gap-2.5 sm:gap-3.5' : totalPlayers <= 6 ? 'gap-2 sm:gap-2.5' : 'gap-1.5 sm:gap-2'
              } overflow-x-auto no-scrollbar py-3 px-6`}
            >
              {orderedPlayers.map((player, slotIdx) => {
                const slotNumber = slotIdx + 1;
                const isViewerSlot = slotIdx === 0;
                const isSlotTurn = gameState.currentTurnPlayerId === player.id;
                
                // Check if a card has been played in this trick by this player
                const trickItem = gameState.currentTrick?.find(t => t.playerId === player.id);
                const playedCard = trickItem?.card;

                // Dynamic card & slot dimensions scaling according to player count
                const dims = getCenterSlotDims(totalPlayers);

                // A card in a slot is ONLY shown face-up if it has finished flying and landed on the table!
                // While flying or waiting, the slot strictly maintains its theme card back (Yellow for Player 1)!
                const isLanded = playedCard ? landedCardIds.has(playedCard.id) : false;
                const isCurrentlySweeping = cutSweepAnimation !== null || hideDeckSlotsUntilNewRound;
                const showFaceUpCard = playedCard && isLanded && !isCurrentlySweeping;

                return (
                  <div key={`deck-slot-${player.id}`} id={`deck-slot-${player.id}`} className="flex flex-col items-center flex-shrink-0 relative">
                    {/* The Card / Deck Slot Box */}
                    <div
                      className={`${dims.slotBox} rounded-xl border-2 transition-all duration-200 relative flex items-center justify-center shadow-lg ${
                        player.theme.deckBorder
                      } ${
                        isSlotTurn
                          ? isTimeLow
                            ? 'ring-4 ring-red-500 shadow-[0_0_24px_#ef4444] scale-105 animate-pulse'
                            : 'ring-4 ring-emerald-400 shadow-[0_0_24px_#22c55e] scale-105'
                          : ''
                      }`}
                    >
                      {showFaceUpCard ? (
                        /* FACE-UP PLAYED CARD (Revealed only once card finishes flight and lands) */
                        <div 
                          className="w-full h-full rounded-xl bg-white border border-slate-200/90 flex flex-col justify-between p-1 sm:p-1.5 select-none shadow-[0_6px_14px_rgba(0,0,0,0.35)] overflow-hidden relative"
                        >
                          {/* Top Header Row: Left = Bold Rank, Right = Small Vector Suit */}
                          <div className="flex items-center justify-between w-full leading-none relative z-10 px-0.5">
                            <span className={`${dims.rankText} font-black tracking-tight ${
                              playedCard.suit === 'HEARTS' || playedCard.suit === 'DIAMONDS' ? 'text-[#ea1d2c]' : 'text-[#0f172a]'
                            } drop-shadow-sm select-none`}>
                              {playedCard.value}
                            </span>
                            <CardSuitIcon suit={playedCard.suit} size={dims.cornerSuitSize} />
                          </div>

                          {/* Centered Large 3D Glossy Suit Emblem */}
                          <div className="w-full flex-1 flex items-center justify-center my-auto relative z-10">
                            <CardSuitIcon suit={playedCard.suit} size={dims.centerSuitSize} glossy={true} />
                          </div>

                          {/* Bottom Inverted Header Row (Only shown if card has enough height) */}
                          {totalPlayers <= 6 && (
                            <div className="flex items-center justify-between w-full leading-none rotate-180 relative z-10 px-0.5">
                              <span className={`${dims.rankText} font-black tracking-tight ${
                                playedCard.suit === 'HEARTS' || playedCard.suit === 'DIAMONDS' ? 'text-[#ea1d2c]' : 'text-[#0f172a]'
                              } drop-shadow-sm select-none`}>
                                {playedCard.value}
                              </span>
                              <CardSuitIcon suit={playedCard.suit} size={dims.cornerSuitSize} />
                            </div>
                          )}
                        </div>
                      ) : (
                        /* FACE-DOWN GLOSSY 3D COLORED CARD BACK */
                        <div
                          className={`w-full h-full rounded-xl ${player.theme.deckBackGradient} border-t-2 border-t-white/70 border-l border-l-white/50 border-r-2 border-r-black/30 border-b-2 border-b-black/40 flex flex-col items-center justify-center p-1 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_12px_rgba(0,0,0,0.3)] relative overflow-hidden`}
                        >
                          {/* Glossy diagonal sheen */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
                          
                          {/* Inner Glossy Metallic Medallion */}
                          <div className="w-full h-full rounded-lg border-2 border-white/40 flex flex-col items-center justify-center bg-black/15 shadow-inner">
                            <div className={`${dims.innerCircleSize} rounded-full bg-gradient-to-br from-white/40 to-white/10 border-2 border-white/60 shadow-md flex items-center justify-center`}>
                              <span className="text-[9px] filter drop-shadow-sm leading-none opacity-80">🎴</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Slot Number & Yellow Pointer for Player 1 (You) */}
                    <div className="mt-1 flex flex-col items-center leading-none">
                      {isViewerSlot ? (
                        <div className="flex flex-col items-center">
                          <span className="text-amber-400 text-xs sm:text-sm font-black leading-none drop-shadow">▲</span>
                          <span className={`text-white ${dims.slotNumberText} drop-shadow`}>{slotNumber}</span>
                        </div>
                      ) : (
                        <span className={`text-white ${dims.slotNumberText} opacity-90 drop-shadow`}>{slotNumber}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Arrow Button for Deck Slots */}
            {totalPlayers > 5 && (
              <button
                onClick={() => scrollAvatars('right')}
                className="absolute -right-1 z-30 w-7 h-7 rounded-full bg-black/70 border border-white/50 text-white flex items-center justify-center shadow-lg active:scale-90 hover:bg-black/90"
                title="Scroll Decks Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 5. SMALL POPUP TOOLTIP ON INVALID CARD TOUCH */}
      {invalidCardNotice && (
        <div className="relative z-40 flex justify-center w-full px-4 -mb-1 pointer-events-none animate-pop-in">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-950 border-2 border-amber-400 text-amber-300 font-black text-xs shadow-[0_4px_18px_rgba(0,0,0,0.8),0_0_12px_rgba(250,204,21,0.6)]">
            <span className="text-sm filter drop-shadow">{invalidCardNotice.symbol}</span>
            <span className="leading-none drop-shadow">{invalidCardNotice.message}</span>
          </div>
        </div>
      )}

      {/* 6. BOTTOM USER HAND (4-Suit Cascade: Spades, Hearts, Clubs, Diamonds - Matches Screenshot) */}
      <div id="my-hand-area" className={`relative z-10 w-full transition-all duration-300 ${
        isMyTurn ? 'bg-gradient-to-t from-emerald-950/60 to-transparent' : ''
      }`}>
        {me && !me.isSpectator && me.cardsCount > 0 && (
          <DonkeyHand
            hand={(gameState.myHand as DonkeyCard[]) || []}
            leadSuit={gameState.leadSuit}
            isMyTurn={isMyTurn}
            isFirstTrick={isFirstTrick}
            selectedCardId={selectedCard?.id}
            hiddenCardId={hiddenHandCardId}
            onSelectCard={card => {
              setSelectedCard(card);
              setInvalidCardNotice(null);
            }}
            onPlayCard={(card, rect) => handlePlayCard(card, rect)}
            onInvalidMove={error => {
              setInvalidCardNotice({ message: error.message, symbol: error.symbol, cardId: error.card.id });
            }}
            onQuickChat={handleSendQuickChat}
          />
        )}
      </div>

      {/* 7. BOTTOM CONTROL BAR: Back, Emoji, Chat, Profile (with green/red turn ring), DEAL Button */}
      <div className={`relative z-20 w-full px-3 py-2 safe-bottom flex items-center justify-between transition-all duration-300 ${
        isMyTurn
          ? 'bg-gradient-to-t from-[#022c15] via-[#043d1f] to-[#065f2c] border-t-2 border-emerald-400 shadow-[0_-8px_30px_rgba(16,185,129,0.5)]'
          : 'bg-gradient-to-t from-[#020b1c] via-[#051739] to-[#0a2760] border-t-2 border-cyan-500/50 shadow-[0_-8px_25px_rgba(0,0,0,0.7)]'
      }`}>
        
        {/* Left Side Buttons: Exit '<<' + Yellow Emoji + Yellow Chat */}
        <div className="relative flex items-center gap-1.5 sm:gap-2">
          {/* Blue '<<' Exit/Settings Button with 3D Tactile Push */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-10 h-10 rounded-xl bg-gradient-to-b from-blue-800 to-blue-950 border-t border-t-cyan-300 border-x border-cyan-500/50 border-b-3 border-b-blue-950 shadow-[0_4px_0_#1e3a8a,0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center text-white active:translate-y-1 active:shadow-[0_1px_0_#1e3a8a] active:scale-95 transition-all cursor-pointer"
            title="Settings & Exit"
          >
            <ChevronsLeft className="w-5 h-5 text-cyan-200" />
          </button>

          {/* Yellow Smiling Emoji Button with 3D Raised Bevel */}
          <button
            onClick={() => {
              sounds.playCardSelect();
              setShowEmotePicker(!showEmotePicker);
              setShowChatPicker(false);
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-t-2 border-t-white/80 border-b-2 border-b-amber-700 shadow-[0_4px_0_#92400e,0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center active:translate-y-1 active:shadow-[0_1px_0_#92400e] active:scale-95 transition-all cursor-pointer"
            title="Send Emoji"
          >
            <Smile className="w-5 h-5 text-slate-950 fill-amber-400" />
          </button>

          {/* Yellow Chat Message Button with 3D Raised Bevel */}
          <button
            onClick={() => {
              sounds.playCardSelect();
              setShowChatPicker(!showChatPicker);
              setShowEmotePicker(false);
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-t-2 border-t-white/80 border-b-2 border-b-amber-700 shadow-[0_4px_0_#92400e,0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center active:translate-y-1 active:shadow-[0_1px_0_#92400e] active:scale-95 transition-all cursor-pointer"
            title="Quick Chat"
          >
            <MessageSquare className="w-5 h-5 text-slate-950 fill-amber-400" />
          </button>

          {/* Emote Picker Dropdown */}
          {showEmotePicker && (
            <div className="absolute bottom-14 left-0 z-50 p-2 rounded-2xl bg-slate-900 border-2 border-amber-400 shadow-2xl flex gap-1.5">
              {EMOTE_LIST.map((em, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendEmote(em)}
                  className="text-2xl hover:scale-125 transition-transform active:scale-95 p-1"
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {/* Quick Chat Dropdown */}
          {showChatPicker && (
            <div className="absolute bottom-14 left-10 z-50 p-2 rounded-2xl bg-slate-900 border-2 border-amber-400 shadow-2xl flex flex-col gap-1 min-w-[190px]">
              <div className="text-[10px] font-black text-amber-300 px-2 py-0.5 uppercase tracking-wider border-b border-white/10 mb-0.5">
                Quick Messages
              </div>
              {QUICK_CHAT_MESSAGES.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuickChat(msg)}
                  className="text-left px-2.5 py-1 rounded-xl text-xs font-bold text-white hover:bg-purple-900 active:scale-95 transition-all truncate"
                >
                  {msg}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Current Player Profile with Green/Red Turn Circle */}
        {(() => {
          const isMeVictim = isCutAnimating && (
            myId === cutDetails?.victimId ||
            (cutDetails?.victimName && me?.name.toLowerCase() === cutDetails.victimName.toLowerCase())
          );

          return (
            <div
              id={`bottom-profile-${myId}`}
              onClick={() => handleCheerPlayer(myId)}
              className="flex flex-col items-center justify-center mx-auto relative cursor-pointer group active:scale-95 transition-transform"
              title="Tap to Cheer!"
            >
              {/* BUSTED Stamp Badge & Incoming Toast for Local Player */}
              {isMeVictim && (
                <div className="absolute -top-12 z-50 flex flex-col items-center pointer-events-none animate-busted-stamp whitespace-nowrap">
                  <div className="px-3.5 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-2 border-yellow-300 text-white font-black text-xs sm:text-sm shadow-[0_0_30px_rgba(239,68,68,1)] flex items-center gap-1.5 animate-pulse">
                    <span className="text-base animate-bounce">💥</span>
                    <span className="tracking-wider">BUSTED!</span>
                    <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded-full font-black">+{cutDetails?.cardsCount}</span>
                  </div>
                  <div className="text-[9px] font-black text-yellow-300 bg-black/85 px-2 py-0.5 rounded-full mt-0.5 border border-yellow-400/50 shadow animate-added-to-deck">
                    📥 Added to Hand
                  </div>
                </div>
              )}

              {/* Red fiery shockwave aura when victim */}
              {isMeVictim && (
                <div className="absolute inset-0 -m-3 rounded-full bg-red-600/60 blur-md animate-ping pointer-events-none" />
              )}

              <div className="relative">
                <div
                  className={`w-12 h-12 rounded-full p-0.5 transition-all duration-300 relative ${
                    isMeVictim
                      ? 'animate-busted-shudder animate-busted-aura'
                      : isMyTurn
                      ? isTimeLow
                        ? 'animate-gentle-turn-red ring-2 ring-red-500'
                        : 'animate-gentle-turn-green ring-2 ring-emerald-400'
                      : 'ring-2 ring-amber-400 shadow-[0_3px_8px_rgba(250,204,21,0.4)]'
                  }`}
                >
              {/* Inner Profile Disc: Pure Yellow Glossy Disc (No symbols, no text, no image) */}
              <div className="w-full h-full rounded-full bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500 border-2 border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),0_2px_6px_rgba(0,0,0,0.35)] relative overflow-hidden">
                {/* 3D Gloss Sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />
                <div className="absolute top-1 left-1.5 w-3.5 h-1.5 rounded-full bg-white/60 blur-[0.5px] pointer-events-none" />
              </div>
            </div>
          </div>

            <div className="mt-0.5 px-2.5 py-0.2 rounded-md bg-gradient-to-b from-amber-300 to-amber-400 border border-yellow-200 text-slate-950 font-black text-[10px] sm:text-[11px] shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
              {me?.name || 'Thala'}
            </div>
          </div>
        );
      })()}

        {/* Right: Prominent 3D Yellow "DEAL / PLAY" Action Button */}
        {hasPlayerCleared || me?.isSpectator ? (
          <button
            onClick={() => setShowExitConfirm(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 active:scale-95 transition-all shadow-md"
          >
            Exit Game
          </button>
        ) : (
          <button
            onClick={() => {
              if (!isMyTurn || isPlayLockedRef.current) {
                if (!isMyTurn) {
                  setInvalidCardNotice({
                    message: "⏳ It's not your turn! Please wait for your turn.",
                    symbol: '⏳',
                    cardId: ''
                  });
                }
                return;
              }
              if (selectedCard) {
                const el = document.getElementById(`hand-card-${selectedCard.id}`);
                handlePlayCard(selectedCard, el ? el.getBoundingClientRect() : null);
              } else {
                // Auto-pick the lowest valid card in hand
                const myHand = (gameState.myHand as DonkeyCard[]) || [];
                const validCard = myHand.find(c => {
                  if (isFirstTrick) return c.suit === 'SPADES' && c.value === 'A';
                  if (gameState.leadSuit && myHand.some(h => h.suit === gameState.leadSuit)) {
                    return c.suit === gameState.leadSuit;
                  }
                  return true;
                });
                if (validCard) {
                  const el = document.getElementById(`hand-card-${validCard.id}`);
                  handlePlayCard(validCard, el ? el.getBoundingClientRect() : null);
                } else {
                  setInvalidCardNotice({
                    message: 'Please tap a card in your hand to deal!',
                    symbol: '🃏',
                    cardId: ''
                  });
                }
              }
            }}
            className={`px-6 sm:px-8 py-2 sm:py-2.5 rounded-full font-black text-sm sm:text-base tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 border-t-2 border-t-white/80 border-b-2 border-b-amber-800 shadow-[0_6px_0_#92400e,0_12px_24px_rgba(0,0,0,0.6)] active:translate-y-1.5 active:shadow-[0_1px_0_#92400e] cursor-pointer ${
              isMyTurn
                ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500 text-red-950 ring-4 ring-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.85)]'
                : 'bg-gradient-to-b from-amber-300/80 via-yellow-400/80 to-amber-500/80 text-red-950/80'
            }`}
          >
            {isMyTurn && selectedCard ? (
              <div className="flex items-center gap-1 font-black">
                <span>PLAY</span>
                <span className="text-base leading-none">
                  {selectedCard.suit === 'SPADES' ? '♠' : selectedCard.suit === 'HEARTS' ? '♥' : selectedCard.suit === 'CLUBS' ? '♣' : '♦'}
                </span>
                <span>{selectedCard.value}</span>
              </div>
            ) : (
              <span>DEAL</span>
            )}
          </button>
        )}
      </div>

      {/* WATCH OR EXIT MODAL (When player finishes their cards) */}
      {showClearedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fadeIn">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 border-2 border-amber-400 text-center shadow-2xl">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-xl font-black text-amber-300">YOU CLEARED YOUR CARDS!</h2>
            <p className="text-sm font-bold text-white mt-1">
              You are Rank #{me?.rank} (Safe)!
            </p>
            <p className="text-xs text-blue-200 mt-2">
              Would you like to watch the rest of the game or exit to the lobby?
            </p>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setIsWatching(true)}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm shadow-xl active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Watch Game</span>
              </button>
              <button
                onClick={() => setShowExitConfirm(true)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 active:scale-95"
              >
                Exit to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fadeIn">
          <div className="w-full max-w-xs p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 border-2 border-cyan-500 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <Settings className="w-5 h-5" /> Game Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-cyan-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-900/40 border border-cyan-400/20">
                <span className="text-xs font-bold">Sound Effects</span>
                <button
                  onClick={toggleSound}
                  className={`p-1.5 rounded-lg font-black text-xs flex items-center gap-1 ${
                    soundEnabled ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{soundEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-900/40 border border-cyan-400/20 text-xs">
                <span className="font-bold">Player Turn Timer</span>
                <span className="font-mono font-bold text-amber-300">20 Seconds</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-900/40 border border-cyan-400/20 text-xs">
                <span className="font-bold">Match Max Time</span>
                <span className="font-mono font-bold text-emerald-300">10 Minutes</span>
              </div>

              {/* Host Controls: Transfer Host Rights */}
              {gameState.hostId === myId && (
                <div className="p-2.5 rounded-xl bg-blue-900/40 border border-cyan-400/20 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-2">
                    <Crown className="w-4 h-4 fill-current" />
                    <span>Transfer Room Host</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                    {gameState.players
                      .filter(p => p.id !== myId && !p.isBot && !p.isDisconnected)
                      .map(p => (
                        <div key={p.id} className="flex items-center justify-between p-1.5 rounded-lg bg-black/40">
                          <span className="truncate max-w-[130px] font-semibold">{p.name}</span>
                          <button
                            onClick={() => {
                              socketService.transferHost(gameState.roomCode, p.id);
                              setShowSettingsModal(false);
                            }}
                            className="px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] flex items-center gap-1 active:scale-95 shadow"
                          >
                            <Crown className="w-3 h-3 fill-current" />
                            <span>Make Host</span>
                          </button>
                        </div>
                      ))}
                    {gameState.players.filter(p => p.id !== myId && !p.isBot && !p.isDisconnected).length === 0 && (
                      <span className="text-[10px] text-slate-400 italic">No other human players in room.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Host Controls: Return all to lobby or End game */}
              {gameState.hostId === myId && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-black text-amber-300">
                    <Crown className="w-4 h-4 fill-current text-amber-400" />
                    <span>👑 Host Match Controls</span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Return all players back to the room lobby? Current match will stop.')) {
                        socketService.returnToLobby(gameState.roomCode);
                        setShowSettingsModal(false);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>RETURN ALL PLAYERS TO LOBBY</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Complete and end the match now? Donkey and rankings will be declared.')) {
                        socketService.forceEndGame(gameState.roomCode);
                        setShowSettingsModal(false);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>COMPLETE & END MATCH</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowExitConfirm(true)}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>EXIT TO LOBBY</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXIT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fadeIn">
          <div className="w-full max-w-xs p-6 rounded-3xl bg-slate-950 border-2 border-red-500 text-center shadow-2xl">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="text-lg font-black text-white">Leave Game?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Are you sure you want to exit? A computer bot will take over your cards so your friends can continue playing.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                Stay in Game
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg active:scale-95"
              >
                Yes, Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER & FINAL RANKINGS MODAL */}
      {isGameOver && (
        <RankCardModal
          gameState={gameState}
          onReplay={() => socketService.replayGame(gameState.roomCode)}
          onBackToRoom={() => socketService.returnToLobby(gameState.roomCode)}
          onExit={handleConfirmExit}
          isHost={gameState.hostId === myId}
          myId={myId}
        />
      )}

      {/* 8. HARDWARE-ACCELERATED ROOT-LEVEL ANIMATION LAYER (100% pixel-perfect on any device/aspect ratio) */}
      {(flyingPlayCards.length > 0 || cutSweepAnimation) && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          {flyingPlayCards.map(flight => (
            <div
              key={flight.id}
              className="animate-profile-to-deck"
              style={{
                '--f-start-x': `${flight.startX}px`,
                '--f-start-y': `${flight.startY}px`,
                '--f-end-x': `${flight.endX}px`,
                '--f-end-y': `${flight.endY}px`,
              } as React.CSSProperties}
            >
              <div
                className="animate-flight-inner"
                style={{
                  '--f-start-scale': flight.startScale ?? 0.92,
                  '--f-start-rot': `${flight.startRot ?? -2}deg`,
                  '--f-mid-rot': `${flight.midRot ?? 1}deg`,
                  '--f-arc-x': `${flight.arcX ?? 0}px`,
                } as React.CSSProperties}
              >
                <div className="w-[72px] sm:w-[84px] h-[108px] sm:h-[126px] rounded-xl bg-white border border-slate-200/90 flex flex-col justify-between p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.65)] select-none overflow-hidden">
                  <div className="flex items-center justify-between w-full leading-none px-0.5">
                    <span className={`text-base sm:text-lg font-black tracking-tight ${
                      flight.card.suit === 'HEARTS' || flight.card.suit === 'DIAMONDS' ? 'text-[#ea1d2c]' : 'text-[#0f172a]'
                    }`}>
                      {flight.card.value}
                    </span>
                    <CardSuitIcon suit={flight.card.suit} size={15} />
                  </div>
                  <div className="w-full flex-1 flex items-center justify-center my-auto">
                    <CardSuitIcon suit={flight.card.suit} size={44} glossy={true} />
                  </div>
                  <div className="flex items-center justify-between w-full leading-none rotate-180 px-0.5">
                    <span className={`text-base sm:text-lg font-black tracking-tight ${
                      flight.card.suit === 'HEARTS' || flight.card.suit === 'DIAMONDS' ? 'text-[#ea1d2c]' : 'text-[#0f172a]'
                    }`}>
                      {flight.card.value}
                    </span>
                    <CardSuitIcon suit={flight.card.suit} size={15} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {cutSweepAnimation && cutSweepAnimation.map(sweep => (
            <div
              key={sweep.id}
              className="animate-collect-and-sweep"
              style={{
                '--c-slot-x': `${sweep.slotX}px`,
                '--c-slot-y': `${sweep.slotY}px`,
                '--c-center-x': `${sweep.centerX}px`,
                '--c-center-y': `${sweep.centerY}px`,
                '--c-victim-x': `${sweep.victimX}px`,
                '--c-victim-y': `${sweep.victimY}px`,
                '--c-rot': `${sweep.stackRot}deg`,
              } as React.CSSProperties}
            >
              <div className="w-[72px] sm:w-[80px] h-[108px] sm:h-[116px] rounded-xl bg-white border border-slate-200/90 flex flex-col justify-between p-1.5 shadow-[0_16px_35px_rgba(0,0,0,0.75)] select-none overflow-hidden">
                <div className="flex items-center justify-between w-full leading-none px-0.5">
                  <span className={`text-base font-black tracking-tight ${
                    sweep.card.suit === 'HEARTS' || sweep.card.suit === 'DIAMONDS' ? 'text-[#ea1d2c]' : 'text-[#0f172a]'
                  }`}>
                    {sweep.card.value}
                  </span>
                  <CardSuitIcon suit={sweep.card.suit} size={14} />
                </div>
                <div className="w-full flex-1 flex items-center justify-center my-auto">
                  <CardSuitIcon suit={sweep.card.suit} size={36} glossy={true} />
                </div>
                <div className="flex items-center justify-between w-full leading-none rotate-180 px-0.5">
                  <span className={`text-base font-black tracking-tight ${
                    sweep.card.suit === 'HEARTS' || sweep.card.suit === 'DIAMONDS' ? 'text-[#ea1d2c]' : 'text-[#0f172a]'
                  }`}>
                    {sweep.card.value}
                  </span>
                  <CardSuitIcon suit={sweep.card.suit} size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
