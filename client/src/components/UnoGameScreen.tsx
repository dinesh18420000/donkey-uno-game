import React, { useState, useEffect, useRef } from 'react';
import type { ClientGameState, UnoCard, UnoColor } from '../types';
import { canPlayUnoCard, getTurnNeighbors } from '../types';
import { socketService } from '../services/socket';
import { PlayerAvatar } from './PlayerAvatar';
import { UnoCardView } from './UnoCardView';
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
  AlertTriangle,
  Eye,
  Megaphone,
  Siren,
  RotateCw,
  Sparkles,
  Smartphone
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UnoGameScreenProps {
  gameState: ClientGameState;
  onExitToLobby?: () => void;
}

const EMOTE_LIST = ['😂', '🔥', '💀', '💥', '😱', '👏', '🥳', '😈'];
const WILD_COLORS: { color: UnoColor; label: string; bg: string }[] = [
  { color: 'red', label: 'RED', bg: 'bg-[#ff2a4b] hover:bg-red-500' },
  { color: 'blue', label: 'BLUE', bg: 'bg-[#0099ff] hover:bg-blue-400' },
  { color: 'green', label: 'GREEN', bg: 'bg-[#00c853] hover:bg-emerald-400' },
  { color: 'yellow', label: 'YELLOW', bg: 'bg-[#ffaa00] hover:bg-amber-300 text-slate-950 font-black' }
];

export const UnoGameScreen: React.FC<UnoGameScreenProps> = ({ gameState, onExitToLobby }) => {
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
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissRotateTip, setDismissRotateTip] = useState<boolean>(false);

  const myId = socketService.playerId;
  const me = gameState.players.find(p => p.id === myId);
  const opponents = gameState.players.filter(p => p.id !== myId);

  // Active players still in Uno (not ranked out or mercy eliminated)
  const rawActive = gameState.players.filter(p => !p.rank && !p.isMercyEliminated && p.cardsCount > 0);
  const activePlayers = rawActive.length >= 2 ? rawActive : gameState.players;
  const orderedPlayers = reorderPlayersForLocalView(activePlayers, myId);
  const totalPlayers = orderedPlayers.length;
  const avatarSize = getAvatarSizeForCount(totalPlayers);
  const hideOpponentNames = totalPlayers >= 8;

  const isMyTurn = gameState.currentTurnPlayerId === myId;
  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  const myHand = (gameState.myHand as UnoCard[]) || [];

  // Turn flow among active players
  const { playerBeforeMe, playerAfterMe } = getTurnNeighbors(
    activePlayers,
    myId,
    gameState.direction || 1
  );

  // Detect orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Animations & Sound Triggers
  const [actionNotice, setActionNotice] = useState<{
    type: 'draw' | 'play';
    text: string;
    playerName: string;
    playerId?: string;
  } | null>(null);
  const [isCardSlamming, setIsCardSlamming] = useState<boolean>(false);
  const [isDrawingAnimation, setIsDrawingAnimation] = useState<boolean>(false);
  const [isSwapAnimating, setIsSwapAnimating] = useState<boolean>(false);
  const [swapBannerText, setSwapBannerText] = useState<string>('');

  const prevActiveCardIdRef = useRef<string | undefined>(gameState.activeUnoCard?.id);
  const prevLastActionRef = useRef<string>(gameState.lastAction || '');
  const prevStackCountRef = useRef<number>(gameState.drawStackCount || 0);

  useEffect(() => {
    const currentActiveId = gameState.activeUnoCard?.id;
    const currentAction = gameState.lastAction || '';
    const currentStack = gameState.drawStackCount || 0;

    // Detect card play
    if (currentActiveId && currentActiveId !== prevActiveCardIdRef.current) {
      prevActiveCardIdRef.current = currentActiveId;
      setIsCardSlamming(true);
      setTimeout(() => setIsCardSlamming(false), 450);

      if (currentAction.includes('Reversed')) {
        sounds.playReverseSound();
      } else if (currentStack > 0 && currentStack > prevStackCountRef.current) {
        sounds.playStackSlamSound();
      } else {
        sounds.playCardPlay();
      }

      const playedBy = gameState.players.find(p => currentAction.includes(p.name));
      const title = gameState.activeUnoCard
        ? `${gameState.activeUnoCard.color.toUpperCase()} ${gameState.activeUnoCard.type.replace('_', ' ').toUpperCase()}`
        : 'Card';

      setActionNotice({
        type: 'play',
        text: `Played ${title}`,
        playerName: playedBy ? playedBy.name : 'Player',
        playerId: playedBy?.id
      });
    }

    // Detect card draw
    if (
      currentAction !== prevLastActionRef.current &&
      (currentAction.toLowerCase().includes('drew') || currentAction.toLowerCase().includes('draw'))
    ) {
      prevLastActionRef.current = currentAction;
      setIsDrawingAnimation(true);
      setTimeout(() => setIsDrawingAnimation(false), 550);
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
      prevLastActionRef.current = currentAction;
      setIsSwapAnimating(true);
      setSwapBannerText(
        currentAction.includes('ALL HANDS PASSED')
          ? '🔄 ALL PLAYERS PASSED HANDS!'
          : '🔁 HANDS SWAPPED!'
      );
      sounds.playCardDeal();
      setTimeout(() => {
        setIsSwapAnimating(false);
        setSwapBannerText('');
      }, 1800);
    } else if (currentAction !== prevLastActionRef.current && currentAction.includes('ELIMINATED')) {
      prevLastActionRef.current = currentAction;
      sounds.playMercyEliminatedSound();
    } else {
      prevLastActionRef.current = currentAction;
    }

    prevStackCountRef.current = currentStack;

    const timer = setTimeout(() => {
      setActionNotice(null);
    }, 2600);

    return () => clearTimeout(timer);
  }, [gameState.activeUnoCard?.id, gameState.lastAction, gameState.drawStackCount, gameState.players]);

  // Turn Countdown
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

  // Card Play Confirmation
  const handleInitiatePlayCard = (card: UnoCard) => {
    if (!isMyTurn) return;

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
    const willHaveOneCard = myHand.length === 2;
    // Automatically include Uno call if local player is about to drop to 1 card
    const callUno = willHaveOneCard || me?.calledUno;

    socketService.playUnoCard(gameState.roomCode, card.id, chosenColor, swapTargetPlayerId, callUno);
    setSelectedCard(null);
    setPendingCard(null);
    setShowColorPicker(false);
    setShowSwapPicker(false);
  };

  // Draw Card
  const handleDrawCard = () => {
    if (!isMyTurn) return;
    sounds.playCardDeal();
    socketService.drawUnoCard(gameState.roomCode);
    setSelectedCard(null);
  };

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

  const isGameOver = gameState.status === 'game_over';
  const winner = gameState.players.find(p => p.rank === 1);

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
    <div className="relative w-full h-full min-h-[100dvh] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#120317] via-[#240428] to-[#0a020e] text-white select-none">
      {/* PORTRAIT ROTATE TO LANDSCAPE BANNER */}
      {isPortrait && !dismissRotateTip && (
        <div className="relative z-50 w-full px-3 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-slate-950 font-black text-xs flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 animate-spin" />
            <span>Rotate phone to <strong>Landscape</strong> for the best Uno No Mercy experience!</span>
          </div>
          <button
            onClick={() => setDismissRotateTip(true)}
            className="p-1 rounded-full bg-slate-900/30 text-slate-950 hover:bg-slate-900/50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP NAVIGATION / STATUS BAR */}
      <div className="relative z-30 w-full px-3 py-1.5 flex items-center justify-between bg-black/70 backdrop-blur-md border-b border-red-500/30 gap-2">
        {/* Left: Branding & Room */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl filter drop-shadow">🔥</span>
          <div className="leading-tight">
            <div className="text-xs sm:text-sm font-black tracking-wider text-rose-400">UNO NO MERCY</div>
            <div className="text-[9px] text-purple-300 font-mono font-bold">ROOM: {gameState.roomCode}</div>
          </div>
        </div>

        {/* Center: Turn Status, Direction & Timer */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Turn Flow Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/90 border border-purple-500/50 shadow-md text-xs">
            {playerBeforeMe && (
              <span className="text-[10px] text-cyan-300 font-bold hidden md:inline">
                ⏮️ {playerBeforeMe.name}
              </span>
            )}

            <div
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-xs shadow ${
                isMyTurn
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 animate-pulse'
                  : 'bg-purple-900/80 text-amber-200'
              }`}
            >
              <span className="text-emerald-400 font-black">
                {gameState.direction === -1 ? '↺ REV' : '↻ CW'}
              </span>
              <span className="truncate max-w-[100px] sm:max-w-[130px]">
                {isMyTurn ? 'YOUR TURN!' : currentTurnPlayer?.name}
              </span>
            </div>

            {playerAfterMe && (
              <span className="text-[10px] text-emerald-300 font-bold hidden md:inline">
                {playerAfterMe.name} ⏭️
              </span>
            )}
          </div>

          {/* 30s Countdown Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border shadow-lg ${
              secondsRemaining <= 5
                ? 'bg-red-600 text-white border-white animate-pulse'
                : secondsRemaining <= 12
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-emerald-600 text-white border-emerald-300'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${secondsRemaining <= 5 ? 'animate-spin' : ''}`} />
            <span className="font-mono text-xs">{secondsRemaining}s</span>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-400/50 text-amber-300 shadow-md active:scale-95 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            aria-label="Game Settings"
            className="p-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-400/50 text-amber-300 shadow-md active:scale-95 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DYNAMIC LANDSCAPE CASINO ARENA (2 to 10 Players) */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-center px-4 py-1 min-h-[260px] max-h-[460px]">
        <div className="relative w-full h-full max-w-5xl mx-auto flex items-center justify-center">

          {/* Neon Elliptical Table Rim */}
          <div className="absolute inset-x-2 inset-y-1 sm:inset-x-8 sm:inset-y-2 rounded-[50%/40%] border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.35),inset_0_0_50px_rgba(0,0,0,0.85)] bg-gradient-to-b from-[#25041a]/90 via-[#360525]/80 to-[#14010e]/95 pointer-events-none" />

          {/* ANIMATED CURVED TURN ARROW TRACK (Flipping dynamically with reverse!) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-35">
            <div
              className={`w-44 h-32 sm:w-56 sm:h-40 rounded-[50%] border-2 border-dashed border-emerald-400/60 flex items-center justify-center transition-transform duration-500 ${
                gameState.direction === -1
                  ? 'scale-x-[-1] animate-green-arrow-ccw'
                  : 'scale-x-100 animate-green-arrow-cw'
              }`}
            >
              <div className="absolute -top-3 text-emerald-400 text-base font-black filter drop-shadow-[0_0_8px_#22c55e]">
                ▶
              </div>
              <div className="absolute -bottom-3 text-emerald-400 text-base font-black filter drop-shadow-[0_0_8px_#22c55e]">
                ◀
              </div>
              <div className="absolute -right-3 text-emerald-400 text-base font-black filter drop-shadow-[0_0_8px_#22c55e]">
                ▼
              </div>
              <div className="absolute -left-3 text-emerald-400 text-base font-black filter drop-shadow-[0_0_8px_#22c55e]">
                ▲
              </div>
            </div>
          </div>

          {/* CENTER PLAY AREA: STACKING BANNER + DRAW & DISCARD PILES */}
          <div className="relative z-20 flex flex-col items-center justify-center">
            {/* IN-PROGRESS STACKING COUNTER BANNER */}
            {gameState.drawStackCount > 0 && (
              <div className="mb-2 px-4 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 border-2 border-white shadow-[0_0_25px_rgba(239,68,68,0.9)] flex items-center gap-1.5 animate-bounce">
                <Flame className="w-4 h-4 fill-amber-300 text-amber-200" />
                <span className="font-black text-xs sm:text-sm tracking-wide text-white">
                  +{gameState.drawStackCount} AND CLIMBING!
                </span>
                <Flame className="w-4 h-4 fill-amber-300 text-amber-200" />
              </div>
            )}

            {/* Piles Container */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* DRAW PILE */}
              <div className="relative flex flex-col items-center">
                <div
                  role="button"
                  tabIndex={isMyTurn ? 0 : -1}
                  aria-label={`Draw pile, ${gameState.deckRemainingCount ?? 'many'} cards remaining`}
                  onClick={isMyTurn ? handleDrawCard : undefined}
                  className={`relative w-13 h-18 sm:w-16 sm:h-22 rounded-2xl bg-gradient-to-br from-slate-900 to-black border-2 border-slate-600 shadow-2xl flex flex-col items-center justify-center transition-all min-w-[48px] min-h-[64px] ${
                    isDrawingAnimation ? 'scale-105 ring-4 ring-cyan-400 shadow-cyan-400/80' : ''
                  } ${
                    isMyTurn
                      ? 'cursor-pointer hover:scale-105 active:scale-95 ring-4 ring-yellow-400 animate-turn-pulse shadow-yellow-400/50'
                      : 'opacity-75'
                  }`}
                >
                  <span className="text-base sm:text-xl font-black text-red-500 tracking-tighter">UNO</span>
                  <span className="text-[8px] font-bold text-slate-300">DRAW</span>

                  {gameState.drawStackCount > 0 && isMyTurn && (
                    <div className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full border border-white animate-bounce shadow-xl">
                      +{gameState.drawStackCount}
                    </div>
                  )}
                </div>

                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  Deck: {gameState.deckRemainingCount ?? 'Deck'}
                </span>
              </div>

              {/* DISCARD PILE (With 3D Flip-and-Settle Animation) */}
              <div className="relative flex flex-col items-center">
                <div
                  className={`relative transition-all duration-300 ${
                    isCardSlamming
                      ? '-translate-y-4 rotate-6 scale-110 ring-4 ring-amber-300 rounded-2xl shadow-yellow-400/80'
                      : ''
                  }`}
                >
                  {gameState.activeUnoCard && (
                    <div key={gameState.activeUnoCard.id} className="relative">
                      {/* Active Color Halo Glow */}
                      <div
                        className={`absolute -inset-2.5 rounded-2xl blur-md opacity-80 ${
                          gameState.activeUnoColor === 'red'
                            ? 'bg-[#ff2a4b]'
                            : gameState.activeUnoColor === 'blue'
                            ? 'bg-[#0099ff]'
                            : gameState.activeUnoColor === 'green'
                            ? 'bg-[#00c853]'
                            : 'bg-[#ffaa00]'
                        }`}
                      />
                      <UnoCardView card={gameState.activeUnoCard} isCompact={false} isValid={false} />
                    </div>
                  )}
                </div>

                {/* Active Color Badge */}
                <div className="mt-1 text-center">
                  <span
                    className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-white shadow-xl ${
                      gameState.activeUnoColor === 'red'
                        ? 'bg-[#ff2a4b] text-white'
                        : gameState.activeUnoColor === 'blue'
                        ? 'bg-[#0099ff] text-white'
                        : gameState.activeUnoColor === 'green'
                        ? 'bg-[#00c853] text-white'
                        : 'bg-[#ffaa00] text-slate-950 font-black'
                    }`}
                  >
                    Active: {gameState.activeUnoColor?.toUpperCase() || 'ANY'}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION / EVENT ANNOUNCEMENTS */}
            {actionNotice && !isSwapAnimating ? (
              <div
                className={`mt-2 px-3 py-1 rounded-full border text-xs font-black shadow-2xl flex items-center gap-1.5 animate-bounce ${
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
            ) : gameState.lastAction && !isSwapAnimating ? (
              <div className="mt-1.5 px-3 py-0.5 rounded-full bg-slate-950/90 border border-purple-500/40 text-purple-200 text-[10px] font-bold shadow-xl text-center max-w-[240px] truncate">
                {gameState.lastAction}
              </div>
            ) : null}
          </div>

          {/* DYNAMIC OPPONENT SEATS (Outer Table Perimeter, 2 to 10 Players) */}
          {orderedPlayers.slice(1).map((player, sliceIdx) => {
            const originalIdx = sliceIdx + 1;
            const seatPos = getLandscapeUnoSeatPosition(totalPlayers, originalIdx);
            const theme = PLAYER_THEME_KEYS[originalIdx % PLAYER_THEME_KEYS.length];

            return (
              <div
                key={`uno-seat-${player.id}`}
                style={seatPos.avatarStyle}
                className="transition-all duration-300"
              >
                <div className="relative flex flex-col items-center">
                  <PlayerAvatar
                    player={player}
                    size={avatarSize}
                    isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                    isSelf={false}
                    hideName={hideOpponentNames}
                    actionNotice={
                      actionNotice?.playerId === player.id
                        ? { type: actionNotice.type, text: actionNotice.text }
                        : null
                    }
                    colorTheme={theme}
                    activeEmote={activeEmotes[player.id]}
                    turnExpiresAt={gameState.turnExpiresAt}
                    turnDuration={gameState.turnDuration}
                    isBeforeMe={playerBeforeMe?.id === player.id}
                    isAfterMe={playerAfterMe?.id === player.id}
                  />

                  {/* Mercy KO Alert if high card count */}
                  {player.cardsCount >= 18 && !player.isMercyEliminated && (
                    <span className="text-[8px] font-black text-rose-400 bg-red-950/90 px-1.5 rounded border border-red-500 animate-pulse block text-center mt-0.5 z-20">
                      ⚠️ {player.cardsCount}/25
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM CONTROLS & LOCAL HAND AREA */}
      <div className="relative z-20 w-full flex flex-col items-center bg-gradient-to-t from-black via-black/95 to-transparent pt-1 border-t border-purple-900/40">
        {/* MERCY DANGER METER (Always visible to know elimination threshold) */}
        <div className="w-full max-w-xl px-4 py-0.5 flex items-center justify-between text-[11px] font-black text-slate-300">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className={`w-3.5 h-3.5 ${myHand.length >= 20 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`} />
            <span>MERCY RULE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={myHand.length >= 20 ? 'text-red-400 font-black animate-pulse' : 'text-slate-400'}>
              {myHand.length} / 25 cards
            </span>
            <div className="w-24 sm:w-36 h-2 rounded-full bg-slate-900 border border-white/20 overflow-hidden shadow-inner">
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

        {/* LOCAL PLAYER HAND COMPONENT */}
        <div className="w-full max-w-4xl px-2">
          <UnoHand
            hand={myHand}
            activeCard={gameState.activeUnoCard}
            activeColor={gameState.activeUnoColor}
            drawStackCount={gameState.drawStackCount}
            isMyTurn={isMyTurn}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
            onPlayCard={handleInitiatePlayCard}
          />
        </div>

        {/* BOTTOM ACTION BUTTONS: CALL UNO, CATCH UNO, EMOTES, DRAW */}
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
            {/* CALL UNO BUTTON (Active when holding 1 or 2 cards) */}
            {(myHand.length <= 2 || me?.calledUno) && !me?.rank && !me?.isMercyEliminated && (
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
                <span>{me?.calledUno ? 'UNO CALLED! ✓' : 'CALL UNO!'}</span>
              </button>
            )}

            {/* CATCH UNO BUTTON (Active when an opponent forgot to call Uno) */}
            {uncaughtOpponent && (
              <button
                onClick={handleCatchUno}
                aria-label={`Catch ${uncaughtOpponent.name} without UNO`}
                className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-full font-black text-xs sm:text-sm bg-gradient-to-r from-amber-400 via-red-600 to-rose-600 text-white border-2 border-white shadow-2xl animate-pulse ring-4 ring-amber-300 active:scale-95"
              >
                <Siren className="w-4 h-4 animate-spin" />
                <span>CATCH UNO on {uncaughtOpponent.name}!</span>
              </button>
            )}
          </div>

          {/* Right: DRAW CARD BUTTON */}
          <div>
            <button
              onClick={handleDrawCard}
              disabled={!isMyTurn}
              aria-label={gameState.drawStackCount > 0 ? `Draw stacked +${gameState.drawStackCount} cards` : 'Draw card'}
              className={`px-5 py-2 min-h-[44px] rounded-full font-black text-xs sm:text-sm shadow-xl transition-all ${
                isMyTurn
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white ring-4 ring-rose-400 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {gameState.drawStackCount > 0 ? `TAKE +${gameState.drawStackCount}` : 'DRAW CARD'}
            </button>
          </div>
        </div>
      </div>

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

      {/* WATCH OR EXIT MODAL (When player finishes cards early) */}
      {!!me?.rank && me.cardsCount === 0 && !isGameOver && !isWatching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-rose-950 to-slate-950 border-2 border-amber-400 text-center shadow-2xl">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-xl font-black text-amber-300">YOU CLEARED YOUR HAND!</h2>
            <p className="text-sm font-bold text-white mt-1">Rank #{me?.rank} Winner!</p>
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
