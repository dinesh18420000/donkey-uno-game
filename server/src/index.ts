import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { RoomManager } from './roomManager.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager(io);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Emergency reset for family room if ever needed
app.get('/api/reset-family', (req, res) => {
  roomManager.leaveRoom('FAMILY', 'all', '');
  res.json({ status: 'reset_ok' });
});

// Serve web client statically so Apple/iOS/Mac/PC users can play directly in browser
const publicDir = fs.existsSync(path.join(__dirname, '../public'))
  ? path.join(__dirname, '../public')
  : path.join(__dirname, '../../client/dist');

if (fs.existsSync(publicDir)) {
  console.log(`🌐 Serving web client from: ${publicDir}`);
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
      return next();
    }
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

io.on('connection', socket => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Create room
  socket.on('createRoom', ({ hostPlayerId, hostName, avatar, gameType, maxPlayers }, callback) => {
    try {
      const room = roomManager.createRoom(
        hostPlayerId,
        hostName,
        avatar,
        gameType,
        maxPlayers,
        socket.id
      );
      socket.join(room.code);
      callback?.({ success: true, roomCode: room.code });
      roomManager.broadcastState(room);
    } catch (err: any) {
      callback?.({ success: false, error: err.message });
    }
  });

  // Join room
  socket.on('joinRoom', ({ roomCode, playerId, playerName, avatar }, callback) => {
    try {
      const result = roomManager.joinRoom(roomCode, playerId, playerName, avatar, socket.id);
      if (result.success && result.room) {
        socket.join(result.room.code);
        callback?.({ success: true, roomCode: result.room.code });
      } else {
        callback?.({ success: false, error: result.error });
      }
    } catch (err: any) {
      callback?.({ success: false, error: err.message });
    }
  });

  // Check for active unfinished game on app launch / home screen
  socket.on('checkActiveGame', ({ playerId }, callback) => {
    try {
      const activeGame = roomManager.findActiveGameForPlayer(playerId);
      callback?.({
        hasActiveGame: !!activeGame,
        activeGame: activeGame || undefined
      });
    } catch (err: any) {
      callback?.({ hasActiveGame: false });
    }
  });

  // Dismiss active game
  socket.on('dismissActiveGame', ({ roomCode, playerId }) => {
    roomManager.leaveRoom(roomCode, playerId, socket.id);
  });

  // Reconnect player (reclaim hand & control from bot)
  socket.on('reconnectPlayer', ({ roomCode, playerId }, callback) => {
    try {
      const result = roomManager.reconnectPlayer(roomCode, playerId, socket.id);
      if (result.success && result.room) {
        socket.join(result.room.code);
        callback?.({ success: true });
      } else {
        callback?.({ success: false });
      }
    } catch (err: any) {
      callback?.({ success: false, error: err.message });
    }
  });

  // Add Bot
  socket.on('addBot', ({ roomCode, hostPlayerId }) => {
    roomManager.addBot(roomCode, hostPlayerId);
  });

  // Kick / remove player
  socket.on('removePlayer', ({ roomCode, playerId, hostPlayerId }) => {
    roomManager.removePlayer(roomCode, playerId, hostPlayerId);
  });

  // Leave room
  socket.on('leaveRoom', ({ roomCode, playerId }, callback) => {
    if (roomCode) {
      socket.leave(roomCode);
    }
    roomManager.leaveRoom(roomCode, playerId, socket.id);
    socket.emit('gameState', null);
    callback?.({ success: true });
  });

  // Start game
  socket.on('startGame', ({ roomCode, hostPlayerId }) => {
    roomManager.startGame(roomCode, hostPlayerId);
  });

  // Change game type inside room/family table
  socket.on('setGameType', ({ roomCode, hostPlayerId, gameType }, callback) => {
    const success = roomManager.setGameType(roomCode, hostPlayerId, gameType);
    callback?.({ success });
  });

  // Replay game
  socket.on('replayGame', ({ roomCode, hostPlayerId }) => {
    roomManager.replayGame(roomCode, hostPlayerId);
  });

  // Return room to lobby
  socket.on('returnToLobby', ({ roomCode, hostPlayerId }) => {
    roomManager.returnToLobby(roomCode, hostPlayerId);
  });

  // Transfer host privileges
  socket.on('transferHost', ({ roomCode, hostPlayerId, newHostPlayerId }) => {
    roomManager.transferHost(roomCode, hostPlayerId, newHostPlayerId);
  });

  // Open Family Table (No room code needed)
  socket.on('joinFamilyRoom', ({ playerId, playerName, avatar, gameType }, callback) => {
    try {
      const result = roomManager.joinFamilyRoom(playerId, playerName, avatar, socket.id, gameType);
      if (result.success) {
        socket.join(result.roomCode);
        callback?.({ success: true, roomCode: result.roomCode });
      } else {
        callback?.({ success: false, error: result.error });
      }
    } catch (err: any) {
      callback?.({ success: false, error: err.message });
    }
  });

  // Play Donkey Card
  socket.on('playDonkeyCard', ({ roomCode, playerId, cardId }) => {
    roomManager.playDonkeyCard(roomCode, playerId, cardId);
  });

  // Play UNO Card
  socket.on('playUnoCard', ({ roomCode, playerId, cardId, chosenColor, swapTargetPlayerId }) => {
    roomManager.playUnoCard(roomCode, playerId, cardId, chosenColor, swapTargetPlayerId);
  });

  // Draw UNO Card
  socket.on('drawUnoCard', ({ roomCode, playerId }) => {
    roomManager.drawUnoCard(roomCode, playerId);
  });

  // Quick Emotes / Chat
  socket.on('sendEmote', ({ roomCode, playerId, emote, playerName }) => {
    io.to(roomCode).emit('playerEmote', { playerId, playerName, emote });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Game Server running on port ${PORT}`);
});
