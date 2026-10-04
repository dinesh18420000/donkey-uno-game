import React, { useState, useEffect, useRef } from 'react';
import type { ClientGameState, UnoCard, UnoColor } from '../types';
import { canPlayUnoCard, getTurnNeighbors } from '../types';
import { socketService } from '../services/socket';
import { PlayerAvatar } from './PlayerAvatar';
import { UnoCardView, UnoCardBackView } from './UnoCardView';
import { UnoHand } from './UnoHand';
import { RankCardModal } from './RankCardModal';
import {
  getLandscapeUnoSeatPosition,
  reorderPlayersForLocalView,
  getAvatarSizeForCount,
  PLAYER_THEME_KEYS
} from '../utils/tableSeating';
import { sounds } from '../utils/audio';
import {
  Volume2,
  VolumeX,
  Smile,
  Flame,
  Settings,
  X,
  LogOut,
  Clock,
  Timer,
  AlertTriangle,
  Eye,
  Megaphone,
  Siren,
  Play,
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SkipProhibitionIcon } from './SkipProhibitionIcon';

interface UnoGameScreenProps {
  gameState: ClientGameState;
  onExitToLobby?: () => void;
}

const EMOTE_LIST = ['😂', '🔥', '💀', '💥', '😱', '👏', '🥳', '😈'];
const WILD_COLORS: { color: UnoColor; label: string; bg: string }[] = [
  { color: 'red', label: 'RED', bg: 'bg-[#ff1744] hover:bg-red-500' },
  { color: 'blue', label: 'BLUE', bg: 'bg-[#0091ea] hover:bg-blue-400' },
  { color: 'green', label: 'GREEN', bg: 'bg-[#00c853] hover:bg-emerald-400' },
  { color: 'yellow', label: 'YELLOW', bg: 'bg-[#ffd600] hover:bg-amber-300 text-slate-950 font-black' }
];

interface UnoFlyingCardItem {
  id: string;
  card?: UnoCard;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startScale?: number;
  midScale?: number;
  endScale?: number;
  startRot?: number;
  midRot?: number;
  endRot?: number;
  arcX?: number;
  arcY?: number;
  duration?: number;
}

export const UnoGameScreen: React.FC<UnoGameScreenProps> = ({ gameState, onExitToLobby }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const [selectedCard, setSelectedCard] = useState<UnoCard | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showSwapPicker, setShowSwapPicker] = useState<boolean>(false);
  const [pendingCard, setPendingCard] = useState<UnoCard | null>(null);
  const [showEmotePicker, setShowEmotePicker] = useState<boolean>(false);
  const [activeEmotes, setActiveEmotes] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [showEliminatedModal, setShowEliminatedModal] = useState<boolean>(false);
  const prevEliminatedRef = useRef<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [gameSecondsRemaining, setGameSecondsRemaining] = useState<number | null>(null);

  const formatGameTime = (sec: number): string => {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Smooth Card Flight Animations & Visual State
  const [flyingCards, setFlyingCards] = useState<UnoFlyingCardItem[]>([]);
  const [hiddenHandCardId, setHiddenHandCardId] = useState<string | null>(null);
  const myPlayedCardOriginRef = useRef<{ cardId: string; rect: DOMRect } | null>(null);
  const localPlayedCardIdRef = useRef<string | null>(null);
  const isActionLockedRef = useRef<boolean>(false);
  const [isPlayingAction, setIsPlayingAction] = useState<boolean>(false);

  // Reverse Surge & Table Flow Indicator
  const prevDirectionRef = useRef<number>(gameState.direction || 1);
  const [isReverseSurging, setIsReverseSurging] = useState<boolean>(false);

  // 0 Pass All Hands & 7 Swap Dual Spotlight States
  const [is0PassAnimating, setIs0PassAnimating] = useState<boolean>(false);
  const [isSwapAnimating, setIsSwapAnimating] = useState<boolean>(false);
  const [swapBannerText, setSwapBannerText] = useState<string>('');
  const [swapHighlightPlayerIds, setSwapHighlightPlayerIds] = useState<string[]>([]);
  const [isCardSlamming, setIsCardSlamming] = useState<boolean>(false);
  const [isDrawingAnimation, setIsDrawingAnimation] = useState<boolean>(false);
  const [skipBannerText, setSkipBannerText] = useState<string | null>(null);
  const [localSkippedPlayerId, setLocalSkippedPlayerId] = useState<string | null>(null);

  // Strict Turn Sequencing: Visual turn waits for card flights and effects to finish
  const [visualTurnPlayerId, setVisualTurnPlayerId] = useState<string>(gameState.currentTurnPlayerId);
  const pendingTurnPlayerIdRef = useRef<string>(gameState.currentTurnPlayerId);

  const myId = socketService.playerId;
  const me = gameState.players.find(p => p.id === myId);
  const opponents = gameState.players.filter(p => p.id !== myId);

  // Active players still in Uno (cardsCount > 0 and not eliminated)
  const activeRemainingPlayers = gameState.players.filter(
    p => !p.isSpectator && !p.isMercyEliminated && (!p.rank || p.cardsCount > 0) && p.cardsCount > 0
  );

  const isLocalActive = activeRemainingPlayers.some(p => p.id === myId);

  // Dynamic Table Capacity and Seating:
  // When any player gets out, capacity dynamically adapts to remaining active players!
  const orderedActive = isLocalActive
    ? reorderPlayersForLocalView(activeRemainingPlayers, myId)
    : activeRemainingPlayers;

  const tableCapacity = isLocalActive
    ? Math.max(2, orderedActive.length)
    : Math.max(2, activeRemainingPlayers.length + 1);

  const tableOpponents = isLocalActive
    ? orderedActive.slice(1)
    : activeRemainingPlayers;

  const avatarSize = getAvatarSizeForCount(tableCapacity);
  const hideOpponentNames = tableCapacity >= 8;

  // Strict turn gating: Local player can ONLY act once previous card has landed and no pending action
  const isMyTurn =
    !me?.isMercyEliminated &&
    visualTurnPlayerId === myId &&
    flyingCards.length === 0 &&
    !is0PassAnimating &&
    !isSwapAnimating &&
    !isPlayingAction;
  const currentTurnPlayer = gameState.players.find(p => p.id === visualTurnPlayerId) || gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  const myHand = (gameState.myHand as UnoCard[]) || [];

  // Turn flow among active remaining players
  const { playerBeforeMe, playerAfterMe } = getTurnNeighbors(
    activeRemainingPlayers.length >= 2 ? activeRemainingPlayers : gameState.players,
    myId,
    gameState.direction || 1
  );

  // Play skip sound & trigger dramatic highlighted banner when a player is skipped
  // Use a ref so server clearing lastSkippedPlayerId doesn't cancel the client visibility timer
  const lastSeenSkippedRef = useRef<string | null>(null);
  useEffect(() => {
    const skippedId = gameState.lastSkippedPlayerId;
    // Only trigger when a new non-null skipped ID arrives (ignore server clearing to undefined)
    if (!skippedId || skippedId === lastSeenSkippedRef.current) return;
    lastSeenSkippedRef.current = skippedId;

    sounds.playSkipSound();
    setLocalSkippedPlayerId(skippedId);

    const timer = setTimeout(() => {
      setLocalSkippedPlayerId(null);
      lastSeenSkippedRef.current = null; // allow same player to be skipped again next round
    }, 2000);

    return () => clearTimeout(timer);
  }, [gameState.lastSkippedPlayerId]);

  // Trigger elimination popup and sound when player exceeds 25 cards
  useEffect(() => {
    if (me?.isMercyEliminated && !prevEliminatedRef.current) {
      prevEliminatedRef.current = true;
      sounds.playMercyEliminatedSound();
      setShowEliminatedModal(true);
    } else if (!me?.isMercyEliminated) {
      prevEliminatedRef.current = false;
    }
  }, [me?.isMercyEliminated]);

  // Sync Direction changes & trigger Reverse Surge
  useEffect(() => {
    if (gameState.direction && gameState.direction !== prevDirectionRef.current) {
      prevDirectionRef.current = gameState.direction;
      setIsReverseSurging(true);
      sounds.playReverseSound();
      const t = setTimeout(() => setIsReverseSurging(false), 2400);
      return () => clearTimeout(t);
    }
  }, [gameState.direction]);

  // Turn Synchronization: delay visual turn handover until flights and special effects land
  useEffect(() => {
    pendingTurnPlayerIdRef.current = gameState.currentTurnPlayerId;
    if (flyingCards.length === 0 && !is0PassAnimating && !isSwapAnimating) {
      setVisualTurnPlayerId(gameState.currentTurnPlayerId);
    }
  }, [gameState.currentTurnPlayerId]);

  useEffect(() => {
    if (flyingCards.length === 0 && !is0PassAnimating && !isSwapAnimating) {
      if (pendingTurnPlayerIdRef.current && visualTurnPlayerId !== pendingTurnPlayerIdRef.current) {
        setVisualTurnPlayerId(pendingTurnPlayerIdRef.current);
      }
    }
  }, [flyingCards.length, is0PassAnimating, isSwapAnimating, visualTurnPlayerId]);

  // Animations & Sound Triggers
  const [actionNotice, setActionNotice] = useState<{
    type: 'draw' | 'play';
    text: string;
    playerName: string;
    playerId?: string;
  } | null>(null);

  const prevActiveCardIdRef = useRef<string | undefined>(gameState.activeUnoCard?.id);
  const prevLastActionRef = useRef<string>(gameState.lastAction || '');
  const prevStackCountRef = useRef<number>(gameState.drawStackCount || 0);

  // GPU Card Flight Helper
  const spawnFlight = (params: {
    card?: UnoCard;
    isDraw?: boolean;
    startEl?: HTMLElement | null;
    startRect?: DOMRect | null;
    endEl?: HTMLElement | null;
    endRect?: DOMRect | null;
    duration?: number;
    delay?: number;
    onEnd?: () => void;
  }) => {
    const container = gameContainerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    const startElement =
      params.startEl ||
      (params.isDraw
        ? document.getElementById('uno-draw-pile')
        : document.getElementById('uno-hand-area'));

    const endElement =
      params.endEl ||
      (params.isDraw
        ? document.getElementById('uno-hand-area')
        : document.getElementById('uno-discard-pile'));

    let sX = cRect.width / 2;
    let sY = params.isDraw ? cRect.height * 0.42 : cRect.height * 0.85;
    let eX = cRect.width / 2;
    let eY = params.isDraw ? cRect.height * 0.85 : cRect.height * 0.42;

    if (params.startRect) {
      sX = (params.startRect.left - cRect.left) + params.startRect.width / 2;
      sY = (params.startRect.top - cRect.top) + params.startRect.height / 2;
    } else if (startElement) {
      const r = startElement.getBoundingClientRect();
      sX = (r.left - cRect.left) + r.width / 2;
      sY = (r.top - cRect.top) + r.height / 2;
    }

    if (params.endRect) {
      eX = (params.endRect.left - cRect.left) + params.endRect.width / 2;
      eY = (params.endRect.top - cRect.top) + params.endRect.height / 2;
    } else if (endElement) {
      const r = endElement.getBoundingClientRect();
      eX = (r.left - cRect.left) + r.width / 2;
      eY = (r.top - cRect.top) + r.height / 2;
    }

    const CARD_W = 76;
    const CARD_H = 114;
    const startX = sX - CARD_W / 2;
    const startY = sY - CARD_H / 2;
    const endX = eX - CARD_W / 2;
    const endY = eY - CARD_H / 2;

    const duration = params.duration || 680;
    const isFromLeft = startX < endX - 20;
    const isFromRight = startX > endX + 20;
    const startRot = isFromLeft ? -6 : isFromRight ? 6 : -2;
    const midRot = isFromLeft ? 3 : isFromRight ? -3 : 2;
    const arcX = isFromLeft ? -15 : isFromRight ? 15 : 0;
    const arcY = params.isDraw ? -15 : -35;

    const flightId = `uno-flight-${Date.now()}-${Math.random()}`;

    const launch = () => {
      setFlyingCards(prev => [
        ...prev,
        {
          id: flightId,
          card: params.card,
          startX,
          startY,
          endX,
          endY,
          startScale: params.isDraw ? 0.82 : 0.95,
          midScale: 1.1,
          endScale: params.isDraw ? 0.9 : 1.0,
          startRot,
          midRot,
          endRot: 0,
          arcX,
          arcY,
          duration
        }
      ]);

      setTimeout(() => {
        setFlyingCards(prev => prev.filter(f => f.id !== flightId));
        if (params.onEnd) params.onEnd();
      }, duration);
    };

    if (params.delay && params.delay > 0) {
      setTimeout(launch, params.delay);
    } else {
      launch();
    }
  };

  useEffect(() => {
    const currentActiveId = gameState.activeUnoCard?.id;
    const currentAction = gameState.lastAction || '';
    const currentStack = gameState.drawStackCount || 0;

    // Detect card play by opponent or local player
    if (currentActiveId && currentActiveId !== prevActiveCardIdRef.current) {
      prevActiveCardIdRef.current = currentActiveId;

      const playedBy = gameState.players.find(p => currentAction.includes(p.name));
      const wasLocalPlay =
        (playedBy && playedBy.id === myId) ||
        (localPlayedCardIdRef.current === currentActiveId) ||
        (myPlayedCardOriginRef.current && myPlayedCardOriginRef.current.cardId === currentActiveId);

      // Clean up local play references & lock state
      localPlayedCardIdRef.current = null;
      myPlayedCardOriginRef.current = null;
      setHiddenHandCardId(null);
      setIsPlayingAction(false);
      isActionLockedRef.current = false;

      if (!wasLocalPlay && gameState.activeUnoCard && playedBy) {
        // Card was played by opponent -> Launch flight from opponent avatar to discard pile!
        const oppAvatarEl = document.getElementById(`avatar-${playedBy.id}`);
        const discardEl = document.getElementById('uno-discard-pile');

        if (oppAvatarEl && discardEl) {
          spawnFlight({
            card: gameState.activeUnoCard,
            isDraw: false,
            startEl: oppAvatarEl,
            endEl: discardEl,
            duration: 680,
            onEnd: () => {
              setIsCardSlamming(true);
              setTimeout(() => setIsCardSlamming(false), 450);
            }
          });
        }
      } else {
        setIsCardSlamming(true);
        setTimeout(() => setIsCardSlamming(false), 450);
      }

      if (currentAction.includes('Reversed')) {
        sounds.playReverseSound();
      } else if (currentStack > 0 && currentStack > prevStackCountRef.current) {
        sounds.playStackSlamSound();
      } else {
        sounds.playCardPlay();
      }

      const title = gameState.activeUnoCard
        ? `${gameState.activeUnoCard.color.toUpperCase()} ${gameState.activeUnoCard.type.replace('_', ' ').toUpperCase()}`
        : 'Card';

      // Notification "Played [Card]" completely removed per user request
    }

    // Detect card draw (single card OR multiple cards cascade!)
    // STRICT: Only match actions that say "drew X card(s)", NEVER match card plays like "played red draw2" or "played wild_draw4"
    const drawMatch = currentAction.match(/\bdrew\s+(\d+)\s+card/i);
    if (
      currentAction !== prevLastActionRef.current &&
      drawMatch
    ) {
      prevLastActionRef.current = currentAction;
      setIsDrawingAnimation(true);
      setTimeout(() => setIsDrawingAnimation(false), 700);

      const drawingPlayer = gameState.players.find(p => currentAction.includes(p.name));
      const drawCount = Math.max(1, parseInt(drawMatch[1], 10));

      // IMPORTANT FIX: Only treat as local draw when drawingPlayer is POSITIVELY identified as me.
      // If drawingPlayer is null/undefined (name match failed), do NOT default to local hand —
      // this causes the wrong animation (e.g. +10 on an eliminated opponent showing cards going to me).
      const isLocalDraw = !!drawingPlayer && drawingPlayer.id === myId;
      const isKnownOpponentDraw = !!drawingPlayer && drawingPlayer.id !== myId;

      const targetEl = isLocalDraw
        ? document.getElementById('uno-hand-area')
        : isKnownOpponentDraw
        ? document.getElementById(`avatar-${drawingPlayer!.id}`)
        : null; // unknown player (just eliminated) — skip animation
      const drawPileEl = document.getElementById('uno-draw-pile');

      // Staggered cascade: Draw 1 or multiple cards visibly moving from Deck to Hand / Opponent
      if (targetEl) {
        // Cap animation cards at 5 to avoid flooding the screen for large draws
        const animCount = Math.min(drawCount, 5);
        for (let i = 0; i < animCount; i++) {
          spawnFlight({
            card: undefined, // Renders UnoCardBackView
            isDraw: true,
            startEl: drawPileEl,
            endEl: targetEl,
            duration: 650,
            delay: i * 160,
            onEnd: () => {
              sounds.playCardDeal();
              if (isLocalDraw && i === animCount - 1) {
                setIsPlayingAction(false);
                isActionLockedRef.current = false;
              }
            }
          });
        }
      } else if (isLocalDraw) {
        // Fallback: release lock even without animation
        setIsPlayingAction(false);
        isActionLockedRef.current = false;
      }

      setActionNotice({
        type: 'draw',
        text: drawCount > 1 ? `Drew +${drawCount} Cards` : `Drew 1 Card`,
        playerName: drawingPlayer ? drawingPlayer.name : 'Player',
        playerId: drawingPlayer?.id
      });
    } else if (
      currentAction !== prevLastActionRef.current &&
      (currentAction.includes('SWAPPED HANDS') || currentAction.includes('ALL HANDS PASSED'))
    ) {
      prevLastActionRef.current = currentAction;
      if (currentAction.includes('ALL HANDS PASSED')) {
        setIs0PassAnimating(true);
        setSwapBannerText('🔄 ALL PLAYERS PASSED HANDS!');
        sounds.playCardDeal();

        // Multi-card orbit flight between all active seats along current direction
        const count = orderedActive.length;
        const dir = gameState.direction || 1;
        if (count >= 2) {
          orderedActive.forEach((p, idx) => {
            const nextIdx = dir === 1
              ? (idx + 1) % count
              : (idx - 1 + count) % count;
            const targetP = orderedActive[nextIdx];
            const startEl = document.getElementById(`avatar-${p.id}`);
            const endEl = document.getElementById(`avatar-${targetP.id}`);
            if (startEl && endEl) {
              for (let k = 0; k < 2; k++) {
                spawnFlight({
                  card: undefined,
                  isDraw: true,
                  startEl,
                  endEl,
                  duration: 1100,
                  delay: k * 120
                });
              }
            }
          });
        }

        setTimeout(() => {
          setIs0PassAnimating(false);
          setSwapBannerText('');
        }, 1800);
      } else {
        // 7 SWAPPED HANDS: Dual spotlight + crossing card stacks
        setIsSwapAnimating(true);
        sounds.playCardDeal();

        const p1 = gameState.players.find(p => currentAction.includes(p.name));
        const matchWith = currentAction.match(/with (.*?)[!&]/);
        const targetName = matchWith ? matchWith[1].trim() : '';
        const p2 = gameState.players.find(p => p.name === targetName || (p1 && p.id !== p1.id && currentAction.includes(p.name)));

        const id1 = p1 ? p1.id : myId;
        const id2 = p2 ? p2.id : (opponents[0]?.id || myId);

        setSwapHighlightPlayerIds([id1, id2]);
        setSwapBannerText(`🔁 ${p1?.name || 'Player'} ⇄ ${p2?.name || 'Player'}`);

        const elA = document.getElementById(`avatar-${id1}`);
        const elB = document.getElementById(`avatar-${id2}`);
        if (elA && elB) {
          for (let k = 0; k < 2; k++) {
            spawnFlight({
              card: undefined,
              isDraw: true,
              startEl: elA,
              endEl: elB,
              duration: 1100,
              delay: k * 100
            });
            spawnFlight({
              card: undefined,
              isDraw: true,
              startEl: elB,
              endEl: elA,
              duration: 1100,
              delay: 60 + k * 100
            });
          }
        }

        setTimeout(() => {
          setIsSwapAnimating(false);
          setSwapHighlightPlayerIds([]);
          setSwapBannerText('');
        }, 1800);
      }
    } else if (currentAction !== prevLastActionRef.current && currentAction.includes('ELIMINATED')) {
      prevLastActionRef.current = currentAction;
      sounds.playMercyEliminatedSound();
      const elimPlayer = gameState.players.find(p => currentAction.includes(p.name));
      setActionNotice({
        type: 'play',
        text: 'Eliminated (25+ Cards) ☠️',
        playerName: elimPlayer ? elimPlayer.name : 'Player',
        playerId: elimPlayer?.id
      });
    } else {
      prevLastActionRef.current = currentAction;
    }

    prevStackCountRef.current = currentStack;

    const timer = setTimeout(() => {
      setActionNotice(null);
    }, 2800);

    return () => clearTimeout(timer);
  }, [gameState.activeUnoCard?.id, gameState.lastAction, gameState.drawStackCount, gameState.players, myId]);

  // Turn Countdown (20s max for Uno)
  useEffect(() => {
    if (!gameState.turnExpiresAt) {
      setSecondsRemaining(gameState.turnDuration || 20);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gameState.turnExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 4 && remaining > 0 && isMyTurn) {
        sounds.playUnoWarning();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameState.turnExpiresAt, gameState.turnDuration, isMyTurn]);

  // 10-Minute Total Match Countdown Timer
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

  // Remote Emotes
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
      }, 2500);
    };

    socket.on('playerEmote', handleRemoteEmote);
    return () => {
      socket.off('playerEmote', handleRemoteEmote);
    };
  }, []);

  // Card Play Confirmation with Hand-to-Deck Flight Animation
  const handleInitiatePlayCard = (card: UnoCard) => {
    if (!isMyTurn || isActionLockedRef.current) return;

    // Capture starting position of the card in hand before any picker modal
    const handCardEl = document.getElementById(`uno-hand-card-${card.id}`);
    if (handCardEl) {
      myPlayedCardOriginRef.current = {
        cardId: card.id,
        rect: handCardEl.getBoundingClientRect()
      };
    }

    if (card.color === 'wild') {
      setPendingCard(card);
      setShowColorPicker(true);
      return;
    }

    if (card.type === 'swap_7') {
      setPendingCard(card);
      setShowSwapPicker(true);
      return;
    }

    executePlayCard(card);
  };

  const executePlayCard = (card: UnoCard, chosenColor?: UnoColor, swapTargetPlayerId?: string) => {
    if (isActionLockedRef.current) return;
    isActionLockedRef.current = true;
    setIsPlayingAction(true);
    localPlayedCardIdRef.current = card.id;

    // Safety timeout in case server doesn't respond
    setTimeout(() => {
      isActionLockedRef.current = false;
      setIsPlayingAction(false);
    }, 1600);

    const willHaveOneCard = myHand.length === 2;
    const callUno = willHaveOneCard || me?.calledUno;

    // Instantly hide card from hand and launch smooth GPU card flight from hand to center discard pile!
    setHiddenHandCardId(card.id);
    const handCardEl = document.getElementById(`uno-hand-card-${card.id}`);
    const discardEl = document.getElementById('uno-discard-pile');

    spawnFlight({
      card,
      isDraw: false,
      startRect: myPlayedCardOriginRef.current?.rect,
      startEl: handCardEl || document.getElementById('uno-hand-area'),
      endEl: discardEl,
      duration: 680,
      onEnd: () => {
        setHiddenHandCardId(null);
        setIsCardSlamming(true);
        setTimeout(() => setIsCardSlamming(false), 450);
      }
    });

    sounds.playCardPlay();

    if (card.type === 'swap_7' && swapTargetPlayerId) {
      setSwapHighlightPlayerIds([myId, swapTargetPlayerId]);
      setIsSwapAnimating(true);
      const targetOpp = gameState.players.find(p => p.id === swapTargetPlayerId);
      setSwapBannerText(`YOU ⇄ ${targetOpp?.name || 'OPPONENT'}`);
      setTimeout(() => {
        setIsSwapAnimating(false);
        setSwapHighlightPlayerIds([]);
        setSwapBannerText('');
      }, 1800);
    } else if (card.type === 'pass_0') {
      setIs0PassAnimating(true);
      setSwapBannerText('🔄 ALL PLAYERS PASSED HANDS!');
      setTimeout(() => {
        setIs0PassAnimating(false);
        setSwapBannerText('');
      }, 1800);
    } else if (card.type === 'reverse' || card.type === 'reverse_draw2' || card.type === 'wild_reverse_draw4') {
      setIsReverseSurging(true);
      sounds.playReverseSound();
      setTimeout(() => {
        setIsReverseSurging(false);
      }, 2400);
    } else if (card.type === 'skip') {
      sounds.playSkipSound();
    }

    socketService.playUnoCard(gameState.roomCode, card.id, chosenColor, swapTargetPlayerId, callUno);
    setSelectedCard(null);
    setPendingCard(null);
    setShowColorPicker(false);
    setShowSwapPicker(false);
  };

  // Draw Card (Smooth single or cascade flight handled exclusively via gameState update in useEffect)
  const handleDrawCard = () => {
    if (!isMyTurn || isActionLockedRef.current) return;
    isActionLockedRef.current = true;
    setIsPlayingAction(true);
    setTimeout(() => {
      isActionLockedRef.current = false;
      setIsPlayingAction(false);
    }, 1600);

    socketService.drawUnoCard(gameState.roomCode);
    setSelectedCard(null);
  };

  const selectedIsValid =
    selectedCard &&
    gameState.activeUnoCard &&
    gameState.activeUnoColor &&
    canPlayUnoCard(selectedCard, gameState.activeUnoCard, gameState.activeUnoColor, gameState.drawStackCount);

  // Call Uno Action
  const handleCallUno = () => {
    sounds.playCallUnoSound();
    socketService.callUno(gameState.roomCode);
  };

  // Find opponent vulnerable to Catch Uno (has exactly 1 card, not called Uno)
  const uncaughtOpponent = opponents.find(
    p => p.cardsCount === 1 && !p.calledUno && !p.rank && !p.isMercyEliminated
  );

  const handleCatchUno = () => {
    if (uncaughtOpponent) {
      sounds.playCatchUnoSound();
      socketService.catchUno(gameState.roomCode, uncaughtOpponent.id);
    }
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

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
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

  // Win condition:
  // 1. Status is 'game_over'
  // 2. Legitimate card winner: emptied hand down to 0 cards AND is NOT mercy-eliminated!
  // 3. Only 1 active player remains standing (all opponents eliminated by Mercy Rule)
  const legitCardWinner = gameState.players.find(
    p => !p.isSpectator && !p.isMercyEliminated && (p.cardsCount === 0 || (p.id === myId && myHand.length === 0))
  );
  const isOnlyOneSurvivor =
    gameState.status === 'playing' &&
    activeRemainingPlayers.length === 1 &&
    gameState.players.filter(p => !p.isSpectator).length > 1;
  const isGameOver = gameState.status === 'game_over' || !!legitCardWinner || isOnlyOneSurvivor;
  const winner =
    gameState.players.find(p => p.rank === 1 && !p.isMercyEliminated) ||
    legitCardWinner ||
    (isOnlyOneSurvivor ? activeRemainingPlayers[0] : undefined);

  useEffect(() => {
    if (isGameOver) {
      if (winner && winner.id === myId) {
        sounds.playVictory();
        confetti({ particleCount: 180, spread: 110, origin: { y: 0.55 } });
      }
    }
  }, [isGameOver, winner, myId]);

  const mercyRatio = Math.min((myHand.length / 25) * 100, 100);

  return (
    <div
      ref={gameContainerRef}
      className="relative w-full h-full min-h-[100dvh] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#120317] via-[#240428] to-[#0a020e] text-white select-none"
    >
      {/* TOP NAVIGATION / STATUS BAR */}
      <div className="relative z-30 w-full px-2 sm:px-3 safe-top py-1.5 flex items-center justify-between bg-black/85 backdrop-blur-md border-b border-red-500/30 gap-1.5 sm:gap-2">
        {/* Left: Branding & Room */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-lg sm:text-xl filter drop-shadow">🔥</span>
          <div className="leading-tight">
            <div className="text-[11px] sm:text-sm font-black tracking-wider text-rose-400">UNO NO MERCY</div>
            <div className="text-[8px] sm:text-[9px] text-purple-300 font-mono font-bold">ROOM: {gameState.roomCode}</div>
          </div>
        </div>

        {/* Center: Match 10-Min Timer, Turn Status & 20s Turn Timer (Auto-scaling) */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          {/* 10-Minute Game Countdown Pill */}
          {gameSecondsRemaining !== null && (
            <div
              title="10-Minute Game Timer (Match ends when time reaches 00:00)"
              className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black border shadow-lg transition-colors flex-shrink-0 ${
                gameSecondsRemaining <= 60
                  ? 'bg-red-950/95 border-red-500 text-red-300 animate-pulse shadow-red-500/50'
                  : gameSecondsRemaining <= 180
                  ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-amber-500/30'
                  : 'bg-slate-900/90 border-cyan-500/50 text-cyan-200'
              }`}
            >
              <Timer className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${gameSecondsRemaining <= 60 ? 'text-red-400 animate-spin' : 'text-cyan-300'}`} />
              <span className="font-mono font-black">{formatGameTime(gameSecondsRemaining)}</span>
            </div>
          )}

          {/* Turn Flow Pill */}
          <div
            className={`flex items-center gap-1 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-black text-[10px] sm:text-xs shadow-md border truncate ${
              isMyTurn
                ? 'bg-amber-400 text-slate-950 border-white shadow-amber-400/50 animate-pulse'
                : 'bg-slate-950/90 text-amber-200 border-purple-500/50'
            }`}
          >
            <span className="truncate max-w-[80px] sm:max-w-[130px]">
              {isMyTurn ? 'YOUR TURN!' : (currentTurnPlayer?.name || 'Waiting...')}
            </span>
          </div>

          {/* 20s Turn Countdown Pill */}
          <div
            title="Turn Timer: 20 seconds max to play a card"
            className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black border shadow-lg flex-shrink-0 ${
              secondsRemaining <= 4
                ? 'bg-red-600 text-white border-white animate-pulse'
                : secondsRemaining <= 8
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-emerald-600 text-white border-emerald-300'
            }`}
          >
            <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${secondsRemaining <= 4 ? 'animate-spin' : ''}`} />
            <span className="font-mono">{secondsRemaining}s</span>
          </div>
        </div>

        {/* Right: Quick Controls (Always 100% visible on mobile, pinned to right!) */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto z-30">
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-400/50 text-amber-300 shadow-md active:scale-95 transition cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            aria-label="Game Settings"
            className="p-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-400/50 text-amber-300 shadow-md active:scale-95 transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DYNAMIC LANDSCAPE CASINO ARENA (Viewer centered perspective, 2 to 10 Players) */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-center px-4 py-1 min-h-[260px] max-h-[460px]">
        <div className="relative w-full h-full max-w-5xl mx-auto flex items-center justify-center">

          {/* Neon Elliptical Table Rim */}
          <div
            className={`absolute inset-x-2 inset-y-1 sm:inset-x-8 sm:inset-y-2 rounded-[50%/40%] border-2 transition-all duration-500 pointer-events-none ${
              isReverseSurging
                ? 'border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.85),inset_0_0_60px_rgba(245,158,11,0.4)] animate-pulse'
                : gameState.direction === -1
                ? 'border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.4),inset_0_0_50px_rgba(0,0,0,0.85)]'
                : 'border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.4),inset_0_0_50px_rgba(0,0,0,0.85)]'
            } bg-gradient-to-b from-[#25041a]/90 via-[#360525]/80 to-[#14010e]/95`}
          />

          {/* REVERSE SURGE DRAMATIC FLASH OVERLAY */}
          {isReverseSurging && (
            <div className="absolute top-2 z-40 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 border-2 border-white shadow-[0_0_35px_rgba(245,158,11,0.95)] flex items-center gap-2 animate-bounce text-slate-950 font-black text-xs sm:text-sm tracking-wide">
              <span className="text-base sm:text-lg">⇄</span>
              <span>REVERSED! NOW PLAYING {gameState.direction === -1 ? 'COUNTER-CLOCKWISE (↺)' : 'CLOCKWISE (↻)'}!</span>
              <span className="text-base sm:text-lg">⇄</span>
            </div>
          )}

          {/* 0 PASS ALL HANDS DRAMATIC BANNER */}
          {is0PassAnimating && (
            <div className="absolute top-2 z-40 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-600 border-2 border-white shadow-[0_0_35px_rgba(6,182,212,0.95)] flex items-center gap-2 animate-bounce text-white font-black text-xs sm:text-sm tracking-wide">
              <span className="text-base sm:text-lg animate-spin">🔄</span>
              <span>0 PASS CARD: ALL PLAYERS PASSING HANDS {gameState.direction === -1 ? '(↺ COUNTER-CLOCKWISE)' : '(↻ CLOCKWISE)'}!</span>
              <span className="text-base sm:text-lg animate-spin">🔄</span>
            </div>
          )}

          {/* 7 SWAP HANDS DRAMATIC BANNER */}
          {isSwapAnimating && (
            <div className="absolute top-2 z-40 px-5 py-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 border-2 border-white shadow-[0_0_35px_rgba(245,158,11,0.95)] flex items-center gap-2 animate-bounce text-slate-950 font-black text-xs sm:text-sm tracking-wide">
              <span className="text-base sm:text-lg">🔁</span>
              <span>7 SWAP: {swapBannerText || 'HANDS SWAPPED!'}</span>
              <span className="text-base sm:text-lg">🔁</span>
            </div>
          )}


          {/* CENTER PLAY AREA: DIRECTIONAL CIRCLE + DRAW & DISCARD PILES */}
          <div className="relative z-20 flex flex-col items-center justify-center">

            {/* CIRCULAR DIRECTIONAL ARROW RING ORBITING AROUND CENTRAL DECK */}
            <div className="absolute -inset-6 sm:-inset-10 pointer-events-none flex items-center justify-center">
              <div
                className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full transition-all duration-500 flex items-center justify-center ${
                  isReverseSurging
                    ? gameState.direction === -1
                      ? 'animate-orbit-fast-ccw'
                      : 'animate-orbit-fast-cw'
                    : gameState.direction === -1
                    ? 'animate-orbit-ccw'
                    : 'animate-orbit-cw'
                }`}
              >
                {/* SVG Circular Track with Directional Glow */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 240 240">
                  <defs>
                    <linearGradient id="orbitCwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient id="orbitCcwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="50%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  {/* Dashed Orbital Circle Track */}
                  <circle
                    cx="120"
                    cy="120"
                    r="108"
                    fill="none"
                    stroke={gameState.direction === -1 ? 'url(#orbitCcwGrad)' : 'url(#orbitCwGrad)'}
                    strokeWidth={isReverseSurging ? '3' : '2'}
                    strokeDasharray={isReverseSurging ? '12 6' : '8 6'}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                    opacity={isReverseSurging ? 1 : 0.75}
                    style={{
                      filter: `drop-shadow(0 0 ${isReverseSurging ? '12px' : '6px'} ${gameState.direction === -1 ? '#f59e0b' : '#10b981'})`
                    }}
                  />
                </svg>

                {/* 4 Compact Directional Arrows spaced around the circle */}
                {/* Top (12 o'clock) */}
                <div
                  className={`absolute top-0.5 transform -translate-x-1/2 left-1/2 w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shadow-md transition-all duration-300 ${
                    gameState.direction === -1
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_#f59e0b]'
                      : 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_#10b981]'
                  } ${isReverseSurging ? 'scale-125' : 'opacity-90'}`}
                >
                  <span className="font-extrabold">{gameState.direction === -1 ? '◀' : '▶'}</span>
                </div>

                {/* Right (3 o'clock) */}
                <div
                  className={`absolute right-0.5 transform -translate-y-1/2 top-1/2 w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shadow-md transition-all duration-300 ${
                    gameState.direction === -1
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_#f59e0b]'
                      : 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_#10b981]'
                  } ${isReverseSurging ? 'scale-125' : 'opacity-90'}`}
                >
                  <span className="font-extrabold">{gameState.direction === -1 ? '▲' : '▼'}</span>
                </div>

                {/* Bottom (6 o'clock) */}
                <div
                  className={`absolute bottom-0.5 transform -translate-x-1/2 left-1/2 w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shadow-md transition-all duration-300 ${
                    gameState.direction === -1
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_#f59e0b]'
                      : 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_#10b981]'
                  } ${isReverseSurging ? 'scale-125' : 'opacity-90'}`}
                >
                  <span className="font-extrabold">{gameState.direction === -1 ? '▶' : '◀'}</span>
                </div>

                {/* Left (9 o'clock) */}
                <div
                  className={`absolute left-0.5 transform -translate-y-1/2 top-1/2 w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shadow-md transition-all duration-300 ${
                    gameState.direction === -1
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_#f59e0b]'
                      : 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_#10b981]'
                  } ${isReverseSurging ? 'scale-125' : 'opacity-90'}`}
                >
                  <span className="font-extrabold">{gameState.direction === -1 ? '▼' : '▲'}</span>
                </div>
              </div>
            </div>

            {/* IN-PROGRESS STACKING COUNTER BANNER */}
            {gameState.drawStackCount > 0 && (
              <div className="mb-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 border border-white shadow-[0_0_16px_rgba(239,68,68,0.9)] flex items-center gap-1.5 animate-bounce z-20">
                <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-200" />
                <span className="font-black text-[11px] sm:text-xs tracking-wide text-white">
                  +{gameState.drawStackCount} Stack Active
                </span>
                <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-200" />
              </div>
            )}

            {/* Piles Container */}
            <div className="flex items-center gap-4 sm:gap-6 z-20">
              {/* DRAW PILE (High-Def Uno Card Back) */}
              <div id="uno-draw-pile" className="relative flex flex-col items-center">
                {/* Visual card deck stack effect underneath matching exact card size */}
                <div className="absolute inset-0 translate-x-1 translate-y-1 w-12 h-17 sm:w-13 sm:h-19 rounded-xl bg-black/60 border border-slate-700/60 pointer-events-none" />
                <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 w-12 h-17 sm:w-13 sm:h-19 rounded-xl bg-red-950/80 border border-amber-500/40 pointer-events-none" />

                <div
                  role="button"
                  tabIndex={isMyTurn ? 0 : -1}
                  aria-label={`Draw pile, ${gameState.deckRemainingCount ?? 'many'} cards remaining`}
                  onClick={isMyTurn ? () => { setSelectedCard(null); handleDrawCard(); } : undefined}
                  className={`relative cursor-pointer transition-all duration-200 ${
                    isDrawingAnimation ? 'scale-105 ring-3 ring-cyan-400 shadow-cyan-400/80' : ''
                  } ${
                    isMyTurn
                      ? 'hover:scale-105 active:scale-95 ring-3 ring-yellow-400 animate-turn-pulse shadow-yellow-400/50'
                      : 'opacity-85'
                  }`}
                >
                  <UnoCardBackView size="table" />

                  {gameState.drawStackCount > 0 && isMyTurn && (
                    <div className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded-full border border-white animate-bounce shadow-xl z-30">
                      +{gameState.drawStackCount}
                    </div>
                  )}
                </div>

                <span className="text-[9px] font-bold text-slate-300 mt-1">
                  Deck: {gameState.deckRemainingCount ?? 'Deck'}
                </span>
              </div>

              {/* DISCARD PILE (100% Crisp & Visible, NO Blurry Glow Halo) */}
              <div id="uno-discard-pile" className="relative flex flex-col items-center">
                <div
                  className={`relative transition-all duration-300 ${
                    isCardSlamming
                      ? 'animate-uno-discard-slam ring-3 ring-amber-300 rounded-xl shadow-yellow-400/80'
                      : ''
                  }`}
                >
                  {gameState.activeUnoCard && (
                    <div key={gameState.activeUnoCard.id} className="relative">
                      <UnoCardView card={gameState.activeUnoCard} isCompact={false} isTableCard={true} />
                    </div>
                  )}
                </div>

                {/* Declared Color Badge (ONLY for Wild cards where color is declared) */}
                {gameState.activeUnoCard && gameState.activeUnoCard.color === 'wild' ? (
                  <div className="mt-1 text-center">
                    <span
                      className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-white shadow-md ${
                        gameState.activeUnoColor === 'red'
                          ? 'bg-[#ff1744] text-white'
                          : gameState.activeUnoColor === 'blue'
                          ? 'bg-[#0091ea] text-white'
                          : gameState.activeUnoColor === 'green'
                          ? 'bg-[#00c853] text-white'
                          : 'bg-[#ffd600] text-slate-950 font-black'
                      }`}
                    >
                      Color: {gameState.activeUnoColor}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] font-bold text-slate-300 mt-1">
                    Discard Pile
                  </span>
                )}
              </div>
            </div>

            {/* ACTION / EVENT FLOATING NOTICE (Clean & Short-lived) */}
            {actionNotice && actionNotice.type !== 'play' && !isSwapAnimating && (
              <div
                className={`mt-2 px-3 py-1 rounded-full border text-xs font-black shadow-2xl flex items-center gap-1.5 animate-bounce z-20 ${
                  actionNotice.type === 'draw'
                    ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white border-cyan-300 shadow-cyan-500/50'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-white shadow-yellow-400/60'
                }`}
              >
                <span>{actionNotice.type === 'draw' ? '📥' : '🎯'}</span>
                <span className="truncate max-w-[200px]">
                  <strong>{actionNotice.playerName}</strong> {actionNotice.text}
                </span>
              </div>
            )}
          </div>

          {/* DYNAMIC OPPONENT SEATS (Dynamically rearranged per remaining player capacity!) */}
          {tableOpponents.map((player, sliceIdx) => {
            const originalIdx = sliceIdx + 1;
            const seatPos = getLandscapeUnoSeatPosition(tableCapacity, originalIdx);
            const theme = PLAYER_THEME_KEYS[originalIdx % PLAYER_THEME_KEYS.length];

            return (
              <div
                key={`uno-seat-${player.id}`}
                id={`avatar-${player.id}`}
                style={seatPos.avatarStyle}
                className="transition-all duration-300"
              >
                <div className="relative flex flex-col items-center">
                  <PlayerAvatar
                    player={player}
                    size={avatarSize}
                    isCurrentTurn={visualTurnPlayerId === player.id}
                    isHighlighted={swapHighlightPlayerIds.includes(player.id)}
                    highlightLabel="SWAPPING"
                    isSkipped={
                      localSkippedPlayerId === player.id ||
                      gameState.lastSkippedPlayerId === player.id ||
                      (gameState.lastSkippedPlayerId === 'everyone' && player.id !== visualTurnPlayerId)
                    }
                    isSelf={false}
                    hideName={hideOpponentNames}
                    actionNotice={null}
                    colorTheme={theme}
                    activeEmote={activeEmotes[player.id]}
                    turnExpiresAt={gameState.turnExpiresAt}
                    turnDuration={gameState.turnDuration}
                    isBeforeMe={playerBeforeMe?.id === player.id}
                    isAfterMe={playerAfterMe?.id === player.id}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM CONTROLS & LOCAL HAND AREA (Viewer Always Centered Perspective) */}
      <div className="relative z-20 w-full flex flex-col items-center bg-gradient-to-t from-black via-black/95 to-transparent pt-1 border-t border-purple-900/40">
        {/* UNIFIED LOCAL PLAYER HUD & MERCY DANGER METER */}
        {!me?.isMercyEliminated && (
          <div className="w-full max-w-xl px-3 py-1 flex items-center justify-between text-[11px] font-black text-slate-300 gap-2">
            {/* Left: Mercy Rule Indicator */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <AlertTriangle className={`w-3.5 h-3.5 ${myHand.length >= 20 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`} />
              <span className="text-[10px] sm:text-xs tracking-tight">MERCY RULE</span>
            </div>

            {/* Center: Sleek Local Player Badge (Acts as card flight anchor) */}
            <div
              id={`avatar-${myId}`}
              className={`relative flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border shadow-md transition-all ${
                isMyTurn
                  ? 'bg-amber-400 text-slate-950 border-white shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse'
                  : 'bg-slate-900/90 text-amber-300 border-amber-400/50'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-[9px] flex items-center justify-center border border-white/60">
                {me?.name ? me.name.slice(0, 2).toUpperCase() : 'YOU'}
              </span>
              <span className="text-[10px] sm:text-[11px] font-black truncate max-w-[80px]">
                {me?.name || 'You'}
              </span>

              {/* Local Player Skip Prohibition Icon Overlay (2-second visual matching user specification) */}
              {(localSkippedPlayerId === myId ||
                gameState.lastSkippedPlayerId === myId ||
                (gameState.lastSkippedPlayerId === 'everyone' && myId !== visualTurnPlayerId)) && (
                <div className="absolute inset-0 -top-1.5 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in-75 duration-200">
                  <SkipProhibitionIcon size={38} />
                </div>
              )}
            </div>

            {/* Right: Card Count & Progress Bar */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[10px] sm:text-[11px] font-mono ${myHand.length >= 20 ? 'text-red-400 font-black animate-pulse' : 'text-slate-400'}`}>
                {myHand.length} / 25
              </span>
              <div className="w-16 sm:w-24 h-2 rounded-full bg-slate-900 border border-white/20 overflow-hidden shadow-inner">
                <div
                  className={`h-full transition-all duration-300 ${
                    myHand.length >= 20
                      ? 'bg-red-600 animate-pulse'
                      : myHand.length >= 14
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${mercyRatio}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {me?.isMercyEliminated ? (
          /* SPECTATOR MODE CONTROLS (Eliminated by Mercy Rule) */
          <div className="w-full max-w-xl px-4 py-3 flex flex-col items-center gap-2.5 safe-bottom">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-black shadow-lg animate-pulse">
              <span className="text-base">☠️</span>
              <span>ELIMINATED BY MERCY RULE (25+ CARDS)</span>
            </div>

            {/* CATCH UNO for spectators too! */}
            {uncaughtOpponent && (
              <button
                onClick={handleCatchUno}
                aria-label={`Catch ${uncaughtOpponent.name} without UNO`}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 min-h-[52px] rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 text-white border-2 border-white shadow-[0_0_30px_rgba(251,191,36,1)] animate-bounce ring-4 ring-amber-300 active:scale-95 transition"
              >
                <Siren className="w-5 h-5 animate-spin" />
                <span>🚨 CATCH {uncaughtOpponent.name} — FORGOT UNO! +2 CARDS! 🚨</span>
                <Siren className="w-5 h-5 animate-spin" />
              </button>
            )}

            <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Eye className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Watching game in spectator mode</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Spectator Emote Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmotePicker(!showEmotePicker)}
                    aria-label="Send emote"
                    className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-white shadow hover:bg-slate-700 active:scale-95 transition"
                  >
                    <Smile className="w-4 h-4 text-amber-300" />
                  </button>

                  {showEmotePicker && (
                    <div className="absolute bottom-11 right-0 z-50 p-2 rounded-2xl bg-slate-900 border-2 border-rose-500 shadow-2xl flex gap-1.5 backdrop-blur-md">
                      {EMOTE_LIST.map((em, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendEmote(em)}
                          className="text-2xl hover:scale-125 transition-transform active:scale-95 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Exit to Lobby Button */}
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-900/60 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit to Lobby</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* LOCAL PLAYER HAND COMPONENT */}
            <div className="w-full max-w-4xl px-2">
              <UnoHand
                hand={myHand}
                activeCard={gameState.activeUnoCard}
                activeColor={gameState.activeUnoColor}
                drawStackCount={gameState.drawStackCount}
                isMyTurn={isMyTurn}
                selectedCard={selectedCard}
                hiddenCardId={hiddenHandCardId}
                onSelectCard={setSelectedCard}
                onPlayCard={handleInitiatePlayCard}
              />
            </div>

            {/* BOTTOM ACTION BUTTONS: CALL UNO, CATCH UNO, EMOTES, DRAW */}

            {/* URGENT CATCH UNO FULL-WIDTH ALERT — shows when any opponent forgets to call UNO */}
            {uncaughtOpponent && (
              <div className="w-full max-w-4xl px-4 pt-1">
                <button
                  onClick={handleCatchUno}
                  aria-label={`Catch ${uncaughtOpponent.name} without UNO`}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 text-white border-2 border-white shadow-[0_0_40px_rgba(251,191,36,1)] animate-bounce ring-4 ring-amber-300 active:scale-95 transition"
                >
                  <Siren className="w-5 h-5 animate-spin flex-shrink-0" />
                  <span>🚨 {uncaughtOpponent.name} HAS 1 CARD &amp; FORGOT TO SAY UNO! TAP TO PUNISH! (+2 CARDS) 🚨</span>
                  <Siren className="w-5 h-5 animate-spin flex-shrink-0" />
                </button>
              </div>
            )}

            <div className="w-full max-w-4xl px-4 pb-2 pt-1 flex items-center justify-between gap-2 safe-bottom">
              {/* Left: Emote Button */}
              <div className="relative">
                <button
                  onClick={() => setShowEmotePicker(!showEmotePicker)}
                  aria-label="Send emote"
                  className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-gradient-to-b from-rose-500 to-red-700 border-2 border-red-300 flex items-center justify-center text-white shadow-xl active:scale-95 transition"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {showEmotePicker && (
                  <div className="absolute bottom-12 left-0 z-50 p-2 rounded-2xl bg-slate-900 border-2 border-rose-500 shadow-2xl flex gap-1.5 backdrop-blur-md">
                    {EMOTE_LIST.map((em, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendEmote(em)}
                        className="text-2xl hover:scale-125 transition-transform active:scale-95 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Center: Uno Call & Catch Buttons */}
              <div className="flex items-center gap-2">
                {/* CALL UNO BUTTON (Active strictly when holding 1 or 2 cards) */}
                {(myHand.length === 1 || myHand.length === 2) && !me?.rank && !me?.isMercyEliminated && (
                  <button
                    onClick={handleCallUno}
                    disabled={me?.calledUno}
                    aria-label="Call UNO"
                    className={`flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-full font-black text-xs sm:text-sm shadow-2xl transition active:scale-95 ${
                      me?.calledUno
                        ? 'bg-emerald-600 text-white border-2 border-emerald-300 opacity-90 cursor-default'
                        : 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white border-2 border-amber-300 animate-bounce ring-4 ring-red-400'
                    }`}
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>{me?.calledUno ? 'UNO CALLED! 📢' : 'CALL UNO!'}</span>
                  </button>
                )}

                {/* CATCH UNO BUTTON — Big urgent banner when opponent forgot UNO! */}
                {uncaughtOpponent && (
                  <button
                    onClick={handleCatchUno}
                    aria-label={`Catch ${uncaughtOpponent.name} without UNO`}
                    className="flex items-center gap-2 px-5 py-2.5 min-h-[48px] rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 text-white border-2 border-white shadow-[0_0_30px_rgba(251,191,36,1)] animate-bounce ring-4 ring-amber-300 active:scale-95 transition"
                  >
                    <Siren className="w-5 h-5 animate-spin flex-shrink-0" />
                    <span>🚨 CATCH {uncaughtOpponent.name}!<br/><span className="text-[10px] font-bold">FORGOT UNO → +2 CARDS</span></span>
                    <Siren className="w-5 h-5 animate-spin flex-shrink-0" />
                  </button>
                )}
              </div>

              {/* Right: PRIMARY ACTION BUTTON (Morphs: DRAW CARD <-> PLAY CARD) */}
              <div>
                {selectedCard ? (
                  <button
                    onClick={() => {
                      if (selectedIsValid && isMyTurn) {
                        handleInitiatePlayCard(selectedCard);
                      }
                    }}
                    disabled={!selectedIsValid || !isMyTurn}
                    aria-label="Play selected card"
                    className={`px-5 sm:px-6 py-2 min-h-[44px] rounded-full font-black text-xs sm:text-sm shadow-xl transition-all flex items-center gap-1.5 ${
                      selectedIsValid && isMyTurn
                        ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white ring-4 ring-emerald-300 animate-pulse active:scale-95 cursor-pointer shadow-emerald-500/60'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-60'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{selectedIsValid ? 'PLAY CARD' : 'CANNOT PLAY'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleDrawCard}
                    disabled={!isMyTurn}
                    aria-label={gameState.drawStackCount > 0 ? `Draw stacked +${gameState.drawStackCount} cards` : 'Draw card'}
                    className={`px-5 py-2 min-h-[44px] rounded-full font-black text-xs sm:text-sm shadow-xl transition-all ${
                      isMyTurn
                        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white ring-4 ring-rose-400 active:scale-95 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {gameState.drawStackCount > 0 ? `TAKE +${gameState.drawStackCount}` : 'DRAW CARD'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* GPU HARDWARE ACCELERATED FLYING CARDS OVERLAY */}
      {flyingCards.map(flight => (
        <div
          key={flight.id}
          className="animate-uno-flight-root"
          style={{
            '--u-start-x': `${flight.startX}px`,
            '--u-start-y': `${flight.startY}px`,
            '--u-end-x': `${flight.endX}px`,
            '--u-end-y': `${flight.endY}px`,
            '--u-duration': `${(flight.duration || 680) / 1000}s`,
          } as React.CSSProperties}
        >
          <div
            className="animate-uno-flight-inner"
            style={{
              '--u-start-scale': flight.startScale ?? 0.95,
              '--u-mid-scale': flight.midScale ?? 1.1,
              '--u-end-scale': flight.endScale ?? 1.0,
              '--u-start-rot': `${flight.startRot ?? -2}deg`,
              '--u-mid-rot': `${flight.midRot ?? 2}deg`,
              '--u-end-rot': `${flight.endRot ?? 0}deg`,
              '--u-arc-x': `${flight.arcX ?? 0}px`,
              '--u-arc-y': `${flight.arcY ?? -26}px`,
              '--u-duration': `${(flight.duration || 680) / 1000}s`,
            } as React.CSSProperties}
          >
            {flight.card ? (
              <UnoCardView card={flight.card} isCompact={false} isTableCard={true} />
            ) : (
              <UnoCardBackView size="table" />
            )}
          </div>
        </div>
      ))}

      {/* WILD COLOR PICKER MODAL */}
      {showColorPicker && pendingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-xs p-5 rounded-3xl bg-slate-900 border-2 border-amber-400 text-center shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">CHOOSE WILD COLOR</h3>
            <p className="text-xs text-slate-300 mb-3">Select the active color for the next player:</p>
            <div className="grid grid-cols-2 gap-3">
              {WILD_COLORS.map(({ color, label, bg }) => (
                <button
                  key={color}
                  onClick={() => executePlayCard(pendingCard, color)}
                  className={`py-4 min-h-[48px] rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all text-white ${bg}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7 SWAP HAND TARGET PICKER MODAL */}
      {showSwapPicker && pendingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-xs p-5 rounded-3xl bg-slate-900 border-2 border-amber-400 text-center shadow-2xl">
            <h3 className="text-lg font-black text-amber-300 mb-1">🔁 7 SWAP RULE!</h3>
            <p className="text-xs text-slate-300 mb-3">Choose a player to swap your entire hand with:</p>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {opponents
                .filter(p => !p.rank && !p.isMercyEliminated)
                .map(opp => (
                  <button
                    key={opp.id}
                    onClick={() => executePlayCard(pendingCard, undefined, opp.id)}
                    className="p-3 min-h-[44px] rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-400/40 flex items-center justify-between active:scale-95 transition-all"
                  >
                    <span className="font-bold text-white text-sm">{opp.name}</span>
                    <span className="text-xs bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                      {opp.cardsCount} cards
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-xs p-5 rounded-3xl bg-gradient-to-b from-purple-950 to-slate-950 border-2 border-red-500 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-red-500/30">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <Settings className="w-5 h-5" /> Game Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-purple-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-900/40 border border-purple-400/20">
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

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-900/40 border border-purple-400/20 text-xs">
                <span className="font-bold">Turn Timer</span>
                <span className="font-mono font-bold text-amber-300">30 Seconds</span>
              </div>

              {/* Host Controls: Transfer Host Rights */}
              {gameState.hostId === myId && (
                <div className="p-2.5 rounded-xl bg-purple-900/40 border border-purple-400/20 text-xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-xs p-6 rounded-3xl bg-slate-950 border-2 border-red-500 text-center shadow-2xl">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="text-lg font-black text-white">Leave Game?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Are you sure you want to exit? A computer bot will take over your cards so other players can finish.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                Stay
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg active:scale-95"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ELIMINATED BY MERCY RULE INFO POPUP MODAL */}
      {showEliminatedModal && !isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-red-950 via-slate-950 to-black border-2 border-red-500 text-center shadow-2xl">
            <div className="text-5xl mb-2 animate-bounce">☠️</div>
            <h2 className="text-xl font-black text-red-400 tracking-wide">MERCY RULE ELIMINATED!</h2>
            <p className="text-sm font-bold text-white mt-1">You accumulated 25+ cards!</p>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Under No Mercy rules, players who hold 25 or more cards are knocked out from this round.
              Sit back and spectate the remaining players, or exit to the lobby.
            </p>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => {
                  setShowEliminatedModal(false);
                  setIsWatching(true);
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm shadow-xl active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Watch Game</span>
              </button>
              <button
                onClick={() => {
                  setShowEliminatedModal(false);
                  setShowExitConfirm(true);
                }}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Exit to Lobby</span>
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
    </div>
  );
};
