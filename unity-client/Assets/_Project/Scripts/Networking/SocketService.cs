using System;
using System.Collections;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using DonkeyUno.Core;

namespace DonkeyUno.Networking
{
    public enum ConnectionState
    {
        Disconnected,
        Connecting,
        Connected
    }

    public class SocketService : MonoBehaviour
    {
        public static SocketService Instance { get; private set; }

        public const string CloudServerUrl = "https://donkey-uno-server.onrender.com";
        public const string LocalServerUrl = "http://localhost:3001";

        [Header("Server Configuration")]
        [SerializeField] private string serverUrl = "http://localhost:3001";
        public string ServerUrl => serverUrl;

        [Header("Player Profile")]
        public string PlayerId { get; private set; }
        public string PlayerName = "Player";
        public string AvatarId = "avatar_1";

        // Action Events
        public event Action OnConnected;
        public event Action<string> OnDisconnected;
        public event Action<string> OnStatusMessage;
        public event Action<ClientGameState> OnGameStateReceived;
        public event Action<string, string, string> OnPlayerEmoteReceived;
        public event Action<string> OnGameTerminated;

        public ConnectionState State { get; private set; } = ConnectionState.Disconnected;
        public bool IsConnected => State == ConnectionState.Connected;

        private ClientWebSocket _webSocket;
        private CancellationTokenSource _cts;
        private bool _isNamespaceConnected;
        private bool _isConnectingRoutineRunning;
        private readonly Queue<Action> _mainThreadQueue = new Queue<Action>();
        private readonly Queue<string> _pendingQueue = new Queue<string>();
        private readonly object _queueLock = new object();

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                InitStorage();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void InitStorage()
        {
            PlayerId = PlayerPrefs.GetString("donkey_uno_player_id", "");
            if (string.IsNullOrEmpty(PlayerId))
            {
                PlayerId = "p_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                PlayerPrefs.SetString("donkey_uno_player_id", PlayerId);
            }

            PlayerName = PlayerPrefs.GetString("donkey_uno_player_name", "Player_" + UnityEngine.Random.Range(100, 999));
            AvatarId = PlayerPrefs.GetString("donkey_uno_avatar", "avatar_1");

            string savedServer = PlayerPrefs.GetString("donkey_uno_server_url", "");
            if (!string.IsNullOrEmpty(savedServer))
            {
                if (Application.isMobilePlatform && (savedServer.Contains("localhost") || savedServer.Contains("127.0.0.1")))
                {
                    serverUrl = CloudServerUrl;
                }
                else
                {
                    serverUrl = savedServer;
                }
            }
            else
            {
                serverUrl = Application.isMobilePlatform ? CloudServerUrl : LocalServerUrl;
            }
        }

        public void SetServerUrl(string url)
        {
            if (string.IsNullOrEmpty(url)) url = CloudServerUrl;
            serverUrl = url;
            PlayerPrefs.SetString("donkey_uno_server_url", url);
            PlayerPrefs.Save();
            Disconnect();
            Connect();
        }

        public void UpdateProfile(string newName, string newAvatar)
        {
            PlayerName = newName;
            AvatarId = newAvatar;
            PlayerPrefs.SetString("donkey_uno_player_name", newName);
            PlayerPrefs.SetString("donkey_uno_avatar", newAvatar);
            PlayerPrefs.Save();
        }

        private void Update()
        {
            // Dispatch queued network events on Unity main thread
            lock (_queueLock)
            {
                while (_mainThreadQueue.Count > 0)
                {
                    _mainThreadQueue.Dequeue()?.Invoke();
                }
            }
        }

#if UNITY_WEBGL && !UNITY_EDITOR
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void WebSocketConnect(string url);

        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void WebSocketSend(string msg);

        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void WebSocketClose();

        public void OnWebGLOpen()
        {
            State = ConnectionState.Connected;
            _isNamespaceConnected = true;
            Debug.Log("[SocketService WebGL] Connected to game server!");
            EnqueueMainThread(() => {
                OnConnected?.Invoke();
                FlushPendingQueue();
            });
        }

        public void OnWebGLMessage(string msg)
        {
            HandleIncomingMessage(msg);
        }

        public void OnWebGLError(string err)
        {
            Debug.LogError($"[SocketService WebGL] Error: {err}");
        }

        public void OnWebGLClose(string reason)
        {
            State = ConnectionState.Disconnected;
            _isNamespaceConnected = false;
            EnqueueMainThread(() => OnDisconnected?.Invoke(reason));
        }
#endif

        public void Connect()
        {
            if (State == ConnectionState.Connected || _isConnectingRoutineRunning) return;

#if UNITY_WEBGL && !UNITY_EDITOR
            State = ConnectionState.Connecting;
            string webglUrl = serverUrl.Replace("http://", "ws://").Replace("https://", "wss://");
            if (!webglUrl.EndsWith("/")) webglUrl += "/";
            webglUrl += "socket.io/?EIO=4&transport=websocket";
            WebSocketConnect(webglUrl);
            return;
#else
            StartCoroutine(ConnectAsyncRoutine());
#endif
        }

        private IEnumerator ConnectAsyncRoutine()
        {
            _isConnectingRoutineRunning = true;
            State = ConnectionState.Connecting;
            EnqueueMainThread(() => OnStatusMessage?.Invoke($"Connecting to {serverUrl}..."));

            string wsUrl = serverUrl.Replace("http://", "ws://").Replace("https://", "wss://");
            if (!wsUrl.EndsWith("/")) wsUrl += "/";
            wsUrl += "socket.io/?EIO=4&transport=websocket";

            _cts?.Cancel();
            _cts = new CancellationTokenSource();
            _webSocket?.Dispose();
            _webSocket = new ClientWebSocket();

            Task connectTask = null;
            try
            {
                connectTask = _webSocket.ConnectAsync(new Uri(wsUrl), _cts.Token);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[SocketService] Initial connect call failed: {ex.Message}");
            }

            float timeout = 4.0f;
            float elapsed = 0f;

            while (connectTask != null && !connectTask.IsCompleted && elapsed < timeout)
            {
                elapsed += Time.unscaledDeltaTime;
                yield return null;
            }

            bool failed = connectTask == null || connectTask.IsFaulted || _webSocket.State != WebSocketState.Open;

            if (failed)
            {
                Debug.LogWarning($"[SocketService] Connection to {serverUrl} failed.");

                // Auto-fallback: If localhost failed, switch to Render cloud server automatically!
                if (serverUrl.Contains("localhost") || serverUrl.Contains("127.0.0.1"))
                {
                    Debug.Log($"[SocketService] Local server unreachable. Auto-fallback to Cloud: {CloudServerUrl}");
                    serverUrl = CloudServerUrl;
                    EnqueueMainThread(() => OnStatusMessage?.Invoke("Localhost offline. Connecting to Cloud Server..."));
                    _webSocket?.Dispose();
                    _webSocket = null;
                    _isConnectingRoutineRunning = false;
                    yield return new WaitForSeconds(0.3f);
                    yield return ConnectAsyncRoutine();
                    yield break;
                }

                State = ConnectionState.Disconnected;
                _isConnectingRoutineRunning = false;
                _webSocket?.Dispose();
                _webSocket = null;
                EnqueueMainThread(() => {
                    OnDisconnected?.Invoke("Server unreachable");
                    OnStatusMessage?.Invoke("Cannot reach server. Tap to retry.");
                });
                yield break;
            }

            Debug.Log($"[SocketService] WebSocket open. Handshaking Socket.IO namespace with {serverUrl}...");
            _isConnectingRoutineRunning = false;

            // Start background listening loop
            Task.Run(ReceiveLoop, _cts.Token);
        }

        private async Task ReceiveLoop()
        {
            var buffer = new byte[8192];
            var messageBuilder = new StringBuilder();

            try
            {
                while (_webSocket != null && _webSocket.State == WebSocketState.Open && !_cts.IsCancellationRequested)
                {
                    var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                        break;
                    }

                    messageBuilder.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));

                    if (result.EndOfMessage)
                    {
                        string rawMessage = messageBuilder.ToString();
                        messageBuilder.Clear();
                        HandleIncomingMessage(rawMessage);
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[SocketService] Receive loop ended: {ex.Message}");
            }
            finally
            {
                State = ConnectionState.Disconnected;
                _isNamespaceConnected = false;
                EnqueueMainThread(() => OnDisconnected?.Invoke("Disconnected"));
            }
        }

        private void HandleIncomingMessage(string msg)
        {
            if (string.IsNullOrEmpty(msg)) return;

            // Engine.IO Packet Types:
            // 0: Handshake -> Send Socket.IO connect '40'
            // 2: Ping from server -> reply Pong '3'
            // 3: Pong
            // 40: Socket.IO connected acknowledgment
            // 42: Custom Socket.IO event: 42["eventName", payload]
            if (msg.StartsWith("0"))
            {
                // Engine.IO handshake received. Request Socket.IO root namespace connection
                SendRaw("40");
            }
            else if (msg == "2")
            {
                // Heartbeat ping from server
                SendRaw("3");
            }
            else if (msg.StartsWith("40"))
            {
                // Connected to Socket.IO namespace!
                Debug.Log("[SocketService] Socket.IO namespace handshake established!");
                _isNamespaceConnected = true;
                State = ConnectionState.Connected;
                EnqueueMainThread(() => {
                    OnConnected?.Invoke();
                    OnStatusMessage?.Invoke($"Online: {(serverUrl.Contains("render") ? "Cloud Server" : "Local Server")}");
                    FlushPendingQueue();
                });
            }
            else if (msg.StartsWith("42"))
            {
                string jsonPayload = msg.Substring(2);
                try
                {
                    var eventArray = JArray.Parse(jsonPayload);
                    if (eventArray.Count >= 2)
                    {
                        string eventName = eventArray[0].ToString();
                        JToken eventData = eventArray[1];
                        DispatchSocketEvent(eventName, eventData);
                    }
                }
                catch (Exception e)
                {
                    Debug.LogError($"[SocketService] Failed parsing event: {e.Message}");
                }
            }
        }

        private void DispatchSocketEvent(string eventName, JToken data)
        {
            switch (eventName)
            {
                case "gameState":
                    if (data != null && data.Type != JTokenType.Null)
                    {
                        var state = data.ToObject<ClientGameState>();
                        EnqueueMainThread(() => OnGameStateReceived?.Invoke(state));
                    }
                    else
                    {
                        EnqueueMainThread(() => OnGameStateReceived?.Invoke(null));
                    }
                    break;

                case "playerEmote":
                    string pId = data["playerId"]?.ToString();
                    string pName = data["playerName"]?.ToString();
                    string emote = data["emote"]?.ToString();
                    EnqueueMainThread(() => OnPlayerEmoteReceived?.Invoke(pId, pName, emote));
                    break;

                case "gameTerminated":
                    string reason = data["reason"]?.ToString() ?? "Game ended.";
                    EnqueueMainThread(() => OnGameTerminated?.Invoke(reason));
                    break;
            }
        }

        public void Emit(string eventName, object payload)
        {
            var array = new JArray { eventName, JToken.FromObject(payload) };
            string packet = "42" + array.ToString(Formatting.None);

#if UNITY_WEBGL && !UNITY_EDITOR
            if (State != ConnectionState.Connected) return;
            WebSocketSend(packet);
            return;
#else
            if (!_isNamespaceConnected || _webSocket == null || _webSocket.State != WebSocketState.Open)
            {
                Debug.Log($"[SocketService] Not yet connected to server. Queueing event: {eventName}");
                lock (_pendingQueue)
                {
                    _pendingQueue.Enqueue(packet);
                }
                Connect();
                return;
            }

            SendRaw(packet);
#endif
        }

        private void FlushPendingQueue()
        {
            lock (_pendingQueue)
            {
                while (_pendingQueue.Count > 0)
                {
                    string packet = _pendingQueue.Dequeue();
                    Debug.Log($"[SocketService] Sending queued packet: {packet}");
                    SendRaw(packet);
                }
            }
        }

        private async void SendRaw(string packet)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WebSocketSend(packet);
            return;
#else
            if (_webSocket == null || _webSocket.State != WebSocketState.Open) return;
            byte[] bytes = Encoding.UTF8.GetBytes(packet);
            try
            {
                await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[SocketService] Send error: {ex.Message}");
            }
#endif
        }

        public void Disconnect()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WebSocketClose();
            State = ConnectionState.Disconnected;
            _isNamespaceConnected = false;
            return;
#else
            _cts?.Cancel();
            _webSocket?.Dispose();
            _webSocket = null;
            State = ConnectionState.Disconnected;
            _isNamespaceConnected = false;
#endif
        }

        private void EnqueueMainThread(Action action)
        {
            lock (_queueLock)
            {
                _mainThreadQueue.Enqueue(action);
            }
        }

        // --- GAME ACTIONS API ---
        public void CreateRoom(GameType gameType, int maxPlayers)
        {
            Emit("createRoom", new
            {
                hostPlayerId = PlayerId,
                hostName = PlayerName,
                avatar = AvatarId,
                gameType = gameType.ToString(),
                maxPlayers
            });
        }

        public void JoinRoom(string roomCode)
        {
            Emit("joinRoom", new
            {
                roomCode,
                playerId = PlayerId,
                playerName = PlayerName,
                avatar = AvatarId
            });
        }

        public void JoinFamilyRoom(GameType gameType)
        {
            Emit("joinFamilyRoom", new
            {
                playerId = PlayerId,
                playerName = PlayerName,
                avatar = AvatarId,
                gameType = gameType.ToString()
            });
        }

        public void StartGame(string roomCode)
        {
            Emit("startGame", new { roomCode, hostPlayerId = PlayerId });
        }

        public void PlayUnoCard(string roomCode, string cardId, UnoColor? chosenColor, string swapTargetId, bool callUno)
        {
            Emit("playUnoCard", new
            {
                roomCode,
                playerId = PlayerId,
                cardId,
                chosenColor = chosenColor?.ToString(),
                swapTargetId,
                callUno
            });
        }

        public void DrawUnoCard(string roomCode)
        {
            Emit("drawUnoCard", new { roomCode, playerId = PlayerId });
        }

        public void CallUno(string roomCode)
        {
            Emit("callUno", new { roomCode, playerId = PlayerId });
        }

        public void CatchUno(string roomCode, string targetPlayerId)
        {
            Emit("catchUno", new { roomCode, catcherPlayerId = PlayerId, targetPlayerId });
        }

        public void PlayDonkeyCard(string roomCode, string cardId)
        {
            Emit("playDonkeyCard", new { roomCode, playerId = PlayerId, cardId });
        }

        public void SendEmote(string roomCode, string emote)
        {
            Emit("playerEmote", new { roomCode, playerId = PlayerId, playerName = PlayerName, emote });
        }

        public void LeaveRoom(string roomCode)
        {
            Emit("leaveRoom", new { roomCode, playerId = PlayerId });
        }
    }
}
