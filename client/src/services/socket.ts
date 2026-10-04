import { io, Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { ClientGameState, GameType, UnoColor } from '../types';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export const CLOUD_PROD_URL = 'https://donkey-uno-server.onrender.com';
export const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=Thala';

class SocketService {
  public socket: Socket | null = null;
  public playerId: string = '';
  public playerName: string = '';
  public avatar: string = DEFAULT_AVATAR;
  private serverUrl: string = CLOUD_PROD_URL;
  private connectionListeners: ((status: ConnectionStatus, url: string) => void)[] = [];
  public connectionStatus: ConnectionStatus = 'disconnected';

  constructor() {
    this.initStorage();
  }

  public onConnectionChange(cb: (status: ConnectionStatus, url: string) => void): () => void {
    this.connectionListeners.push(cb);
    cb(this.socket?.connected ? 'connected' : this.connectionStatus, this.serverUrl);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== cb);
    };
  }

  private notifyConnection(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.connectionListeners.forEach(cb => {
      try {
        cb(status, this.serverUrl);
      } catch (e) {
        console.error('Error in connection listener:', e);
      }
    });
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
    if (savedName && savedName.trim() !== 'Thala') {
      this.playerName = savedName;
    } else {
      localStorage.removeItem('donkey_uno_player_name');
      this.playerName = '';
    }

    const savedAvatar = localStorage.getItem('donkey_uno_avatar');
    if (savedAvatar && (savedAvatar.startsWith('http://') || savedAvatar.startsWith('https://') || savedAvatar.startsWith('data:'))) {
      this.avatar = savedAvatar;
    } else {
      this.avatar = DEFAULT_AVATAR;
      localStorage.setItem('donkey_uno_avatar', DEFAULT_AVATAR);
    }

    // Determine if running inside a native mobile app (Capacitor Android / iOS)
    const isNativePlatform =
      Capacitor.isNativePlatform() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && window.location.port !== '3001' && window.location.port !== '5173');

    let savedServer = localStorage.getItem('donkey_uno_server_url');

    // On native mobile app, purge any stale/erroneous localhost or 127.0.0.1 URLs
    if (isNativePlatform && savedServer && (savedServer.includes('localhost') || savedServer.includes('127.0.0.1'))) {
      console.warn('📱 Native mobile app detected with localhost server URL. Purging stale value and resetting to:', CLOUD_PROD_URL);
      localStorage.removeItem('donkey_uno_server_url');
      savedServer = null;
    }

    let defaultUrl = CLOUD_PROD_URL;
    if (!isNativePlatform) {
      // In web browser
      if (window.location.port === '5173') {
        defaultUrl = 'http://localhost:3001';
      } else if (window.location.port === '3001') {
        defaultUrl = 'http://localhost:3001';
      } else if (window.location.protocol.startsWith('http') && window.location.hostname !== 'localhost') {
        defaultUrl = window.location.origin;
      }
    }

    const envServer = (import.meta as any).env?.VITE_SERVER_URL;
    this.serverUrl = savedServer || (isNativePlatform ? CLOUD_PROD_URL : (envServer || defaultUrl));
    console.log(`📡 SocketService initialized: target server URL = ${this.serverUrl} (native: ${isNativePlatform})`);
  }

  public setServerUrl(url: string) {
    const cleaned = url.trim().replace(/\/+$/, '');
    this.serverUrl = cleaned;
    localStorage.setItem('donkey_uno_server_url', cleaned);
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connect();
  }

  public resetToCloudServer() {
    this.setServerUrl(CLOUD_PROD_URL);
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
      this.notifyConnection('connecting');
      this.socket = io(this.serverUrl, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 30,
        reconnectionDelay: 1000,
        timeout: 15000
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to game server:', this.socket?.id, 'at', this.serverUrl);
        this.notifyConnection('connected');
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('⚠️ Disconnected from server:', reason);
        this.notifyConnection('disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.warn('❌ Server connection error to ' + this.serverUrl + ':', error.message);
        this.notifyConnection('disconnected');
      });
    } else if (!this.socket.connected) {
      this.notifyConnection('connecting');
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
    swapTargetPlayerId?: string,
    callUno?: boolean
  ) {
    this.connect().emit('playUnoCard', {
      roomCode,
      playerId: this.playerId,
      cardId,
      chosenColor,
      swapTargetPlayerId,
      callUno
    });
  }

  public drawUnoCard(roomCode: string) {
    this.connect().emit('drawUnoCard', { roomCode, playerId: this.playerId });
  }

  public callUno(roomCode: string) {
    this.connect().emit('callUno', { roomCode, playerId: this.playerId });
  }

  public catchUno(roomCode: string, targetPlayerId: string) {
    this.connect().emit('catchUno', {
      roomCode,
      catcherPlayerId: this.playerId,
      targetPlayerId
    });
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
