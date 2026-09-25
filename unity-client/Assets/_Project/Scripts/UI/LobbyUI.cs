using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DonkeyUno.Core;
using DonkeyUno.Networking;

namespace DonkeyUno.UI
{
    public class LobbyUI : MonoBehaviour
    {
        [Header("Profile Inputs")]
        [SerializeField] private TMP_InputField nameInputField;
        [SerializeField] private TMP_InputField serverUrlInputField;

        [Header("Room Creation")]
        [SerializeField] private TMP_Dropdown gameTypeDropdown;
        [SerializeField] private Slider maxPlayersSlider;
        [SerializeField] private TextMeshProUGUI maxPlayersText;
        [SerializeField] private Button createRoomButton;

        [Header("Join Room")]
        [SerializeField] private TMP_InputField roomCodeInputField;
        [SerializeField] private Button joinRoomButton;

        [Header("Waiting Room")]
        [SerializeField] private GameObject waitingRoomPanel;
        [SerializeField] private TextMeshProUGUI roomCodeDisplayText;
        [SerializeField] private TextMeshProUGUI playersListText;
        [SerializeField] private Button addBotButton;
        [SerializeField] private Button startGameButton;
        [SerializeField] private Button leaveRoomButton;

        private ClientGameState _currentState;

        private void Start()
        {
            if (nameInputField != null)
            {
                nameInputField.text = SocketService.Instance.PlayerName;
                nameInputField.onEndEdit.AddListener(val => SocketService.Instance.UpdateProfile(val, SocketService.Instance.AvatarId));
            }

            if (serverUrlInputField != null)
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

            if (joinRoomButton != null)
            {
                joinRoomButton.onClick.AddListener(OnJoinRoomClicked);
            }

            if (addBotButton != null)
            {
                addBotButton.onClick.AddListener(() =>
                {
                    if (_currentState != null)
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
                    if (_currentState != null)
                    {
                        SocketService.Instance.StartGame(_currentState.roomCode);
                    }
                });
            }

            if (leaveRoomButton != null)
            {
                leaveRoomButton.onClick.AddListener(() =>
                {
                    if (_currentState != null)
                    {
                        SocketService.Instance.LeaveRoom(_currentState.roomCode);
                    }
                });
            }
        }

        public void UpdateGameState(ClientGameState state)
        {
            _currentState = state;

            if (state == null || state.status == RoomStatus.playing)
            {
                if (waitingRoomPanel != null) waitingRoomPanel.SetActive(false);
                return;
            }

            // Waiting room panel
            if (state.status == RoomStatus.waiting)
            {
                if (waitingRoomPanel != null) waitingRoomPanel.SetActive(true);
                if (roomCodeDisplayText != null) roomCodeDisplayText.text = $"ROOM CODE: {state.roomCode}";

                string myId = SocketService.Instance.PlayerId;
                bool isHost = state.hostId == myId;

                if (startGameButton != null) startGameButton.gameObject.SetActive(isHost);
                if (addBotButton != null) addBotButton.gameObject.SetActive(isHost && state.players.Count < 10);

                if (playersListText != null && state.players != null)
                {
                    playersListText.text = string.Join("\n", state.players.ConvertAll(p =>
                        $"• {p.name} {(p.isHost ? "(Host)" : "")} {(p.isBot ? "[AI Bot]" : "")}"
                    ));
                }
            }
        }

        private void OnCreateRoomClicked()
        {
            GameType gType = gameTypeDropdown != null && gameTypeDropdown.value == 1
                ? GameType.uno_no_mercy
                : GameType.donkey;

            int maxPlayers = maxPlayersSlider != null ? (int)maxPlayersSlider.value : 6;
            SocketService.Instance.CreateRoom(gType, maxPlayers);
        }

        private void OnJoinRoomClicked()
        {
            string code = roomCodeInputField != null ? roomCodeInputField.text.Trim().ToUpper() : "";
            if (!string.IsNullOrEmpty(code))
            {
                SocketService.Instance.JoinRoom(code);
            }
        }
    }
}
