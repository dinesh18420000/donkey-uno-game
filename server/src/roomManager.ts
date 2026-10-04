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

const HUMAN_TURN_TIME_MS = 30000; // 30 seconds max play time for Donkey Master
const UNO_HUMAN_TURN_TIME_MS = 20000; // 20 seconds max to play a card in Uno No Mercy
const UNO_GAME_MAX_TIME_MS = 10 * 60 * 1000; // 10 minutes max for entire Uno match
const BOT_TURN_TIME_MS = 750;      // 0.75s for Donkey Master
const UNO_BOT_TURN_TIME_MS = 1800; // 1.8s for Uno No Mercy so card movement and effects are smooth and clearly understandable

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private socketToPlayerMap: Map<string, { roomCode: string; playerId: string }> = new Map();
  private turnTimers: Map<string, NodeJS.Timeout> = new Map();
  private disconnectGraceTimers: Map<string, NodeJS.Timeout> = new Map();
  private gameTimers: Map<string, NodeJS.Timeout> = new Map();

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
      const timerKey = `${room.code}:${playerId}`;
      if (this.disconnectGraceTimers.has(timerKey)) {
        clearTimeout(this.disconnectGraceTimers.get(timerKey)!);
        this.disconnectGraceTimers.delete(timerKey);
      }

      existingPlayer.socketId = socketId;
      existingPlayer.isDisconnected = false;
      existingPlayer.isBot = false;
      existingPlayer.name = playerName || existingPlayer.name.replace(' (Bot)', '');
      existingPlayer.avatar = avatar || existingPlayer.avatar;
      this.socketToPlayerMap.set(socketId, { roomCode: code, playerId });
      room.lastAction = `🟢 ${existingPlayer.name} reconnected! Control restored.`;
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
      this.startGameTimer(room);
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
      this.startGameTimer(room);
    }

    this.startTurnTimer(room);
    this.broadcastState(room);
    return true;
  }

  // Return everyone in room back to the Lobby
  public returnToLobby(roomCode: string, hostPlayerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId) return false;

    // Cancel active turn timers and game timers
    if (this.turnTimers.has(room.code)) {
      clearTimeout(this.turnTimers.get(room.code)!);
      this.turnTimers.delete(room.code);
    }
    if (this.gameTimers.has(room.code)) {
      clearTimeout(this.gameTimers.get(room.code)!);
      this.gameTimers.delete(room.code);
    }

    room.status = 'waiting';
    room.roundNumber = 1;
    room.currentTrick = [];
    room.drawStackCount = 0;
    room.activeUnoCard = undefined;
    room.activeUnoColor = undefined;
    room.lastSkippedPlayerId = undefined;
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
      if (this.gameTimers.has(familyCode)) {
        clearTimeout(this.gameTimers.get(familyCode)!);
        this.gameTimers.delete(familyCode);
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
      const timerKey = `${familyCode}:${playerId}`;
      if (this.disconnectGraceTimers.has(timerKey)) {
        clearTimeout(this.disconnectGraceTimers.get(timerKey)!);
        this.disconnectGraceTimers.delete(timerKey);
      }

      existingPlayer.socketId = socketId;
      existingPlayer.isDisconnected = false;
      existingPlayer.isBot = false;
      existingPlayer.name = playerName || existingPlayer.name.replace(' (Bot)', '');
      existingPlayer.avatar = avatar || existingPlayer.avatar;
      this.socketToPlayerMap.set(socketId, { roomCode: familyCode, playerId });
      room.players.forEach(p => { p.isHost = (p.id === room.hostId); });
      room.lastAction = `🟢 ${existingPlayer.name} reconnected! Control restored.`;
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

    // Check if any human players (non-bot, non-disconnected, non-spectator) are still playing
    const activeHumanPlayers = room.players.filter(p => !p.isBot && !p.isDisconnected && !p.isSpectator);
    if (activeHumanPlayers.length === 0) {
      // All human players left/disconnected! Immediately stop the game and cancel turn timers
      if (this.turnTimers.has(room.code)) {
        clearTimeout(this.turnTimers.get(room.code)!);
        this.turnTimers.delete(room.code);
      }
      if (this.gameTimers.has(room.code)) {
        clearTimeout(this.gameTimers.get(room.code)!);
        this.gameTimers.delete(room.code);
      }
      const timerKey = `${room.code}:${player.id}`;
      if (this.disconnectGraceTimers.has(timerKey)) {
        clearTimeout(this.disconnectGraceTimers.get(timerKey)!);
        this.disconnectGraceTimers.delete(timerKey);
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

    if (room.status === 'playing') {
      room.lastAction = `🔴 ${player.name} lost connection! Waiting 15s to reconnect...`;
      this.broadcastState(room);

      const timerKey = `${room.code}:${player.id}`;
      if (this.disconnectGraceTimers.has(timerKey)) {
        clearTimeout(this.disconnectGraceTimers.get(timerKey)!);
      }

      // 15-second grace period: Wait 15s before turning the disconnected player into a bot
      const graceTimer = setTimeout(() => {
        this.disconnectGraceTimers.delete(timerKey);
        if (room.status !== 'playing') return;

        const p = room.players.find(pl => pl.id === player.id);
        if (p && p.isDisconnected && !p.isBot) {
          p.isBot = true;
          room.lastAction = `🤖 15s expired! AI Bot took over for ${p.name}.`;
          console.log(`[Room ${room.code}] 15s grace expired for ${p.name}. Bot taking over.`);
          this.broadcastState(room);

          const currentActive = room.players[room.currentTurnIndex];
          if (currentActive && currentActive.id === p.id) {
            this.startTurnTimer(room, room.gameType === 'uno_no_mercy' ? UNO_BOT_TURN_TIME_MS : BOT_TURN_TIME_MS);
          }
        }
      }, 15000);

      this.disconnectGraceTimers.set(timerKey, graceTimer);

      // If it is currently this player's turn, give 15s grace for them to return
      const currentActive = room.players[room.currentTurnIndex];
      if (currentActive && currentActive.id === player.id) {
        this.startTurnTimer(room, 15000);
      }
    } else {
      room.lastAction = `⚠️ ${player.name} disconnected.`;
      this.broadcastState(room);
    }
  }

  public leaveRoom(roomCode: string, playerId: string, socketId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    this.socketToPlayerMap.delete(socketId);

    const timerKey = `${roomCode}:${playerId}`;
    if (this.disconnectGraceTimers.has(timerKey)) {
      clearTimeout(this.disconnectGraceTimers.get(timerKey)!);
      this.disconnectGraceTimers.delete(timerKey);
    }

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
      if (this.gameTimers.has(room.code)) {
        clearTimeout(this.gameTimers.get(room.code)!);
        this.gameTimers.delete(room.code);
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
        this.startTurnTimer(room, room.gameType === 'uno_no_mercy' ? UNO_BOT_TURN_TIME_MS : BOT_TURN_TIME_MS);
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

  // --- UNO NO MERCY WIN / SURVIVAL END CONDITION CHECK ---
  private checkUnoEndCondition(room: GameRoom, reasonSuffix?: string): boolean {
    if (room.status !== 'playing' || room.gameType !== 'uno_no_mercy') return false;

    // 1. Check if any active player emptied their hand (cardsCount === 0 or hand.length === 0)
    const zeroCardWinner = room.players.find(
      p => !p.isSpectator && !p.isMercyEliminated && (p.cardsCount === 0 || p.hand.length === 0)
    );

    if (zeroCardWinner) {
      zeroCardWinner.rank = 1;
      room.status = 'game_over';
      room.lastAction = `🏆 ${zeroCardWinner.name} PLAYED THEIR LAST CARD AND WON!${reasonSuffix ? ' ' + reasonSuffix : ''}`;
      if (this.turnTimers.has(room.code)) {
        clearTimeout(this.turnTimers.get(room.code)!);
        this.turnTimers.delete(room.code);
      }
      if (this.gameTimers.has(room.code)) {
        clearTimeout(this.gameTimers.get(room.code)!);
        this.gameTimers.delete(room.code);
      }
      (room as any).isResolvingUnoAction = false;
      this.finalizeUnoRanks(room);
      this.broadcastState(room);
      return true;
    }

    // 2. Check if only 1 active player remains standing (Mercy Rule / eliminations)
    const active = room.players.filter(p => !p.rank && !p.isMercyEliminated && !p.isSpectator && (p.cardsCount > 0 || p.hand.length > 0));
    const allParticipants = room.players.filter(p => !p.isSpectator);
    if (active.length <= 1 && allParticipants.length > 1) {
      room.status = 'game_over';
      if (active.length === 1) {
        active[0].rank = 1;
        room.lastAction = `🏆 ${active[0].name} SURVIVED AND WINS!${reasonSuffix ? ' ' + reasonSuffix : ''}`;
      }
      if (this.turnTimers.has(room.code)) {
        clearTimeout(this.turnTimers.get(room.code)!);
        this.turnTimers.delete(room.code);
      }
      if (this.gameTimers.has(room.code)) {
        clearTimeout(this.gameTimers.get(room.code)!);
        this.gameTimers.delete(room.code);
      }
      (room as any).isResolvingUnoAction = false;
      this.finalizeUnoRanks(room);
      this.broadcastState(room);
      return true;
    }

    return false;
  }

  // --- 20s (UNO) / 30s (DONKEY) TURN TIMER & AUTO-PLAY SYSTEM ---
  private startTurnTimer(room: GameRoom, customMs?: number): void {
    if (this.turnTimers.has(room.code)) {
      clearTimeout(this.turnTimers.get(room.code)!);
      this.turnTimers.delete(room.code);
    }

    if (room.status !== 'playing') return;

    if (room.gameType === 'uno_no_mercy' && this.checkUnoEndCondition(room)) return;

    let currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.rank || currentPlayer.isMercyEliminated || (room.gameType === 'uno_no_mercy' && (currentPlayer.cardsCount === 0 || currentPlayer.hand.length === 0))) {
      if (room.gameType === 'uno_no_mercy') {
        const nextIdx = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 1);
        if (nextIdx !== room.currentTurnIndex) {
          room.currentTurnIndex = nextIdx;
          currentPlayer = room.players[room.currentTurnIndex];
        } else {
          this.checkUnoEndCondition(room);
          return;
        }
      } else {
        return;
      }
    }

    const isBotOrDisconnected = currentPlayer.isBot || currentPlayer.isDisconnected;
    const defaultBotTime = room.gameType === 'uno_no_mercy' ? UNO_BOT_TURN_TIME_MS : BOT_TURN_TIME_MS;
    const defaultHumanTime = room.gameType === 'uno_no_mercy' ? UNO_HUMAN_TURN_TIME_MS : HUMAN_TURN_TIME_MS;
    const durationMs = customMs !== undefined ? customMs : (isBotOrDisconnected ? defaultBotTime : defaultHumanTime);

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

    if (room.gameType === 'uno_no_mercy' && this.checkUnoEndCondition(room)) return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== expectedPlayerId) return;

    const wasHuman = !currentPlayer.isBot && !currentPlayer.isDisconnected;
    if (wasHuman) {
      const timeLimitSec = room.gameType === 'uno_no_mercy' ? 20 : 30;
      room.lastAction = `⏰ ${timeLimitSec}s timer expired! Computer auto-selected a card for ${currentPlayer.name}.`;
    }

    this.executeBotTurn(roomCode, currentPlayer.id);

    // Watchdog fallback: If turn does not transition within 2500ms after timeout, force auto-action
    if (room.gameType === 'uno_no_mercy') {
      setTimeout(() => {
        const liveRoom = this.rooms.get(roomCode);
        if (!liveRoom || liveRoom.status !== 'playing') return;
        if (this.checkUnoEndCondition(liveRoom)) return;
        const liveCurrent = liveRoom.players[liveRoom.currentTurnIndex];
        if (liveCurrent && liveCurrent.id === expectedPlayerId && !(liveRoom as any).isResolvingUnoAction) {
          console.warn(`[Watchdog] Force resolving stuck turn for ${liveCurrent.name}`);
          const drawn = this.drawUnoCard(roomCode, expectedPlayerId);
          if (!drawn) {
            (liveRoom as any).isResolvingUnoAction = false;
            liveRoom.currentTurnIndex = getNextUnoTurnIndex(liveRoom.players, liveRoom.currentTurnIndex, liveRoom.direction, 1);
            this.startTurnTimer(liveRoom);
            this.broadcastState(liveRoom);
          }
        }
      }, 2500);
    }
  }

  // --- 10-MINUTE TOTAL UNO MATCH TIMER ---
  private startGameTimer(room: GameRoom): void {
    if (this.gameTimers.has(room.code)) {
      clearTimeout(this.gameTimers.get(room.code)!);
      this.gameTimers.delete(room.code);
    }

    if (room.status !== 'playing' || room.gameType !== 'uno_no_mercy') return;

    room.gameDuration = Math.round(UNO_GAME_MAX_TIME_MS / 1000);
    room.gameExpiresAt = Date.now() + UNO_GAME_MAX_TIME_MS;

    const timer = setTimeout(() => {
      this.handleGameTimeout(room.code);
    }, UNO_GAME_MAX_TIME_MS);

    this.gameTimers.set(room.code, timer);
  }

  private handleGameTimeout(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.gameType !== 'uno_no_mercy') return;

    // Clear active turn timers and game timer
    if (this.turnTimers.has(room.code)) {
      clearTimeout(this.turnTimers.get(room.code)!);
      this.turnTimers.delete(room.code);
    }
    if (this.gameTimers.has(room.code)) {
      this.gameTimers.delete(room.code);
    }

    room.status = 'game_over';

    // Rank all remaining active players by fewest cards
    const nonEliminated = room.players.filter(p => !p.isMercyEliminated && !p.isSpectator);
    nonEliminated.sort((a, b) => a.cardsCount - b.cardsCount);

    if (nonEliminated.length > 0) {
      nonEliminated[0].rank = 1;
    }
    this.finalizeUnoRanks(room);

    const winner = nonEliminated[0];
    const winnerText = winner ? `${winner.name} wins with fewest cards (${winner.cardsCount} cards)!` : '';
    room.lastAction = `⏰ 10-Minute Game Timer Expired! Match finished. ${winnerText}`;
    this.broadcastState(room);
  }

  private executeBotTurn(roomCode: string, botPlayerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing') return;

    if (room.gameType === 'uno_no_mercy') {
      if (this.checkUnoEndCondition(room)) return;

      if ((room as any).isResolvingUnoAction) {
        setTimeout(() => this.executeBotTurn(roomCode, botPlayerId), 300);
        return;
      }
    } else {
      if ((room as any).isResolvingTrick) {
        setTimeout(() => this.executeBotTurn(roomCode, botPlayerId), 300);
        return;
      }
    }

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== botPlayerId) return;

    if (currentPlayer.rank || currentPlayer.isMercyEliminated) {
      if (room.gameType === 'uno_no_mercy') {
        room.currentTurnIndex = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 1);
        this.startTurnTimer(room);
      }
      return;
    }

    if (room.gameType === 'donkey') {
      const isFirstTrick = room.roundNumber === 1 && room.currentTrick.length === 0 && !room.leadSuit;
      const botCard = chooseDonkeyBotCard(currentPlayer, room.leadSuit, isFirstTrick);
      if (botCard) {
        const played = this.playDonkeyCard(roomCode, botPlayerId, botCard.id);
        if (!played) {
          setTimeout(() => this.executeBotTurn(roomCode, botPlayerId), 300);
        }
      }
    } else {
      const move = chooseUnoBotCard(currentPlayer, room.activeUnoCard!, room.activeUnoColor!, room.drawStackCount);
      let success = false;
      if (move) {
        success = this.playUnoCard(roomCode, botPlayerId, move.card.id, move.chosenColor, move.swapTargetPlayerId, move.callUno);
      }
      if (!success) {
        const drawn = this.drawUnoCard(roomCode, botPlayerId);
        if (!drawn) {
          setTimeout(() => this.executeBotTurn(roomCode, botPlayerId), 300);
        }
      }
    }
  }

  // --- DONKEY PLAY ACTION ---
  public playDonkeyCard(roomCode: string, playerId: string, cardId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.gameType !== 'donkey') return false;

    // Prevent double play / duplicate actions while a finished trick or cut is resolving
    if ((room as any).isResolvingTrick) return false;

    // In Donkey Master, a player can play AT MOST one card per trick
    if (room.currentTrick && room.currentTrick.some(t => t.playerId === playerId)) return false;

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
      (room as any).isResolvingTrick = true;
      if (result.isCut) {
        room.lastCutVictimId = result.victimPlayerId;
        room.lastCutterId = result.cutterPlayerId;
      } else {
        room.lastCutVictimId = undefined;
        room.lastCutterId = undefined;
      }
      this.broadcastState(room);

      // Smooth pause: 1100ms for clean trick, 1800ms for dramatic cut to allow card collection and sweep animation
      const pauseDuration = result.isCut ? 1800 : 1100;
      setTimeout(() => {
        (room as any).isResolvingTrick = false;
        room.currentTrick = [];
        room.leadSuit = undefined;
        room.lastCutVictimId = undefined;
        room.lastCutterId = undefined;
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

    // Prevent overlapping plays while previous action/card flight is in motion
    if ((room as any).isResolvingUnoAction) return false;

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
      for (const p of room.players) {
        if (!p.isSpectator && !p.isMercyEliminated && p.hand.length >= 25) {
          if (checkMercyRule(p, room.discardPile)) {
            actionMsg += ` ☠️ ${p.name} exceeded 25 cards and is ELIMINATED!`;
          }
        }
      }
    } else if (card.type === 'swap_7') {
      const target = room.players.find(p => p.id === swapTargetPlayerId) ||
        room.players.find(p => p.id !== currentPlayer.id && !p.rank && !p.isMercyEliminated && !p.isSpectator);
      if (target) {
        execute7SwapHands(currentPlayer, target);
        actionMsg += ` 🔁 SWAPPED HANDS with ${target.name}!`;
        for (const p of [currentPlayer, target]) {
          if (!p.isSpectator && !p.isMercyEliminated && p.hand.length >= 25) {
            if (checkMercyRule(p, room.discardPile)) {
              actionMsg += ` ☠️ ${p.name} exceeded 25 cards and is ELIMINATED!`;
            }
          }
        }
      }
    }

    // Check end condition immediately after hand manipulation (pass_0 / swap_7 / discard_all)
    if (this.checkUnoEndCondition(room, actionMsg)) return true;

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

    // Check end condition again (e.g. played last card)
    if (this.checkUnoEndCondition(room, actionMsg)) return true;

    let nextTurnIndex = room.currentTurnIndex;
    if (card.type === 'skip_everyone') {
      nextTurnIndex = room.currentTurnIndex;
      room.lastSkippedPlayerId = 'everyone';
      actionMsg += ` & SKIPPED EVERYONE! 🚫`;
    } else if (card.type === 'skip') {
      const skippedPlayerIndex = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 1);
      const skippedPlayer = room.players[skippedPlayerIndex];
      if (skippedPlayer) {
        room.lastSkippedPlayerId = skippedPlayer.id;
        actionMsg += ` & SKIPPED ${skippedPlayer.name}! 🚫`;
      }
      nextTurnIndex = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 2);
    } else {
      nextTurnIndex = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 1);
    }

    room.lastAction = actionMsg;

    // Strict sequencing: Hold turn on current player until card flight and effects land
    (room as any).isResolvingUnoAction = true;
    const actionDelay =
      card.type === 'pass_0'
        ? 2000
        : card.type === 'swap_7'
        ? 1800
        : card.type === 'skip' || card.type === 'skip_everyone'
        ? 2000
        : card.type === 'reverse' || card.type === 'reverse_draw2' || card.type === 'wild_reverse_draw4'
        ? 1400
        : 850;

    room.turnDuration = Math.round(actionDelay / 1000) || 1;
    room.turnExpiresAt = Date.now() + actionDelay;

    // Broadcast immediate card state while turn visually stays with current player
    this.broadcastState(room);

    setTimeout(() => {
      (room as any).isResolvingUnoAction = false;
      room.lastSkippedPlayerId = undefined;
      if (room.status !== 'playing') return;
      if (this.checkUnoEndCondition(room)) return;
      room.currentTurnIndex = nextTurnIndex;
      this.startTurnTimer(room);
      this.broadcastState(room);
    }, actionDelay);

    return true;
  }

  // --- UNO DRAW CARD ACTION ---
  public drawUnoCard(roomCode: string, playerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.gameType !== 'uno_no_mercy') return false;

    // Prevent overlapping actions while card is in transit
    if ((room as any).isResolvingUnoAction) return false;

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

    if (this.checkUnoEndCondition(room, msg)) return true;

    const nextTurnIndex = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 1);
    room.lastAction = msg;

    // Strict sequencing: Hold turn on drawing player until drawn cards land in hand
    (room as any).isResolvingUnoAction = true;
    const drawFlightDuration = countToDraw > 1 ? 1200 : 750;
    room.turnDuration = Math.round(drawFlightDuration / 1000) || 1;
    room.turnExpiresAt = Date.now() + drawFlightDuration;
    this.broadcastState(room);

    setTimeout(() => {
      (room as any).isResolvingUnoAction = false;
      if (room.status !== 'playing') return;
      if (this.checkUnoEndCondition(room)) return;
      room.currentTurnIndex = nextTurnIndex;
      this.startTurnTimer(room);
      this.broadcastState(room);
    }, drawFlightDuration);

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

    if (this.checkUnoEndCondition(room, msg)) return true;

    // If target was eliminated and holds the current turn, advance turn to next active player
    if (isKO && room.players[room.currentTurnIndex]?.id === target.id) {
      room.currentTurnIndex = getNextUnoTurnIndex(room.players, room.currentTurnIndex, room.direction, 1);
      this.startTurnTimer(room);
    }

    room.lastAction = msg;
    this.broadcastState(room);
    return true;
  }

  private finalizeUnoRanks(room: GameRoom): void {
    const winner = room.players.find(p => p.rank === 1 && !p.isMercyEliminated);
    const nonEliminated = room.players.filter(p => p !== winner && !p.isMercyEliminated && !p.isSpectator);
    nonEliminated.sort((a, b) => a.cardsCount - b.cardsCount);

    let currentRank = winner ? 2 : 1;
    for (const p of nonEliminated) {
      p.rank = currentRank++;
    }

    const eliminated = room.players.filter(p => p.isMercyEliminated && !p.isSpectator);
    for (const p of eliminated) {
      p.rank = currentRank++;
    }
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
        gameExpiresAt: room.gameExpiresAt,
        gameDuration: room.gameDuration,
        leadSuit: room.leadSuit,
        currentTrick: room.currentTrick,
        lastCutVictimId: room.lastCutVictimId,
        lastCutterId: room.lastCutterId,
        activeUnoCard: room.activeUnoCard,
        activeUnoColor: room.activeUnoColor,
        drawStackCount: room.drawStackCount,
        deckRemainingCount: room.deckRemainingCount,
        lastSkippedPlayerId: room.lastSkippedPlayerId
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
