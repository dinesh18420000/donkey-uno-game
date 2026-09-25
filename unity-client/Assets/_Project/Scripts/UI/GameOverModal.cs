using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DonkeyUno.Core;
using DonkeyUno.Networking;

namespace DonkeyUno.UI
{
    public class GameOverModal : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private TextMeshProUGUI titleText;
        [SerializeField] private TextMeshProUGUI winnerNameText;
        [SerializeField] private TextMeshProUGUI rankingsListText;
        [SerializeField] private Button replayButton;
        [SerializeField] private Button backToLobbyButton;
        [SerializeField] private Button exitButton;

        private ClientGameState _currentState;

        private void Start()
        {
            if (replayButton != null)
            {
                replayButton.onClick.AddListener(() =>
                {
                    if (_currentState != null)
                    {
                        SocketService.Instance.Emit("replayGame", new
                        {
                            roomCode = _currentState.roomCode,
                            hostPlayerId = SocketService.Instance.PlayerId
                        });
                    }
                });
            }

            if (backToLobbyButton != null)
            {
                backToLobbyButton.onClick.AddListener(() =>
                {
                    if (_currentState != null)
                    {
                        SocketService.Instance.Emit("returnToLobby", new
                        {
                            roomCode = _currentState.roomCode,
                            hostPlayerId = SocketService.Instance.PlayerId
                        });
                    }
                });
            }

            if (exitButton != null)
            {
                exitButton.onClick.AddListener(() =>
                {
                    if (_currentState != null)
                    {
                        SocketService.Instance.LeaveRoom(_currentState.roomCode);
                    }
                });
            }
        }

        public void Setup(ClientGameState state)
        {
            _currentState = state;
            if (state == null) return;

            string myId = SocketService.Instance.PlayerId;
            bool isHost = state.hostId == myId;

            if (replayButton != null) replayButton.gameObject.SetActive(isHost);
            if (backToLobbyButton != null) backToLobbyButton.gameObject.SetActive(isHost);

            var winner = state.players?.Find(p => p.rank == 1);
            if (winnerNameText != null)
            {
                winnerNameText.text = winner != null ? $"🏆 {winner.name} WINS!" : "GAME OVER";
            }

            if (rankingsListText != null && state.players != null)
            {
                var sb = new System.Text.StringBuilder();
                foreach (var p in state.players)
                {
                    string medal = p.rank == 1 ? "🥇" : (p.rank == 2 ? "🥈" : (p.rank == 3 ? "🥉" : "•"));
                    if (p.isDonkey) medal = "🫏";
                    if (p.isMercyEliminated) medal = "💀";

                    string status = p.rank.HasValue ? $"Rank #{p.rank}" : (p.isDonkey ? "THE DONKEY" : (p.isMercyEliminated ? "Mercy KO" : ""));
                    sb.AppendLine($"{medal} {p.name} - {status}");
                }
                rankingsListText.text = sb.ToString();
            }
        }
    }
}
