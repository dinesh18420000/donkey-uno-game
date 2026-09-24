import React, { useState, useEffect } from 'react';
import type { ClientGameState, DonkeyCard } from '../types';
import { socketService } from '../services/socket';
import { PlayerAvatar } from './PlayerAvatar';
import { DonkeyHand } from './DonkeyHand';
import { DonkeyCardView } from './DonkeyCardView';
import { RankCardModal } from './RankCardModal';
import { sounds } from '../utils/audio';
import {
  Volume2,
  VolumeX,
  Smile,
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

export const DonkeyGameScreen: React.FC<DonkeyGameScreenProps> = ({ gameState, onExitToLobby }) => {
  const [selectedCard, setSelectedCard] = useState<DonkeyCard | null>(null);
  const [showEmotePicker, setShowEmotePicker] = useState<boolean>(false);
  const [activeEmotes, setActiveEmotes] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);

  // Robust local 30-second turn timer
  const [turnSeconds, setTurnSeconds] = useState<number>(30);

  const myId = socketService.playerId;
  const me = gameState.players.find(p => p.id === myId);
  const opponents = gameState.players.filter(p => p.id !== myId);
  const isHost = gameState.hostId === myId;

  const isMyTurn = gameState.currentTurnPlayerId === myId;
  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  const isFirstTrick = gameState.roundNumber === 1 && gameState.currentTrick.length === 0 && !gameState.leadSuit;

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

      {/* TOP HEADER BAR */}
      <div className="relative z-20 w-full px-3 safe-top pb-2 flex items-center justify-between bg-black/50 backdrop-blur-md border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <span className="text-2xl filter drop-shadow">🫏</span>
          <div>
            <div className="text-xs sm:text-sm font-black tracking-wider text-amber-400">DONKEY MASTER</div>
            <div className="text-[10px] text-purple-200 font-mono font-bold">
              {gameState.roomCode === 'FAMILY' ? 'FAMILY TABLE (OPEN)' : `ROOM: ${gameState.roomCode}`}
            </div>
          </div>
        </div>

        {/* Lead Suit & Top Timer Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-950/80 border border-purple-400/40 text-xs font-black shadow-lg">
            {gameState.leadSuit ? (
              <span>
                Lead:{' '}
                <strong className={gameState.leadSuit === 'HEARTS' || gameState.leadSuit === 'DIAMONDS' ? 'text-red-400 text-sm' : 'text-slate-100 text-sm'}>
                  {gameState.leadSuit}
                </strong>
              </span>
            ) : (
              <span className="text-amber-300">
                {isFirstTrick ? '♠ Ace of Spades Leads' : 'Lead any card'}
              </span>
            )}
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 shadow-xl ${
              turnSeconds <= 5
                ? 'bg-red-600 text-white border-white animate-pulse'
                : turnSeconds <= 12
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-emerald-600 text-white border-emerald-300'
            }`}
          >
            <Clock className="w-4 h-4 animate-spin" />
            <span className="text-sm font-mono">{turnSeconds}s</span>
          </div>
        </div>

        {/* TOP RIGHT SETTINGS BUTTON */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-400/50 text-amber-300 shadow-md active:scale-95 transition-all"
          title="Game Settings & Exit"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* TOP OPPONENTS ROW (Responsive with hidden scrollbar track) */}
      <div className="relative z-10 w-full px-2 pt-1">
        <div
          className="flex items-center justify-start sm:justify-center gap-2.5 sm:gap-4 overflow-x-auto py-1 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {opponents.map((opp, idx) => {
            const colors: ('blue' | 'pink' | 'green' | 'yellow' | 'orange' | 'purple')[] = [
              'blue', 'pink', 'green', 'yellow', 'orange', 'purple'
            ];
            const themeColor = colors[idx % colors.length];

            return (
              <PlayerAvatar
                key={opp.id}
                player={opp}
                isCurrentTurn={gameState.currentTurnPlayerId === opp.id}
                colorTheme={themeColor}
                activeEmote={activeEmotes[opp.id]}
                turnExpiresAt={gameState.turnExpiresAt}
                turnDuration={gameState.turnDuration}
              />
            );
          })}
        </div>
      </div>

      {/* PROMINENT CENTRAL 30-SECOND TIMER & PROGRESS BAR */}
      <div className="relative z-15 w-full max-w-sm mx-auto px-4 my-0.5">
        <div className="p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-amber-400/40 shadow-2xl flex flex-col items-center">
          <div className="flex items-center justify-between w-full px-1 mb-0.5">
            <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
              <Clock className={`w-3.5 h-3.5 ${turnSeconds <= 5 ? 'text-red-400 animate-spin' : 'text-amber-400'}`} />
              {isMyTurn ? "👉 IT IS YOUR TURN!" : `⏳ ${currentTurnPlayer?.name || 'Player'}'s Turn`}
            </span>
            <span
              className={`text-xs font-black font-mono px-2 py-0.5 rounded-full border shadow-md ${
                turnSeconds <= 5
                  ? 'bg-red-600 text-white border-white animate-pulse'
                  : turnSeconds <= 12
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : 'bg-emerald-600 text-white border-emerald-300'
              }`}
            >
              ⏱️ {turnSeconds}s / 30s
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden border border-white/20">
            <div
              className={`h-full transition-all duration-300 ${
                turnSeconds <= 5
                  ? 'bg-red-500 animate-pulse'
                  : turnSeconds <= 12
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${timerRatio}%` }}
            />
          </div>
        </div>
      </div>

      {/* SPECTATOR BADGE (If player cleared hand and is watching) */}
      {isWatching && !isGameOver && (
        <div className="relative z-15 w-fit mx-auto px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-xs font-black flex items-center gap-1.5 animate-pulse">
          <Eye className="w-3.5 h-3.5" />
          <span>Watching Match Live (Rank #{me?.rank} Safe)</span>
        </div>
      )}

      {/* CENTER TRICK PLAY AREA (Well-bounded height to completely prevent overlapping with hand!) */}
      <div className="relative z-10 flex flex-col items-center justify-center my-0.5 px-3 min-h-[75px] max-h-[85px]">
        {/* Active Cards Played in Trick (Compact to stay cleanly inside center area) */}
        <div className="relative z-20 flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
          {gameState.currentTrick.length > 0 ? (
            gameState.currentTrick.map((play, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center animate-card-drop"
                style={{
                  transform: `rotate(${(idx - (gameState.currentTrick.length - 1) / 2) * 8}deg)`
                }}
              >
                <div className="text-[9px] font-black bg-slate-950/90 px-1.5 py-0.5 rounded-full mb-0.5 text-white border border-amber-400/40 shadow-md">
                  {play.playerName} {play.isCut ? '💥 CUT!' : ''}
                </div>
                <DonkeyCardView card={play.card} isCompact={true} />
              </div>
            ))
          ) : (
            <div className="text-center py-1 px-3 rounded-xl bg-purple-950/70 border border-purple-500/40 backdrop-blur-md shadow-md text-xs font-bold text-purple-200">
              {isMyTurn
                ? (isFirstTrick ? '♠ You hold Ace of Spades! Tap it to start.' : 'Lead any card to start the round.')
                : `Waiting for ${currentTurnPlayer?.name || 'opponent'} to play...`}
            </div>
          )}
        </div>

        {/* Last Action Announcement Pill */}
        {gameState.lastAction && (
          <div className="mt-1 px-3 py-0.5 rounded-full bg-slate-950/90 border border-amber-400/50 text-amber-300 text-[10px] font-bold shadow-lg max-w-sm truncate text-center">
            {gameState.lastAction}
          </div>
        )}
      </div>

      {/* BOTTOM USER HAND (4-Suit Cascade where ALL cards are visible simultaneously) */}
      <div className="relative z-10 w-full">
        {me && me.cardsCount > 0 && (
          <DonkeyHand
            hand={(gameState.myHand as DonkeyCard[]) || []}
            leadSuit={gameState.leadSuit}
            isMyTurn={isMyTurn}
            isFirstTrick={isFirstTrick}
            selectedCardId={selectedCard?.id}
            onSelectCard={card => setSelectedCard(card)}
            onPlayCard={card => handlePlayCard(card)}
          />
        )}
      </div>

      {/* BOTTOM CONTROL & ACTION BAR */}
      <div className="relative z-20 w-full px-3 pt-2 safe-bottom bg-gradient-to-t from-black via-black/95 to-black/80 flex items-center justify-between border-t border-purple-500/30">
        {/* Quick Emote / Reactions Button */}
        <div className="relative">
          <button
            onClick={() => setShowEmotePicker(!showEmotePicker)}
            className="w-11 h-11 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-yellow-200 flex items-center justify-center text-slate-950 shadow-xl active:scale-95 transition-all"
            title="Send Emote"
          >
            <Smile className="w-6 h-6 fill-current" />
          </button>

          {showEmotePicker && (
            <div className="absolute bottom-14 left-0 z-40 p-2 rounded-2xl bg-slate-900 border-2 border-amber-400 shadow-2xl flex gap-1.5 backdrop-blur-md">
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

        {/* If Spectating / Cleared Hand */}
        {hasPlayerCleared ? (
          <div className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-purple-900/60 border border-purple-400/40 backdrop-blur-md shadow-lg">
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
            {/* Current User Profile Center Avatar */}
            {me && (
              <div className="flex flex-col items-center">
                <PlayerAvatar
                  player={me}
                  isCurrentTurn={isMyTurn}
                  isSelf={true}
                  colorTheme="orange"
                  activeEmote={activeEmotes[myId]}
                  turnExpiresAt={gameState.turnExpiresAt}
                  turnDuration={gameState.turnDuration}
                />
              </div>
            )}

            {/* Large "DEAL" Action Button */}
            <button
              onClick={() => {
                if (isMyTurn && selectedCard) {
                  handlePlayCard(selectedCard);
                }
              }}
              disabled={!isMyTurn || !selectedCard}
              className={`px-6 py-2.5 rounded-full font-black text-sm sm:text-base shadow-2xl transition-all flex items-center gap-1.5 ${
                isMyTurn && selectedCard
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 ring-4 ring-yellow-300 active:scale-95 shadow-yellow-400/80 cursor-pointer animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>
                {isMyTurn
                  ? selectedCard
                    ? `DEAL ${selectedCard.value}${selectedCard.suit === 'SPADES' ? '♠' : selectedCard.suit === 'HEARTS' ? '♥' : selectedCard.suit === 'CLUBS' ? '♣' : '♦'}`
                    : 'DEAL'
                  : 'DEAL'}
              </span>
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
          onExit={handleConfirmExit}
          isHost={isHost}
          myId={myId}
        />
      )}
    </div>
  );
};
