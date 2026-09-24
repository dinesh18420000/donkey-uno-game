import React, { useEffect, useState } from 'react';
import type { PlayerPublic } from '../types';
import type { PlayerColorTheme } from '../utils/tableSeating';
import { PLAYER_THEME_DETAILS } from '../utils/tableSeating';
import { Bot, WifiOff, Crown, Clock, Gift, User } from 'lucide-react';

interface PlayerAvatarProps {
  player: PlayerPublic;
  isCurrentTurn: boolean;
  isSelf?: boolean;
  size?: 'xs' | 'sm' | 'md';
  namePosition?: 'top' | 'bottom';
  colorTheme?: PlayerColorTheme | string;
  activeEmote?: string | null;
  turnExpiresAt?: number;
  turnDuration?: number;
  onSelect?: () => void;
  isBeforeMe?: boolean;
  isAfterMe?: boolean;
  actionNotice?: { type: 'draw' | 'play'; text: string } | null;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  isCurrentTurn,
  isSelf,
  size = 'md',
  namePosition = 'bottom',
  colorTheme = 'blue',
  activeEmote,
  turnExpiresAt,
  turnDuration = 30,
  onSelect,
  isBeforeMe,
  isAfterMe,
  actionNotice
}) => {
  const theme =
    PLAYER_THEME_DETAILS[(colorTheme as PlayerColorTheme)] ||
    PLAYER_THEME_DETAILS.blue;
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

  // Size specific dimensions
  const circleSizeClass =
    size === 'xs'
      ? 'w-9 h-9 sm:w-10 sm:h-10'
      : size === 'sm'
      ? 'w-11 h-11 sm:w-12 sm:h-12'
      : 'w-13 h-13 sm:w-15 sm:h-15';

  const nameMaxW =
    size === 'xs'
      ? 'max-w-[65px] text-[8px] sm:text-[9px] px-1 py-0.2'
      : size === 'sm'
      ? 'max-w-[78px] text-[9px] sm:text-[10px] px-1.5 py-0.2'
      : 'max-w-[92px] text-[10px] sm:text-xs px-2 py-0.5';

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
        <div className="absolute -top-6 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full border shadow-xl bg-slate-950 text-[10px] sm:text-[11px] font-black tracking-tight">
          <Clock className={`w-3 h-3 ${secondsRemaining <= 5 ? 'text-red-400 animate-spin' : 'text-amber-400'}`} />
          <span className={secondsRemaining <= 5 ? 'text-red-400 font-extrabold animate-pulse' : 'text-amber-300 font-black'}>
            {secondsRemaining}s
          </span>
        </div>
      )}

      {/* Donkey Crown or Winner Badge */}
      {player.isDonkey && (
        <div className="absolute -top-7 z-20 flex items-center gap-1 bg-red-600 text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shadow-xl border-2 border-yellow-300 animate-bounce">
          <span>🫏 DONKEY</span>
        </div>
      )}
      {player.rank && !player.isDonkey && (
        <div className="absolute -top-6 z-20 flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">
          <Crown className="w-3 h-3" />
          <span>#{player.rank} SAFE</span>
        </div>
      )}

      {/* Name Label (Above Avatar if namePosition === 'top') */}
      {namePosition === 'top' && (
        <div
          className={`mb-0.5 rounded font-black shadow-md truncate text-center ${nameMaxW} ${
            isSelf ? 'bg-amber-500 text-slate-950' : theme.pill
          }`}
        >
          {player.name}
        </div>
      )}

      {/* Avatar Circle Container */}
      <div className="relative">
        <div
          className={`${circleSizeClass} rounded-full p-0.5 transition-all ${
            isCurrentTurn
              ? 'turn-halo-yellow ring-4 ring-yellow-400 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 shadow-[0_0_25px_#facc15] scale-105'
              : `${theme.ring} ring-2 shadow-md`
          }`}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center border border-white/90">
            {player.avatar && player.avatar.startsWith('http') ? (
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-tr from-purple-900 to-indigo-800 flex items-center justify-center font-black text-white ${size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                {initials}
              </div>
            )}
          </div>
        </div>

        {/* Small Gift Icon Badge on Left (Matching Donkey Master Reference Screenshot) */}
        <div
          className={`absolute ${size === 'xs' ? '-bottom-0.5 -left-1 w-4 h-4' : '-bottom-1 -left-1.5 w-5 h-5'} rounded-full bg-slate-900 border border-white/80 flex items-center justify-center text-white shadow-md z-15`}
          title="Send Gift"
        >
          <Gift className={`${size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-white fill-current`} />
        </div>

        {/* Small User Profile / Friend Icon Badge on Right (Matching Donkey Master Reference Screenshot) */}
        {!player.isBot && !player.isDisconnected && (
          <div
            className={`absolute ${size === 'xs' ? '-bottom-0.5 -right-1 w-4 h-4' : '-bottom-1 -right-1.5 w-5 h-5'} rounded-full bg-amber-400 border border-yellow-200 flex items-center justify-center text-slate-950 shadow-md z-15`}
          >
            <User className={`${size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-slate-950 fill-current`} />
          </div>
        )}

        {/* Bot Icon Indicator */}
        {(player.isBot || player.isDisconnected) && (
          <div
            title={player.isDisconnected ? "Disconnected: Bot is playing" : "AI Bot"}
            className={`absolute ${size === 'xs' ? '-bottom-0.5 -right-1 w-4 h-4' : '-bottom-1 -right-1.5 w-5 h-5'} rounded-full bg-indigo-600 border border-white flex items-center justify-center text-white shadow-md z-15`}
          >
            <Bot className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </div>
        )}

        {/* Disconnection Offline Warning */}
        {player.isDisconnected && (
          <div
            title="Connection dropped - Bot active"
            className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-600 border border-white flex items-center justify-center text-white shadow-md animate-pulse z-20"
          >
            <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </div>
        )}

        {/* Card Count Pill Badge */}
        {!player.rank && !player.isMercyEliminated && (
          <div
            className={`absolute -top-1 -left-1 px-1 py-0.1 sm:px-1.5 sm:py-0.2 text-[8px] sm:text-[9px] font-black rounded-full border border-white text-white shadow-md z-20 ${
              player.cardsCount >= 20 ? 'bg-red-600 animate-pulse' : 'bg-slate-950/90'
            }`}
          >
            🃏{player.cardsCount}
          </div>
        )}
      </div>

      {/* Name Label (Below Avatar if namePosition === 'bottom') */}
      {namePosition === 'bottom' && (
        <div
          className={`mt-0.5 rounded font-black shadow-md truncate text-center ${nameMaxW} ${
            isSelf ? 'bg-amber-500 text-slate-950' : theme.pill
          }`}
        >
          {player.name}
        </div>
      )}

      {/* Turn Relationship Badges: Before You / After You / Playing Now */}
      {!player.rank && !player.isMercyEliminated && (
        <div className="mt-0.5 flex flex-col items-center">
          {isCurrentTurn ? (
            <span className="px-1 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[8px] sm:text-[9px] font-black uppercase tracking-tight shadow-sm flex items-center gap-0.5 animate-pulse">
              <span>🎯</span>
              <span>{isSelf ? 'YOU' : 'PLAY'}</span>
            </span>
          ) : isBeforeMe ? (
            <span className="px-1 py-0.2 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-[8px] sm:text-[9px] font-bold tracking-tight shadow-sm flex items-center gap-0.5">
              <span>⏮️</span>
              <span className="hidden sm:inline">Before</span>
            </span>
          ) : isAfterMe ? (
            <span className="px-1 py-0.2 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-[8px] sm:text-[9px] font-bold tracking-tight shadow-sm flex items-center gap-0.5">
              <span>⏭️</span>
              <span className="hidden sm:inline">After</span>
            </span>
          ) : null}
        </div>
      )}

      {player.isDisconnected && (
        <span className="text-[8px] text-amber-300 font-semibold mt-0.5 tracking-tight">
          Bot
        </span>
      )}
    </div>
  );
};
