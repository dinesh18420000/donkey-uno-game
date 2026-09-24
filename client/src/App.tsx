import React, { useEffect, useState } from 'react';
import { ClientGameState } from './types';
import { socketService } from './services/socket';
import { LobbyScreen } from './components/LobbyScreen';
import { DonkeyGameScreen } from './components/DonkeyGameScreen';
import { UnoGameScreen } from './components/UnoGameScreen';
import { Bot, WifiOff, RefreshCw } from 'lucide-react';

export function App() {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showReconnectingBanner, setShowReconnectingBanner] = useState<boolean>(false);

  useEffect(() => {
    const socket = socketService.connect();

    const handleConnect = () => {
      setIsConnected(true);
      setShowReconnectingBanner(false);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      const activeRoom = localStorage.getItem('donkey_uno_active_room');
      if (activeRoom) {
        setShowReconnectingBanner(true);
      }
    };

    const handleGameState = (state: ClientGameState | null) => {
      setGameState(state);
      if (!state) {
        setShowReconnectingBanner(false);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('gameState', handleGameState);

    // Initial check
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('gameState', handleGameState);
    };
  }, []);

  const handleExitToLobby = () => {
    setShowReconnectingBanner(false);
    setGameState(null);
    socketService.leaveRoom();
  };

  // Determine current screen
  const isInGame = gameState && (gameState.status === 'playing' || gameState.status === 'game_over');

  return (
    <div className="relative w-full h-full max-w-lg mx-auto bg-slate-950 overflow-hidden flex flex-col shadow-2xl">
      {/* DISCONNECTION / BOT TAKEOVER NOTICE BANNER */}
      {showReconnectingBanner && (
        <div className="absolute top-0 left-0 right-0 z-50 p-2.5 bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-bold flex items-center justify-between shadow-2xl animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>Connection dropped! A computer bot is playing for you...</span>
          </div>
          <button
            onClick={() => {
              const activeRoom = localStorage.getItem('donkey_uno_active_room');
              if (activeRoom) socketService.reconnect(activeRoom);
            }}
            className="flex items-center gap-1 bg-white text-slate-950 px-2 py-0.5 rounded-full text-[11px] font-black active:scale-95"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            Reconnect
          </button>
        </div>
      )}

      {/* Screen Router */}
      {!isInGame ? (
        <LobbyScreen gameState={gameState} onExitToLobby={handleExitToLobby} />
      ) : gameState.gameType === 'donkey' ? (
        <DonkeyGameScreen gameState={gameState} onExitToLobby={handleExitToLobby} />
      ) : (
        <UnoGameScreen gameState={gameState} onExitToLobby={handleExitToLobby} />
      )}
    </div>
  );
}

export default App;
