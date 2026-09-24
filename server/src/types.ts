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

export interface Player {
  id: string;
  name: string;
  avatar: string;
  socketId: string | null;
  isHost: boolean;
  isBot: boolean;
  isDisconnected: boolean;
  cardsCount: number;
  hand: Card[];
  rank?: number; // 1 for 1st place, etc.
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

export interface GameRoom {
  code: string;
  gameType: GameType;
  hostId: string;
  status: RoomStatus;
  maxPlayers: number;
  players: Player[];
  currentTurnIndex: number;
  direction: 1 | -1; // 1 clockwise, -1 counterclockwise
  roundNumber: number;
  lastAction: string;
  turnExpiresAt: number; // Unix timestamp in ms when 30s expires
  turnDuration: number;  // 30 seconds

  // Donkey state
  leadSuit?: Suit;
  currentTrick: TrickPlay[];
  trickStarterIndex?: number;
  donkeyPlayerId?: string;

  // UNO No Mercy state
  activeUnoCard?: UnoCard;
  activeUnoColor?: UnoColor;
  drawStackCount: number; // accumulated draw penalty
  deckRemainingCount: number;
  discardPile: UnoCard[];
  unoDeck: UnoCard[];
}

export interface ClientGameState {
  roomCode: string;
  gameType: GameType;
  status: RoomStatus;
  hostId: string;
  myPlayerId: string;
  myHand: Card[];
  players: {
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
  }[];
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
