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
