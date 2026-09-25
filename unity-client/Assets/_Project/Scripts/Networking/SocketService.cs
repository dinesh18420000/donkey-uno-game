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
    public class SocketService : MonoBehaviour
    {
        public static SocketService Instance { get; private set; }

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
        public event Action<ClientGameState> OnGameStateReceived;
        public event Action<string, string, string> OnPlayerEmoteReceived; // playerId, playerName, emote
        public event Action<string> OnGameTerminated;

        private ClientWebSocket _webSocket;
        private CancellationTokenSource _cts;
        private bool _isConnected;
        private readonly Queue<Action> _mainThreadQueue = new Queue<Action>();
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
                serverUrl = savedServer;
            }
        }

        public void SetServerUrl(string url)
        {
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
            _isConnected = true;
            Debug.Log("[SocketService WebGL] Connected to game server!");
            EnqueueMainThread(() => OnConnected?.Invoke());
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
            _isConnected = false;
            EnqueueMainThread(() => OnDisconnected?.Invoke(reason));
        }
#endif

        public void Connect()
        {
            if (_isConnected || _webSocket != null) return;

#if UNITY_WEBGL && !UNITY_EDITOR
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
            string wsUrl = serverUrl.Replace("http://", "ws://").Replace("https://", "wss://");
            if (!wsUrl.EndsWith("/")) wsUrl += "/";
            wsUrl += "socket.io/?EIO=4&transport=websocket";

            _cts = new CancellationTokenSource();
            _webSocket = new ClientWebSocket();

            var connectTask = _webSocket.ConnectAsync(new Uri(wsUrl), _cts.Token);
            while (!connectTask.IsCompleted)
            {
                yield return null;
            }

            if (connectTask.IsFaulted || _webSocket.State != WebSocketState.Open)
            {
                Debug.LogError($"[SocketService] Connection failed: {connectTask.Exception?.Message}");
                EnqueueMainThread(() => OnDisconnected?.Invoke("Connection failed"));
                yield break;
            }

            _isConnected = true;
            Debug.Log("[SocketService] Connected to game server!");
            EnqueueMainThread(() => OnConnected?.Invoke());

            // Start listen loop
            Task.Run(ReceiveLoop, _cts.Token);
        }

        private async Task ReceiveLoop()
        {
            var buffer = new byte[8192];
            var messageBuilder = new StringBuilder();

            try
            {
                while (_webSocket.State == WebSocketState.Open && !_cts.IsCancellationRequested)
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
                Debug.LogWarning($"[SocketService] Receive loop stopped: {ex.Message}");
            }
            finally
            {
                _isConnected = false;
                EnqueueMainThread(() => OnDisconnected?.Invoke("Disconnected"));
            }
        }

        private void HandleIncomingMessage(string msg)
        {
            if (string.IsNullOrEmpty(msg)) return;

            // Engine.IO packet types:
            // 0: Handshake
            // 2: Ping from server -> respond with Pong '3'
            // 3: Pong
            // 40: Socket.io connected
            // 42: Socket.io custom event: 42["eventName", payload]
            if (msg.StartsWith("0"))
            {
                // Respond with Socket.IO connect packet "40"
                SendRaw("40");
            }
            else if (msg == "2")
            {
                // Heartbeat Pong response
                SendRaw("3");
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
#if UNITY_WEBGL && !UNITY_EDITOR
            if (!_isConnected) return;
            var array = new JArray { eventName, JToken.FromObject(payload) };
            string packet = "42" + array.ToString(Formatting.None);
            WebSocketSend(packet);
            return;
#else
            if (!_isConnected || _webSocket == null || _webSocket.State != WebSocketState.Open) return;
            var array = new JArray { eventName, JToken.FromObject(payload) };
            string packet = "42" + array.ToString(Formatting.None);
            SendRaw(packet);
#endif
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
            _isConnected = false;
            return;
#else
            _cts?.Cancel();
            _webSocket?.Dispose();
            _webSocket = null;
            _isConnected = false;
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
                swapTargetPlayerId = swapTargetId,
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
            Emit("catchUno", new
            {
                roomCode,
                catcherPlayerId = PlayerId,
                targetPlayerId
            });
        }

        public void PlayDonkeyCard(string roomCode, string cardId)
        {
            Emit("playDonkeyCard", new { roomCode, playerId = PlayerId, cardId });
        }

        public void SendEmote(string roomCode, string emote)
        {
            Emit("sendEmote", new
            {
                roomCode,
                playerId = PlayerId,
                playerName = PlayerName,
                emote
            });
        }

        public void LeaveRoom(string roomCode)
        {
            Emit("leaveRoom", new { roomCode, playerId = PlayerId });
        }
    }
}
