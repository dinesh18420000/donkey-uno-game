import { io, Socket } from 'socket.io-client';
import { ClientGameState, GameType, UnoColor } from '../types';

class SocketService {
  public socket: Socket | null = null;
  public playerId: string = '';
  public playerName: string = 'Thala';
  public avatar: string = 'avatar_thala';
  private serverUrl: string = '';

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (typeof window === 'undefined') return;

    let pid = localStorage.getItem('donkey_uno_player_id');
    if (!pid) {
      pid = 'p_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('donkey_uno_player_id', pid);
    }
    this.playerId = pid;

    const savedName = localStorage.getItem('donkey_uno_player_name');
    if (savedName) this.playerName = savedName;

    const savedAvatar = localStorage.getItem('donkey_uno_avatar');
    if (savedAvatar) this.avatar = savedAvatar;

    let savedServer = localStorage.getItem('donkey_uno_server_url');

    // Auto-clean stale localhost or dead LAN URLs from previous local dev testing
    if (savedServer && (savedServer.includes('localhost') || savedServer.includes('127.0.0.1') || savedServer.includes('192.168.'))) {
      const isLocalHostBrowser = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (!isLocalHostBrowser) {
        localStorage.removeItem('donkey_uno_server_url');
        savedServer = null;
      }
    }

    // If running in browser (e.g. Safari on Apple device or Chrome on PC), default to current origin if hosted online
    const isBrowserWeb = typeof window !== 'undefined' && window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost');

    const envServer = (import.meta as any).env?.VITE_SERVER_URL;
    this.serverUrl = savedServer || (isBrowserWeb ? window.location.origin : (envServer || 'https://donkey-uno-server.onrender.com'));
  }

  public setServerUrl(url: string) {
    this.serverUrl = url;
    localStorage.setItem('donkey_uno_server_url', url);
    if (this.socket) {
      this.socket.disconnect();
      this.connect();
    }
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public updateProfile(name: string, avatar: string) {
    this.playerName = name;
    this.avatar = avatar;
    localStorage.setItem('donkey_uno_player_name', name);
    localStorage.setItem('donkey_uno_avatar', avatar);
  }

  public connect(): Socket {
    if (this.socket && this.socket.connected) return this.socket;

    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to game server:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('⚠️ Disconnected from server:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('❌ Server connection error:', error.message);
      });
    } else if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  public createRoom(
    gameType: GameType,
    maxPlayers: number,
    callback: (res: { success: boolean; roomCode?: string; error?: string }) => void
  ) {
    this.connect().emit('createRoom', {
      hostPlayerId: this.playerId,
      hostName: this.playerName,
      avatar: this.avatar,
      gameType,
      maxPlayers
    }, (res: any) => {
      if (res.success && res.roomCode) {
        localStorage.setItem('donkey_uno_active_room', res.roomCode);
      }
      callback(res);
    });
  }

  public joinRoom(
    roomCode: string,
    callback: (res: { success: boolean; roomCode?: string; error?: string }) => void
  ) {
    this.connect().emit('joinRoom', {
      roomCode,
      playerId: this.playerId,
      playerName: this.playerName,
      avatar: this.avatar
    }, (res: any) => {
      if (res.success && res.roomCode) {
        localStorage.setItem('donkey_uno_active_room', res.roomCode);
      }
      callback(res);
    });
  }

  public checkActiveGame(
    callback: (res: {
      hasActiveGame: boolean;
      activeGame?: {
        roomCode: string;
        gameType: GameType;
        roundNumber: number;
        cardsCount: number;
      };
    }) => void
  ) {
    this.connect().emit('checkActiveGame', { playerId: this.playerId }, (res: any) => {
      callback(res || { hasActiveGame: false });
    });
  }

  public dismissActiveGame(roomCode: string) {
    localStorage.removeItem('donkey_uno_active_room');
    if (this.socket) {
      this.socket.emit('dismissActiveGame', { roomCode, playerId: this.playerId });
    }
  }

  public reconnect(roomCode: string, callback?: (success: boolean) => void) {
    if (!this.socket) this.connect();
    localStorage.setItem('donkey_uno_active_room', roomCode);
    this.connect().emit('reconnectPlayer', {
      roomCode,
      playerId: this.playerId
    }, (res: any) => {
      if (res?.success) {
        console.log('🎉 Successfully resumed game from Bot takeover!');
      }
      callback?.(!!res?.success);
    });
  }

  public joinFamilyRoom(
    gameType: GameType,
    callback: (res: { success: boolean; roomCode?: string; error?: string }) => void
  ) {
    const socket = this.connect();
    let responded = false;
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        callback({
          success: false,
          error: 'Connection timeout. The cloud server may be waking up from sleep (~20s). Please tap Join again in a moment!'
        });
      }
    }, 12000);

    socket.emit('joinFamilyRoom', {
      playerId: this.playerId,
      playerName: this.playerName,
      avatar: this.avatar,
      gameType
    }, (res: any) => {
      if (responded) return;
      responded = true;
      clearTimeout(timeout);
      if (res?.success && res?.roomCode) {
        localStorage.setItem('donkey_uno_active_room', res.roomCode);
      }
      callback(res || { success: false, error: 'No response received from game server.' });
    });
  }

  public replayGame(roomCode: string) {
    this.connect().emit('replayGame', { roomCode, hostPlayerId: this.playerId });
  }

  public returnToLobby(roomCode: string) {
    this.connect().emit('returnToLobby', { roomCode, hostPlayerId: this.playerId });
  }

  public transferHost(roomCode: string, newHostPlayerId: string) {
    this.connect().emit('transferHost', {
      roomCode,
      hostPlayerId: this.playerId,
      newHostPlayerId
    });
  }

  public addBot(roomCode: string) {
    this.connect().emit('addBot', { roomCode, hostPlayerId: this.playerId });
  }

  public removePlayer(roomCode: string, targetPlayerId: string) {
    this.connect().emit('removePlayer', {
      roomCode,
      playerId: targetPlayerId,
      hostPlayerId: this.playerId
    });
  }

  public setGameType(roomCode: string, gameType: GameType, callback?: (res: { success: boolean }) => void) {
    this.connect().emit('setGameType', { roomCode, hostPlayerId: this.playerId, gameType }, callback);
  }

  public startGame(roomCode: string) {
    this.connect().emit('startGame', { roomCode, hostPlayerId: this.playerId });
  }

  public playDonkeyCard(roomCode: string, cardId: string) {
    this.connect().emit('playDonkeyCard', {
      roomCode,
      playerId: this.playerId,
      cardId
    });
  }

  public playUnoCard(
    roomCode: string,
    cardId: string,
    chosenColor?: UnoColor,
    swapTargetPlayerId?: string
  ) {
    this.connect().emit('playUnoCard', {
      roomCode,
      playerId: this.playerId,
      cardId,
      chosenColor,
      swapTargetPlayerId
    });
  }

  public drawUnoCard(roomCode: string) {
    this.connect().emit('drawUnoCard', { roomCode, playerId: this.playerId });
  }

  public sendEmote(roomCode: string, emote: string) {
    this.connect().emit('sendEmote', {
      roomCode,
      playerId: this.playerId,
      playerName: this.playerName,
      emote
    });
  }

  public sendQuickChat(roomCode: string, message: string) {
    this.sendEmote(roomCode, message);
  }

  public leaveRoom(callback?: () => void) {
    const activeRoom = localStorage.getItem('donkey_uno_active_room');
    if (activeRoom && this.socket && this.socket.connected) {
      this.socket.emit('leaveRoom', { roomCode: activeRoom, playerId: this.playerId }, () => {
        callback?.();
      });
    } else {
      callback?.();
    }
    localStorage.removeItem('donkey_uno_active_room');
  }
}

export const socketService = new SocketService();
