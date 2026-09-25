import { UnoCard, UnoColor, UnoCardType, Player } from './types.js';

export const UNO_COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];

export function createUnoNoMercyDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let id = 1;

  for (const color of UNO_COLORS) {
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
      deck.push({ id: `uno_${id++}_${color}_revd2_${c}`, color, type: 'reverse_draw2' });
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

export function shuffle<T>(array: T[]): T[] {
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
    p.calledUno = false;
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
    case 'draw2':
    case 'reverse_draw2':
      return 2;
    case 'draw4':
    case 'wild_reverse_draw4':
      return 4;
    case 'wild_draw6':
      return 6;
    case 'wild_draw10':
      return 10;
    default:
      return 0;
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

  // Cross-matching for reverse_draw2
  if (card.type === 'reverse_draw2' && (activeCard.type === 'reverse' || activeCard.type === 'draw2')) return true;
  if ((card.type === 'reverse' || card.type === 'draw2') && activeCard.type === 'reverse_draw2') return true;

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
): { card: UnoCard; chosenColor?: UnoColor; swapTargetPlayerId?: string; callUno?: boolean } | null {
  const validCards = getValidUnoMoves(player, activeCard, activeColor, drawStackCount);
  if (validCards.length === 0) return null; // Must draw

  // Count colors in hand to pick best wild color
  const colorCounts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
  (player.hand as UnoCard[]).forEach(c => {
    colorCounts[c.color]++;
  });

  const bestColor = (['red', 'blue', 'green', 'yellow'] as UnoColor[]).reduce((best, cur) =>
    colorCounts[cur] > colorCounts[best] ? cur : best, 'red');

  // Will this play leave bot with 1 card? If so, bot calls Uno!
  const willHaveOneCard = player.hand.length === 2;

  // Strategy 1: In stacking battle, play the lowest penalty counter that is >= current penalty to save higher cards
  if (drawStackCount > 0) {
    const currentPenalty = getDrawCardPenalty(activeCard.type);
    const sortedDrawCards = validCards
      .filter(c => getDrawCardPenalty(c.type) >= currentPenalty)
      .sort((a, b) => getDrawCardPenalty(a.type) - getDrawCardPenalty(b.type));

    if (sortedDrawCards.length > 0) {
      const chosen = sortedDrawCards[0];
      return {
        card: chosen,
        chosenColor: chosen.color === 'wild' ? bestColor : undefined,
        callUno: willHaveOneCard
      };
    }
  }

  // Strategy 2: Play Discard All if we have 2+ of that color
  const discardAll = validCards.find(c => c.type === 'discard_all' && colorCounts[c.color] >= 2);
  if (discardAll) {
    return {
      card: discardAll,
      callUno: (player.hand as UnoCard[]).filter(c => c.color !== discardAll.color).length === 1
    };
  }

  // Strategy 3: Play highest impact draw card when not stacking
  const drawCard = validCards.find(c => getDrawCardPenalty(c.type) > 0);
  if (drawCard) {
    return {
      card: drawCard,
      chosenColor: drawCard.color === 'wild' ? bestColor : undefined,
      callUno: willHaveOneCard
    };
  }

  // Pick randomly among valid cards for dynamic gameplay
  const cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
  return {
    card: cardToPlay,
    chosenColor: cardToPlay.color === 'wild' ? bestColor : undefined,
    callUno: willHaveOneCard
  };
}

export function execute0PassHands(players: Player[], direction: 1 | -1): void {
  const activePlayers = players.filter(p => !p.rank && !p.isMercyEliminated && !p.isSpectator);
  if (activePlayers.length < 2) return;

  const hands = activePlayers.map(p => [...p.hand]);
  const len = activePlayers.length;

  for (let i = 0; i < len; i++) {
    // If direction is 1 (clockwise), player receives hand from previous player
    const sourceIdx = (i - direction + len) % len;
    activePlayers[i].hand = hands[sourceIdx];
    activePlayers[i].cardsCount = activePlayers[i].hand.length;
    // Reset Uno call on swapped hands
    activePlayers[i].calledUno = false;
  }
}

export function execute7SwapHands(playerA: Player, playerB: Player): void {
  const tempHand = [...playerA.hand];
  playerA.hand = [...playerB.hand];
  playerB.hand = tempHand;
  playerA.cardsCount = playerA.hand.length;
  playerB.cardsCount = playerB.hand.length;
  playerA.calledUno = false;
  playerB.calledUno = false;
}

export function checkMercyRule(player: Player, discardPile: UnoCard[]): boolean {
  if (player.hand.length >= 25 && !pIsEliminated(player)) {
    player.isMercyEliminated = true;
    // Reshuffle eliminated player's hand back into discard pile
    discardPile.push(...(player.hand as UnoCard[]));
    player.hand = [];
    player.cardsCount = 0;
    player.calledUno = false;
    return true; // Knocked out!
  }
  return false;
}

function pIsEliminated(player: Player): boolean {
  return !!player.rank || !!player.isMercyEliminated;
}

export function getNextUnoTurnIndex(
  players: Player[],
  currentIdx: number,
  direction: 1 | -1,
  steps: number = 1
): number {
  if (steps === 0) return currentIdx;

  const len = players.length;
  let idx = currentIdx;

  for (let s = 0; s < steps; s++) {
    let next = (idx + direction + len) % len;
    let loops = 0;
    while (loops < len) {
      const p = players[next];
      if (!p.rank && !p.isMercyEliminated && !p.isSpectator && (p.hand.length > 0 || p.cardsCount > 0)) {
        idx = next;
        break;
      }
      next = (next + direction + len) % len;
      loops++;
    }
  }

  return idx;
}

// -------------------------------------------------------------
// DECOUPLED UNO NO MERCY REDUCER / STATE MACHINE
// -------------------------------------------------------------

export interface UnoEngineState {
  players: Player[];
  activeUnoCard: UnoCard;
  activeUnoColor: UnoColor;
  drawStackCount: number;
  currentTurnIndex: number;
  direction: 1 | -1;
  unoDeck: UnoCard[];
  discardPile: UnoCard[];
  status: 'waiting' | 'playing' | 'round_end' | 'game_over';
  winnerPlayerId?: string;
  lastAction: string;
}

export type UnoEngineAction =
  | {
      type: 'PLAY_CARD';
      playerId: string;
      cardId: string;
      chosenColor?: UnoColor;
      swapTargetPlayerId?: string;
      callUno?: boolean;
    }
  | {
      type: 'DRAW_CARD';
      playerId: string;
    }
  | {
      type: 'CALL_UNO';
      playerId: string;
    }
  | {
      type: 'CATCH_UNO';
      catcherPlayerId: string;
      targetPlayerId: string;
    };

export function unoReducer(state: UnoEngineState, action: UnoEngineAction): UnoEngineState {
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'PLAY_CARD': {
      const currentPlayer = state.players[state.currentTurnIndex];
      if (!currentPlayer || currentPlayer.id !== action.playerId) return state;

      const cardIndex = (currentPlayer.hand as UnoCard[]).findIndex(c => c.id === action.cardId);
      if (cardIndex === -1) return state;
      const card = currentPlayer.hand[cardIndex] as UnoCard;

      if (!canPlayUnoCard(card, state.activeUnoCard, state.activeUnoColor, state.drawStackCount)) {
        return state;
      }

      // Clone players and hands
      const players = state.players.map(p => ({
        ...p,
        hand: [...p.hand]
      }));
      const p = players[state.currentTurnIndex];

      p.hand.splice(cardIndex, 1);
      p.cardsCount = p.hand.length;

      const discardPile = [...state.discardPile, card];
      const activeUnoCard = card;
      const activeUnoColor: UnoColor = card.color === 'wild' ? (action.chosenColor || 'red') : card.color;

      let direction = state.direction;
      let drawStackCount = state.drawStackCount;
      let actionMsg = `${p.name} played ${card.color} ${card.type}`;

      // Handle card effects
      if (card.type === 'discard_all') {
        const matchColor = card.color;
        const matchingCards = (p.hand as UnoCard[]).filter(c => c.color === matchColor);
        p.hand = (p.hand as UnoCard[]).filter(c => c.color !== matchColor);
        p.cardsCount = p.hand.length;
        discardPile.push(...matchingCards);
        actionMsg += ` & discarded ${matchingCards.length} matching cards!`;
      } else if (card.type === 'reverse' || card.type === 'reverse_draw2' || card.type === 'wild_reverse_draw4') {
        direction = (direction * -1) as 1 | -1;
        actionMsg += ` ⇄ (Reversed direction)`;
      } else if (card.type === 'skip_everyone') {
        actionMsg += ` 🚫 SKIPPED EVERYONE!`;
      } else if (card.type === 'pass_0') {
        execute0PassHands(players, direction);
        actionMsg += ` 🔄 ALL HANDS PASSED!`;
      } else if (card.type === 'swap_7') {
        const target = players.find(pl => pl.id === action.swapTargetPlayerId) ||
          players.find(pl => pl.id !== p.id && !pl.rank && !pl.isMercyEliminated && !pl.isSpectator);
        if (target) {
          execute7SwapHands(p, target);
          actionMsg += ` 🔁 SWAPPED HANDS with ${target.name}!`;
        }
      }

      // Stacking accumulation
      const penalty = getDrawCardPenalty(card.type);
      if (penalty > 0) {
        drawStackCount += penalty;
        actionMsg += ` 🔥 Penalty stack: +${drawStackCount}!`;
      }

      // Uno Call State
      if (p.hand.length === 1) {
        p.calledUno = !!action.callUno;
        if (p.calledUno) {
          actionMsg += ` 📢 Called UNO!`;
        }
      } else {
        p.calledUno = false;
      }

      // Win Condition: Hand emptied!
      if (p.hand.length === 0) {
        p.rank = 1;
        return {
          ...state,
          players,
          activeUnoCard,
          activeUnoColor,
          drawStackCount,
          direction,
          discardPile,
          status: 'game_over',
          winnerPlayerId: p.id,
          lastAction: `🏆 ${p.name} PLAYED THEIR LAST CARD AND WON!`
        };
      }

      // Determine next turn
      let nextTurnIndex = state.currentTurnIndex;
      if (card.type === 'skip_everyone') {
        // Keeps the turn!
        nextTurnIndex = state.currentTurnIndex;
      } else if (card.type === 'skip') {
        nextTurnIndex = getNextUnoTurnIndex(players, state.currentTurnIndex, direction, 2);
      } else {
        nextTurnIndex = getNextUnoTurnIndex(players, state.currentTurnIndex, direction, 1);
      }

      return {
        ...state,
        players,
        activeUnoCard,
        activeUnoColor,
        drawStackCount,
        direction,
        discardPile,
        currentTurnIndex: nextTurnIndex,
        lastAction: actionMsg
      };
    }

    case 'DRAW_CARD': {
      const currentPlayer = state.players[state.currentTurnIndex];
      if (!currentPlayer || currentPlayer.id !== action.playerId) return state;

      const players = state.players.map(p => ({
        ...p,
        hand: [...p.hand]
      }));
      const p = players[state.currentTurnIndex];

      let deck = [...state.unoDeck];
      let discardPile = [...state.discardPile];

      const countToDraw = state.drawStackCount > 0 ? state.drawStackCount : 1;
      const drawStackCount = 0; // Stack consumed!

      for (let i = 0; i < countToDraw; i++) {
        if (deck.length === 0) {
          if (discardPile.length > 1) {
            const top = discardPile.pop()!;
            deck = shuffle(discardPile);
            discardPile = [top];
          }
        }
        if (deck.length > 0) {
          p.hand.push(deck.pop()!);
        }
      }

      p.cardsCount = p.hand.length;
      p.calledUno = false;

      let actionMsg = `${p.name} drew ${countToDraw} card(s).`;

      // Check Mercy Rule (25+ cards)
      const isEliminated = checkMercyRule(p, discardPile);
      if (isEliminated) {
        actionMsg += ` ☠️ MERCY RULE! ${p.name} exceeded 25 cards and is ELIMINATED!`;
      }

      // Check if only 1 active survivor remains
      const activeSurvivors = players.filter(pl => !pl.rank && !pl.isMercyEliminated && !pl.isSpectator);
      if (activeSurvivors.length <= 1) {
        if (activeSurvivors.length === 1) {
          activeSurvivors[0].rank = 1;
        }
        return {
          ...state,
          players,
          unoDeck: deck,
          discardPile,
          drawStackCount,
          status: 'game_over',
          winnerPlayerId: activeSurvivors[0]?.id,
          lastAction: activeSurvivors.length === 1
            ? `🏆 ${activeSurvivors[0].name} SURVIVED AND WINS!`
            : '🛑 Game over: No survivors.'
        };
      }

      const nextTurnIndex = getNextUnoTurnIndex(players, state.currentTurnIndex, state.direction, 1);

      return {
        ...state,
        players,
        unoDeck: deck,
        discardPile,
        drawStackCount,
        currentTurnIndex: nextTurnIndex,
        lastAction: actionMsg
      };
    }

    case 'CALL_UNO': {
      const players = state.players.map(p => {
        if (p.id === action.playerId && p.hand.length === 1) {
          return { ...p, calledUno: true };
        }
        return p;
      });
      const p = players.find(pl => pl.id === action.playerId);
      return {
        ...state,
        players,
        lastAction: p ? `📢 ${p.name} called UNO!` : state.lastAction
      };
    }

    case 'CATCH_UNO': {
      const target = state.players.find(p => p.id === action.targetPlayerId);
      const catcher = state.players.find(p => p.id === action.catcherPlayerId);
      if (!target || target.hand.length !== 1 || target.calledUno) {
        return state; // Target is either not at 1 card, or already called Uno!
      }

      // Target was caught without calling Uno! Penalty is drawing 2 cards
      const players = state.players.map(p => ({
        ...p,
        hand: [...p.hand]
      }));
      const victim = players.find(p => p.id === action.targetPlayerId)!;

      let deck = [...state.unoDeck];
      let discardPile = [...state.discardPile];

      for (let i = 0; i < 2; i++) {
        if (deck.length === 0 && discardPile.length > 1) {
          const top = discardPile.pop()!;
          deck = shuffle(discardPile);
          discardPile = [top];
        }
        if (deck.length > 0) {
          victim.hand.push(deck.pop()!);
        }
      }

      victim.cardsCount = victim.hand.length;
      victim.calledUno = false;

      let actionMsg = `🚨 ${catcher?.name || 'Someone'} CAUGHT ${victim.name} NOT SAYING UNO! (+2 cards penalty)`;

      // Check Mercy Rule
      if (checkMercyRule(victim, discardPile)) {
        actionMsg += ` ☠️ MERCY RULE! ${victim.name} exceeded 25 cards and is ELIMINATED!`;
      }

      return {
        ...state,
        players,
        unoDeck: deck,
        discardPile,
        lastAction: actionMsg
      };
    }

    default:
      return state;
  }
}
