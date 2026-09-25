import type { UnoCard, UnoColor, UnoCardType } from '../types';

export interface LogicPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  isDisconnected: boolean;
  cardsCount: number;
  hand: UnoCard[];
  rank?: number;
  isMercyEliminated?: boolean;
  isSpectator?: boolean;
  calledUno?: boolean;
}

export interface UnoEngineState {
  players: LogicPlayer[];
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
  if (drawStackCount > 0) {
    const currentPenalty = getDrawCardPenalty(activeCard.type);
    const cardPenalty = getDrawCardPenalty(card.type);
    return cardPenalty > 0 && cardPenalty >= currentPenalty;
  }

  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.type === 'number' && activeCard.type === 'number' && card.value === activeCard.value) return true;
  if (card.type !== 'number' && card.type === activeCard.type) return true;

  if (card.type === 'reverse_draw2' && (activeCard.type === 'reverse' || activeCard.type === 'draw2')) return true;
  if ((card.type === 'reverse' || card.type === 'draw2') && activeCard.type === 'reverse_draw2') return true;

  return false;
}

export function getNextUnoTurnIndex(
  players: LogicPlayer[],
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

export function unoReducer(state: UnoEngineState, action: UnoEngineAction): UnoEngineState {
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'PLAY_CARD': {
      const currentPlayer = state.players[state.currentTurnIndex];
      if (!currentPlayer || currentPlayer.id !== action.playerId) return state;

      const cardIndex = currentPlayer.hand.findIndex(c => c.id === action.cardId);
      if (cardIndex === -1) return state;
      const card = currentPlayer.hand[cardIndex];

      if (!canPlayUnoCard(card, state.activeUnoCard, state.activeUnoColor, state.drawStackCount)) {
        return state;
      }

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

      if (card.type === 'discard_all') {
        const matchColor = card.color;
        const matchingCards = p.hand.filter(c => c.color === matchColor);
        p.hand = p.hand.filter(c => c.color !== matchColor);
        p.cardsCount = p.hand.length;
        discardPile.push(...matchingCards);
        actionMsg += ` & discarded ${matchingCards.length} matching cards!`;
      } else if (card.type === 'reverse' || card.type === 'reverse_draw2' || card.type === 'wild_reverse_draw4') {
        direction = (direction * -1) as 1 | -1;
        actionMsg += ` ⇄ (Reversed direction)`;
      } else if (card.type === 'skip_everyone') {
        actionMsg += ` 🚫 SKIPPED EVERYONE!`;
      }

      const penalty = getDrawCardPenalty(card.type);
      if (penalty > 0) {
        drawStackCount += penalty;
        actionMsg += ` 🔥 Penalty stack: +${drawStackCount}!`;
      }

      if (p.hand.length === 1) {
        p.calledUno = !!action.callUno;
        if (p.calledUno) {
          actionMsg += ` 📢 Called UNO!`;
        }
      } else {
        p.calledUno = false;
      }

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

      let nextTurnIndex = state.currentTurnIndex;
      if (card.type === 'skip_everyone') {
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

      const deck = [...state.unoDeck];
      const discardPile = [...state.discardPile];

      const countToDraw = state.drawStackCount > 0 ? state.drawStackCount : 1;
      const drawStackCount = 0;

      for (let i = 0; i < countToDraw; i++) {
        if (deck.length > 0) {
          p.hand.push(deck.pop()!);
        }
      }

      p.cardsCount = p.hand.length;
      p.calledUno = false;

      let actionMsg = `${p.name} drew ${countToDraw} card(s).`;

      if (p.hand.length >= 25 && !p.rank && !p.isMercyEliminated) {
        p.isMercyEliminated = true;
        discardPile.push(...p.hand);
        p.hand = [];
        p.cardsCount = 0;
        actionMsg += ` ☠️ MERCY RULE! ${p.name} exceeded 25 cards and is ELIMINATED!`;
      }

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
        return state;
      }

      const players = state.players.map(p => ({
        ...p,
        hand: [...p.hand]
      }));
      const victim = players.find(p => p.id === action.targetPlayerId)!;
      const deck = [...state.unoDeck];
      const discardPile = [...state.discardPile];

      for (let i = 0; i < 2; i++) {
        if (deck.length > 0) {
          victim.hand.push(deck.pop()!);
        }
      }

      victim.cardsCount = victim.hand.length;
      victim.calledUno = false;

      let actionMsg = `🚨 ${catcher?.name || 'Player'} CAUGHT ${victim.name} NOT SAYING UNO! (+2 cards penalty)`;

      if (victim.hand.length >= 25) {
        victim.isMercyEliminated = true;
        discardPile.push(...victim.hand);
        victim.hand = [];
        victim.cardsCount = 0;
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
