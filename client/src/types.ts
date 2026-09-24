export type Suit = 'SPADES' | 'HEARTS' | 'CLUBS' | 'DIAMONDS';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface DonkeyCard {
  id: string;
  suit: Suit;
  value: CardValue;
  rank: number; // 2 to 14 (A=14)
}

export type UnoColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type UnoCardType =
  | 'number'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'draw4'
  | 'discard_all'
  | 'skip_everyone'
  | 'wild'
  | 'wild_draw6'
  | 'wild_draw10'
  | 'wild_reverse_draw4'
  | 'pass_0'
  | 'swap_7';

export interface UnoCard {
  id: string;
  color: UnoColor;
  type: UnoCardType;
  value?: number; // 0-9 for numbers
}

export type Card = DonkeyCard | UnoCard;

export function isDonkeyCard(card: any): card is DonkeyCard {
  return card && 'suit' in card && 'rank' in card;
}

export function isUnoCard(card: any): card is UnoCard {
  return card && 'color' in card && 'type' in card;
}

export function getDrawCardPenalty(type: UnoCardType): number {
  switch (type) {
    case 'draw2': return 2;
    case 'draw4': return 4;
    case 'wild_reverse_draw4': return 4;
    case 'wild_draw6': return 6;
    case 'wild_draw10': return 10;
    default: return 0;
  }
}

export function canPlayUnoCard(
  card: UnoCard,
  activeCard: UnoCard,
  activeColor: UnoColor,
  drawStackCount: number
): boolean {
  if (drawStackCount > 0) {
    const currentPenalty = getDrawCardPenalty(activeCard.type);
    const cardPenalty = getDrawCardPenalty(card.type);
    return cardPenalty > 0 && cardPenalty >= currentPenalty;
  }

  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.type === 'number' && activeCard.type === 'number' && card.value === activeCard.value) return true;
  if (card.type !== 'number' && card.type === activeCard.type) return true;

  return false;
}

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  isDisconnected: boolean;
  cardsCount: number;
  rank?: number;
  isDonkey?: boolean;
  isMercyEliminated?: boolean;
  isSpectator?: boolean;
}

export type GameType = 'donkey' | 'uno_no_mercy';
export type RoomStatus = 'waiting' | 'playing' | 'round_end' | 'game_over';

export interface TrickPlay {
  playerId: string;
  playerName: string;
  card: DonkeyCard;
  isCut?: boolean;
}

export interface ClientGameState {
  roomCode: string;
  gameType: GameType;
  status: RoomStatus;
  hostId: string;
  myPlayerId: string;
  myHand: Card[];
  players: PlayerPublic[];
  currentTurnPlayerId: string;
  direction: 1 | -1;
  lastAction: string;
  roundNumber: number;
  turnExpiresAt: number;
  turnDuration: number;

  // Donkey
  leadSuit?: Suit;
  currentTrick: TrickPlay[];

  // UNO
  activeUnoCard?: UnoCard;
  activeUnoColor?: UnoColor;
  drawStackCount: number;
  deckRemainingCount: number;
}

// Helper to determine who plays before and after a specific player
export function getTurnNeighbors(
  players: PlayerPublic[],
  myPlayerId: string,
  direction: 1 | -1 = 1
): { playerBeforeMe: PlayerPublic | null; playerAfterMe: PlayerPublic | null } {
  // Filter active players who still have cards / not ranked out
  const activePlayers = players.filter(
    p => !p.rank && !p.isMercyEliminated && (p.cardsCount > 0 || p.id === myPlayerId)
  );

  if (activePlayers.length <= 1) {
    return { playerBeforeMe: null, playerAfterMe: null };
  }

  const myIdx = activePlayers.findIndex(p => p.id === myPlayerId);
  if (myIdx === -1) {
    return { playerBeforeMe: null, playerAfterMe: null };
  }

  const len = activePlayers.length;
  // If direction is 1 (CW): after me is +1, before me is -1
  // If direction is -1 (CCW): after me is -1, before me is +1
  const afterIdx = (myIdx + direction + len) % len;
  const beforeIdx = (myIdx - direction + len) % len;

  return {
    playerAfterMe: activePlayers[afterIdx] || null,
    playerBeforeMe: activePlayers[beforeIdx] || null
  };
}
