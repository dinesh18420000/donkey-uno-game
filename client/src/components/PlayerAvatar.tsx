import React, { useEffect, useState } from 'react';
import type { PlayerPublic } from '../types';
import { Bot, WifiOff, Crown, Clock } from 'lucide-react';

interface PlayerAvatarProps {
  player: PlayerPublic;
  isCurrentTurn: boolean;
  isSelf?: boolean;
  colorTheme?: 'blue' | 'pink' | 'green' | 'yellow' | 'orange' | 'purple';
  activeEmote?: string | null;
  turnExpiresAt?: number;
  turnDuration?: number;
  onSelect?: () => void;
  isBeforeMe?: boolean;
  isAfterMe?: boolean;
  actionNotice?: { type: 'draw' | 'play'; text: string } | null;
}

const AVATAR_COLORS: Record<string, { ring: string; pill: string; glow: string }> = {
  blue: { ring: 'ring-cyan-400 border-cyan-400', pill: 'bg-blue-600', glow: 'shadow-[0_0_15px_#38bdf8]' },
  pink: { ring: 'ring-pink-500 border-pink-500', pill: 'bg-fuchsia-600', glow: 'shadow-[0_0_15px_#ec4899]' },
  green: { ring: 'ring-emerald-400 border-emerald-400', pill: 'bg-emerald-600', glow: 'shadow-[0_0_15px_#34d399]' },
  yellow: { ring: 'ring-amber-400 border-amber-400', pill: 'bg-amber-500', glow: 'shadow-[0_0_15px_#fbbf24]' },
  orange: { ring: 'ring-orange-400 border-orange-400', pill: 'bg-orange-500', glow: 'shadow-[0_0_15px_#fb923c]' },
  purple: { ring: 'ring-purple-400 border-purple-400', pill: 'bg-purple-600', glow: 'shadow-[0_0_15px_#c084fc]' }
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  isCurrentTurn,
  isSelf,
  colorTheme = 'blue',
  activeEmote,
  turnExpiresAt,
  turnDuration = 30,
  onSelect,
  isBeforeMe,
  isAfterMe,
  actionNotice
}) => {
  const theme = AVATAR_COLORS[colorTheme] || AVATAR_COLORS.blue;
  const initials = player.name.slice(0, 2).toUpperCase();

  // Local state for 30s countdown ticking
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);

  useEffect(() => {
    if (!isCurrentTurn || !turnExpiresAt) {
      setSecondsRemaining(turnDuration);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.ceil((turnExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 300);
    return () => clearInterval(interval);
  }, [isCurrentTurn, turnExpiresAt, turnDuration]);

  return (
    <div
      onClick={onSelect}
      className={`relative flex flex-col items-center select-none cursor-pointer transition-transform ${
        isCurrentTurn ? 'scale-105' : 'scale-95'
      }`}
    >
      {/* Floating Emote Popup */}
      {activeEmote && (
        <div className="absolute -top-12 z-30 animate-bounce text-4xl filter drop-shadow-lg">
          {activeEmote}
        </div>
      )}

      {/* Floating Action Notice (Draw or Play card) */}
      {actionNotice && (
        <div
          className={`absolute -top-10 z-40 px-2 py-0.5 rounded-full text-[10px] font-black shadow-2xl border-2 flex items-center gap-1 animate-bounce ${
            actionNotice.type === 'draw'
              ? 'bg-blue-600 text-white border-cyan-300 shadow-cyan-500/50'
              : 'bg-amber-400 text-slate-950 border-white shadow-yellow-500/50'
          }`}
        >
          <span>{actionNotice.type === 'draw' ? '📥' : '🎯'}</span>
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* 30-Second Turn Countdown Timer Badge */}
      {isCurrentTurn && !player.rank && (
        <div className="absolute -top-6 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full border shadow-xl bg-slate-950 text-[11px] font-black tracking-tight">
          <Clock className={`w-3.5 h-3.5 ${secondsRemaining <= 5 ? 'text-red-400 animate-spin' : 'text-amber-400'}`} />
          <span className={secondsRemaining <= 5 ? 'text-red-400 font-extrabold animate-pulse' : 'text-amber-300 font-black'}>
            {secondsRemaining}s
          </span>
        </div>
      )}

      {/* Donkey Crown or Winner Badge */}
      {player.isDonkey && (
        <div className="absolute -top-7 z-20 flex items-center gap-1 bg-red-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xl border-2 border-yellow-300 animate-bounce">
          <span>🫏 DONKEY</span>
        </div>
      )}
      {player.rank && !player.isDonkey && (
        <div className="absolute -top-6 z-20 flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">
          <Crown className="w-3.5 h-3.5" />
          <span>#{player.rank} SAFE</span>
        </div>
      )}

      {/* Avatar Circle Container */}
      <div className="relative">
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 transition-all ${
            isCurrentTurn
              ? secondsRemaining <= 5
                ? 'ring-4 ring-red-500 bg-red-600 shadow-[0_0_20px_#ef4444] animate-pulse'
                : 'ring-4 ring-yellow-400 bg-gradient-to-br from-yellow-300 to-amber-600 shadow-[0_0_20px_#facc15]'
              : theme.glow
          }`}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center border-2 border-white/90">
            {player.avatar && player.avatar.startsWith('http') ? (
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-purple-900 to-indigo-800 flex items-center justify-center font-black text-white text-base">
                {initials}
              </div>
            )}
          </div>
        </div>

        {/* Bot Icon Indicator */}
        {(player.isBot || player.isDisconnected) && (
          <div
            title={player.isDisconnected ? "Disconnected: Bot is playing" : "AI Bot"}
            className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-indigo-600 border border-white flex items-center justify-center text-white shadow-md"
          >
            <Bot className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Disconnection Offline Warning */}
        {player.isDisconnected && (
          <div
            title="Connection dropped - Bot active"
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 border border-white flex items-center justify-center text-white shadow-md animate-pulse"
          >
            <WifiOff className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Card Count Pill Badge */}
        {!player.rank && !player.isMercyEliminated && (
          <div
            className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 text-[11px] font-black rounded-full border border-white text-white shadow-md ${
              player.cardsCount >= 20 ? 'bg-red-600 animate-pulse' : 'bg-slate-950/90'
            }`}
          >
            🃏 {player.cardsCount}
          </div>
        )}
      </div>

      {/* Name Label */}
      <div
        className={`mt-1.5 px-2.5 py-0.5 rounded-lg text-white text-xs font-black shadow-md max-w-[95px] truncate text-center ${
          isSelf ? 'bg-amber-500 text-slate-950 font-black' : theme.pill
        }`}
      >
        {player.name}
      </div>

      {/* Turn Relationship Badges: Before You / After You / Playing Now */}
      {!player.rank && !player.isMercyEliminated && (
        <div className="mt-0.5 flex flex-col items-center">
          {isCurrentTurn ? (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-tight shadow-sm flex items-center gap-0.5 animate-pulse">
              <span>🎯</span>
              <span>{isSelf ? 'YOUR TURN' : 'PLAYING'}</span>
            </span>
          ) : isBeforeMe ? (
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-[9px] font-bold tracking-tight shadow-sm flex items-center gap-0.5">
              <span>⏮️</span>
              <span>Before You</span>
            </span>
          ) : isAfterMe ? (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-[9px] font-bold tracking-tight shadow-sm flex items-center gap-0.5">
              <span>⏭️</span>
              <span>After You</span>
            </span>
          ) : null}
        </div>
      )}

      {player.isDisconnected && (
        <span className="text-[9px] text-amber-300 font-semibold mt-0.5 tracking-tight">
          Bot Playing
        </span>
      )}
    </div>
  );
};
