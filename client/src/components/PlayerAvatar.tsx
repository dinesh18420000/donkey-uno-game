import React, { useEffect, useState } from 'react';
import type { PlayerPublic } from '../types';
import type { PlayerColorTheme } from '../utils/tableSeating';
import { PLAYER_THEME_DETAILS } from '../utils/tableSeating';
import { Bot, WifiOff, Crown, Clock, Gift, User } from 'lucide-react';
import { SkipProhibitionIcon } from './SkipProhibitionIcon';

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
  hideName?: boolean;
  isHighlighted?: boolean;
  highlightLabel?: string;
  isSkipped?: boolean;
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
  turnDuration = 20,
  onSelect,
  isBeforeMe,
  isAfterMe,
  actionNotice,
  hideName,
  isHighlighted = false,
  highlightLabel,
  isSkipped = false
}) => {
  const theme =
    PLAYER_THEME_DETAILS[(colorTheme as PlayerColorTheme)] ||
    PLAYER_THEME_DETAILS.blue;
  const initials = player.name.slice(0, 2).toUpperCase();

  // Local state for countdown ticking
  const maxSec = Math.min(20, turnDuration || 20);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(maxSec);

  useEffect(() => {
    if (!isCurrentTurn) {
      setSecondsRemaining(maxSec);
      return;
    }

    if (!turnExpiresAt) {
      setSecondsRemaining(maxSec);
      const interval = setInterval(() => {
        setSecondsRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.min(maxSec, Math.ceil((turnExpiresAt - Date.now()) / 1000)));
      setSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [isCurrentTurn, turnExpiresAt, maxSec]);

  // Turn is active and time is very low (<= 4 seconds)
  const isTimeLow = isCurrentTurn && secondsRemaining <= 4;

  // Size specific dimensions (compact, reduced profile icon)
  const circleSizeClass =
    size === 'xs'
      ? 'w-7 h-7 sm:w-8 sm:h-8'
      : size === 'sm'
      ? 'w-8 h-8 sm:w-9 sm:h-9'
      : 'w-9 h-9 sm:w-10 sm:h-10';

  const nameMaxW =
    size === 'xs'
      ? 'max-w-[60px] text-[8px] sm:text-[9px] px-1 py-0.2'
      : size === 'sm'
      ? 'max-w-[72px] text-[8px] sm:text-[9px] px-1.5 py-0.2'
      : 'max-w-[85px] text-[9px] sm:text-[10px] px-2 py-0.5';

  return (
    <div
      onClick={onSelect}
      className={`relative flex flex-col items-center select-none cursor-pointer transition-all duration-300 ${
        player.isMercyEliminated
          ? 'opacity-65 grayscale-[35%] z-10'
          : isSkipped
          ? 'scale-115 z-40'
          : isHighlighted
          ? 'player-swap-spotlight z-30'
          : isCurrentTurn
          ? 'player-active-spotlight z-30'
          : 'player-inactive-dimmed z-10'
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

      {/* Turn Countdown Timer Badge (Only for opponents; local player has top HUD timer) */}
      {!isSelf && isCurrentTurn && !player.rank && (
        <div
          className={`absolute -top-5 z-30 flex items-center gap-1 px-1.5 py-0.2 rounded-full border shadow-xl text-[9px] sm:text-[10px] font-black tracking-tight ${
            isTimeLow
              ? 'bg-red-950/95 border-red-500 text-red-300 animate-pulse shadow-red-500/50'
              : 'bg-slate-950/95 border-amber-300 text-amber-300 shadow-amber-500/30'
          }`}
        >
          <Clock className={`w-2.5 h-2.5 ${isTimeLow ? 'text-red-400 animate-spin' : 'text-amber-400'}`} />
          <span className={isTimeLow ? 'text-red-400 font-extrabold animate-pulse' : 'text-amber-300 font-black'}>
            {secondsRemaining}s
          </span>
        </div>
      )}

      {/* Universal Skip Prohibition Icon centered right over the avatar (2-second visual) */}
      {isSkipped && (
        <div className="absolute inset-0 -top-2 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in-75 duration-200">
          <SkipProhibitionIcon size={size === 'xs' ? 36 : size === 'sm' ? 42 : 48} />
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
          {isSelf ? 'YOU' : player.name}
        </div>
      )}

      {/* Monogram Circle with Player-Themed Accent Glow */}
      <div className="relative">
        {/* Subtle, tasteful glow matching player's profile theme color */}
        {isHighlighted ? (
          <div
            className="absolute -inset-1.5 sm:-inset-2 rounded-full blur-sm opacity-75 animate-pulse pointer-events-none"
            style={{ backgroundColor: '#fbbf24', boxShadow: '0 0 16px #fbbf24' }}
          />
        ) : isCurrentTurn ? (
          <div
            className="absolute -inset-1.5 sm:-inset-2 rounded-full blur-sm pointer-events-none animate-pulse"
            style={{
              backgroundColor: isTimeLow ? '#ef4444' : theme.accentColor,
              boxShadow: isTimeLow ? '0 0 16px #ef4444' : `0 0 16px ${theme.accentColor}`,
              opacity: 0.7
            }}
          />
        ) : null}

        {/* Animated Circular Countdown Progress Ring around Profile */}
        {isCurrentTurn && (
          <div className="absolute -inset-1 sm:-inset-1.5 pointer-events-none z-10">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
              <circle
                cx="22"
                cy="22"
                r="19"
                fill="none"
                stroke={isTimeLow ? 'rgba(239, 68, 68, 0.25)' : `${theme.accentColor}33`}
                strokeWidth="2.5"
              />
              <circle
                cx="22"
                cy="22"
                r="19"
                fill="none"
                stroke={isTimeLow ? '#ef4444' : theme.accentColor}
                strokeWidth="2.5"
                strokeDasharray="119.38"
                strokeDashoffset={`${119.38 * (1 - Math.max(0, secondsRemaining) / (turnDuration || 30))}`}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 5px ${isTimeLow ? '#ef4444' : theme.accentColor})`
                }}
                className="transition-all duration-300"
              />
            </svg>
          </div>
        )}

        <div
          className={`${circleSizeClass} rounded-full p-0.5 transition-all duration-300 relative ${
            player.isMercyEliminated
              ? 'ring-1.5 ring-red-800/80'
              : isHighlighted
              ? 'ring-3.5 ring-amber-300 scale-105 animate-pulse'
              : isCurrentTurn
              ? isTimeLow
                ? 'ring-3.5 ring-red-500 scale-105 animate-pulse'
                : `ring-3.5 ${theme.ring} scale-105`
              : `${theme.ring} ring-1.5 opacity-85`
          }`}
          style={
            player.isMercyEliminated
              ? { boxShadow: '0 0 8px rgba(185, 28, 28, 0.4)' }
              : isSkipped
              ? { boxShadow: '0 0 25px #ef4444, 0 0 50px rgba(239, 68, 68, 0.95)' }
              : isHighlighted
              ? { boxShadow: '0 0 16px #fbbf24' }
              : isCurrentTurn
              ? { boxShadow: isTimeLow ? '0 0 16px #ef4444' : `0 0 16px ${theme.accentColor}` }
              : undefined
          }
        >
          {/* High-contrast initials badge, no profile pic */}
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center border border-white/80">
            <div className={`w-full h-full bg-gradient-to-tr from-purple-900 via-slate-800 to-indigo-900 flex items-center justify-center font-black text-white ${size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
              {initials}
            </div>
          </div>

          {/* Skipped Red Overlay Slash - High Visibility & Big */}
          {isSkipped && (
            <div className="absolute inset-0 rounded-full bg-red-600/85 backdrop-blur-[2px] flex items-center justify-center border-2 sm:border-3 border-white shadow-[0_0_20px_#ef4444] z-30 animate-pulse">
              <span className="text-white text-lg sm:text-2xl font-black filter drop-shadow animate-ping">
                🚫
              </span>
            </div>
          )}
        </div>

        {/* JOKER / JESTER CAP FOR BOT PLAYERS */}
        {player.isBot && (
          <div
            title="Computer Bot (Joker)"
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-25 pointer-events-none flex items-center justify-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] animate-bounce"
          >
            <span className="text-base sm:text-lg select-none inline-block transform -rotate-12">🃏</span>
          </div>
        )}

        {/* Bot Pill Indicator */}
        {player.isBot && (
          <div
            title="AI Bot"
            className="absolute -bottom-0.5 -right-1 px-1 py-0.2 rounded-full bg-indigo-600 border border-white flex items-center justify-center text-white shadow-md z-15 text-[8px] font-black"
          >
            BOT
          </div>
        )}

        {/* Glowing Pulsing Red Dot Disconnect Indicator */}
        {player.isDisconnected && (
          <div
            title="Network lost / Disconnected (Waiting to reconnect...)"
            className="absolute -top-1 -right-1 z-35 flex items-center justify-center pointer-events-none"
          >
            <span className="absolute w-4 h-4 rounded-full bg-red-500 animate-ping opacity-80" />
            <span className="relative w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-[0_0_10px_#ef4444]" />
          </div>
        )}

        {/* Card Count Pill Badge - Only show if name is hidden for high capacity */}
        {hideName && !player.rank && !player.isMercyEliminated && (
          <div
            title={`${player.cardsCount} card${player.cardsCount === 1 ? '' : 's'} in hand`}
            className={`absolute -bottom-1 -left-2 px-1 py-0.2 rounded-full border shadow-xl z-25 flex items-center gap-0.5 font-black transition-all ${
              player.cardsCount === 1
                ? 'bg-amber-400 text-slate-950 border-white shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-bounce scale-110'
                : player.cardsCount >= 20
                ? 'bg-red-600 text-white border-white shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse'
                : 'bg-slate-950 text-amber-300 border-amber-400/80'
            }`}
          >
            <span className="text-[8px]">🎴</span>
            <span className="text-[9px] font-mono leading-none">{player.cardsCount}</span>
          </div>
        )}

        {/* Mercy Rule Eliminated Badge */}
        {player.isMercyEliminated && (
          <div className="absolute -top-1 -left-1 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black rounded-full border border-red-500 bg-red-950 text-red-300 shadow-md z-20 flex items-center gap-0.5">
            <span>☠️</span>
            <span>OUT</span>
          </div>
        )}

        {/* Uno Call Alert Status */}
        {player.cardsCount === 1 && !player.rank && !player.isMercyEliminated && (
          <div
            className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full font-black text-[8px] sm:text-[9px] border-2 shadow-2xl z-30 flex items-center gap-1 whitespace-nowrap animate-bounce ${
              player.calledUno
                ? 'bg-emerald-600 text-white border-white shadow-emerald-500/80'
                : 'bg-red-600 text-white border-white shadow-red-500/80'
            }`}
          >
            <span>{player.calledUno ? '📢 UNO!' : '🚨 NO UNO!'}</span>
          </div>
        )}
      </div>

      {/* Unified Single Name Pill & Subtitle (No stacked badge towers) */}
      {(!hideName || isSelf) && (
        <div className="mt-1 flex flex-col items-center">
          <div
            className={`rounded-full font-black shadow-md truncate text-center transition-all ${nameMaxW} ${
              isHighlighted
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 border border-white'
                : isCurrentTurn
                ? 'bg-amber-400 text-slate-950 border border-white shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse'
                : isSelf
                ? 'bg-amber-500 text-slate-950'
                : theme.pill
            }`}
          >
            {isSelf ? 'YOU' : player.name}
          </div>

          {/* Clean Card Count Subtitle */}
          {!player.rank && !player.isMercyEliminated && (
            <div className="text-[8px] sm:text-[9px] font-bold text-slate-300 tracking-tight flex items-center gap-1 mt-0.5 whitespace-nowrap">
              <span className="text-[7px] text-amber-400">●</span>
              <span>{player.cardsCount} {player.cardsCount === 1 ? 'card' : 'cards'}</span>
            </div>
          )}

          {player.isMercyEliminated && (
            <span className="text-[8px] font-black text-red-400 flex items-center gap-0.5 mt-0.5">
              ☠️ OUT
            </span>
          )}
        </div>
      )}

      {player.isDisconnected && (
        <span className="text-[8px] text-amber-300 font-semibold mt-0.5 tracking-tight">
          Disconnected
        </span>
      )}
    </div>
  );
};
