import React, { useState, useEffect } from 'react';
import type { ClientGameState, UnoCard, UnoColor } from '../types';
import { canPlayUnoCard, getTurnNeighbors } from '../types';
import { socketService } from '../services/socket';
import { PlayerAvatar } from './PlayerAvatar';
import { UnoCardView } from './UnoCardView';
import { RankCardModal } from './RankCardModal';
import {
  getTableSeatPosition,
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
  RotateCw,
  RotateCcw,
  Settings,
  X,
  LogOut,
  Clock,
  AlertTriangle,
  Eye,
  LayoutGrid,
  Layers,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UnoGameScreenProps {
  gameState: ClientGameState;
  onExitToLobby?: () => void;
}

const EMOTE_LIST = ['😂', '🔥', '💀', '💥', '😱', '👏', '🥳', '😈'];
const COLORS: { color: UnoColor; label: string; bg: string }[] = [
  { color: 'red', label: 'RED', bg: 'bg-red-600 hover:bg-red-500' },
  { color: 'blue', label: 'BLUE', bg: 'bg-blue-600 hover:bg-blue-500' },
  { color: 'green', label: 'GREEN', bg: 'bg-emerald-600 hover:bg-emerald-500' },
  { color: 'yellow', label: 'YELLOW', bg: 'bg-amber-400 hover:bg-amber-300 text-slate-950' }
];

export const UnoGameScreen: React.FC<UnoGameScreenProps> = ({ gameState, onExitToLobby }) => {
  const [selectedCard, setSelectedCard] = useState<UnoCard | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showSwapPicker, setShowSwapPicker] = useState<boolean>(false);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [showEmotePicker, setShowEmotePicker] = useState<boolean>(false);
  const [activeEmotes, setActiveEmotes] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [viewMode, setViewMode] = useState<'grid' | 'fan'>('grid');
  const [sortByColor, setSortByColor] = useState<boolean>(true);
  const handScrollRef = React.useRef<HTMLDivElement>(null);

  const myId = socketService.playerId;
  const me = gameState.players.find(p => p.id === myId);
  const opponents = gameState.players.filter(p => p.id !== myId);

  // Active players still in Uno (not ranked out or mercy eliminated)
  const rawActive = gameState.players.filter(p => !p.rank && !p.isMercyEliminated && p.cardsCount > 0);
  const activePlayers = rawActive.length >= 2 ? rawActive : gameState.players;
  const orderedPlayers = reorderPlayersForLocalView(activePlayers, myId);
  const totalPlayers = orderedPlayers.length;
  const avatarSize = getAvatarSizeForCount(totalPlayers);

  // Finished / Safe winners or mercy eliminated players
  const finishedWinners = gameState.players
    .filter(p => p.rank || p.isMercyEliminated)
    .sort((a, b) => (a.rank || 99) - (b.rank || 99));

  const isMyTurn = gameState.currentTurnPlayerId === myId;
  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  const myHand = (gameState.myHand as UnoCard[]) || [];

  // Turn flow among ACTIVE players (accounting for CW / CCW direction)
  const { playerBeforeMe, playerAfterMe } = getTurnNeighbors(
    activePlayers,
    myId,
    gameState.direction || 1
  );

  // Animated feedback for Card Plays & Card Draws
  const [actionNotice, setActionNotice] = useState<{
    type: 'draw' | 'play';
    text: string;
    playerName: string;
    playerId?: string;
  } | null>(null);
  const [isDrawingAnimation, setIsDrawingAnimation] = useState<boolean>(false);
  const [isCardSlamming, setIsCardSlamming] = useState<boolean>(false);
  const [isSwapAnimating, setIsSwapAnimating] = useState<boolean>(false);
  const [swapBannerText, setSwapBannerText] = useState<string>('');

  const prevActiveCardIdRef = React.useRef<string | undefined>(gameState.activeUnoCard?.id);
  const prevLastActionRef = React.useRef<string>(gameState.lastAction || '');

  // Detect card play vs card draw vs card swap and trigger rich animations
  useEffect(() => {
    const currentActiveId = gameState.activeUnoCard?.id;
    const currentAction = gameState.lastAction || '';

    // 1. Detect CARD PLAY onto discard pile
    if (currentActiveId && currentActiveId !== prevActiveCardIdRef.current) {
      prevActiveCardIdRef.current = currentActiveId;
      setIsCardSlamming(true);
      setTimeout(() => setIsCardSlamming(false), 500);
      sounds.playCardPlay();

      const playedByPlayer = gameState.players.find(p => currentAction.includes(p.name));
      const cardTitle = gameState.activeUnoCard
        ? `${gameState.activeUnoCard.color.toUpperCase()} ${gameState.activeUnoCard.type.replace('_', ' ').toUpperCase()}`
        : 'Card';

      setActionNotice({
        type: 'play',
        text: `Played ${cardTitle}`,
        playerName: playedByPlayer ? playedByPlayer.name : 'Player',
        playerId: playedByPlayer?.id
      });
    }

    // 2. Detect CARD DRAW from draw pile
    if (
      currentAction !== prevLastActionRef.current &&
      (currentAction.toLowerCase().includes('drew') || currentAction.toLowerCase().includes('draw'))
    ) {
      prevLastActionRef.current = currentAction;
      setIsDrawingAnimation(true);
      setTimeout(() => setIsDrawingAnimation(false), 600);
      sounds.playCardDeal();

      const drawingPlayer = gameState.players.find(p => currentAction.includes(p.name));
      const match = currentAction.match(/drew (\d+)/i);
      const drawCount = match ? match[1] : '1';

      setActionNotice({
        type: 'draw',
        text: `Drew +${drawCount} Cards`,
        playerName: drawingPlayer ? drawingPlayer.name : 'Player',
        playerId: drawingPlayer?.id
      });
    } else if (
      currentAction !== prevLastActionRef.current &&
      (currentAction.includes('SWAPPED HANDS') || currentAction.includes('ALL HANDS PASSED'))
    ) {
      // 3. Detect 7-SWAP or 0-PASS CARD SWAP
      prevLastActionRef.current = currentAction;
      setIsSwapAnimating(true);
      setSwapBannerText(
        currentAction.includes('ALL HANDS PASSED')
          ? '🔄 ALL PLAYERS PASSED HANDS!'
          : '🔁 HANDS SWAPPED BETWEEN PLAYERS!'
      );
      sounds.playCardDeal();
      setTimeout(() => {
        setIsSwapAnimating(false);
        setSwapBannerText('');
      }, 1900);
    } else {
      prevLastActionRef.current = currentAction;
    }

    const timer = setTimeout(() => {
      setActionNotice(null);
    }, 2800);

    return () => clearTimeout(timer);
  }, [gameState.activeUnoCard?.id, gameState.lastAction, gameState.players]);

  const COLOR_ORDER: Record<UnoColor, number> = {
    red: 1,
    blue: 2,
    green: 3,
    yellow: 4,
    wild: 5
  };

  const displayHand = React.useMemo(() => {
    if (!sortByColor) return myHand;
    return [...myHand].sort((a, b) => {
      const colDiff = (COLOR_ORDER[a.color] || 99) - (COLOR_ORDER[b.color] || 99);
      if (colDiff !== 0) return colDiff;
      const aVal = a.type === 'number' ? (a.value ?? 0) : 100;
      const bVal = b.type === 'number' ? (b.value ?? 0) : 100;
      if (aVal !== bVal) return aVal - bVal;
      return a.type.localeCompare(b.type);
    });
  }, [myHand, sortByColor]);

  const getFanMarginLeft = (totalCards: number, idx: number): string => {
    if (idx === 0) return '0px';
    if (totalCards <= 5) return '-14px';
    if (totalCards <= 8) return '-26px';
    if (totalCards <= 12) return '-36px';
    if (totalCards <= 16) return '-44px';
    return '-50px';
  };

  const scrollHand = (dir: 'left' | 'right') => {
    if (handScrollRef.current) {
      const scrollAmt = dir === 'left' ? -220 : 220;
      handScrollRef.current.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    }
  };

  // 30-Second Turn Countdown
  useEffect(() => {
    if (!gameState.turnExpiresAt) {
      setSecondsRemaining(30);
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
  }, [gameState.turnExpiresAt, isMyTurn]);

  // Listen for emotes from teammates and opponents
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

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Check if a specific card in hand is valid to play right now
  const isCardValid = (card: UnoCard): boolean => {
    if (!isMyTurn) return false;
    if (!gameState.activeUnoCard) return true;
    return canPlayUnoCard(card, gameState.activeUnoCard, gameState.activeUnoColor || 'red', gameState.drawStackCount);
  };

  const handleCardClick = (card: UnoCard) => {
    if (!isMyTurn) return;
    if (!isCardValid(card)) return; // Block tapping invalid/grayed-out cards
    // Selecting card on tap
    if (selectedCard?.id === card.id) {
      // Tapped selected card again -> deal it
      handleConfirmPlayUnoCard(card);
    } else {
      setSelectedCard(card);
    }
  };

  const handleConfirmPlayUnoCard = (card: UnoCard) => {
    if (!isMyTurn) return;

    if (card.color === 'wild') {
      setPendingWildCard(card);
      setShowColorPicker(true);
      return;
    }

    if (card.type === 'swap_7') {
      setPendingWildCard(card);
      setShowSwapPicker(true);
      return;
    }

    playCard(card);
  };

  const playCard = (card: UnoCard, chosenColor?: UnoColor, swapTargetPlayerId?: string) => {
    sounds.playCardPlay();
    socketService.playUnoCard(gameState.roomCode, card.id, chosenColor, swapTargetPlayerId);
    setSelectedCard(null);
    setPendingWildCard(null);
    setShowColorPicker(false);
    setShowSwapPicker(false);
  };

  const handleDrawCard = () => {
    if (!isMyTurn) return;
    sounds.playCardDeal();
    socketService.drawUnoCard(gameState.roomCode);
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

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    setShowSettingsModal(false);
    if (onExitToLobby) {
      onExitToLobby();
    } else {
      socketService.leaveRoom();
    }
  };

  const isGameOver = gameState.status === 'game_over';
  const winner = gameState.players.find(p => p.rank === 1);

  useEffect(() => {
    if (isGameOver) {
      if (winner && winner.id === myId) {
        sounds.playVictory();
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
      }
    }
  }, [isGameOver, winner, myId]);

  const mercyRatio = Math.min((myHand.length / 25) * 100, 100);

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#1c0422] via-[#2d0536] to-[#0f0113] text-white select-none">
      {/* SINGLE CONSOLIDATED TOP BAR */}
      <div className="relative z-20 w-full px-3 safe-top py-1.5 flex items-center justify-between bg-black/60 backdrop-blur-md border-b border-red-500/30 gap-2">
        {/* Left: Title & Room */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xl filter drop-shadow">🔥</span>
          <div className="leading-tight">
            <span className="text-xs sm:text-sm font-black tracking-wider text-rose-400">UNO NO MERCY</span>
            <div className="text-[9px] text-purple-200 font-mono font-bold">CODE: {gameState.roomCode}</div>
          </div>
        </div>

        {/* Center: Turn Flow & Status Pill (Prev, Active Turn, Next) + Stack info */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          {/* Stacking Pill if active */}
          {gameState.drawStackCount > 0 && (
            <div className="flex items-center gap-1 bg-red-600 px-2.5 py-0.5 rounded-full text-xs font-black animate-pulse shadow-red-500 shadow-md border border-red-300 flex-shrink-0">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>+{gameState.drawStackCount} STACK</span>
            </div>
          )}

          {/* Turn Relationship Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-purple-500/50 shadow-md text-xs flex-shrink-0">
            {playerBeforeMe && (
              <span className="text-[10px] text-cyan-300 font-bold hidden sm:inline" title="Plays before you">
                ⏮️ {playerBeforeMe.name}
              </span>
            )}

            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[11px] shadow ${
              isMyTurn
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 animate-pulse'
                : 'bg-purple-900/80 text-amber-200'
            }`}>
              <span className="text-emerald-400 font-black">{gameState.direction === -1 ? '↺ REV' : '↻ CW'}</span>
              <span className="truncate max-w-[85px] sm:max-w-[110px]">{isMyTurn ? "YOUR TURN!" : currentTurnPlayer?.name}</span>
            </div>

            {playerAfterMe && (
              <span className="text-[10px] text-emerald-300 font-bold hidden sm:inline" title="Plays after you">
                {playerAfterMe.name} ⏭️
              </span>
            )}
          </div>

          {/* 30s Countdown Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-lg flex-shrink-0 ${
              secondsRemaining <= 5
                ? 'bg-red-600 text-white border-white animate-pulse'
                : secondsRemaining <= 12
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-emerald-600 text-white border-emerald-300'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${secondsRemaining <= 5 ? 'animate-spin' : ''}`} />
            <span className="font-mono text-[11px]">{secondsRemaining}s</span>
          </div>
        </div>

        {/* Right: Settings / Exit */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-400/50 text-amber-300 shadow-md active:scale-95 transition-all flex-shrink-0"
          title="Settings & Exit"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* FINISHED / SAFE WINNERS & MERCY ELIMINATED BANNER (Once players start winning / KO) */}
      {finishedWinners.length > 0 && !isGameOver && (
        <div className="relative z-15 w-full px-3 py-1 flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar bg-black/40 backdrop-blur-sm border-b border-purple-500/20">
          <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <span>🏆</span>
            <span>Status:</span>
          </span>
          {finishedWinners.map(w => (
            <div
              key={`safe-${w.id}`}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-[10px] sm:text-[11px] shadow-md border flex-shrink-0 ${
                w.isMercyEliminated
                  ? 'bg-red-950/90 text-red-300 border-red-500/50'
                  : 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-white/60'
              }`}
            >
              <span>{w.rank ? `#${w.rank}` : '💀'}</span>
              <span className="truncate max-w-[80px]">{w.name}</span>
              <span
                className={`text-[8px] px-1 py-0.2 rounded-full font-bold ${
                  w.isMercyEliminated
                    ? 'bg-red-800 text-white'
                    : 'bg-slate-950 text-emerald-300'
                }`}
              >
                {w.isMercyEliminated ? 'KO' : 'Safe'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CASINO CIRCULAR TABLE ARENA (Dynamic 2 to 10 Players Layout - Uno No Mercy) */}
      <div className="relative z-10 w-full max-w-lg mx-auto px-2 flex-1 flex flex-col justify-center my-0.5">
        <div className="relative w-full aspect-[1/0.95] max-h-[350px] sm:max-h-[390px] mx-auto flex items-center justify-center">
          
          {/* Glowing Neon Circular Table Rim */}
          <div className="absolute inset-1.5 sm:inset-3 rounded-full border-2 border-red-500/60 shadow-[0_0_35px_rgba(239,68,68,0.45),inset_0_0_40px_rgba(0,0,0,0.85)] bg-gradient-to-b from-[#28041c]/90 via-[#3a0628]/85 to-[#170110]/95 pointer-events-none" />

          {/* Revolving Central Neon Direction Arrow Track (Spins CW or CCW with game direction!) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-30">
            <div
              className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-dashed border-emerald-400/50 flex items-center justify-center ${
                gameState.direction === -1 ? 'animate-green-arrow-ccw' : 'animate-green-arrow-cw'
              }`}
            >
              <div className="absolute -top-3 text-emerald-400 text-sm sm:text-base font-black filter drop-shadow-[0_0_10px_#22c55e]">
                {gameState.direction === -1 ? '◀' : '▶'}
              </div>
              <div className="absolute -bottom-3 text-emerald-400 text-sm sm:text-base font-black filter drop-shadow-[0_0_10px_#22c55e]">
                {gameState.direction === -1 ? '▶' : '◀'}
              </div>
              <div className="absolute -right-3 text-emerald-400 text-sm sm:text-base font-black filter drop-shadow-[0_0_10px_#22c55e]">
                {gameState.direction === -1 ? '▲' : '▼'}
              </div>
              <div className="absolute -left-3 text-emerald-400 text-sm sm:text-base font-black filter drop-shadow-[0_0_10px_#22c55e]">
                {gameState.direction === -1 ? '▼' : '▲'}
              </div>
            </div>
          </div>

          {/* CENTER PLAY AREA: DRAW PILE + ACTIVE DISCARD PILE */}
          <div className="relative z-10 flex flex-col items-center justify-center px-2">
            <div className="flex items-center gap-3 sm:gap-5">
              {/* DRAW PILE WITH ANIMATION */}
              <div className="relative">
                <div
                  onClick={isMyTurn ? handleDrawCard : undefined}
                  className={`relative w-11 h-16 sm:w-14 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-900 to-black border-2 border-slate-600 shadow-2xl flex flex-col items-center justify-center transition-all ${
                    isDrawingAnimation ? 'scale-110 ring-4 ring-cyan-400 shadow-cyan-400/80' : ''
                  } ${
                    isMyTurn
                      ? 'cursor-pointer hover:scale-105 active:scale-95 ring-4 ring-yellow-400 animate-turn-pulse shadow-yellow-400/50'
                      : 'opacity-70'
                  }`}
                >
                  <span className="text-base sm:text-lg font-black text-red-500 tracking-tighter">UNO</span>
                  <span className="text-[7px] sm:text-[8px] text-slate-300 font-bold">DRAW</span>
                  {gameState.drawStackCount > 0 && isMyTurn && (
                    <div className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded-full border border-white animate-bounce shadow-xl">
                      +{gameState.drawStackCount}
                    </div>
                  )}
                </div>

                {/* Floating visual card leaving draw pile when someone draws */}
                {isDrawingAnimation && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 border-2 border-white flex flex-col items-center justify-center text-white font-black text-[9px] pointer-events-none animate-bounce shadow-2xl z-30">
                    <span className="text-xs">🎴</span>
                    <span className="text-[7px] tracking-wider">DRAW</span>
                  </div>
                )}
              </div>

              {/* ACTIVE DISCARD PILE WITH DEAL-TO-TABLE ANIMATION */}
              <div className={`relative transition-all duration-200 ${isCardSlamming ? 'scale-110 -rotate-3 ring-4 ring-amber-300 rounded-2xl shadow-yellow-400/80' : ''}`}>
                {gameState.activeUnoCard ? (
                  <div key={gameState.activeUnoCard.id} className="relative animate-deal-to-table">
                    <div
                      className={`absolute -inset-2 rounded-2xl blur-md opacity-80 ${
                        gameState.activeUnoColor === 'red'
                          ? 'bg-red-500'
                          : gameState.activeUnoColor === 'blue'
                          ? 'bg-blue-500'
                          : gameState.activeUnoColor === 'green'
                          ? 'bg-emerald-500'
                          : 'bg-yellow-400'
                      }`}
                    />
                    <UnoCardView card={gameState.activeUnoCard} isCompact={true} isValid={false} />
                  </div>
                ) : null}

                {/* Color Indicator Badge */}
                <div className="mt-0.5 text-center">
                  <span
                    className={`text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.2 rounded-full border border-white shadow-xl ${
                      gameState.activeUnoColor === 'red'
                        ? 'bg-red-600 text-white'
                        : gameState.activeUnoColor === 'blue'
                        ? 'bg-blue-600 text-white'
                        : gameState.activeUnoColor === 'green'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {gameState.activeUnoColor || 'ANY'}
                  </span>
                </div>
              </div>
            </div>

            {/* DYNAMIC CARD SWAP ANIMATION OVERLAY (Cards flying player-to-player) */}
            {isSwapAnimating && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none bg-black/60 backdrop-blur-[2px] rounded-3xl">
                <div className="relative w-full max-w-xs h-14 flex items-center justify-center">
                  <div className="absolute animate-swap-a-to-b w-9 h-13 rounded-xl bg-gradient-to-br from-red-600 via-rose-500 to-amber-500 border-2 border-white shadow-2xl flex flex-col items-center justify-center text-white font-black text-[9px]">
                    <span className="text-xs">🔁</span>
                    <span className="text-[7px]">HAND</span>
                  </div>
                  <div className="absolute animate-swap-b-to-a w-9 h-13 rounded-xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 border-2 border-white shadow-2xl flex flex-col items-center justify-center text-white font-black text-[9px]">
                    <span className="text-xs">🎴</span>
                    <span className="text-[7px]">SWAP</span>
                  </div>
                </div>
                <div className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[11px] border-2 border-white shadow-2xl flex items-center gap-1 animate-bounce">
                  <span>🔁</span>
                  <span>{swapBannerText || 'HANDS SWAPPED!'}</span>
                </div>
              </div>
            )}

            {/* PROMINENT ANIMATED ACTION BANNER: Clearly shows DRAW vs PLAY */}
            {actionNotice && !isSwapAnimating ? (
              <div
                className={`mt-1 px-2.5 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-black shadow-2xl flex items-center gap-1 animate-bounce ${
                  actionNotice.type === 'draw'
                    ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white border-cyan-300 shadow-cyan-500/50'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-white shadow-yellow-400/60'
                }`}
              >
                <span>{actionNotice.type === 'draw' ? '📥' : '🎯'}</span>
                <span className="truncate max-w-[160px]">
                  <strong>{actionNotice.playerName}</strong> {actionNotice.text}
                </span>
              </div>
            ) : gameState.lastAction && !isSwapAnimating ? (
              <div className="mt-0.5 px-2 py-0.2 rounded-full bg-slate-950/90 border border-purple-500/40 text-purple-200 text-[8px] sm:text-[9px] font-bold shadow-xl text-center max-w-[180px] truncate">
                {gameState.lastAction}
              </div>
            ) : null}
          </div>

          {/* DYNAMIC PLAYER SEATS (Outer Table Perimeter, 2 to 10 Players) */}
          {orderedPlayers.map((player, idx) => {
            const seatPos = getTableSeatPosition(totalPlayers, idx);
            const theme = PLAYER_THEME_KEYS[idx % PLAYER_THEME_KEYS.length];
            const isSelf = player.id === myId;

            return (
              <div
                key={`uno-avatar-${player.id}`}
                style={seatPos.avatarStyle}
                className="transition-all duration-300"
              >
                <div className="relative flex flex-col items-center">
                  <PlayerAvatar
                    player={player}
                    size={avatarSize}
                    isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                    isSelf={isSelf}
                    actionNotice={actionNotice?.playerId === player.id ? { type: actionNotice.type, text: actionNotice.text } : null}
                    colorTheme={theme}
                    activeEmote={activeEmotes[player.id]}
                    turnExpiresAt={gameState.turnExpiresAt}
                    turnDuration={gameState.turnDuration}
                    isBeforeMe={playerBeforeMe?.id === player.id}
                    isAfterMe={playerAfterMe?.id === player.id}
                  />
                  {player.cardsCount >= 18 && !player.isMercyEliminated && (
                    <span className="text-[7px] sm:text-[8px] font-black text-rose-400 bg-red-950/90 px-1 rounded border border-red-500 animate-pulse block text-center mt-0.5 z-20">
                      ⚠️ {player.cardsCount}/25 KO
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MERCY DANGER METER */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-1">
        <div className="flex justify-between items-center text-xs font-black text-slate-200 mb-0.5">
          <span className="flex items-center gap-1">
            <AlertTriangle className={`w-3.5 h-3.5 ${myHand.length >= 20 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`} />
            MERCY RULE METER
          </span>
          <span className={myHand.length >= 20 ? 'text-red-400 font-black animate-pulse' : 'text-slate-300'}>
            {myHand.length} / 25 Cards (KO at 25)
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-900 border border-white/20 overflow-hidden shadow-inner">
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

      {/* HAND VIEW CONTROLS BAR (Allows seeing ALL cards with 1 tap!) */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 py-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-amber-300">
            My Cards ({myHand.length})
          </span>
          {myHand.length > 7 && (
            <span className="text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full">
              {viewMode === 'grid' ? 'Showing All Cards' : 'Swipe / Scroll to See All'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Sort Color Button */}
          <button
            onClick={() => setSortByColor(!sortByColor)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition-all active:scale-95 ${
              sortByColor
                ? 'bg-purple-900/80 border-purple-400 text-amber-300 shadow-sm'
                : 'bg-white/10 border-white/20 text-slate-300 hover:text-white'
            }`}
            title="Organize cards by color"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>Sort Color</span>
          </button>

          {/* View Mode Toggle: Grid (Show All) vs Fan */}
          <button
            onClick={() => setViewMode(viewMode === 'fan' ? 'grid' : 'fan')}
            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 flex items-center gap-1 shadow-md active:scale-95 transition-all"
            title={viewMode === 'fan' ? 'Switch to Grid View to see all cards at once' : 'Switch to Fan View'}
          >
            {viewMode === 'fan' ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Show All Cards</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span>Fan View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM PLAYER HAND: GRID VIEW (SHOW ALL) OR DYNAMIC FAN VIEW */}
      {viewMode === 'grid' ? (
        /* ALL CARDS GRID VIEW (Wraps into organized rows, ZERO cards cut off!) */
        <div className="relative z-10 w-full max-w-3xl mx-auto overflow-y-auto max-h-52 sm:max-h-60 py-2 px-3 no-scrollbar">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {displayHand.map((card) => (
              <UnoCardView
                key={card.id}
                card={card}
                isSelected={selectedCard?.id === card.id}
                isValid={isCardValid(card)}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* HORIZONTAL FAN VIEW (With dynamic overlap, desktop mouse wheel & scroll arrows) */
        <div className="relative z-10 w-full max-w-3xl mx-auto py-1 px-1">
          {myHand.length > 7 && (
            <>
              <button
                onClick={() => scrollHand('left')}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-slate-900/90 border border-amber-400/60 text-amber-300 shadow-xl active:scale-90 hover:bg-slate-800"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollHand('right')}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-slate-900/90 border border-amber-400/60 text-amber-300 shadow-xl active:scale-90 hover:bg-slate-800"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          <div
            ref={handScrollRef}
            onWheel={(e) => {
              if (handScrollRef.current) {
                handScrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="w-full overflow-x-auto py-2 px-6 no-scrollbar cursor-grab"
          >
            <div className="flex items-center justify-center min-w-max px-2">
              {displayHand.map((card, idx) => (
                <div
                  key={card.id}
                  style={{
                    marginLeft: getFanMarginLeft(displayHand.length, idx),
                    zIndex: selectedCard?.id === card.id ? 100 : idx + 10
                  }}
                  className="transition-all duration-150 hover:z-50"
                >
                  <UnoCardView
                    card={card}
                    isSelected={selectedCard?.id === card.id}
                    isValid={isCardValid(card)}
                    onClick={() => handleCardClick(card)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION BAR (With Safe-Area padding for mobile navigation bar) */}
      <div className="relative z-20 w-full px-3 pt-2 safe-bottom bg-gradient-to-t from-black via-black/95 to-black/80 flex items-center justify-between border-t border-red-500/30">
        {/* Emote Button */}
        <div className="relative">
          <button
            onClick={() => setShowEmotePicker(!showEmotePicker)}
            className="w-11 h-11 rounded-full bg-gradient-to-b from-rose-400 to-red-600 border-2 border-red-300 flex items-center justify-center text-white shadow-xl active:scale-95 transition-all"
            title="Emotes"
          >
            <Smile className="w-6 h-6" />
          </button>

          {showEmotePicker && (
            <div className="absolute bottom-14 left-0 z-40 p-2 rounded-2xl bg-slate-900 border-2 border-rose-500 shadow-2xl flex gap-1.5 backdrop-blur-md">
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
        </div>

        {/* If Spectating / Cleared Hand / Knocked Out */}
        {!!me?.rank || me?.isMercyEliminated ? (
          <div className="flex-1 mx-2 flex items-center justify-between px-3.5 py-2 rounded-2xl bg-rose-950/70 border border-amber-400/40 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-pulse">
                {me?.isMercyEliminated ? '☠️' : '🏆'}
              </span>
              <div className="text-left">
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>SPECTATING MATCH</span>
                  {me?.rank ? (
                    <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      Winner! Rank #{me.rank}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                      Mercy Knockout
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-rose-200">
                  Watching live until all players finish...
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowExitConfirm(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 active:scale-95 transition-all"
            >
              Exit
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1" />
          </>
        )}

        {/* Action Button: DEAL CARD (when card selected) OR DRAW (when no card selected) */}
        {selectedCard ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCard(null)}
              className="px-3 py-2 rounded-full bg-slate-800 text-slate-300 text-xs font-bold active:scale-95 border border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => handleConfirmPlayUnoCard(selectedCard)}
              disabled={!isMyTurn}
              className="px-6 py-2.5 rounded-full font-black text-sm sm:text-base shadow-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 ring-4 ring-yellow-300 active:scale-95 cursor-pointer animate-pulse"
            >
              DEAL CARD
            </button>
          </div>
        ) : (
          <button
            onClick={handleDrawCard}
            disabled={!isMyTurn}
            className={`px-5 py-2.5 rounded-full font-black text-sm sm:text-base shadow-2xl transition-all ${
              isMyTurn
                ? 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-white ring-4 ring-rose-400 active:scale-95 animate-bounce'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {gameState.drawStackCount > 0 ? `TAKE +${gameState.drawStackCount}` : 'DRAW CARD'}
          </button>
        )}
      </div>

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

      {/* WILD COLOR PICKER MODAL */}
      {showColorPicker && pendingWildCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-xs p-5 rounded-3xl bg-slate-900 border-2 border-amber-400 text-center shadow-2xl">
            <h3 className="text-lg font-black text-white mb-3">CHOOSE WILD COLOR</h3>
            <div className="grid grid-cols-2 gap-3">
              {COLORS.map(({ color, label, bg }) => (
                <button
                  key={color}
                  onClick={() => playCard(pendingWildCard, color)}
                  className={`py-4 rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all text-white ${bg}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7 SWAP HAND TARGET PICKER MODAL */}
      {showSwapPicker && pendingWildCard && (
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
                    onClick={() => playCard(pendingWildCard, undefined, opp.id)}
                    className="p-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-400/40 flex items-center justify-between active:scale-95 transition-all"
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

      {/* WATCH OR EXIT MODAL (When player finishes their cards) */}
      {!!me?.rank && me.cardsCount === 0 && !isGameOver && !isWatching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-rose-950 to-slate-950 border-2 border-amber-400 text-center shadow-2xl">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-xl font-black text-amber-300">YOU CLEARED YOUR HAND!</h2>
            <p className="text-sm font-bold text-white mt-1">
              Rank #{me?.rank} Winner!
            </p>
            <p className="text-xs text-rose-200 mt-2">
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
