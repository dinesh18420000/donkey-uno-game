export interface DonkeyDeckTheme {
  id: number;
  name: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  deckBorder: string;
  deckBackGradient: string;
  deckBackBorder: string;
  deckGlow: string;
  accentHex: string;
  numberColor: string;
}

export const DONKEY_10_DECK_THEMES: DonkeyDeckTheme[] = [
  // 1: Yellow (Player 1)
  {
    id: 1,
    name: 'Yellow',
    pillBg: 'bg-amber-400',
    pillBorder: 'border-yellow-200',
    pillText: 'text-slate-950 font-black',
    deckBorder: 'border-yellow-400',
    deckBackGradient: 'bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500',
    deckBackBorder: 'border-yellow-200/90',
    deckGlow: 'shadow-[0_0_18px_rgba(250,204,21,0.85)]',
    accentHex: '#eab308',
    numberColor: 'text-amber-300'
  },
  // 2: Blue (Player 2)
  {
    id: 2,
    name: 'Blue',
    pillBg: 'bg-blue-600',
    pillBorder: 'border-blue-300',
    pillText: 'text-white font-bold',
    deckBorder: 'border-blue-400',
    deckBackGradient: 'bg-gradient-to-b from-blue-400 via-blue-600 to-blue-700',
    deckBackBorder: 'border-blue-300/90',
    deckGlow: 'shadow-[0_0_18px_rgba(59,130,246,0.85)]',
    accentHex: '#2563eb',
    numberColor: 'text-blue-300'
  },
  // 3: Pink (Player 3)
  {
    id: 3,
    name: 'Pink',
    pillBg: 'bg-pink-600',
    pillBorder: 'border-pink-300',
    pillText: 'text-white font-bold',
    deckBorder: 'border-pink-400',
    deckBackGradient: 'bg-gradient-to-b from-pink-400 via-pink-600 to-rose-700',
    deckBackBorder: 'border-pink-300/90',
    deckGlow: 'shadow-[0_0_18px_rgba(236,72,153,0.85)]',
    accentHex: '#db2777',
    numberColor: 'text-pink-300'
  },
  // 4: Green (Player 4)
  {
    id: 4,
    name: 'Green',
    pillBg: 'bg-emerald-600',
    pillBorder: 'border-emerald-300',
    pillText: 'text-white font-bold',
    deckBorder: 'border-emerald-400',
    deckBackGradient: 'bg-gradient-to-b from-emerald-400 via-emerald-600 to-green-700',
    deckBackBorder: 'border-emerald-300/90',
    deckGlow: 'shadow-[0_0_18px_rgba(16,185,129,0.85)]',
    accentHex: '#16a34a',
    numberColor: 'text-emerald-300'
  },
  // 5: Purple (Player 5)
  {
    id: 5,
    name: 'Purple',
    pillBg: 'bg-purple-600',
    pillBorder: 'border-purple-300',
    pillText: 'text-white font-bold',
    deckBorder: 'border-purple-400',
    deckBackGradient: 'bg-gradient-to-b from-purple-400 via-purple-600 to-indigo-800',
    deckBackBorder: 'border-purple-300/90',
    deckGlow: 'shadow-[0_0_18px_rgba(168,85,247,0.85)]',
    accentHex: '#9333ea',
    numberColor: 'text-purple-300'
  },
  // 6: Red (Player 6)
  {
    id: 6,
    name: 'Red',
    pillBg: 'bg-red-600',
    pillBorder: 'border-red-300',
    pillText: 'text-white font-bold',
    deckBorder: 'border-red-400',
    deckBackGradient: 'bg-gradient-to-b from-red-500 via-red-600 to-rose-800',
    deckBackBorder: 'border-red-300/90',
    deckGlow: 'shadow-[0_0_18px_rgba(239,68,68,0.85)]',
    accentHex: '#dc2626',
    numberColor: 'text-red-300'
  },
  // 7: Cyan (Player 7)
  {
    id: 7,
    name: 'Cyan',
    pillBg: 'bg-cyan-500',
    pillBorder: 'border-cyan-200',
    pillText: 'text-slate-950 font-black',
    deckBorder: 'border-cyan-300',
    deckBackGradient: 'bg-gradient-to-b from-cyan-300 via-cyan-500 to-teal-700',
    deckBackBorder: 'border-cyan-200/90',
    deckGlow: 'shadow-[0_0_18px_rgba(6,182,212,0.85)]',
    accentHex: '#0891b2',
    numberColor: 'text-cyan-300'
  },
  // 8: Orange (Player 8)
  {
    id: 8,
    name: 'Orange',
    pillBg: 'bg-orange-500',
    pillBorder: 'border-orange-200',
    pillText: 'text-white font-bold',
    deckBorder: 'border-orange-400',
    deckBackGradient: 'bg-gradient-to-b from-orange-400 via-orange-500 to-amber-700',
    deckBackBorder: 'border-orange-200/90',
    deckGlow: 'shadow-[0_0_18px_rgba(249,115,22,0.85)]',
    accentHex: '#ea580c',
    numberColor: 'text-orange-300'
  },
  // 9: Lime (Player 9)
  {
    id: 9,
    name: 'Lime',
    pillBg: 'bg-lime-500',
    pillBorder: 'border-lime-200',
    pillText: 'text-slate-950 font-black',
    deckBorder: 'border-lime-400',
    deckBackGradient: 'bg-gradient-to-b from-lime-300 via-lime-500 to-green-600',
    deckBackBorder: 'border-lime-200/90',
    deckGlow: 'shadow-[0_0_18px_rgba(132,204,22,0.85)]',
    accentHex: '#84cc16',
    numberColor: 'text-lime-300'
  },
  // 10: Maroon (Player 10)
  {
    id: 10,
    name: 'Maroon',
    pillBg: 'bg-rose-700',
    pillBorder: 'border-rose-300',
    pillText: 'text-white font-bold',
    deckBorder: 'border-rose-400',
    deckBackGradient: 'bg-gradient-to-b from-rose-500 via-rose-700 to-red-950',
    deckBackBorder: 'border-rose-300/90',
    deckGlow: 'shadow-[0_0_18px_rgba(190,18,60,0.85)]',
    accentHex: '#be123c',
    numberColor: 'text-rose-300'
  }
];

export function rotatePlayersForViewer<T extends { id: string }>(
  players: T[],
  viewerId: string
): Array<T & { originalIndex: number; displayIndex: number; theme: DonkeyDeckTheme }> {
  const total = players.length;
  if (total === 0) return [];

  const viewerIdx = players.findIndex(p => p.id === viewerId);
  const currentViewerIndex = viewerIdx !== -1 ? viewerIdx : 0;

  const result: Array<T & { originalIndex: number; displayIndex: number; theme: DonkeyDeckTheme }> = [];

  for (let offset = 0; offset < total; offset++) {
    const originalIndex = (currentViewerIndex + offset) % total;
    const player = players[originalIndex];
    result.push({
      ...player,
      originalIndex,
      displayIndex: offset,
      theme: DONKEY_10_DECK_THEMES[originalIndex % 10]
    });
  }

  return result;
}
