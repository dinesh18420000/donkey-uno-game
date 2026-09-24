import React, { useState, useEffect } from 'react';
import type { GameType, ClientGameState } from '../types';
import { socketService } from '../services/socket';
import {
  Play,
  Copy,
  PlusCircle,
  Settings,
  Wifi,
  Trash2,
  Sparkles,
  Bot,
  Users,
  Home,
  Key,
  RefreshCw,
  X
} from 'lucide-react';

interface LobbyScreenProps {
  gameState: ClientGameState | null;
  onExitToLobby?: () => void;
  onGameStarted?: () => void;
}

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Thala',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Mahi',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Sulfi',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Dinesh',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Rocky',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Ace'
];

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ gameState, onExitToLobby }) => {
  const [playerName, setPlayerName] = useState(socketService.playerName);
  const [selectedAvatar, setSelectedAvatar] = useState(socketService.avatar || AVATAR_OPTIONS[0]);
  const [selectedGameType, setSelectedGameType] = useState<GameType>('donkey');
  const [maxPlayers, setMaxPlayers] = useState<number>(10);
  const [joinCode, setJoinCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCodeOptions, setShowCodeOptions] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(socketService.getServerUrl());
  const [activeGameInfo, setActiveGameInfo] = useState<{
    roomCode: string;
    gameType: GameType;
    roundNumber: number;
    cardsCount: number;
  } | null>(null);
  const [showActiveGameModal, setShowActiveGameModal] = useState<boolean>(false);

  // Check for unfinished active games when on Home Screen
  useEffect(() => {
    if (!gameState) {
      const check = () => {
        socketService.checkActiveGame(res => {
          if (res.hasActiveGame && res.activeGame) {
            setActiveGameInfo(res.activeGame);
            setShowActiveGameModal(true);
          } else {
            setActiveGameInfo(null);
            setShowActiveGameModal(false);
          }
        });
      };

      check();
      const socket = socketService.connect();
      socket.on('connect', check);
      return () => {
        socket.off('connect', check);
      };
    }
  }, [gameState]);

  const handleUpdateProfile = (name: string, avatar: string) => {
    setPlayerName(name);
    setSelectedAvatar(avatar);
    socketService.updateProfile(name, avatar);
  };

  // Open Family Table (No room code needed!)
  const handleJoinFamilyTable = () => {
    setErrorMessage('');
    socketService.joinFamilyRoom(selectedGameType, res => {
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to connect to Family Table.');
      }
    });
  };

  const handleCreateRoom = () => {
    setErrorMessage('');
    socketService.createRoom(selectedGameType, maxPlayers, res => {
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create room.');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) {
      setErrorMessage('Please enter a 6-digit room code.');
      return;
    }
    setErrorMessage('');
    socketService.joinRoom(joinCode.trim().toUpperCase(), res => {
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to join room.');
      }
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveServerUrl = () => {
    socketService.setServerUrl(serverUrlInput.trim());
    setShowSettings(false);
  };

  // If already in a room and waiting to start
  if (gameState && gameState.status === 'waiting') {
    const isHost = gameState.hostId === socketService.playerId;
    const isFamilyTable = gameState.roomCode === 'FAMILY';

    return (
      <div className="w-full h-full flex flex-col items-center justify-between px-4 safe-top safe-bottom bg-gradient-to-b from-purple-950 via-[#260a38] to-slate-950 text-white overflow-y-auto">
        {/* Top Header */}
        <div className="w-full max-w-md flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {gameState.gameType === 'donkey' ? '🫏' : '🔥'}
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wide">
                {gameState.gameType === 'donkey' ? 'DONKEY MASTER' : 'UNO NO MERCY'}
              </h1>
              <p className="text-[11px] text-purple-300 font-bold">
                {isFamilyTable ? '🏠 Open Family & Friends Table' : `Lobby (Code: ${gameState.roomCode})`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (onExitToLobby) onExitToLobby();
              else socketService.leaveRoom();
            }}
            className="text-xs bg-red-600/80 hover:bg-red-600 px-3 py-1.5 rounded-xl font-bold"
          >
            Leave
          </button>
        </div>

        {/* Room Banner */}
        <div className="w-full max-w-md my-3 p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-purple-500/30 text-center shadow-2xl">
          {isFamilyTable ? (
            <div>
              <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-base mb-1">
                <Home className="w-5 h-5" />
                <span>OPEN TABLE FOR FAMILY & FRIENDS</span>
              </div>
              <p className="text-xs text-purple-200">
                Any family member opening the app joins this exact table automatically! No code needed.
              </p>
            </div>
          ) : (
            <div>
              <div className="text-xs uppercase tracking-wider text-purple-200 font-bold mb-1">
                Share Room Code
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl sm:text-4xl font-black text-amber-300 tracking-widest font-mono">
                  {gameState.roomCode}
                </span>
                <button
                  onClick={() => handleCopyCode(gameState.roomCode)}
                  className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-md active:scale-95"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-400 font-bold mt-1">Copied to clipboard!</p>
              )}
            </div>
          )}

          <div className="mt-3 py-1.5 px-3 rounded-xl bg-indigo-950/80 border border-indigo-400/30 text-[11px] text-indigo-200 flex items-center justify-center gap-2">
            <Bot className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <span>If anyone disconnects, an AI bot holds their turn until they return!</span>
          </div>
        </div>

        {/* Connected Players Grid (Supports up to 10 players) */}
        <div className="w-full max-w-md flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-200 uppercase tracking-wide">
              Players Joined ({gameState.players.length} / 10)
            </span>
            {isHost && gameState.players.length < 10 && (
              <button
                onClick={() => socketService.addBot(gameState.roomCode)}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-xl font-bold shadow-md active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Computer Bot
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
            {gameState.players.map((p) => (
              <div
                key={p.id}
                className="relative p-2 rounded-2xl bg-purple-900/40 border border-purple-400/30 flex items-center gap-2 shadow-md"
              >
                <img
                  src={p.avatar}
                  alt={p.name}
                  className="w-10 h-10 rounded-full border-2 border-amber-400/80 bg-slate-900"
                />
                <div className="overflow-hidden">
                  <div className="text-xs font-bold truncate text-white">
                    {p.name} {p.id === socketService.playerId ? '(You)' : ''}
                  </div>
                  <div className="text-[10px] text-purple-300 font-semibold">
                    {p.isHost ? '👑 Host' : p.isBot ? '🤖 Bot' : 'Player'}
                  </div>
                </div>

                {isHost && !p.isHost && (
                  <button
                    onClick={() => socketService.removePlayer(gameState.roomCode, p.id)}
                    className="absolute top-1 right-1 p-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Start Game Action Bar */}
        <div className="w-full max-w-md pt-3">
          {isHost ? (
            <button
              onClick={() => socketService.startGame(gameState.roomCode)}
              disabled={gameState.players.length < 2}
              className={`w-full py-4 rounded-2xl font-black text-lg shadow-2xl flex items-center justify-center gap-2 transition-all ${
                gameState.players.length >= 2
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 active:scale-95 hover:shadow-yellow-400/60 ring-4 ring-yellow-300/40'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Play className="w-6 h-6 fill-current" />
              <span>START GAME {gameState.players.length < 2 ? '(Need 2+ Players)' : ''}</span>
            </button>
          ) : (
            <div className="text-center py-3.5 rounded-2xl bg-white/5 border border-white/10 text-purple-200 text-sm font-bold animate-pulse">
              Waiting for Host to start game...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Menu / Lobby Setup
  return (
    <div className="w-full h-full flex flex-col items-center justify-between px-4 safe-top safe-bottom bg-gradient-to-b from-purple-950 via-[#260a38] to-slate-950 text-white overflow-y-auto">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-xl shadow-lg border border-yellow-200">
            🃏
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight">
              CARDS ARENA
            </h1>
            <p className="text-[11px] text-amber-300 font-semibold">Donkey Master & UNO No Mercy</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-purple-200"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="w-full max-w-md my-2 p-3 rounded-2xl bg-slate-900 border border-purple-500/40 text-xs shadow-2xl">
          <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
            <Wifi className="w-4 h-4" /> Server Connection URL
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverUrlInput}
              onChange={e => setServerUrlInput(e.target.value)}
              placeholder="http://localhost:3001"
              className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={handleSaveServerUrl}
              className="px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Profile Setup */}
      <div className="w-full max-w-md my-2 p-3.5 rounded-3xl bg-white/10 backdrop-blur-md border border-purple-500/30 shadow-xl">
        <div className="text-xs uppercase tracking-wider text-purple-200 font-bold mb-2">
          Your Player Profile
        </div>
        <div className="flex items-center gap-3">
          <img
            src={selectedAvatar}
            alt="Avatar"
            className="w-14 h-14 rounded-full border-2 border-amber-400 bg-slate-900 p-0.5 shadow-md"
          />
          <div className="flex-1">
            <input
              type="text"
              value={playerName}
              maxLength={15}
              onChange={e => handleUpdateProfile(e.target.value, selectedAvatar)}
              placeholder="Your nickname (e.g. Thala)"
              className="w-full px-3 py-2 rounded-xl bg-purple-950/80 border border-purple-400/50 text-white font-bold text-sm focus:outline-none focus:border-amber-400 shadow-inner"
            />
            {/* Avatar selector pills */}
            <div className="flex gap-1.5 mt-2">
              {AVATAR_OPTIONS.map((av, idx) => (
                <img
                  key={idx}
                  src={av}
                  alt={`Av ${idx}`}
                  onClick={() => handleUpdateProfile(playerName, av)}
                  className={`w-7 h-7 rounded-full cursor-pointer transition-all ${
                    selectedAvatar === av ? 'ring-2 ring-amber-400 scale-110 shadow-md' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Select Game Mode */}
      <div className="w-full max-w-md my-1">
        <div className="text-xs uppercase tracking-wider text-purple-200 font-bold mb-1.5">
          Select Game Mode
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Donkey Mode */}
          <div
            onClick={() => setSelectedGameType('donkey')}
            className={`cursor-pointer p-3 rounded-2xl border-2 transition-all ${
              selectedGameType === 'donkey'
                ? 'bg-purple-800/70 border-amber-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-2xl mb-1">🫏</div>
            <div className="text-sm font-black text-white">Donkey Master</div>
            <div className="text-[10px] text-purple-200 mt-0.5 leading-tight">
              52 Cards • 4 Suit Columns • Ace Spades Lead • Cut Penalty
            </div>
          </div>

          {/* UNO No Mercy Mode */}
          <div
            onClick={() => setSelectedGameType('uno_no_mercy')}
            className={`cursor-pointer p-3 rounded-2xl border-2 transition-all ${
              selectedGameType === 'uno_no_mercy'
                ? 'bg-rose-900/70 border-amber-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-sm font-black text-white">UNO No Mercy</div>
            <div className="text-[10px] text-rose-200 mt-0.5 leading-tight">
              168 Cards • +10 Draw Stack • 0 Pass • 7 Swap • 25 KO
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="w-full max-w-md p-2 rounded-xl bg-red-600/90 text-white text-xs font-bold text-center">
          {errorMessage}
        </div>
      )}

      {/* PRIMARY ACTION: OPEN FAMILY & FRIENDS TABLE (NO ROOM CODE NEEDED!) */}
      <div className="w-full max-w-md flex flex-col gap-2 pt-2">
        <button
          onClick={handleJoinFamilyTable}
          className="w-full py-4 rounded-3xl bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 text-slate-950 font-black text-base sm:text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-white/60 ring-4 ring-emerald-400/30"
        >
          <Home className="w-6 h-6 fill-current" />
          <span>JOIN FAMILY & FRIENDS TABLE</span>
        </button>
        <p className="text-[11px] text-center text-emerald-300 font-extrabold -mt-0.5">
          ⭐ No code needed! Instant 1-tap join for your family & friends circle (Up to 10).
        </p>

        {/* Optional Private Room Code Toggle */}
        <div className="mt-2 text-center">
          <button
            onClick={() => setShowCodeOptions(!showCodeOptions)}
            className="text-xs text-purple-300 hover:text-white underline font-semibold flex items-center justify-center gap-1 mx-auto"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{showCodeOptions ? 'Hide Private Code Options' : 'Need a Private Room with Code? Click here'}</span>
          </button>
        </div>

        {showCodeOptions && (
          <div className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2 animate-fadeIn">
            <button
              onClick={handleCreateRoom}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md active:scale-95"
            >
              Create Private 6-Digit Room
            </button>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                maxLength={6}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="6-DIGIT CODE"
                className="flex-1 px-3 py-2 rounded-xl bg-purple-950/80 border border-purple-400/40 text-center font-mono font-bold text-xs text-amber-300 focus:outline-none"
              />
              <button
                onClick={handleJoinRoom}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs active:scale-95"
              >
                JOIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECONNECT / ACTIVE GAME NOTIFICATION POP-UP MODAL */}
      {showActiveGameModal && activeGameInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border-2 border-emerald-400 text-center shadow-[0_0_30px_rgba(52,211,153,0.3)]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black tracking-wider uppercase mb-3 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Game In Progress</span>
            </div>

            <div className="text-5xl mb-2">
              {activeGameInfo.gameType === 'donkey' ? '🫏' : '🔥'}
            </div>

            <h2 className="text-xl font-black text-amber-300">
              {activeGameInfo.gameType === 'donkey' ? 'DONKEY MASTER' : 'UNO NO MERCY'}
            </h2>

            <p className="text-xs text-purple-200 mt-2 leading-relaxed">
              You lost connection during an active match in{' '}
              <strong className="text-white font-mono">{activeGameInfo.roomCode === 'FAMILY' ? 'Family Table' : `Room ${activeGameInfo.roomCode}`}</strong>.
              <br />
              An AI computer bot is currently holding your seat and playing your turn!
            </p>

            <div className="my-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Your Hand</span>
                <span className="text-base font-black text-amber-300 font-mono">{activeGameInfo.cardsCount} cards</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Match State</span>
                <span className="text-base font-black text-emerald-300 font-mono">Unfinished</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setShowActiveGameModal(false);
                  socketService.reconnect(activeGameInfo.roomCode);
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 active:scale-95 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>JOIN GAME AGAIN (TAKE CONTROL)</span>
              </button>

              <button
                onClick={() => {
                  socketService.dismissActiveGame(activeGameInfo.roomCode);
                  setShowActiveGameModal(false);
                  setActiveGameInfo(null);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition-all"
              >
                Dismiss & Stay in Home Screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
