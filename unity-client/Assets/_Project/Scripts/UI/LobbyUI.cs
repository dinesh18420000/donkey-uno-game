using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DonkeyUno.Core;
using DonkeyUno.Networking;

namespace DonkeyUno.UI
{
    public class LobbyUI : MonoBehaviour
    {
        [Header("Panels")]
        [SerializeField] private GameObject mainPanel;
        [SerializeField] private GameObject waitingRoomPanel;

        [Header("Connection Status")]
        [SerializeField] private TextMeshProUGUI connectionBadgeText;
        [SerializeField] private TextMeshProUGUI statusFeedbackText;

        [Header("Profile Inputs")]
        [SerializeField] private TMP_InputField nameInputField;
        [SerializeField] private TMP_InputField serverUrlInputField;

        [Header("Family Table (1-Tap Join)")]
        [SerializeField] private Button joinFamilyTableButton;
        [SerializeField] private TextMeshProUGUI joinFamilyTableButtonText;

        [Header("Room Creation")]
        [SerializeField] private TMP_Dropdown gameTypeDropdown;
        [SerializeField] private Slider maxPlayersSlider;
        [SerializeField] private TextMeshProUGUI maxPlayersText;
        [SerializeField] private Button createRoomButton;

        [Header("Join Room")]
        [SerializeField] private TMP_InputField roomCodeInputField;
        [SerializeField] private Button joinRoomButton;

        [Header("Waiting Room")]
        [SerializeField] private TextMeshProUGUI roomCodeDisplayText;
        [SerializeField] private TextMeshProUGUI gameModeBadgeText;
        [SerializeField] private TextMeshProUGUI playersListText;
        [SerializeField] private Button addBotButton;
        [SerializeField] private Button startGameButton;
        [SerializeField] private Button leaveRoomButton;

        private ClientGameState _currentState;

        private void Start()
        {
            if (SocketService.Instance != null)
            {
                SocketService.Instance.OnConnected += HandleConnected;
                SocketService.Instance.OnDisconnected += HandleDisconnected;
                SocketService.Instance.OnStatusMessage += HandleStatusMessage;

                UpdateConnectionUI();
            }

            if (nameInputField != null && SocketService.Instance != null)
            {
                nameInputField.text = SocketService.Instance.PlayerName;
                nameInputField.onEndEdit.AddListener(val => SocketService.Instance.UpdateProfile(val, SocketService.Instance.AvatarId));
            }

            if (serverUrlInputField != null && SocketService.Instance != null)
            {
                serverUrlInputField.text = SocketService.Instance.ServerUrl;
                serverUrlInputField.onEndEdit.AddListener(val => SocketService.Instance.SetServerUrl(val));
            }

            if (maxPlayersSlider != null)
            {
                maxPlayersSlider.onValueChanged.AddListener(val =>
                {
                    if (maxPlayersText != null) maxPlayersText.text = $"Max Players: {(int)val}";
                });
            }

            if (createRoomButton != null)
            {
                createRoomButton.onClick.AddListener(OnCreateRoomClicked);
            }

            if (joinFamilyTableButton != null)
            {
                joinFamilyTableButton.onClick.AddListener(OnJoinFamilyTableClicked);
            }

            if (joinRoomButton != null)
            {
                joinRoomButton.onClick.AddListener(OnJoinRoomClicked);
            }

            if (addBotButton != null)
            {
                addBotButton.onClick.AddListener(() =>
                {
                    if (_currentState != null && SocketService.Instance != null)
                    {
                        SocketService.Instance.Emit("addBot", new
                        {
                            roomCode = _currentState.roomCode,
                            hostPlayerId = SocketService.Instance.PlayerId
                        });
                    }
                });
            }

            if (startGameButton != null)
            {
                startGameButton.onClick.AddListener(() =>
                {
                    if (_currentState != null && SocketService.Instance != null)
                    {
                        SocketService.Instance.StartGame(_currentState.roomCode);
                    }
                });
            }

            if (leaveRoomButton != null)
            {
                leaveRoomButton.onClick.AddListener(() =>
                {
                    if (_currentState != null && SocketService.Instance != null)
                    {
                        SocketService.Instance.LeaveRoom(_currentState.roomCode);
                    }
                    ShowMainLobby();
                });
            }

            // Ensure initial panel visibility
            ShowMainLobby();
        }

        private void OnDestroy()
        {
            if (SocketService.Instance != null)
            {
                SocketService.Instance.OnConnected -= HandleConnected;
                SocketService.Instance.OnDisconnected -= HandleDisconnected;
                SocketService.Instance.OnStatusMessage -= HandleStatusMessage;
            }
        }

        private void HandleConnected()
        {
            UpdateConnectionUI();
            if (statusFeedbackText != null) statusFeedbackText.text = "";
        }

        private void HandleDisconnected(string reason)
        {
            UpdateConnectionUI();
        }

        private void HandleStatusMessage(string message)
        {
            if (connectionBadgeText != null && SocketService.Instance != null && !SocketService.Instance.IsConnected)
            {
                connectionBadgeText.text = message;
            }
            if (statusFeedbackText != null)
            {
                statusFeedbackText.text = message;
            }
        }

        private void UpdateConnectionUI()
        {
            if (connectionBadgeText == null || SocketService.Instance == null) return;

            if (SocketService.Instance.IsConnected)
            {
                string sUrl = SocketService.Instance.ServerUrl;
                string label = sUrl.Contains("render") ? "Render Cloud" : "Local Server (3001)";
                connectionBadgeText.text = $"🟢 ONLINE: {label}";
                connectionBadgeText.color = new Color(0.2f, 1f, 0.4f);
            }
            else if (SocketService.Instance.State == ConnectionState.Connecting)
            {
                connectionBadgeText.text = "🟡 CONNECTING TO SERVER...";
                connectionBadgeText.color = new Color(1f, 0.85f, 0.2f);
            }
            else
            {
                connectionBadgeText.text = "🔴 OFFLINE (Connecting...)";
                connectionBadgeText.color = new Color(1f, 0.35f, 0.35f);
            }
        }

        public void UpdateGameState(ClientGameState state)
        {
            _currentState = state;

            if (state == null || state.status == RoomStatus.playing)
            {
                ShowMainLobby();
                return;
            }

            // Waiting room panel
            if (state.status == RoomStatus.waiting)
            {
                if (mainPanel != null) mainPanel.SetActive(false);
                if (waitingRoomPanel != null) waitingRoomPanel.SetActive(true);

                if (joinFamilyTableButtonText != null)
                {
                    joinFamilyTableButtonText.text = "JOIN FAMILY & FRIENDS TABLE 🏠";
                }

                if (roomCodeDisplayText != null)
                {
                    roomCodeDisplayText.text = state.roomCode == "FAMILY" 
                        ? "🏠 FAMILY & FRIENDS TABLE" 
                        : $"ROOM CODE: {state.roomCode}";
                }

                if (gameModeBadgeText != null)
                {
                    gameModeBadgeText.text = state.gameType == GameType.uno_no_mercy
                        ? "🔥 UNO NO MERCY (168 Cards • Stacking)"
                        : "🫏 DONKEY MASTER (52 Cards • Penalty Cut)";
                }

                string myId = SocketService.Instance != null ? SocketService.Instance.PlayerId : "";
                bool isHost = state.hostId == myId;

                if (startGameButton != null) startGameButton.gameObject.SetActive(isHost);
                if (addBotButton != null) addBotButton.gameObject.SetActive(isHost && state.players.Count < 10);

                if (playersListText != null && state.players != null)
                {
                    string list = $"Connected Players ({state.players.Count}/10):\n\n";
                    foreach (var p in state.players)
                    {
                        string hostTag = p.isHost ? " 👑 [Host]" : "";
                        string botTag = p.isBot ? " 🤖 [Bot]" : "";
                        string meTag = p.id == myId ? " (You)" : "";
                        list += $"• {p.name}{meTag}{hostTag}{botTag}\n";
                    }
                    playersListText.text = list;
                }
            }
        }

        private void ShowMainLobby()
        {
            if (mainPanel != null) mainPanel.SetActive(true);
            if (waitingRoomPanel != null) waitingRoomPanel.SetActive(false);

            if (joinFamilyTableButtonText != null)
            {
                joinFamilyTableButtonText.text = "JOIN FAMILY & FRIENDS TABLE 🏠";
            }
            if (statusFeedbackText != null)
            {
                statusFeedbackText.text = "";
            }
        }

        private void OnCreateRoomClicked()
        {
            if (SocketService.Instance == null) return;

            GameType gType = gameTypeDropdown != null && gameTypeDropdown.value == 1
                ? GameType.uno_no_mercy
                : GameType.donkey;

            int maxPlayers = maxPlayersSlider != null ? (int)maxPlayersSlider.value : 6;
            if (statusFeedbackText != null) statusFeedbackText.text = "Creating room...";
            SocketService.Instance.CreateRoom(gType, maxPlayers);
        }

        private void OnJoinFamilyTableClicked()
        {
            if (SocketService.Instance == null) return;

            GameType gType = gameTypeDropdown != null && gameTypeDropdown.value == 1
                ? GameType.uno_no_mercy
                : GameType.donkey;

            if (joinFamilyTableButtonText != null)
            {
                joinFamilyTableButtonText.text = "Joining Family Table 🏠...";
            }
            if (statusFeedbackText != null)
            {
                statusFeedbackText.text = "Connecting to Family Table...";
            }

            Debug.Log($"[LobbyUI] Join Family Table clicked! GameType: {gType}");
            SocketService.Instance.JoinFamilyRoom(gType);
        }

        private void OnJoinRoomClicked()
        {
            if (SocketService.Instance == null) return;

            string code = roomCodeInputField != null ? roomCodeInputField.text.Trim().ToUpper() : "";
            if (!string.IsNullOrEmpty(code))
            {
                if (statusFeedbackText != null) statusFeedbackText.text = $"Joining room {code}...";
                SocketService.Instance.JoinRoom(code);
            }
        }
    }
}
