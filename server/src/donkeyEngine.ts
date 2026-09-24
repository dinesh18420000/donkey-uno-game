import { DonkeyCard, Player, Suit, CardValue, TrickPlay } from './types.js';

const SUITS: Suit[] = ['SPADES', 'HEARTS', 'CLUBS', 'DIAMONDS'];
const VALUES: { val: CardValue; rank: number }[] = [
  { val: '2', rank: 2 },
  { val: '3', rank: 3 },
  { val: '4', rank: 4 },
  { val: '5', rank: 5 },
  { val: '6', rank: 6 },
  { val: '7', rank: 7 },
  { val: '8', rank: 8 },
  { val: '9', rank: 9 },
  { val: '10', rank: 10 },
  { val: 'J', rank: 11 },
  { val: 'Q', rank: 12 },
  { val: 'K', rank: 13 },
  { val: 'A', rank: 14 }
];

export function createDonkeyDeck(): DonkeyCard[] {
  const deck: DonkeyCard[] = [];
  let id = 1;
  for (const suit of SUITS) {
    for (const v of VALUES) {
      deck.push({
        id: `card_${id++}_${suit}_${v.val}`,
        suit,
        value: v.val,
        rank: v.rank
      });
    }
  }
  return shuffle(deck);
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealDonkeyCards(players: Player[]): { startingPlayerIndex: number } {
  const deck = createDonkeyDeck();
  players.forEach(p => {
    p.hand = [];
    p.cardsCount = 0;
    p.rank = undefined;
    p.isDonkey = false;
  });

  // Deal cards evenly
  let pIdx = 0;
  while (deck.length > 0) {
    const card = deck.pop()!;
    players[pIdx].hand.push(card);
    pIdx = (pIdx + 1) % players.length;
  }

  // Sort each player's hand: Suit order (♠, ♥, ♣, ♦), then descending rank
  const suitOrder: Record<Suit, number> = { SPADES: 1, HEARTS: 2, CLUBS: 3, DIAMONDS: 4 };
  players.forEach(p => {
    (p.hand as DonkeyCard[]).sort((a, b) => {
      if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
      return b.rank - a.rank;
    });
    p.cardsCount = p.hand.length;
  });

  // Starting player is the one holding Ace of Spades (or highest spade if not dealt)
  let starter = 0;
  for (let i = 0; i < players.length; i++) {
    const hasAceSpades = (players[i].hand as DonkeyCard[]).some(c => c.suit === 'SPADES' && c.value === 'A');
    if (hasAceSpades) {
      starter = i;
      break;
    }
  }

  return { startingPlayerIndex: starter };
}

export function getValidDonkeyMoves(player: Player, leadSuit?: Suit, isFirstTrick: boolean = false): DonkeyCard[] {
  const hand = player.hand as DonkeyCard[];
  if (!leadSuit) {
    // If it's the very first trick of the game, player MUST lead with Ace of Spades
    if (isFirstTrick) {
      const aceSpades = hand.find(c => c.suit === 'SPADES' && c.value === 'A');
      if (aceSpades) return [aceSpades];
    }
    // Otherwise, can lead any card
    return hand;
  }

  // Must follow suit if player has cards of leadSuit
  const matchingSuitCards = hand.filter(c => c.suit === leadSuit);
  if (matchingSuitCards.length > 0) {
    return matchingSuitCards;
  }

  // Doesn't have lead suit -> can cut with any card
  return hand;
}

export function chooseDonkeyBotCard(player: Player, leadSuit?: Suit, isFirstTrick: boolean = false): DonkeyCard {
  const validCards = getValidDonkeyMoves(player, leadSuit, isFirstTrick);
  if (validCards.length === 0) return (player.hand as DonkeyCard[])[0];
  if (validCards.length === 1) return validCards[0];

  // Randomly select among valid cards so the bot never predictably repeats the exact same card!
  const randomIdx = Math.floor(Math.random() * validCards.length);
  return validCards[randomIdx];
}

export interface DonkeyTurnResult {
  cardPlayed: DonkeyCard;
  isCut: boolean;
  trickFinished: boolean;
  cardsPickedUpByPlayerId?: string;
  cardsCountPickedUp?: number;
  trickWinnerPlayerId?: string;
  nextLeadPlayerIndex: number;
  message: string;
}

export function resolveDonkeyPlay(
  players: Player[],
  currentPlayerIndex: number,
  card: DonkeyCard,
  currentTrick: TrickPlay[],
  leadSuit?: Suit,
  isFirstTrick: boolean = false
): DonkeyTurnResult {
  const player = players[currentPlayerIndex];
  
  // Remove card from hand
  player.hand = (player.hand as DonkeyCard[]).filter(c => c.id !== card.id);
  player.cardsCount = player.hand.length;

  const effectiveLead = leadSuit || card.suit;
  const isCut = card.suit !== effectiveLead;

  const play: TrickPlay = {
    playerId: player.id,
    playerName: player.name,
    card,
    isCut
  };
  currentTrick.push(play);

  // Check if player emptied their hand
  checkAndAssignRanks(players);

  // If a CUT happened:
  if (isCut) {
    // Find the player who played the HIGHEST card of the leadSuit so far
    let highestLeadCard: DonkeyCard | null = null;
    let highestLeadPlayerId = '';

    for (const p of currentTrick) {
      if (p.card.suit === effectiveLead) {
        if (!highestLeadCard || p.card.rank > highestLeadCard.rank) {
          highestLeadCard = p.card;
          highestLeadPlayerId = p.playerId;
        }
      }
    }

    const victim = players.find(p => p.id === highestLeadPlayerId) || player;
    const cardsToPick = currentTrick.map(t => t.card);

    // Victim receives all trick cards into their hand
    victim.hand.push(...cardsToPick);
    // Resort victim's hand
    const suitOrder: Record<Suit, number> = { SPADES: 1, HEARTS: 2, CLUBS: 3, DIAMONDS: 4 };
    (victim.hand as DonkeyCard[]).sort((a, b) => {
      if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
      return b.rank - a.rank;
    });
    victim.cardsCount = victim.hand.length;
    // If victim had ranked out, they are back in the game!
    if (victim.rank) victim.rank = undefined;

    const victimIndex = players.findIndex(p => p.id === victim.id);

    return {
      cardPlayed: card,
      isCut: true,
      trickFinished: true,
      cardsPickedUpByPlayerId: victim.id,
      cardsCountPickedUp: cardsToPick.length,
      nextLeadPlayerIndex: victimIndex,
      message: `💥 CUT! ${player.name} threw ${card.suit} ${card.value}. ${victim.name} picked up ${cardsToPick.length} cards!`
    };
  }

  // If everyone with cards has played this trick:
  const activePlayers = players.filter(p => !p.rank);
  if (currentTrick.length >= activePlayers.length) {
    // Clean trick! No cut. Find highest card winner
    let winnerId = currentTrick[0].playerId;
    let highestRank = currentTrick[0].card.rank;

    for (const p of currentTrick) {
      if (p.card.suit === effectiveLead && p.card.rank > highestRank) {
        highestRank = p.card.rank;
        winnerId = p.playerId;
      }
    }

    const winner = players.find(p => p.id === winnerId)!;
    let nextLeadIdx = players.findIndex(p => p.id === winnerId);

    // If winner has emptied their cards and ranked out, find next active player clockwise
    if (winner.rank) {
      nextLeadIdx = getNextActivePlayerIndex(players, nextLeadIdx, 1);
    }

    return {
      cardPlayed: card,
      isCut: false,
      trickFinished: true,
      trickWinnerPlayerId: winnerId,
      nextLeadPlayerIndex: nextLeadIdx,
      message: `✨ Clean trick! ${winner.name} won with ${card.suit} ${highestRank} and cleared the table.`
    };
  }

  // Trick is still ongoing -> advance to next active player
  const nextIdx = getNextActivePlayerIndex(players, currentPlayerIndex, 1);
  return {
    cardPlayed: card,
    isCut: false,
    trickFinished: false,
    nextLeadPlayerIndex: nextIdx,
    message: `${player.name} played ${card.suit} ${card.value}.`
  };
}

export function getNextActivePlayerIndex(players: Player[], currentIdx: number, direction: 1 | -1 = 1): number {
  const len = players.length;
  let idx = (currentIdx + direction + len) % len;
  let loops = 0;
  while (loops < len) {
    const p = players[idx];
    if (!p.rank && !p.isMercyEliminated && p.hand.length > 0) {
      return idx;
    }
    idx = (idx + direction + len) % len;
    loops++;
  }
  return currentIdx;
}

export function checkAndAssignRanks(players: Player[]): void {
  const activeWithoutRank = players.filter(p => !p.rank && p.cardsCount === 0);
  let nextRank = Math.max(0, ...players.map(p => p.rank || 0)) + 1;

  for (const p of activeWithoutRank) {
    p.rank = nextRank++;
  }

  // Check if only 1 player remains holding cards -> They are DONKEY!
  const remainingPlayers = players.filter(p => !p.rank && p.cardsCount > 0);
  if (remainingPlayers.length === 1 && players.length > 1) {
    remainingPlayers[0].isDonkey = true;
    remainingPlayers[0].rank = 999; // Donkey
  }
}
