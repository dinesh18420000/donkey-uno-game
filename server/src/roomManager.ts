import { Server } from 'socket.io';
import {
  GameRoom,
  Player,
  GameType,
  ClientGameState,
  DonkeyCard,
  UnoCard,
  UnoColor
} from './types.js';
import {
  dealDonkeyCards,
  resolveDonkeyPlay,
  chooseDonkeyBotCard,
  getNextActivePlayerIndex,
  getValidDonkeyMoves
} from './donkeyEngine.js';
import {
  createUnoNoMercyDeck,
  dealUnoCards,
  canPlayUnoCard,
  chooseUnoBotCard,
  getDrawCardPenalty,
  execute0PassHands,
  execute7SwapHands,
  checkMercyRule,
  getNextUnoTurnIndex
} from './unoEngine.js';

const HUMAN_TURN_TIME_MS = 30000; // 30 seconds max play time
const BOT_TURN_TIME_MS = 750;      // 0.75s for smooth, fast, responsive bot turns

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private socketToPlayerMap: Map<string, { roomCode: string; playerId: string }> = new Map();
  private turnTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private io: Server) {}

  public createRoom(
    hostPlayerId: string,
    hostName: string,
    avatar: string,
    gameType: GameType,
    maxPlayers: number,
    socketId: string
  ): GameRoom {
    const code = this.generateRoomCode();
    const host: Player = {
      id: hostPlayerId,
      name: hostName || 'Host',
      avatar: avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Thala',
      socketId,
      isHost: true,
      isBot: false,
      isDisconnected: false,
      cardsCount: 0,
      hand: []
    };

    const room: GameRoom = {
      code,
      gameType,
      hostId: hostPlayerId,
      status: 'waiting',
      maxPlayers: Math.min(Math.max(maxPlayers || 4, 2), 10),
      players: [host],
      currentTurnIndex: 0,
      direction: 1,
      roundNumber: 1,
      lastAction: `Room created by ${host.name}`,
      turnExpiresAt: 0,
      turnDuration: 30,
      currentTrick: [],
      drawStackCount: 0,
      deckRemainingCount: 0,
      discardPile: [],
      unoDeck: []
    };

    this.rooms.set(code, room);
    this.socketToPlayerMap.set(socketId, { roomCode: code, playerId: hostPlayerId });
    return room;
  }

  public joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string,
    avatar: string,
    socketId: string
  ): { success: boolean; error?: string; room?: GameRoom } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: 'Room not found! Check the room code.' };
    }

    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      existingPlayer.socketId = socketId;
      existingPlayer.isDisconnected = false;
      existingPlayer.isBot = false;
      existingPlayer.name = playerName || existingPlayer.name.replace(' (Bot)', '');
      existingPlayer.avatar = avatar || existingPlayer.avatar;
      this.socketToPlayerMap.set(socketId, { roomCode: code, playerId });
      this.broadcastState(room);
      return { success: true, room };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Game has already started in this room!' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: `Room is full (Maximum ${room.maxPlayers} players).` };
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName || `Player ${room.players.length + 1}`,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=P${room.players.length + 1}`,
      socketId,
      isHost: false,
      isBot: false,
      isDisconnected: false,
      cardsCount: 0,
      hand: []
    };

    room.players.push(newPlayer);
    this.socketToPlayerMap.set(socketId, { roomCode: code, playerId });
    room.lastAction = `${newPlayer.name} joined the room`;

    this.broadcastState(room);
    return { success: true, room };
  }

  public addBot(roomCode: string, hostPlayerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId || room.status !== 'waiting') return false;
    if (room.players.length >= room.maxPlayers) return false;

    const botNumber = room.players.filter(p => p.isBot).length + 1;
    const botNames = ['Smart Bot', 'Robo Ace', 'Cyber King', 'Pixel Donkey', 'Turbo AI', 'Alpha Play'];
    const botName = botNames[botNumber - 1] || `Bot ${botNumber}`;

    const bot: Player = {
      id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: botName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${botName}`,
      socketId: null,
      isHost: false,
      isBot: true,
      isDisconnected: false,
      cardsCount: 0,
      hand: []
    };

    room.players.push(bot);
    room.lastAction = `${botName} was added to the room`;
    this.broadcastState(room);
    return true;
  }

  public removePlayer(roomCode: string, playerId: string, hostPlayerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId || room.status !== 'waiting') return false;

    const idx = room.players.findIndex(p => p.id === playerId);
    if (idx === -1 || room.players[idx].isHost) return false;

    const [removed] = room.players.splice(idx, 1);
    room.lastAction = `${removed.name} was removed`;
    this.broadcastState(room);
    return true;
  }

  public startGame(roomCode: string, hostPlayerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId || room.status !== 'waiting') return false;
    if (room.players.length < 2) return false;

    room.status = 'playing';
    room.roundNumber = 1;
    room.currentTrick = [];

    if (room.gameType === 'donkey') {
      const { startingPlayerIndex } = dealDonkeyCards(room.players);
      room.currentTurnIndex = startingPlayerIndex;
      room.leadSuit = undefined;
      const starter = room.players[startingPlayerIndex];
      room.lastAction = `Game started! ${starter.name} holds Ace of Spades (♠ A) and leads!`;
    } else {
      const deck = createUnoNoMercyDeck();
      const { activeCard, remainingDeck } = dealUnoCards(room.players, deck);
      room.unoDeck = remainingDeck;
      room.discardPile = [activeCard];
      room.activeUnoCard = activeCard;
      room.activeUnoColor = activeCard.color === 'wild' ? 'red' : activeCard.color;
      room.deckRemainingCount = remainingDeck.length;
      room.drawStackCount = 0;
      room.currentTurnIndex = 0;
      room.lastAction = `UNO Show 'Em No Mercy started! First card: ${activeCard.color} ${activeCard.type}`;
    }

    this.startTurnTimer(room);
    this.broadcastState(room);
    return true;
  }

  public replayGame(roomCode: string, hostPlayerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId) return false;
    if (room.players.length < 2) return false;

    room.status = 'playing';
    room.roundNumber = 1;
    room.currentTrick = [];
    room.drawStackCount = 0;

    // Reset player ranks & statuses
    room.players.forEach(p => {
      p.rank = undefined;
      p.isDonkey = false;
      p.isMercyEliminated = false;
      p.isSpectator = false;
      p.cardsCount = 0;
      p.hand = [];
    });

    if (room.gameType === 'donkey') {
      const { startingPlayerIndex } = dealDonkeyCards(room.players);
      room.currentTurnIndex = startingPlayerIndex;
      room.leadSuit = undefined;
      const starter = room.players[startingPlayerIndex];
      room.lastAction = `🔄 New Game Replayed! ${starter.name} holds Ace of Spades (♠ A) and leads!`;
    } else {
      const deck = createUnoNoMercyDeck();
      const { activeCard, remainingDeck } = dealUnoCards(room.players, deck);
      room.unoDeck = remainingDeck;
      room.discardPile = [activeCard];
      room.activeUnoCard = activeCard;
      room.activeUnoColor = activeCard.color === 'wild' ? 'red' : activeCard.color;
      room.deckRemainingCount = remainingDeck.length;
      room.currentTurnIndex = 0;
      room.lastAction = `🔄 New Game Replayed! First card: ${activeCard.color} ${activeCard.type}`;
    }

    this.startTurnTimer(room);
    this.broadcastState(room);
    return true;
  }

  // Return everyone in room back to the Lobby
  public returnToLobby(roomCode: string, hostPlayerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId) return false;

    // Cancel active turn timers
    if (this.turnTimers.has(room.code)) {
      clearTimeout(this.turnTimers.get(room.code)!);
      this.turnTimers.delete(room.code);
    }

    room.status = 'waiting';
    room.roundNumber = 1;
    room.currentTrick = [];
    room.drawStackCount = 0;
    room.activeUnoCard = undefined;
    room.activeUnoColor = undefined;
    room.leadSuit = undefined;
    room.turnExpiresAt = 0;
    room.lastAction = '🏠 Host returned everyone back to the room lobby!';

    // Reset player ranks, hands, and game flags
    room.players.forEach(p => {
      p.rank = undefined;
      p.isDonkey = false;
      p.isMercyEliminated = false;
      p.cardsCount = 0;
      p.hand = [];
    });

    console.log(`[Room ${room.code}] Returned to lobby by host ${hostPlayerId}`);
    this.broadcastState(room);
    return true;
  }

  // Transfer host rights from current host to another human player
  public transferHost(roomCode: string, currentHostPlayerId: string, newHostPlayerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== currentHostPlayerId) return false;

    // Target must exist, be in the room, and not be a bot
    const targetPlayer = room.players.find(p => p.id === newHostPlayerId && !p.isBot);
    if (!targetPlayer) return false;

    const oldHost = room.players.find(p => p.id === currentHostPlayerId);
    room.hostId = newHostPlayerId;

    room.players.forEach(p => {
      p.isHost = p.id === newHostPlayerId;
    });

    room.lastAction = `👑 ${oldHost ? oldHost.name : 'Host'} transferred Room Host rights to ${targetPlayer.name}!`;
    console.log(`[Room ${room.code}] Host transferred from ${currentHostPlayerId} to ${newHostPlayerId}`);

    this.broadcastState(room);
    return true;
  }

  public joinFamilyRoom(
    playerId: string,
    playerName: string,
    avatar: string,
    socketId: string,
    gameType: GameType = 'donkey'
  ): { success: boolean; roomCode: string; error?: string } {
    const familyCode = 'FAMILY';
    let room = this.rooms.get(familyCode);

    // 1. If room doesn't exist, create it cleanly
    if (!room) {
      room = this.createRoom(playerId, playerName, avatar, gameType, 10, socketId);
      this.rooms.delete(room.code);
      room.code = familyCode;
      this.rooms.set(familyCode, room);
      this.socketToPlayerMap.set(socketId, { roomCode: familyCode, playerId });
      this.broadcastState(room);
      return { success: true, roomCode: familyCode };
    }

    // 2. If room was in game_over or has no active connected humans, reset for fresh play
    const activeHumans = room.players.filter(p => !p.isBot && !p.isDisconnected && p.socketId);
    if (room.status === 'game_over' || activeHumans.length === 0) {
      if (this.turnTimers.has(familyCode)) {
        clearTimeout(this.turnTimers.get(familyCode)!);
        this.turnTimers.delete(familyCode);
      }
      room.status = 'waiting';
      room.roundNumber = 1;
      room.currentTrick = [];
      room.drawStackCount = 0;
      room.leadSuit = undefined;
      room.gameType = gameType;
      // Remove all bots from old game
      room.players = room.players.filter(p => !p.isBot);
      // Reset remaining human players
      room.players.forEach(p => {
        p.rank = undefined;
        p.isDonkey = false;
        p.isMercyEliminated = false;
        p.cardsCount = 0;
        p.hand = [];
      });
      // Make this incoming player host if previous host is gone
      room.hostId = playerId;
      room.players.forEach(p => { p.isHost = (p.id === room.hostId); });
    }

    // Ensure room has an active host
    if (!room.players.some(p => p.id === room.hostId && !p.isDisconnected)) {
      room.hostId = playerId;
    }

    // 3. Check if player already exists in room (reconnection)
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      existingPlayer.socketId = socketId;
      existingPlayer.isDisconnected = false;
      existingPlayer.isBot = false;
      existingPlayer.name = playerName || existingPlayer.name.replace(' (Bot)', '');
      existingPlayer.avatar = avatar || existingPlayer.avatar;
      this.socketToPlayerMap.set(socketId, { roomCode: familyCode, playerId });
      room.players.forEach(p => { p.isHost = (p.id === room.hostId); });
      this.broadcastState(room);
      return { success: true, roomCode: familyCode };
    }

    // 4. If game is currently playing, allow joining as Spectator
    if (room.status === 'playing') {
      if (room.players.length >= room.maxPlayers) {
        return { success: false, roomCode: familyCode, error: 'Family table is full (10 players max).' };
      }
      const spectator: Player = {
        id: playerId,
        name: playerName || `Player ${room.players.length + 1}`,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=P${room.players.length + 1}`,
        socketId,
        isHost: false,
        isBot: false,
        isDisconnected: false,
        isSpectator: true,
        cardsCount: 0,
        hand: []
      };
      room.players.push(spectator);
      this.socketToPlayerMap.set(socketId, { roomCode: familyCode, playerId });
      room.lastAction = `${spectator.name} joined as a spectator!`;
      room.players.forEach(p => { p.isHost = (p.id === room.hostId); });
      this.broadcastState(room);
      return { success: true, roomCode: familyCode };
    }

    // 5. Room is 'waiting': Join normally
    if (room.players.length >= room.maxPlayers) {
      return { success: false, roomCode: familyCode, error: 'Family table is full (10 players max).' };
    }

    const isFirstPlayer = room.players.length === 0;
    if (isFirstPlayer) {
      room.hostId = playerId;
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName || `Player ${room.players.length + 1}`,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=P${room.players.length + 1}`,
      socketId,
      isHost: isFirstPlayer || room.hostId === playerId,
      isBot: false,
      isDisconnected: false,
      cardsCount: 0,
      hand: []
    };

    room.players.push(newPlayer);
    this.socketToPlayerMap.set(socketId, { roomCode: familyCode, playerId });
    room.lastAction = `${newPlayer.name} joined the family table!`;
    room.players.forEach(p => { p.isHost = (p.id === room.hostId); });
    this.broadcastState(room);
    return { success: true, roomCode: familyCode };
  }

  public setGameType(roomCode: string, hostPlayerId: string, gameType: GameType): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId || room.status !== 'waiting') return false;
    room.gameType = gameType;
    const gameName = gameType === 'donkey' ? 'Donkey Master 🫏' : 'UNO Show \'Em No Mercy 🔥';
    const host = room.players.find(p => p.id === hostPlayerId);
    room.lastAction = `${host ? host.name : 'Host'} selected ${gameName}`;
    this.broadcastState(room);
    return true;
  }

  public handleDisconnect(socketId: string): void {
    const mapping = this.socketToPlayerMap.get(socketId);
    if (!mapping) return;

    this.socketToPlayerMap.delete(socketId);
    const room = this.rooms.get(mapping.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === mapping.playerId);
    if (!player) return;

    player.socketId = null;
    player.isDisconnected = true;
    room.lastAction = `⚠️ ${player.name} lost connection! Bot took over.`;

    // Check if any human players (non-bot, non-disconnected, non-spectator) are still playing
    const activeHumanPlayers = room.players.filter(p => !p.isBot && !p.isDisconnected && !p.isSpectator);
    if (activeHumanPlayers.length === 0) {
      // All human players left/disconnected! Immediately stop the game and cancel turn timers
      if (this.turnTimers.has(room.code)) {
        clearTimeout(this.turnTimers.get(room.code)!);
        this.turnTimers.delete(room.code);
      }
      room.status = 'game_over';
      room.lastAction = '🛑 Game stopped: All human players have left the game.';
      console.log(`[Room ${room.code}] Game stopped: All human players have left.`);

      // Notify all users/viewers to return to lobby (no bots-only viewing)
      this.io.to(room.code).emit('gameTerminated', {
        reason: 'All players left the game. Returning to lobby...'
      });
      this.io.to(room.code).emit('returnToLobby');
      this.rooms.delete(room.code);
      return;
    }

    // If disconnected player was host, transfer host to next active human
    if (room.hostId === player.id) {
      const nextHuman = room.players.find(p => !p.isBot && !p.isDisconnected);
      if (nextHuman) {
        room.hostId = nextHuman.id;
        nextHuman.isHost = true;
      }
    }

    this.broadcastState(room);

    if (room.status === 'playing') {
      const currentActive = room.players[room.currentTurnIndex];
      if (currentActive && currentActive.id === player.id) {
        this.startTurnTimer(room, BOT_TURN_TIME_MS);
      }
    }
  }

  public leaveRoom(roomCode: string, playerId: string, socketId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    this.socketToPlayerMap.delete(socketId);

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    if (room.status === 'playing') {
      // In active game: AI bot takes over this seat so match continues uninterrupted
      player.socketId = null;
      player.isBot = true;
      if (!player.name.includes('(Bot)')) {
        player.name = `${player.name} (Bot)`;
      }
      room.lastAction = `${player.name} exited. AI bot took over.`;

      // If host exited, reassign host to another human
      if (room.hostId === playerId) {
        const nextHuman = room.players.find(p => !p.isBot && !p.isDisconnected);
        if (nextHuman) {
          room.hostId = nextHuman.id;
          nextHuman.isHost = true;
        }
      }
    } else {
      // In waiting room or game over: completely remove player
      const idx = room.players.findIndex(p => p.id === playerId);
      if (idx !== -1) {
        const [removed] = room.players.splice(idx, 1);
        room.lastAction = `${removed.name} left the room.`;
      }
      if (room.hostId === playerId && room.players.length > 0) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
      }
    }

    // Check if any active human players remain (non-bot, non-disconnected, non-spectator)
    const activeHumanPlayers = room.players.filter(p => !p.isBot && !p.isDisconnected && !p.isSpectator);
    if (activeHumanPlayers.length === 0) {
      if (this.turnTimers.has(room.code)) {
        clearTimeout(this.turnTimers.get(room.code)!);
        this.turnTimers.delete(room.code);
      }
      room.status = 'game_over';
      room.lastAction = '🛑 Game stopped: All human players have left.';
      console.log(`[Room ${room.code}] Game stopped: All humans left.`);

      // Notify all users/viewers to return to lobby (no bots-only viewing)
      this.io.to(room.code).emit('gameTerminated', {
        reason: 'All players left the game. Returning to lobby...'
      });
      this.io.to(room.code).emit('returnToLobby');
      this.rooms.delete(room.code);
      return;
    }

    // If it was the exiting player's turn, trigger bot turn
    if (room.status === 'playing') {
      const currentActive = room.players[room.currentTurnIndex];
      if (currentActive && currentActive.id === playerId) {
        this.startTurnTimer(room, BOT_TURN_TIME_MS);
      }
    }

    this.broadcastState(room);
  }

  public findActiveGameForPlayer(playerId: string): {
    roomCode: string;
    gameType: GameType;
    roundNumber: number;
    cardsCount: number;
  } | null {
    for (const room of this.rooms.values()) {
      if (room.status === 'playing') {
        const player = room.players.find(p => p.id === playerId);
        if (player) {
          return {
            roomCode: room.code,
            gameType: room.gameType,
            roundNumber: room.roundNumber,
            cardsCount: player.cardsCount
          };
        }
      }
    }
    return null;
  }

  public reconnectPlayer(
    roomCode: string,
    playerId: string,
    socketId: string
  ): { success: boolean; room?: GameRoom } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    player.socketId = socketId;
    player.isDisconnected = false;
    player.isBot = false;
    player.name = player.name.replace(' (Bot)', '');
    this.socketToPlayerMap.set(socketId, { roomCode, playerId });

    room.lastAction = `🎉 ${player.name} reconnected! Resumed control of cards from Bot.`;
    this.broadcastState(room);
    return { success: true, room };
  }

  // --- 30-SECOND TURN TIMER & AUTO-PLAY SYSTEM ---
  private startTurnTimer(room: GameRoom, customMs?: number): void {
    if (this.turnTimers.has(room.code)) {
      clearTimeout(this.turnTimers.get(room.code)!);
      this.turnTimers.delete(room.code);
    }

    if (room.status !== 'playing') return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.rank || currentPlayer.isMercyEliminated) return;

    const isBotOrDisconnected = currentPlayer.isBot || currentPlayer.isDisconnected;
    const durationMs = customMs !== undefined ? customMs : (isBotOrDisconnected ? BOT_TURN_TIME_MS : HUMAN_TURN_TIME_MS);

    room.turnDuration = Math.round(durationMs / 1000);
    room.turnExpiresAt = Date.now() + durationMs;

    const timer = setTimeout(() => {
      this.handleTurnTimeout(room.code, currentPlayer.id);
    }, durationMs);

    this.turnTimers.set(room.code, timer);
  }

  private handleTurnTimeout(roomCode: string, expectedPlayerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== expectedPlayerId) return;

    const wasHuman = !currentPlayer.isBot && !currentPlayer.isDisconnected;
    if (wasHuman) {
      room.lastAction = `⏰ 30s timer expired! Computer auto-selected a card for ${currentPlayer.name}.`;
    }

    this.executeBotTurn(roomCode, currentPlayer.id);
  }

  private executeBotTurn(roomCode: string, botPlayerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== botPlayerId) return;

    if (room.gameType === 'donkey') {
      const isFirstTrick = room.roundNumber === 1 && room.currentTrick.length === 0 && !room.leadSuit;
      const botCard = chooseDonkeyBotCard(currentPlayer, room.leadSuit, isFirstTrick);
      if (botCard) {
        this.playDonkeyCard(roomCode, botPlayerId, botCard.id);
      }
    } else {
      const move = chooseUnoBotCard(currentPlayer, room.activeUnoCard!, room.activeUnoColor!, room.drawStackCount);
      if (move) {
        this.playUnoCard(roomCode, botPlayerId, move.card.id, move.chosenColor, move.swapTargetPlayerId, move.callUno);
      } else {
        this.drawUnoCard(roomCode, botPlayerId);
      }
    }
  }

  // --- DONKEY PLAY ACTION ---
  public playDonkeyCard(roomCode: string, playerId: string, cardId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.gameType !== 'donkey') return false;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;

    const card = (currentPlayer.hand as DonkeyCard[]).find(c => c.id === cardId);
    if (!card) return false;

    const isFirstTrickOfGame = room.roundNumber === 1 && room.currentTrick.length === 0 && !room.leadSuit;
    const validMoves = getValidDonkeyMoves(currentPlayer, room.leadSuit, isFirstTrickOfGame);
    const isValid = validMoves.some(c => c.id === card.id);
    if (!isValid) return false;

    if (this.turnTimers.has(room.code)) {
      clearTimeout(this.turnTimers.get(room.code)!);
      this.turnTimers.delete(room.code);
    }

    if (!room.leadSuit) {
      room.leadSuit = card.suit;
    }

    const result = resolveDonkeyPlay(
      room.players,
      room.currentTurnIndex,
      card,
      room.currentTrick,
      room.leadSuit,
      isFirstTrickOfGame
    );

    room.lastAction = result.message;

    if (result.trickFinished) {
      this.broadcastState(room);

      // Smooth pause: 1100ms for clean trick, 1600ms for dramatic cut
      const pauseDuration = result.isCut ? 1600 : 1100;
      setTimeout(() => {
        room.currentTrick = [];
        room.leadSuit = undefined;
        room.currentTurnIndex = result.nextLeadPlayerIndex;
        room.roundNumber++;

        const remaining = room.players.filter(p => !p.rank && p.cardsCount > 0 && !p.isSpectator);
        const activeParticipants = room.players.filter(p => !p.isSpectator);
        if (remaining.length <= 1 && activeParticipants.length > 1) {
          room.status = 'game_over';
          if (remaining.length === 1) {
            remaining[0].isDonkey = true;
            room.lastAction = `🫏 GAME OVER! ${remaining[0].name} IS THE DONKEY!`;
          }
        }

        if (room.status === 'playing') {
          this.startTurnTimer(room);
        }
        this.broadcastState(room);
      }, pauseDuration);
      return true;
    } else {
      room.currentTurnIndex = result.nextLeadPlayerIndex;
      this.startTurnTimer(room);
      this.broadcastState(room);
      return true;
    }
  }

  // --- UNO PLAY ACTION ---
  public playUnoCard(
    roomCode: string,
    playerId: string,
    cardId: string,
    chosenColor?: UnoColor,
    swapTargetPlayerId?: string,
    callUno?: boolean
  ): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.gameType !== 'uno_no_mercy') return false;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;

    const card = (currentPlayer.hand as UnoCard[]).find(c => c.id === cardId);
    if (!card) return false;

    if (!canPlayUnoCard(card, room.activeUnoCard!, room.activeUnoColor!, room.drawStackCount)) {
      return false;
    }

    if (this.turnTimers.has(room.code)) {
      clearTimeout(this.turnTimers.get(room.code)!);
      this.turnTimers.delete(room.code);
    }

    currentPlayer.hand = (currentPlayer.hand as UnoCard[]).filter(c => c.id !== card.id);
    currentPlayer.cardsCount = currentPlayer.hand.length;

    room.discardPile.push(card);
    room.activeUnoCard = card;
    room.activeUnoColor = card.color === 'wild' ? (chosenColor || 'red') : card.color;

    let actionMsg = `${currentPlayer.name} played ${card.color} ${card.type}`;

    if (card.type === 'discard_all') {
      const matchColor = card.color;
      const discards = (currentPlayer.hand as UnoCard[]).filter(c => c.color === matchColor);
      currentPlayer.hand = (currentPlayer.hand as UnoCard[]).filter(c => c.color !== matchColor);
      currentPlayer.cardsCount = currentPlayer.hand.length;
      room.discardPile.push(...discards);
      actionMsg += ` & discarded ${discards.length} matching cards!`;
    } else if (card.type === 'skip_everyone') {
      actionMsg += ` & SKIPPED EVERYONE!`;
    } else if (card.type === 'reverse' || card.type === 'reverse_draw2' || card.type === 'wild_reverse_draw4') {
      room.direction = (room.direction * -1) as 1 | -1;
      actionMsg += ` ⇄ (Reversed direction)`;
    } else if (card.type === 'pass_0') {
      execute0PassHands(room.players, room.direction);
      actionMsg += ` 🔄 ALL HANDS PASSED!`;
    } else if (card.type === 'swap_7') {
      const target = room.players.find(p => p.id === swapTargetPlayerId) ||
        room.players.find(p => p.id !== currentPlayer.id && !p.rank && !p.isMercyEliminated && !p.isSpectator);
      if (target) {
        execute7SwapHands(currentPlayer, target);
        actionMsg += ` 🔁 SWAPPED HANDS with ${target.name}!`;
      }
    }

    const drawPenalty = getDrawCardPenalty(card.type);
    if (drawPenalty > 0) {
      room.drawStackCount += drawPenalty;
      actionMsg += ` 🔥 Penalty stack: +${room.drawStackCount}!`;
    }

    if (currentPlayer.cardsCount === 1) {
      currentPlayer.calledUno = !!callUno;
      if (currentPlayer.calledUno) {
        actionMsg += ` 📢 Said UNO!`;
      }
    } else {
      currentPlayer.calledUno = false;
    }

    if (currentPlayer.cardsCount === 0) {
      currentPlayer.rank = 1;
      room.status = 'game_over';
      room.lastAction = `🏆 ${currentPlayer.name} PLAYED THEIR LAST CARD AND WON!`;
      this.broadcastState(room);
      return true;
    }

    if (card.type === 'skip_everyone') {
      // Keeps the turn on current player
    } else if (card.type === 'skip') {
      room.currentTurnIndex = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 2);
    } else {
      room.currentTurnIndex = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 1);
    }

    room.lastAction = actionMsg;
    this.startTurnTimer(room);
    this.broadcastState(room);
    return true;
  }

  // --- UNO DRAW CARD ACTION ---
  public drawUnoCard(roomCode: string, playerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.gameType !== 'uno_no_mercy') return false;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;

    if (this.turnTimers.has(room.code)) {
      clearTimeout(this.turnTimers.get(room.code)!);
      this.turnTimers.delete(room.code);
    }

    const countToDraw = room.drawStackCount > 0 ? room.drawStackCount : 1;
    room.drawStackCount = 0;

    for (let i = 0; i < countToDraw; i++) {
      if (room.unoDeck.length === 0) {
        if (room.discardPile.length > 1) {
          const top = room.discardPile.pop()!;
          room.unoDeck = room.discardPile.sort(() => Math.random() - 0.5);
          room.discardPile = [top];
        }
      }
      if (room.unoDeck.length > 0) {
        currentPlayer.hand.push(room.unoDeck.pop()!);
      }
    }
    currentPlayer.cardsCount = currentPlayer.hand.length;
    currentPlayer.calledUno = false;
    room.deckRemainingCount = room.unoDeck.length;

    let msg = `${currentPlayer.name} drew ${countToDraw} card(s).`;

    const isKO = checkMercyRule(currentPlayer, room.discardPile);
    if (isKO) {
      msg += ` ☠️ MERCY RULE! ${currentPlayer.name} exceeded 25 cards and is ELIMINATED!`;
    }

    const active = room.players.filter(p => !p.rank && !p.isMercyEliminated && !p.isSpectator);
    if (active.length <= 1) {
      room.status = 'game_over';
      if (active.length === 1) {
        active[0].rank = 1;
        room.lastAction = `🏆 ${active[0].name} SURVIVED AND WINS!`;
      }
      this.broadcastState(room);
      return true;
    }

    room.currentTurnIndex = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 1);
    room.lastAction = msg;

    this.startTurnTimer(room);
    this.broadcastState(room);
    return true;
  }

  // --- UNO CALL ACTION ---
  public callUno(roomCode: string, playerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.gameType !== 'uno_no_mercy') return false;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.cardsCount !== 1) return false;

    player.calledUno = true;
    room.lastAction = `📢 ${player.name} CALLED UNO!`;
    this.broadcastState(room);
    return true;
  }

  // --- UNO CATCH ACTION ---
  public catchUno(roomCode: string, catcherPlayerId: string, targetPlayerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.gameType !== 'uno_no_mercy') return false;

    const catcher = room.players.find(p => p.id === catcherPlayerId);
    const target = room.players.find(p => p.id === targetPlayerId);
    if (!target || target.cardsCount !== 1 || target.calledUno) return false;

    for (let i = 0; i < 2; i++) {
      if (room.unoDeck.length === 0 && room.discardPile.length > 1) {
        const top = room.discardPile.pop()!;
        room.unoDeck = room.discardPile.sort(() => Math.random() - 0.5);
        room.discardPile = [top];
      }
      if (room.unoDeck.length > 0) {
        target.hand.push(room.unoDeck.pop()!);
      }
    }
    target.cardsCount = target.hand.length;
    target.calledUno = false;
    room.deckRemainingCount = room.unoDeck.length;

    let msg = `🚨 ${catcher?.name || 'Someone'} CAUGHT ${target.name} NOT SAYING UNO! (+2 cards penalty)`;

    const isKO = checkMercyRule(target, room.discardPile);
    if (isKO) {
      msg += ` ☠️ MERCY RULE! ${target.name} exceeded 25 cards and is ELIMINATED!`;
    }

    room.lastAction = msg;
    this.broadcastState(room);
    return true;
  }

  // --- STATE BROADCASTING ---
  public broadcastState(room: GameRoom): void {
    const currentActivePlayer = room.players[room.currentTurnIndex];

    for (const player of room.players) {
      if (!player.socketId) continue;

      const clientState: ClientGameState = {
        roomCode: room.code,
        gameType: room.gameType,
        status: room.status,
        hostId: room.hostId,
        myPlayerId: player.id,
        myHand: player.hand,
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isHost: p.id === room.hostId,
          isBot: p.isBot,
          isDisconnected: p.isDisconnected,
          cardsCount: p.cardsCount,
          rank: p.rank,
          isDonkey: p.isDonkey,
          isMercyEliminated: p.isMercyEliminated,
          isSpectator: p.isSpectator || false,
          calledUno: p.calledUno || false
        })),
        currentTurnPlayerId: currentActivePlayer ? currentActivePlayer.id : '',
        direction: room.direction,
        lastAction: room.lastAction,
        roundNumber: room.roundNumber,
        turnExpiresAt: room.turnExpiresAt,
        turnDuration: room.turnDuration,
        leadSuit: room.leadSuit,
        currentTrick: room.currentTrick,
        activeUnoCard: room.activeUnoCard,
        activeUnoColor: room.activeUnoColor,
        drawStackCount: room.drawStackCount,
        deckRemainingCount: room.deckRemainingCount
      };

      this.io.to(player.socketId).emit('gameState', clientState);
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.rooms.has(code) ? this.generateRoomCode() : code;
  }
}
