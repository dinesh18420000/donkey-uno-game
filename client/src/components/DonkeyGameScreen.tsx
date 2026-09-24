import React, { useState, useEffect } from 'react';
import type { ClientGameState, DonkeyCard } from '../types';
import { getTurnNeighbors } from '../types';
import { socketService } from '../services/socket';
import { PlayerAvatar } from './PlayerAvatar';
import { DonkeyHand } from './DonkeyHand';
import { DonkeyCardView } from './DonkeyCardView';
import { RankCardModal } from './RankCardModal';
import {
  getTableSeatPosition,
  reorderPlayersForLocalView,
  getAvatarSizeForCount,
  getCenterCardDimensions,
  PLAYER_THEME_KEYS,
  PLAYER_THEME_DETAILS
} from '../utils/tableSeating';
import { sounds } from '../utils/audio';
import {
  Volume2,
  VolumeX,
  Smile,
  MessageSquare,
  ChevronsLeft,
  Gift,
  Settings,
  X,
  LogOut,
  Clock,
  Eye,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

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

  // Robust local 30-second turn timer
  const [turnSeconds, setTurnSeconds] = useState<number>(30);

  const myId = socketService.playerId;
  const me = gameState.players.find(p => p.id === myId);
  const orderedPlayers = reorderPlayersForLocalView(gameState.players, myId);
  const totalPlayers = orderedPlayers.length;
  const avatarSize = getAvatarSizeForCount(totalPlayers);
  const cardDims = getCenterCardDimensions(totalPlayers);
  const isHost = gameState.hostId === myId;

  const isMyTurn = gameState.currentTurnPlayerId === myId;
  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  const isFirstTrick = gameState.roundNumber === 1 && gameState.currentTrick.length === 0 && !gameState.leadSuit;

  // Turn order: who plays before me and who plays after me (Donkey is clockwise: 1)
  const { playerBeforeMe, playerAfterMe } = getTurnNeighbors(gameState.players, myId, 1);

  // Animated feedback for Donkey Cut (all cards swept to victim)
  const [isCutAnimating, setIsCutAnimating] = useState<boolean>(false);
  const [cutVictimName, setCutVictimName] = useState<string>('');
  const prevLastActionRef = React.useRef<string>(gameState.lastAction || '');

  useEffect(() => {
    const action = gameState.lastAction || '';
    if (action !== prevLastActionRef.current && (action.includes('CUT!') || action.includes('picked up'))) {
      prevLastActionRef.current = action;
      setIsCutAnimating(true);
      const match = action.match(/(\w+) picked up/i);
      if (match) setCutVictimName(match[1]);
      sounds.playDonkeySound();
      setTimeout(() => {
        setIsCutAnimating(false);
        setCutVictimName('');
      }, 1400);
    } else {
      prevLastActionRef.current = action;
    }
  }, [gameState.lastAction]);

  // Whenever turn changes or trick updates, initialize the 30-second countdown
  useEffect(() => {
    if (gameState.turnExpiresAt && gameState.turnExpiresAt > Date.now()) {
      const remaining = Math.max(1, Math.round((gameState.turnExpiresAt - Date.now()) / 1000));
      setTurnSeconds(remaining);
    } else {
      setTurnSeconds(30);
    }

    const interval = setInterval(() => {
      setTurnSeconds(prev => {
        if (prev <= 1) return 0;
        if (prev === 5 && isMyTurn) {
          sounds.playUnoWarning();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.currentTurnPlayerId, gameState.roundNumber, gameState.turnExpiresAt, isMyTurn]);

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

  const handlePlayCard = (card: DonkeyCard) => {
    if (!isMyTurn) return;
    sounds.playCardPlay();
    socketService.playDonkeyCard(gameState.roomCode, card.id);
    setSelectedCard(null);
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

  const handleSendQuickChat = (msg: string) => {
    socketService.sendEmote(gameState.roomCode, msg);
    setShowChatPicker(false);
    setActiveEmotes(prev => ({ ...prev, [myId]: msg }));
    setTimeout(() => {
      setActiveEmotes(prev => {
        const copy = { ...prev };
        delete copy[myId];
        return copy;
      });
    }, 3000);
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
  const donkeyPlayer = gameState.players.find(p => p.isDonkey);
  const hasPlayerCleared = !!me?.rank && me.cardsCount === 0;
  const showClearedModal = hasPlayerCleared && !isGameOver && !isWatching;

  useEffect(() => {
    if (isGameOver) {
      if (donkeyPlayer && donkeyPlayer.id !== myId) {
        sounds.playVictory();
        confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
      } else {
        sounds.playDonkeySound();
      }
    }
  }, [isGameOver, donkeyPlayer, myId]);

  const timerRatio = Math.max(0, Math.min(100, (turnSeconds / 30) * 100));

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#2e0940] via-[#430f5c] to-[#1c0426] text-white select-none">
      {/* Decorative Felt Texture */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.2) 2px, transparent 0%)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* SINGLE CONSOLIDATED TOP BAR */}
      <div className="relative z-20 w-full px-3 safe-top py-1.5 flex items-center justify-between bg-black/60 backdrop-blur-md border-b border-purple-500/30 gap-2">
        {/* Left: Title & Room */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xl filter drop-shadow">🫏</span>
          <div className="leading-tight">
            <div className="text-xs sm:text-sm font-black tracking-wider text-amber-400">DONKEY MASTER</div>
            <div className="text-[9px] text-purple-200 font-mono font-bold">
              {gameState.roomCode === 'FAMILY' ? 'FAMILY TABLE (OPEN)' : `ROOM: ${gameState.roomCode}`}
            </div>
          </div>
        </div>

        {/* Center: Turn Flow & Status Pill (Prev, Active Turn, Next) + Lead Suit */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          {/* Lead Suit Badge */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/90 border border-purple-400/40 text-[11px] font-black shadow-md flex-shrink-0">
            {gameState.leadSuit ? (
              <span>
                Lead:{' '}
                <strong className={gameState.leadSuit === 'HEARTS' || gameState.leadSuit === 'DIAMONDS' ? 'text-red-400 font-bold' : 'text-slate-100 font-bold'}>
                  {gameState.leadSuit === 'SPADES' ? '♠ SPADES' : gameState.leadSuit === 'HEARTS' ? '♥ HEARTS' : gameState.leadSuit === 'CLUBS' ? '♣ CLUBS' : '♦ DIAMONDS'}
                </strong>
              </span>
            ) : (
              <span className="text-amber-300">
                {isFirstTrick ? '♠ Ace of Spades Leads' : 'Any Card Leads'}
              </span>
            )}
          </div>

          {/* Turn Relationship Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-purple-500/50 shadow-md text-xs flex-shrink-0">
            {playerBeforeMe && (
              <span className="text-[10px] text-cyan-300 font-bold hidden sm:inline" title="Plays before you">
                ⏮️ {playerBeforeMe.name}
              </span>
            )}

            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[11px] shadow ${
              isMyTurn
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 animate-pulse'
                : 'bg-purple-900/80 text-amber-200'
            }`}>
              <span className="text-emerald-400 font-black">↻ CW</span>
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
              turnSeconds <= 5
                ? 'bg-red-600 text-white border-white animate-pulse'
                : turnSeconds <= 12
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-emerald-600 text-white border-emerald-300'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${turnSeconds <= 5 ? 'animate-spin' : ''}`} />
            <span className="font-mono text-[11px]">{turnSeconds}s</span>
          </div>
        </div>

        {/* Right: Settings / Exit */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-400/50 text-amber-300 shadow-md active:scale-95 transition-all flex-shrink-0"
          title="Game Settings & Exit"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* SPECTATOR BADGE (If player cleared hand and is watching) */}
      {isWatching && !isGameOver && (
        <div className="relative z-15 w-fit mx-auto px-3 py-0.5 my-0.5 rounded-full bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-[11px] font-black flex items-center gap-1.5 animate-pulse">
          <Eye className="w-3.5 h-3.5" />
          <span>Watching Match Live (Rank #{me?.rank} Safe)</span>
        </div>
      )}

      {/* CASINO CIRCULAR TABLE ARENA (Dynamic 2 to 10 Players Layout - Matches Screenshot) */}
      <div className="relative z-10 w-full max-w-lg mx-auto px-2 flex-1 flex flex-col justify-center my-0.5">
        <div className="relative w-full aspect-[1/0.95] max-h-[350px] sm:max-h-[390px] mx-auto flex items-center justify-center">
          
          {/* Glowing Neon Circular Felt Rim (Matching Reference Screenshot) */}
          <div className="absolute inset-1.5 sm:inset-3 rounded-full border-2 border-fuchsia-500/60 shadow-[0_0_35px_rgba(217,70,239,0.45),inset_0_0_40px_rgba(0,0,0,0.85)] bg-gradient-to-b from-[#23043a]/90 via-[#340755]/85 to-[#160224]/95 pointer-events-none" />

          {/* Revolving Central Neon-Green Turn Direction Arrow Track */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-25">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-dashed border-emerald-400/40 flex items-center justify-center animate-green-arrow-cw">
              <div className="absolute -top-3 text-emerald-400 text-sm sm:text-base font-black filter drop-shadow-[0_0_10px_#22c55e]">➤</div>
              <div className="absolute -bottom-3 text-emerald-400 text-sm sm:text-base font-black filter drop-shadow-[0_0_10px_#22c55e] rotate-180">➤</div>
              <div className="absolute -right-3 text-emerald-400 text-sm sm:text-base font-black filter drop-shadow-[0_0_10px_#22c55e] rotate-90">➤</div>
              <div className="absolute -left-3 text-emerald-400 text-sm sm:text-base font-black filter drop-shadow-[0_0_10px_#22c55e] -rotate-90">➤</div>
            </div>
          </div>

          {/* SHARED CARD / TRICK AREA IN THE CENTER (Radial Ring of Cards for 2 to 10 players) */}
          <div className="absolute inset-0 pointer-events-none">
            {orderedPlayers.map((player, idx) => {
              const seatPos = getTableSeatPosition(totalPlayers, idx);
              const theme = PLAYER_THEME_DETAILS[PLAYER_THEME_KEYS[idx % PLAYER_THEME_KEYS.length]];
              const play = gameState.currentTrick.find(item => item.playerId === player.id);

              return (
                <div
                  key={`trick-slot-${player.id}`}
                  style={seatPos.cardSlotStyle}
                  className="pointer-events-auto transition-all duration-300"
                >
                  {play ? (
                    <div className={`flex flex-col items-center ${isCutAnimating ? 'animate-cut-sweep' : 'animate-deal-to-table'}`}>
                      <div className="text-[7px] sm:text-[8px] font-black bg-slate-950/90 px-1 py-0.2 rounded-full mb-0.5 text-white border border-amber-400/40 shadow truncate max-w-[55px]">
                        {play.playerName} {play.isCut ? '💥 CUT!' : ''}
                      </div>
                      <div className={`p-0.5 rounded-lg border-2 shadow-xl ${theme.ring} bg-white`}>
                        <DonkeyCardView card={play.card} isCompact={true} />
                      </div>
                    </div>
                  ) : (
                    /* Designated Face-Down Colored Card Back (Matching Reference Screenshot) */
                    <div className="flex flex-col items-center opacity-85">
                      <div className={`${cardDims.container} rounded-xl border-2 shadow-xl flex flex-col items-center justify-center p-0.5 transition-all ${theme.border} ${theme.cardBackBg}`}>
                        <div className="w-full h-full rounded-lg border border-white/40 flex flex-col items-center justify-center text-white/90">
                          <span className="text-xs sm:text-sm filter drop-shadow">🫏</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Slanted Deck of Cards (Near center-right, matching Donkey Master reference screenshot!) */}
            <div
              style={{ left: '78%', top: '52%', transform: 'translate(-50%, -50%) rotate(18deg)' }}
              className="absolute pointer-events-auto shadow-2xl hidden xs:flex flex-col items-center z-15"
            >
              <div className="w-9 h-13 sm:w-11 sm:h-16 rounded-xl bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 border-2 border-purple-400/70 shadow-2xl flex flex-col items-center justify-center text-center p-0.5 ring-1 ring-black/50">
                <span className="text-[10px] sm:text-xs">🫏</span>
                <span className="text-[6px] sm:text-[7px] font-black text-amber-300 leading-tight uppercase tracking-tighter mt-0.5">
                  Donkey<br />Master
                </span>
              </div>
            </div>
          </div>

          {/* DYNAMIC PLAYER SEATS (Outer Table Perimeter, 2 to 10 Players) */}
          {orderedPlayers.map((player, idx) => {
            const seatPos = getTableSeatPosition(totalPlayers, idx);
            const theme = PLAYER_THEME_KEYS[idx % PLAYER_THEME_KEYS.length];
            const isSelf = player.id === myId;

            return (
              <div
                key={`avatar-${player.id}`}
                style={seatPos.avatarStyle}
                className="transition-all duration-300"
              >
                <PlayerAvatar
                  player={player}
                  size={avatarSize}
                  isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                  isSelf={isSelf}
                  colorTheme={theme}
                  activeEmote={activeEmotes[player.id]}
                  turnExpiresAt={gameState.turnExpiresAt}
                  turnDuration={gameState.turnDuration}
                  isBeforeMe={playerBeforeMe?.id === player.id}
                  isAfterMe={playerAfterMe?.id === player.id}
                />
              </div>
            );
          })}

          {/* DYNAMIC CUT ANIMATION OVERLAY: All cards fly to victim */}
          {isCutAnimating && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
              <div className="animate-cut-sweep flex flex-col items-center">
                <div className="text-3xl filter drop-shadow">🎴🎴🎴</div>
                <div className="mt-1 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs sm:text-sm border-2 border-yellow-300 shadow-2xl flex items-center gap-1.5 animate-bounce whitespace-nowrap">
                  <span>💥 CUT!</span>
                  <span>All Trick Cards Swept to {cutVictimName || 'Victim'}!</span>
                  <span>🫏</span>
                </div>
              </div>
            </div>
          )}

          {/* Last Action Announcement Pill */}
          {gameState.lastAction && !isCutAnimating && (
            <div className="absolute bottom-1 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-amber-400/50 text-amber-300 text-[8px] sm:text-[9px] font-bold shadow-lg max-w-[210px] sm:max-w-xs truncate text-center z-25">
              {gameState.lastAction}
            </div>
          )}
        </div>
      </div>

      {/* PROMINENT INVALID CARD ERROR MESSAGE BANNER (Brief with card symbol) */}
      {invalidCardNotice && (
        <div className="relative z-30 w-full max-w-md mx-auto px-3 my-0.5 animate-bounce">
          <div className="p-2 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 border-2 border-white shadow-2xl flex items-center justify-between gap-2 text-white">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-lg filter drop-shadow">⚠️</span>
              <span className="text-xs sm:text-sm font-black leading-tight text-white drop-shadow truncate">
                {invalidCardNotice.message}
              </span>
            </div>
            <button
              onClick={() => setInvalidCardNotice(null)}
              className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-white active:scale-95 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM USER HAND (4-Suit Cascade where ALL cards are visible simultaneously) */}
      <div className="relative z-10 w-full">
        {me && me.cardsCount > 0 && (
          <DonkeyHand
            hand={(gameState.myHand as DonkeyCard[]) || []}
            leadSuit={gameState.leadSuit}
            isMyTurn={isMyTurn}
            isFirstTrick={isFirstTrick}
            selectedCardId={selectedCard?.id}
            onSelectCard={card => {
              setSelectedCard(card);
              setInvalidCardNotice(null);
            }}
            onPlayCard={card => handlePlayCard(card)}
            onInvalidMove={error => {
              setInvalidCardNotice({ message: error.message, symbol: error.symbol, cardId: error.card.id });
            }}
          />
        )}
      </div>

      {/* BOTTOM CONTROL & ACTION BAR (Authentic Donkey Master Navigation Footer) */}
      <div className="relative z-20 w-full px-3 py-2 safe-bottom bg-gradient-to-t from-[#12011f] via-[#1f0333] to-[#12011f]/90 flex items-center justify-between border-t border-purple-500/40">
        {/* Left Action Buttons: Purple Settings Button + Yellow Emoji + Yellow Chat Button */}
        <div className="relative flex items-center gap-2">
          {/* Purple Menu/Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-10 h-10 rounded-xl bg-purple-900/90 hover:bg-purple-800 border-2 border-purple-400/50 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
            title="Settings & Menu"
          >
            <ChevronsLeft className="w-5 h-5 text-purple-200" />
          </button>

          {/* Yellow Circular Emoji Button */}
          <button
            onClick={() => {
              setShowEmotePicker(!showEmotePicker);
              setShowChatPicker(false);
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-2 border-yellow-200 flex items-center justify-center shadow-xl active:scale-95 transition-all"
            title="Send Emoji"
          >
            <Smile className="w-5 h-5 text-slate-950" />
          </button>

          {/* Yellow Circular Chat Button */}
          <button
            onClick={() => {
              setShowChatPicker(!showChatPicker);
              setShowEmotePicker(false);
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-2 border-yellow-200 flex items-center justify-center shadow-xl active:scale-95 transition-all"
            title="Quick Chat"
          >
            <MessageSquare className="w-5 h-5 text-slate-950" />
          </button>

          {/* Quick Emote Picker Dropdown */}
          {showEmotePicker && (
            <div className="absolute bottom-14 left-0 z-50 p-2 rounded-2xl bg-slate-900 border-2 border-amber-400 shadow-2xl flex gap-1.5 backdrop-blur-md">
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

          {/* Quick Chat Phrases Dropdown */}
          {showChatPicker && (
            <div className="absolute bottom-14 left-10 z-50 p-2 rounded-2xl bg-slate-900 border-2 border-amber-400 shadow-2xl flex flex-col gap-1 backdrop-blur-md min-w-[190px]">
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

        {/* If Spectating / Cleared Hand */}
        {hasPlayerCleared ? (
          <div className="flex-1 mx-2 flex items-center justify-between px-3.5 py-2 rounded-2xl bg-purple-900/60 border border-purple-400/40 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-pulse">👀</span>
              <div className="text-left">
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>SPECTATING MATCH</span>
                  <span className="text-[10px] bg-emerald-500/80 text-white px-1.5 py-0.2 rounded-full">
                    Rank #{me?.rank} (Safe)
                  </span>
                </div>
                <div className="text-[10px] text-purple-200">
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

            {/* Right: Prominent Pill-Shaped Yellow "DEAL" Action Button (Matching authentic mobile screenshot) */}
            <button
              onClick={() => {
                if (!isMyTurn) {
                  setInvalidCardNotice({
                    message: "⏳ It's not your turn! Please wait for your turn.",
                    symbol: '⏳',
                    cardId: ''
                  });
                  return;
                }
                if (selectedCard) {
                  handlePlayCard(selectedCard);
                } else {
                  // If a card isn't explicitly highlighted, auto-pick the lowest valid card in hand
                  const myHand = (gameState.myHand as DonkeyCard[]) || [];
                  const validCard = myHand.find(c => {
                    if (isFirstTrick) return c.suit === 'SPADES' && c.value === 'A';
                    if (gameState.leadSuit && myHand.some(h => h.suit === gameState.leadSuit)) {
                      return c.suit === gameState.leadSuit;
                    }
                    return true;
                  });
                  if (validCard) {
                    handlePlayCard(validCard);
                  } else {
                    setInvalidCardNotice({
                      message: 'Please tap a card in your hand to deal!',
                      symbol: '🃏',
                      cardId: ''
                    });
                  }
                }
              }}
              className={`px-8 sm:px-10 py-2.5 sm:py-3 rounded-full font-black text-sm sm:text-base tracking-wider uppercase shadow-2xl transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                isMyTurn
                  ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 border-2 border-yellow-200 ring-4 ring-yellow-400/50 shadow-[0_0_25px_rgba(250,204,21,0.8)] animate-pulse cursor-pointer'
                  : 'bg-gradient-to-b from-amber-300/80 via-yellow-400/80 to-amber-500/80 text-slate-900 border-2 border-yellow-200/50 shadow-md cursor-pointer'
              }`}
            >
              <span>DEAL</span>
            </button>
          </>
        )}
      </div>

      {/* WATCH OR EXIT MODAL (When player finishes their cards) */}
      {showClearedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-purple-900 to-slate-950 border-2 border-amber-400 text-center shadow-2xl">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-xl font-black text-amber-300">YOU CLEARED YOUR CARDS!</h2>
            <p className="text-sm font-bold text-white mt-1">
              You are Rank #{me?.rank} (Safe)!
            </p>
            <p className="text-xs text-purple-200 mt-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-xs p-5 rounded-3xl bg-gradient-to-b from-purple-950 to-slate-950 border-2 border-purple-500 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/30">
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
