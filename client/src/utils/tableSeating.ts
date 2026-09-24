import type { CSSProperties } from 'react';

export type PlayerColorTheme =
  | 'yellow'
  | 'blue'
  | 'pink'
  | 'red'
  | 'green'
  | 'purple'
  | 'cyan'
  | 'orange'
  | 'lime'
  | 'indigo';

export const PLAYER_THEME_KEYS: PlayerColorTheme[] = [
  'yellow',
  'blue',
  'pink',
  'red',
  'green',
  'purple',
  'cyan',
  'orange',
  'lime',
  'indigo'
];

export interface PlayerThemeDetails {
  key: PlayerColorTheme;
  ring: string;
  border: string;
  pill: string;
  glow: string;
  cardBackBg: string;
  cardBackBorder: string;
}

export const PLAYER_THEME_DETAILS: Record<PlayerColorTheme, PlayerThemeDetails> = {
  yellow: {
    key: 'yellow',
    ring: 'ring-amber-400 border-amber-400',
    border: 'border-yellow-400',
    pill: 'bg-amber-500 text-slate-950 font-black',
    glow: 'shadow-[0_0_18px_#fbbf24]',
    cardBackBg: 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500',
    cardBackBorder: 'border-yellow-300'
  },
  blue: {
    key: 'blue',
    ring: 'ring-cyan-400 border-cyan-400',
    border: 'border-cyan-400',
    pill: 'bg-blue-600 text-white font-bold',
    glow: 'shadow-[0_0_18px_#38bdf8]',
    cardBackBg: 'bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700',
    cardBackBorder: 'border-cyan-300'
  },
  pink: {
    key: 'pink',
    ring: 'ring-pink-500 border-pink-500',
    border: 'border-pink-500',
    pill: 'bg-fuchsia-600 text-white font-bold',
    glow: 'shadow-[0_0_18px_#ec4899]',
    cardBackBg: 'bg-gradient-to-br from-pink-600 via-rose-500 to-fuchsia-600',
    cardBackBorder: 'border-pink-300'
  },
  red: {
    key: 'red',
    ring: 'ring-red-500 border-red-500',
    border: 'border-red-500',
    pill: 'bg-red-600 text-white font-bold',
    glow: 'shadow-[0_0_18px_#ef4444]',
    cardBackBg: 'bg-gradient-to-br from-red-600 via-rose-600 to-red-700',
    cardBackBorder: 'border-red-300'
  },
  green: {
    key: 'green',
    ring: 'ring-emerald-400 border-emerald-400',
    border: 'border-emerald-400',
    pill: 'bg-emerald-600 text-white font-bold',
    glow: 'shadow-[0_0_18px_#34d399]',
    cardBackBg: 'bg-gradient-to-br from-emerald-600 via-green-500 to-teal-600',
    cardBackBorder: 'border-emerald-300'
  },
  purple: {
    key: 'purple',
    ring: 'ring-purple-400 border-purple-400',
    border: 'border-purple-400',
    pill: 'bg-purple-600 text-white font-bold',
    glow: 'shadow-[0_0_18px_#c084fc]',
    cardBackBg: 'bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800',
    cardBackBorder: 'border-purple-300'
  },
  cyan: {
    key: 'cyan',
    ring: 'ring-teal-400 border-teal-400',
    border: 'border-teal-400',
    pill: 'bg-teal-600 text-white font-bold',
    glow: 'shadow-[0_0_18px_#2dd4bf]',
    cardBackBg: 'bg-gradient-to-br from-teal-500 via-cyan-600 to-teal-700',
    cardBackBorder: 'border-teal-300'
  },
  orange: {
    key: 'orange',
    ring: 'ring-orange-400 border-orange-400',
    border: 'border-orange-400',
    pill: 'bg-orange-500 text-white font-bold',
    glow: 'shadow-[0_0_18px_#fb923c]',
    cardBackBg: 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600',
    cardBackBorder: 'border-orange-300'
  },
  lime: {
    key: 'lime',
    ring: 'ring-lime-400 border-lime-400',
    border: 'border-lime-400',
    pill: 'bg-lime-600 text-slate-950 font-black',
    glow: 'shadow-[0_0_18px_#a3e635]',
    cardBackBg: 'bg-gradient-to-br from-lime-500 via-green-500 to-lime-600',
    cardBackBorder: 'border-lime-300'
  },
  indigo: {
    key: 'indigo',
    ring: 'ring-indigo-400 border-indigo-400',
    border: 'border-indigo-400',
    pill: 'bg-indigo-600 text-white font-bold',
    glow: 'shadow-[0_0_18px_#818cf8]',
    cardBackBg: 'bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-800',
    cardBackBorder: 'border-indigo-300'
  }
};

export interface TableSeatPosition {
  avatarStyle: CSSProperties;
  cardSlotStyle: CSSProperties;
  angleDeg: number;
  cardRotation: number;
}

/**
 * Reorders any player array so that the local player is strictly at index 0 (bottom).
 * Subsequent players are ordered clockwise in play order.
 */
export function reorderPlayersForLocalView<T extends { id: string }>(
  players: T[],
  localPlayerId?: string
): T[] {
  if (!players || players.length === 0) return [];
  if (!localPlayerId) return [...players];

  const myIndex = players.findIndex(p => p.id === localPlayerId);
  if (myIndex === -1) return [...players];

  return [...players.slice(myIndex), ...players.slice(0, myIndex)];
}

/**
 * Calculates absolute percentage positions for avatar and center card slot
 * for a variable number of players from 2 to 10.
 *
 * Rules:
 * - Local player (playerIndex = 0) is ALWAYS placed at the bottom (angle 90°).
 * - For 2 players: 1 bottom (90°), 1 top (270°) - opposite each other.
 * - For 3 players: 1 bottom (90°), 1 top-left (210°), 1 top-right (330°) - balanced triangle.
 * - For 4 players: 4 directions (90° bottom, 180° left, 270° top, 0° right) - diamond.
 * - For 5 players: pentagon evenly around center (90°, 162°, 234°, 306°, 18°).
 * - For 6 players: hexagon (90°, 150°, 210°, 270°, 330°, 30°).
 * - For 7 players: circular/oval (90° bottom, 141.4°, 192.9°, 244.3°, 295.7°, 347.1°, 38.6°).
 * - For 8, 9, 10 players: evenly distributed around the oval/circle.
 *
 * All card slots face inward towards the center.
 */
export function getTableSeatPosition(
  totalPlayers: number,
  playerIndex: number
): TableSeatPosition {
  const count = Math.max(2, Math.min(10, totalPlayers));
  const idx = ((playerIndex % count) + count) % count;

  // Angle in degrees: 0° is 3 o'clock (right), 90° is 6 o'clock (bottom),
  // 180° is 9 o'clock (left), 270° is 12 o'clock (top).
  const angleDeg = (90 + idx * (360 / count)) % 360;
  const angleRad = (angleDeg * Math.PI) / 180;

  // Radii tuning for responsive portrait 9:16 screen
  let rAvatarX = 39;
  let rAvatarY = 36;
  let rCardX = 19;
  let rCardY = 19;

  if (count <= 4) {
    rAvatarX = 38;
    rAvatarY = 35;
    rCardX = 18;
    rCardY = 18;
  } else if (count <= 7) {
    rAvatarX = 40;
    rAvatarY = 37;
    rCardX = 20;
    rCardY = 20;
  } else {
    // 8 to 10 players
    rAvatarX = 41;
    rAvatarY = 38;
    rCardX = 21;
    rCardY = 21;
  }

  const avatarX = Math.round((50 + rAvatarX * Math.cos(angleRad)) * 10) / 10;
  const avatarY = Math.round((50 + rAvatarY * Math.sin(angleRad)) * 10) / 10;

  const cardX = Math.round((50 + rCardX * Math.cos(angleRad)) * 10) / 10;
  const cardY = Math.round((50 + rCardY * Math.sin(angleRad)) * 10) / 10;

  // Rotation so the card slot radiates towards the center
  const cardRotation = Math.round(angleDeg - 90);

  return {
    avatarStyle: {
      position: 'absolute',
      left: `${avatarX}%`,
      top: `${avatarY}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 20
    },
    cardSlotStyle: {
      position: 'absolute',
      left: `${cardX}%`,
      top: `${cardY}%`,
      transform: `translate(-50%, -50%) rotate(${cardRotation}deg)`,
      zIndex: 10
    },
    angleDeg,
    cardRotation
  };
}

export function getAvatarSizeForCount(totalPlayers: number): 'xs' | 'sm' | 'md' {
  if (totalPlayers <= 4) return 'md';
  if (totalPlayers <= 7) return 'sm';
  return 'xs';
}

export function getCenterCardDimensions(totalPlayers: number): {
  container: string;
  width: string;
  height: string;
} {
  if (totalPlayers <= 4) {
    return {
      container: 'w-12 h-17 sm:w-14 sm:h-20',
      width: 'w-12 sm:w-14',
      height: 'h-17 sm:h-20'
    };
  }
  if (totalPlayers <= 7) {
    return {
      container: 'w-10 h-14 sm:w-12 sm:h-17',
      width: 'w-10 sm:w-12',
      height: 'h-14 sm:h-17'
    };
  }
  return {
    container: 'w-8 h-12 sm:w-9 sm:h-14',
    width: 'w-8 sm:w-9',
    height: 'h-12 sm:h-14'
  };
}

// -------------------------------------------------------------
// Backwards Compatibility Helpers (for any components using legacy exports)
// -------------------------------------------------------------

export function getOpponentSeatStyle(idx: number, total: number): CSSProperties {
  if (total <= 0) return {};
  const pos = getTableSeatPosition(total + 1, idx + 1);
  return pos.avatarStyle;
}

export interface PartitionedOpponents<T> {
  leftOpponent: T | null;
  topOpponents: T[];
  rightOpponent: T | null;
}

export function partitionOpponents<T>(opponents: T[]): PartitionedOpponents<T> {
  const total = opponents.length;
  if (total === 0) return { leftOpponent: null, topOpponents: [], rightOpponent: null };
  if (total === 1) return { leftOpponent: null, topOpponents: [opponents[0]], rightOpponent: null };
  if (total === 2) return { leftOpponent: opponents[0], topOpponents: [], rightOpponent: opponents[1] };
  if (total === 3) return { leftOpponent: opponents[0], topOpponents: [opponents[1]], rightOpponent: opponents[2] };
  if (total === 4) return { leftOpponent: opponents[0], topOpponents: [opponents[1], opponents[2]], rightOpponent: opponents[3] };
  return {
    leftOpponent: opponents[0],
    topOpponents: opponents.slice(1, total - 1),
    rightOpponent: opponents[total - 1]
  };
}
