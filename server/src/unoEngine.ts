import { UnoCard, UnoColor, UnoCardType, Player } from './types.js';

const COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];

export function createUnoNoMercyDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let id = 1;

  for (const color of COLORS) {
    // Numbers 0-9 (two of each 1-9, one 0)
    deck.push({ id: `uno_${id++}_${color}_0`, color, type: 'pass_0', value: 0 });
    for (let i = 1; i <= 9; i++) {
      if (i === 7) {
        deck.push({ id: `uno_${id++}_${color}_7a`, color, type: 'swap_7', value: 7 });
        deck.push({ id: `uno_${id++}_${color}_7b`, color, type: 'swap_7', value: 7 });
      } else {
        deck.push({ id: `uno_${id++}_${color}_${i}a`, color, type: 'number', value: i });
        deck.push({ id: `uno_${id++}_${color}_${i}b`, color, type: 'number', value: i });
      }
    }

    // Action cards per color (2 of each)
    for (let c = 0; c < 2; c++) {
      deck.push({ id: `uno_${id++}_${color}_skip_${c}`, color, type: 'skip' });
      deck.push({ id: `uno_${id++}_${color}_rev_${c}`, color, type: 'reverse' });
      deck.push({ id: `uno_${id++}_${color}_d2_${c}`, color, type: 'draw2' });
      deck.push({ id: `uno_${id++}_${color}_d4_${c}`, color, type: 'draw4' });
      deck.push({ id: `uno_${id++}_${color}_disc_${c}`, color, type: 'discard_all' });
    }

    // Skip Everyone (1 per color)
    deck.push({ id: `uno_${id++}_${color}_skipeveryone`, color, type: 'skip_everyone' });
  }

  // Wild cards
  for (let w = 0; w < 4; w++) {
    deck.push({ id: `uno_${id++}_wild_basic_${w}`, color: 'wild', type: 'wild' });
    deck.push({ id: `uno_${id++}_wild_d6_${w}`, color: 'wild', type: 'wild_draw6' });
    deck.push({ id: `uno_${id++}_wild_d10_${w}`, color: 'wild', type: 'wild_draw10' });
    deck.push({ id: `uno_${id++}_wild_revd4_${w}`, color: 'wild', type: 'wild_reverse_draw4' });
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

export function dealUnoCards(players: Player[], deck: UnoCard[]): { activeCard: UnoCard; remainingDeck: UnoCard[] } {
  players.forEach(p => {
    p.hand = [];
    p.cardsCount = 0;
    p.rank = undefined;
    p.isMercyEliminated = false;
  });

  // Deal 7 cards to each player
  for (let round = 0; round < 7; round++) {
    for (const player of players) {
      if (deck.length > 0) {
        player.hand.push(deck.pop()!);
      }
    }
  }

  players.forEach(p => {
    p.cardsCount = p.hand.length;
  });

  // Pick starter card (must be a number or basic action card, not wild draw)
  let starterIdx = deck.findIndex(c => c.color !== 'wild' && c.type === 'number');
  if (starterIdx === -1) starterIdx = 0;
  const activeCard = deck.splice(starterIdx, 1)[0];

  return { activeCard, remainingDeck: deck };
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
  // If there is an active draw penalty stack, only eligible draw cards can be played (Stacking Rule)
  if (drawStackCount > 0) {
    const currentPenalty = getDrawCardPenalty(activeCard.type);
    const cardPenalty = getDrawCardPenalty(card.type);
    // In No Mercy, you can only stack draw cards of equal or higher penalty!
    return cardPenalty > 0 && cardPenalty >= currentPenalty;
  }

  // Wild cards can always be played
  if (card.color === 'wild') return true;

  // Matching color
  if (card.color === activeColor) return true;

  // Matching number
  if (card.type === 'number' && activeCard.type === 'number' && card.value === activeCard.value) return true;

  // Matching action type
  if (card.type !== 'number' && card.type === activeCard.type) return true;

  return false;
}

export function getValidUnoMoves(
  player: Player,
  activeCard: UnoCard,
  activeColor: UnoColor,
  drawStackCount: number
): UnoCard[] {
  return (player.hand as UnoCard[]).filter(c => canPlayUnoCard(c, activeCard, activeColor, drawStackCount));
}

export function chooseUnoBotCard(
  player: Player,
  activeCard: UnoCard,
  activeColor: UnoColor,
  drawStackCount: number
): { card: UnoCard; chosenColor?: UnoColor; swapTargetPlayerId?: string } | null {
  const validCards = getValidUnoMoves(player, activeCard, activeColor, drawStackCount);
  if (validCards.length === 0) return null; // Must draw

  // Count colors in hand to pick best wild color
  const colorCounts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
  (player.hand as UnoCard[]).forEach(c => {
    colorCounts[c.color]++;
  });

  const bestColor = (['red', 'blue', 'green', 'yellow'] as UnoColor[]).reduce((best, cur) =>
    colorCounts[cur] > colorCounts[best] ? cur : best, 'red');

  // Strategy: Play Discard All if we have 2+ of that color
  const discardAll = validCards.find(c => c.type === 'discard_all' && colorCounts[c.color] >= 2);
  if (discardAll) return { card: discardAll };

  // Play highest impact action or draw stack
  const drawCard = validCards.find(c => getDrawCardPenalty(c.type) > 0);
  if (drawCard) {
    return {
      card: drawCard,
      chosenColor: drawCard.color === 'wild' ? bestColor : undefined
    };
  }

  // Pick randomly among valid cards so the bot plays dynamically!
  const cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
  return {
    card: cardToPlay,
    chosenColor: cardToPlay.color === 'wild' ? bestColor : undefined
  };
}

export function execute0PassHands(players: Player[], direction: 1 | -1): void {
  const activePlayers = players.filter(p => !p.rank && !p.isMercyEliminated);
  if (activePlayers.length < 2) return;

  const hands = activePlayers.map(p => [...p.hand]);
  const len = activePlayers.length;

  for (let i = 0; i < len; i++) {
    // If direction is 1 (clockwise), player receives hand from previous player
    const sourceIdx = (i - direction + len) % len;
    activePlayers[i].hand = hands[sourceIdx];
    activePlayers[i].cardsCount = activePlayers[i].hand.length;
  }
}

export function execute7SwapHands(playerA: Player, playerB: Player): void {
  const tempHand = [...playerA.hand];
  playerA.hand = [...playerB.hand];
  playerB.hand = tempHand;
  playerA.cardsCount = playerA.hand.length;
  playerB.cardsCount = playerB.hand.length;
}

export function checkMercyRule(player: Player, discardPile: UnoCard[]): boolean {
  if (player.hand.length >= 25 && !pIsEliminated(player)) {
    player.isMercyEliminated = true;
    // Reshuffle eliminated player's hand back into discard pile
    discardPile.push(...(player.hand as UnoCard[]));
    player.hand = [];
    player.cardsCount = 0;
    return true; // Knocked out!
  }
  return false;
}

function pIsEliminated(player: Player): boolean {
  return !!player.rank || !!player.isMercyEliminated;
}
