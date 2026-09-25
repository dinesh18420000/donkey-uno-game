import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  canPlayUnoCard,
  getDrawCardPenalty,
  unoReducer,
  UnoEngineState,
  createUnoNoMercyDeck
} from '../src/unoEngine.js';
import { Player, UnoCard } from '../src/types.js';

function createMockPlayer(id: string, name: string, hand: UnoCard[] = []): Player {
  return {
    id,
    name,
    avatar: 'avatar_1',
    socketId: `socket_${id}`,
    isHost: id === 'p1',
    isBot: false,
    isDisconnected: false,
    cardsCount: hand.length,
    hand,
    calledUno: false
  };
}

describe('Uno No Mercy Game Engine & Reducer Tests', () => {

  describe('Stacking Rules & Countering', () => {
    it('calculates correct penalty amounts for all draw cards', () => {
      assert.strictEqual(getDrawCardPenalty('draw2'), 2);
      assert.strictEqual(getDrawCardPenalty('reverse_draw2'), 2);
      assert.strictEqual(getDrawCardPenalty('draw4'), 4);
      assert.strictEqual(getDrawCardPenalty('wild_reverse_draw4'), 4);
      assert.strictEqual(getDrawCardPenalty('wild_draw6'), 6);
      assert.strictEqual(getDrawCardPenalty('wild_draw10'), 10);
      assert.strictEqual(getDrawCardPenalty('number'), 0);
      assert.strictEqual(getDrawCardPenalty('skip'), 0);
    });

    it('enforces mandatory equal-or-higher stacking: +2 can be countered by +2, +4, +6, +10', () => {
      const activeD2: UnoCard = { id: 'c1', color: 'red', type: 'draw2' };
      const counterD2: UnoCard = { id: 'c2', color: 'blue', type: 'draw2' };
      const counterD4: UnoCard = { id: 'c3', color: 'yellow', type: 'draw4' };
      const counterWD6: UnoCard = { id: 'c4', color: 'wild', type: 'wild_draw6' };
      const counterWD10: UnoCard = { id: 'c5', color: 'wild', type: 'wild_draw10' };
      const normalCard: UnoCard = { id: 'c6', color: 'red', type: 'number', value: 5 };

      assert.strictEqual(canPlayUnoCard(counterD2, activeD2, 'red', 2), true);
      assert.strictEqual(canPlayUnoCard(counterD4, activeD2, 'red', 2), true);
      assert.strictEqual(canPlayUnoCard(counterWD6, activeD2, 'red', 2), true);
      assert.strictEqual(canPlayUnoCard(counterWD10, activeD2, 'red', 2), true);
      assert.strictEqual(canPlayUnoCard(normalCard, activeD2, 'red', 2), false);
    });

    it('rejects lower draw cards when higher draw card is active (e.g. +2 cannot counter +4)', () => {
      const activeD4: UnoCard = { id: 'c1', color: 'red', type: 'draw4' };
      const weakCounterD2: UnoCard = { id: 'c2', color: 'red', type: 'draw2' };
      const validCounterD4: UnoCard = { id: 'c3', color: 'blue', type: 'draw4' };

      assert.strictEqual(canPlayUnoCard(weakCounterD2, activeD4, 'red', 4), false);
      assert.strictEqual(canPlayUnoCard(validCounterD4, activeD4, 'red', 4), true);
    });

    it('chains full stacking sequence: +2 -> +4 -> +6 -> +10 totaling +22 penalty', () => {
      const p1Hand: UnoCard[] = [{ id: 'p1_d2', color: 'red', type: 'draw2' }, { id: 'p1_num', color: 'blue', type: 'number', value: 3 }];
      const p2Hand: UnoCard[] = [{ id: 'p2_d4', color: 'blue', type: 'draw4' }, { id: 'p2_num', color: 'green', type: 'number', value: 5 }];
      const p3Hand: UnoCard[] = [{ id: 'p3_wd6', color: 'wild', type: 'wild_draw6' }, { id: 'p3_num', color: 'yellow', type: 'number', value: 8 }];
      const p4Hand: UnoCard[] = [{ id: 'p4_wd10', color: 'wild', type: 'wild_draw10' }, { id: 'p4_num', color: 'red', type: 'number', value: 1 }];

      const p1 = createMockPlayer('p1', 'Alice', p1Hand);
      const p2 = createMockPlayer('p2', 'Bob', p2Hand);
      const p3 = createMockPlayer('p3', 'Charlie', p3Hand);
      const p4 = createMockPlayer('p4', 'Dave', p4Hand);

      const starterCard: UnoCard = { id: 'starter', color: 'red', type: 'number', value: 7 };

      let state: UnoEngineState = {
        players: [p1, p2, p3, p4],
        activeUnoCard: starterCard,
        activeUnoColor: 'red',
        drawStackCount: 0,
        currentTurnIndex: 0,
        direction: 1,
        unoDeck: createUnoNoMercyDeck(),
        discardPile: [starterCard],
        status: 'playing',
        lastAction: 'Game started'
      };

      // 1. P1 plays Draw 2
      state = unoReducer(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'p1_d2' });
      assert.strictEqual(state.drawStackCount, 2);
      assert.strictEqual(state.currentTurnIndex, 1); // P2's turn

      // 2. P2 counters with Draw 4
      state = unoReducer(state, { type: 'PLAY_CARD', playerId: 'p2', cardId: 'p2_d4' });
      assert.strictEqual(state.drawStackCount, 6); // 2 + 4
      assert.strictEqual(state.currentTurnIndex, 2); // P3's turn

      // 3. P3 counters with Wild Draw 6
      state = unoReducer(state, { type: 'PLAY_CARD', playerId: 'p3', cardId: 'p3_wd6', chosenColor: 'yellow' });
      assert.strictEqual(state.drawStackCount, 12); // 6 + 6
      assert.strictEqual(state.activeUnoColor, 'yellow');
      assert.strictEqual(state.currentTurnIndex, 3); // P4's turn

      // 4. P4 counters with Wild Draw 10
      state = unoReducer(state, { type: 'PLAY_CARD', playerId: 'p4', cardId: 'p4_wd10', chosenColor: 'blue' });
      assert.strictEqual(state.drawStackCount, 22); // 12 + 10 = 22!
      assert.strictEqual(state.currentTurnIndex, 0); // Loops back to P1!

      // 5. P1 cannot counter and draws 22 cards
      const p1CardCountBefore = state.players[0].hand.length;
      state = unoReducer(state, { type: 'DRAW_CARD', playerId: 'p1' });

      assert.strictEqual(state.drawStackCount, 0); // Stack cleared!
      // Check P1 received the 22 cards (or mercy eliminated if 25+)
      assert.strictEqual(state.players[0].hand.length, p1CardCountBefore + 22);
      assert.strictEqual(state.currentTurnIndex, 1); // Turn advanced to P2
    });
  });

  describe('Direction Reversal and Skip Interactions', () => {
    it('wild_reverse_draw4 reverses direction AND adds +4 to stack', () => {
      const p1 = createMockPlayer('p1', 'Alice', [
        { id: 'p1_c', color: 'wild', type: 'wild_reverse_draw4' },
        { id: 'p1_extra', color: 'red', type: 'number', value: 5 }
      ]);
      const p2 = createMockPlayer('p2', 'Bob', [{ id: 'p2_c', color: 'blue', type: 'number', value: 2 }]);
      const p3 = createMockPlayer('p3', 'Charlie', [{ id: 'p3_c', color: 'green', type: 'number', value: 3 }]);

      const starterCard: UnoCard = { id: 'starter', color: 'red', type: 'number', value: 1 };
      let state: UnoEngineState = {
        players: [p1, p2, p3],
        activeUnoCard: starterCard,
        activeUnoColor: 'red',
        drawStackCount: 0,
        currentTurnIndex: 0,
        direction: 1, // Clockwise
        unoDeck: createUnoNoMercyDeck(),
        discardPile: [starterCard],
        status: 'playing',
        lastAction: 'Game started'
      };

      state = unoReducer(state, {
        type: 'PLAY_CARD',
        playerId: 'p1',
        cardId: 'p1_c',
        chosenColor: 'green'
      });

      assert.strictEqual(state.direction, -1); // Reversed to counter-clockwise!
      assert.strictEqual(state.drawStackCount, 4);
      // In CCW from index 0 among 3 players: next is index 2 (Charlie / P3)!
      assert.strictEqual(state.currentTurnIndex, 2);
    });

    it('skip_everyone card keeps the turn on the same player', () => {
      const p1 = createMockPlayer('p1', 'Alice', [
        { id: 'p1_skip_all', color: 'red', type: 'skip_everyone' },
        { id: 'p1_num', color: 'red', type: 'number', value: 9 }
      ]);
      const p2 = createMockPlayer('p2', 'Bob', [{ id: 'p2_c', color: 'red', type: 'number', value: 2 }]);
      const p3 = createMockPlayer('p3', 'Charlie', [{ id: 'p3_c', color: 'red', type: 'number', value: 3 }]);

      const starterCard: UnoCard = { id: 'starter', color: 'red', type: 'number', value: 5 };
      let state: UnoEngineState = {
        players: [p1, p2, p3],
        activeUnoCard: starterCard,
        activeUnoColor: 'red',
        drawStackCount: 0,
        currentTurnIndex: 0,
        direction: 1,
        unoDeck: createUnoNoMercyDeck(),
        discardPile: [starterCard],
        status: 'playing',
        lastAction: 'Game started'
      };

      state = unoReducer(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'p1_skip_all' });
      assert.strictEqual(state.currentTurnIndex, 0); // Still P1's turn!
    });
  });

  describe('Mercy Rule (25+ Cards Elimination)', () => {
    it('eliminates player who accumulates 25 or more cards', () => {
      // P1 already has 20 cards
      const dummyCards: UnoCard[] = Array.from({ length: 20 }, (_, i) => ({
        id: `p1_card_${i}`,
        color: 'red',
        type: 'number',
        value: 1
      }));
      const p1 = createMockPlayer('p1', 'Alice', dummyCards);
      const p2 = createMockPlayer('p2', 'Bob', [{ id: 'p2_c', color: 'blue', type: 'number', value: 2 }]);

      const starterCard: UnoCard = { id: 'starter', color: 'red', type: 'draw6' as any };
      let state: UnoEngineState = {
        players: [p1, p2],
        activeUnoCard: starterCard,
        activeUnoColor: 'red',
        drawStackCount: 6, // 20 + 6 = 26 cards!
        currentTurnIndex: 0,
        direction: 1,
        unoDeck: createUnoNoMercyDeck(),
        discardPile: [starterCard],
        status: 'playing',
        lastAction: 'Stacking'
      };

      state = unoReducer(state, { type: 'DRAW_CARD', playerId: 'p1' });

      assert.strictEqual(state.players[0].isMercyEliminated, true);
      assert.strictEqual(state.players[0].hand.length, 0); // Hand discarded
      assert.strictEqual(state.status, 'game_over'); // Only P2 survived!
      assert.strictEqual(state.winnerPlayerId, 'p2');
    });
  });

  describe('Uno Call & Catch Mechanics', () => {
    it('marks player as calledUno if callUno flag is sent when dropping to 1 card', () => {
      const p1 = createMockPlayer('p1', 'Alice', [
        { id: 'p1_c1', color: 'blue', type: 'number', value: 4 },
        { id: 'p1_c2', color: 'blue', type: 'number', value: 8 }
      ]);
      const p2 = createMockPlayer('p2', 'Bob', [{ id: 'p2_c', color: 'blue', type: 'number', value: 2 }]);

      const starterCard: UnoCard = { id: 'starter', color: 'blue', type: 'number', value: 1 };
      let state: UnoEngineState = {
        players: [p1, p2],
        activeUnoCard: starterCard,
        activeUnoColor: 'blue',
        drawStackCount: 0,
        currentTurnIndex: 0,
        direction: 1,
        unoDeck: createUnoNoMercyDeck(),
        discardPile: [starterCard],
        status: 'playing',
        lastAction: 'Playing'
      };

      state = unoReducer(state, {
        type: 'PLAY_CARD',
        playerId: 'p1',
        cardId: 'p1_c1',
        callUno: true
      });

      assert.strictEqual(state.players[0].hand.length, 1);
      assert.strictEqual(state.players[0].calledUno, true);
    });

    it('penalizes player with +2 cards if opponent catches them without calling Uno', () => {
      const p1 = createMockPlayer('p1', 'Alice', [
        { id: 'p1_c1', color: 'blue', type: 'number', value: 4 },
        { id: 'p1_c2', color: 'blue', type: 'number', value: 8 }
      ]);
      const p2 = createMockPlayer('p2', 'Bob', [{ id: 'p2_c', color: 'blue', type: 'number', value: 2 }]);

      const starterCard: UnoCard = { id: 'starter', color: 'blue', type: 'number', value: 1 };
      let state: UnoEngineState = {
        players: [p1, p2],
        activeUnoCard: starterCard,
        activeUnoColor: 'blue',
        drawStackCount: 0,
        currentTurnIndex: 0,
        direction: 1,
        unoDeck: createUnoNoMercyDeck(),
        discardPile: [starterCard],
        status: 'playing',
        lastAction: 'Playing'
      };

      // P1 plays without calling Uno
      state = unoReducer(state, {
        type: 'PLAY_CARD',
        playerId: 'p1',
        cardId: 'p1_c1',
        callUno: false
      });

      assert.strictEqual(state.players[0].hand.length, 1);
      assert.strictEqual(state.players[0].calledUno, false);

      // P2 catches P1!
      state = unoReducer(state, {
        type: 'CATCH_UNO',
        catcherPlayerId: 'p2',
        targetPlayerId: 'p1'
      });

      // P1 should now have 1 + 2 = 3 cards!
      assert.strictEqual(state.players[0].hand.length, 3);
      assert.strictEqual(state.players[0].calledUno, false);
      assert.match(state.lastAction, /CAUGHT Alice NOT SAYING UNO/);
    });
  });

  describe('Win Condition', () => {
    it('declares winner immediately when a player plays their last card', () => {
      const p1 = createMockPlayer('p1', 'Alice', [{ id: 'last_card', color: 'yellow', type: 'number', value: 9 }]);
      const p2 = createMockPlayer('p2', 'Bob', [{ id: 'p2_c', color: 'yellow', type: 'number', value: 2 }]);

      const starterCard: UnoCard = { id: 'starter', color: 'yellow', type: 'number', value: 3 };
      let state: UnoEngineState = {
        players: [p1, p2],
        activeUnoCard: starterCard,
        activeUnoColor: 'yellow',
        drawStackCount: 0,
        currentTurnIndex: 0,
        direction: 1,
        unoDeck: createUnoNoMercyDeck(),
        discardPile: [starterCard],
        status: 'playing',
        lastAction: 'Playing'
      };

      state = unoReducer(state, {
        type: 'PLAY_CARD',
        playerId: 'p1',
        cardId: 'last_card'
      });

      assert.strictEqual(state.status, 'game_over');
      assert.strictEqual(state.winnerPlayerId, 'p1');
      assert.strictEqual(state.players[0].rank, 1);
      assert.match(state.lastAction, /PLAYED THEIR LAST CARD AND WON/);
    });
  });
});
