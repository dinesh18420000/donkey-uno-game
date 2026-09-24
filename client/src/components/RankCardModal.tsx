import React from 'react';
import { Trophy, RotateCcw, LogOut, Crown, Skull, Award, CheckCircle2, Bot, Home, Loader2 } from 'lucide-react';
import type { ClientGameState, GameType } from '../types';
import { socketService } from '../services/socket';

interface RankCardModalProps {
  gameState: ClientGameState;
  onReplay: () => void;
  onBackToRoom: () => void;
  onExit: () => void;
  isHost: boolean;
  myId: string;
}

export const RankCardModal: React.FC<RankCardModalProps> = ({
  gameState,
  onReplay,
  onBackToRoom,
  onExit,
  isHost,
  myId
}) => {
  const isDonkeyGame = gameState.gameType === 'donkey';

  // Exclude spectators/viewers: Viewer-only users cannot be listed on the rank card!
  const actualPlayers = gameState.players.filter(p => !p.isSpectator);

  // Sort players for leaderboard:
  // 1. Players with rank ascending (Rank 1, 2, 3...)
  // 2. Players without rank, sorted by cardsCount ascending
  // 3. Donkey player / Mercy-eliminated at the very bottom
  const sortedPlayers = [...actualPlayers].sort((a, b) => {
    if (a.isDonkey) return 1;
    if (b.isDonkey) return -1;
    if (a.isMercyEliminated && !b.isMercyEliminated) return 1;
    if (!a.isMercyEliminated && b.isMercyEliminated) return -1;

    if (a.rank !== undefined && b.rank !== undefined) {
      return a.rank - b.rank;
    }
    if (a.rank !== undefined) return -1;
    if (b.rank !== undefined) return 1;

    return a.cardsCount - b.cardsCount;
  });

  const donkeyPlayer = gameState.players.find(p => p.isDonkey);
  const unoWinner = !isDonkeyGame
    ? gameState.players.find(p => p.rank === 1) || sortedPlayers[0]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 animate-fadeIn select-none">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-purple-950 via-[#1e072b] to-slate-950 border-2 border-amber-400 text-white shadow-2xl overflow-hidden">
        
        {/* HEADER SECTION */}
        <div className="relative pt-5 pb-3 px-4 text-center bg-gradient-to-b from-amber-500/20 via-transparent to-transparent border-b border-purple-500/30">
          <div className="flex justify-center items-center gap-2 mb-1">
            <Trophy className="w-8 h-8 text-amber-300 animate-bounce" />
            <h2 className="text-xl sm:text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
              MATCH RESULTS
            </h2>
            <Trophy className="w-8 h-8 text-amber-300 animate-bounce" />
          </div>
          
          <p className="text-xs font-bold text-purple-200">
            {isDonkeyGame ? '🫏 Donkey Master Standings' : '🔥 UNO Show \'Em No Mercy Standings'}
          </p>

          {/* HIGHLIGHT BANNER */}
          {isDonkeyGame && donkeyPlayer ? (
            <div className="mt-2 py-2 px-3 rounded-2xl bg-red-950/80 border border-red-500/80 text-white flex items-center justify-center gap-2 shadow-inner">
              <span className="text-2xl">🫏</span>
              <div className="text-left">
                <span className="text-[10px] uppercase font-black tracking-wider text-red-300 block">
                  Crown of Shame
                </span>
                <span className="text-sm font-black text-amber-300">
                  {donkeyPlayer.name} {donkeyPlayer.id === myId ? '(You)' : ''} is the DONKEY!
                </span>
              </div>
            </div>
          ) : !isDonkeyGame && unoWinner ? (
            <div className="mt-2 py-2 px-3 rounded-2xl bg-amber-500/20 border border-amber-400 text-white flex items-center justify-center gap-2 shadow-inner">
              <Crown className="w-6 h-6 text-amber-300 flex-shrink-0" />
              <div className="text-left">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-300 block">
                  Champion
                </span>
                <span className="text-sm font-black text-white">
                  {unoWinner.name} {unoWinner.id === myId ? '(You)' : ''} Won the Match!
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* RANKINGS TABLE / LEADERBOARD (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2 no-scrollbar">
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-purple-300 px-2 tracking-wider">
            <span>Rank & Player</span>
            <span>Final Status</span>
          </div>

          {sortedPlayers.map((player, idx) => {
            const isMe = player.id === myId;
            const isWinner = player.rank === 1;
            const isDonkey = player.isDonkey;
            const isKnockedOut = player.isMercyEliminated;

            let rankBadge = (
              <span className="w-7 h-7 rounded-xl bg-purple-900/60 border border-purple-400/40 flex items-center justify-center text-xs font-black text-purple-200">
                #{idx + 1}
              </span>
            );

            if (isDonkey) {
              rankBadge = (
                <span className="w-7 h-7 rounded-xl bg-red-600 border border-red-300 flex items-center justify-center text-sm shadow-md" title="The Donkey">
                  🫏
                </span>
              );
            } else if (isKnockedOut) {
              rankBadge = (
                <span className="w-7 h-7 rounded-xl bg-rose-950 border border-rose-500 flex items-center justify-center text-sm shadow-md" title="Mercy Knockout">
                  <Skull className="w-4 h-4 text-rose-400" />
                </span>
              );
            } else if (player.rank === 1) {
              rankBadge = (
                <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-sm font-black shadow-lg ring-2 ring-yellow-200" title="1st Place">
                  🥇
                </span>
              );
            } else if (player.rank === 2) {
              rankBadge = (
                <span className="w-7 h-7 rounded-xl bg-slate-300 text-slate-950 flex items-center justify-center text-sm font-black shadow-md ring-1 ring-white" title="2nd Place">
                  🥈
                </span>
              );
            } else if (player.rank === 3) {
              rankBadge = (
                <span className="w-7 h-7 rounded-xl bg-amber-700 text-white flex items-center justify-center text-sm font-black shadow-md" title="3rd Place">
                  🥉
                </span>
              );
            }

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                  isDonkey
                    ? 'bg-red-950/60 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : isWinner
                    ? 'bg-amber-500/20 border-amber-400/90 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : isMe
                    ? 'bg-purple-900/50 border-purple-400/80'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {/* Left: Rank & Avatar & Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {rankBadge}
                  
                  <div className="relative">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-9 h-9 rounded-full bg-slate-900 border-2 border-white/30 object-cover"
                    />
                    {isWinner && (
                      <Crown className="w-3.5 h-3.5 text-yellow-300 absolute -top-1.5 -right-1 drop-shadow" />
                    )}
                  </div>

                  <div className="truncate">
                    <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 truncate">
                      <span className="truncate">{player.name}</span>
                      {isMe && (
                        <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase flex-shrink-0">
                          YOU
                        </span>
                      )}
                      {player.isBot && (
                        <span className="text-[9px] bg-indigo-600/80 text-white font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 flex-shrink-0">
                          <Bot className="w-2.5 h-2.5" /> BOT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-purple-300 font-medium flex items-center gap-1.5 mt-0.5">
                      <span>{player.isHost ? '👑 Room Host' : 'Player'}</span>
                      {isHost && !player.isBot && !isMe && (
                        <button
                          onClick={() => socketService.transferHost(gameState.roomCode, player.id)}
                          className="px-1.5 py-0.5 rounded bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/50 text-[9px] font-black flex items-center gap-0.5 active:scale-95 transition-all shadow-sm"
                          title="Transfer Room Host rights to this player"
                        >
                          <Crown className="w-2.5 h-2.5 fill-current" />
                          <span>Make Host</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill */}
                <div className="flex-shrink-0 ml-2">
                  {isDonkey ? (
                    <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <span>🫏 THE DONKEY</span>
                    </span>
                  ) : isKnockedOut ? (
                    <span className="px-2.5 py-1 rounded-full bg-rose-900/90 border border-rose-500 text-rose-200 text-[10px] font-bold flex items-center gap-1">
                      <Skull className="w-3 h-3 text-rose-400" />
                      <span>Mercy KO ({player.cardsCount})</span>
                    </span>
                  ) : player.rank ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/80 text-emerald-300 text-[11px] font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{player.rank === 1 ? 'Winner!' : `Rank #${player.rank}`}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                      {player.cardsCount} cards left
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM ACTION BUTTONS: ONLY HOST HAS ACTION CONTROLS */}
        <div className="p-4 bg-black/70 border-t border-purple-500/30 flex flex-col gap-2.5">
          {isHost ? (
            <>
              {/* Host primary controls: Replay or Back to Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={onReplay}
                  className="py-3 px-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ring-2 ring-yellow-300/50 hover:brightness-105"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>REPLAY MATCH</span>
                </button>

                <button
                  onClick={onBackToRoom}
                  className="py-3 px-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ring-2 ring-purple-400/40"
                >
                  <Home className="w-4 h-4" />
                  <span>BACK TO ROOM</span>
                </button>
              </div>

              {/* Host exit button */}
              <button
                onClick={onExit}
                className="w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Table</span>
              </button>
            </>
          ) : (
            /* Non-host users: Waiting for the Host with loading symbol and exit button */
            <div className="flex flex-col gap-2">
              <div className="py-3 px-4 rounded-2xl bg-purple-950/70 border border-purple-400/40 text-center flex items-center justify-center gap-2.5 shadow-inner">
                <Loader2 className="w-4 h-4 animate-spin text-amber-300 flex-shrink-0" />
                <span className="text-amber-300 font-black text-xs sm:text-sm tracking-wide">
                  Waiting for the Host
                </span>
              </div>

              <button
                onClick={onExit}
                className="w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-slate-700 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
