using UnityEngine;
using DonkeyUno.Core;
using DonkeyUno.Networking;

namespace DonkeyUno.UI
{
    public class GameController : MonoBehaviour
    {
        [Header("Screen Panels")]
        [SerializeField] private GameObject lobbyScreen;
        [SerializeField] private UnoGameUI unoGameScreen;
        [SerializeField] private DonkeyGameUI donkeyGameScreen;
        [SerializeField] private GameObject gameOverModal;

        private void Start()
        {
            // Auto connect to server
            if (SocketService.Instance != null)
            {
                SocketService.Instance.OnGameStateReceived += HandleGameState;
                SocketService.Instance.OnGameTerminated += HandleGameTerminated;
                SocketService.Instance.Connect();
            }

            ShowLobby();
        }

        private void OnDestroy()
        {
            if (SocketService.Instance != null)
            {
                SocketService.Instance.OnGameStateReceived -= HandleGameState;
                SocketService.Instance.OnGameTerminated -= HandleGameTerminated;
            }
        }

        private void HandleGameState(ClientGameState state)
        {
            if (state == null || state.status == RoomStatus.waiting)
            {
                ShowLobby();
                lobbyScreen.GetComponent<LobbyUI>()?.UpdateGameState(state);
                return;
            }

            // Route to appropriate game screen
            if (state.gameType == GameType.uno_no_mercy)
            {
                // Lock screen to Landscape for Uno No Mercy
                Screen.orientation = ScreenOrientation.LandscapeLeft;

                if (lobbyScreen != null) lobbyScreen.SetActive(false);
                if (donkeyGameScreen != null) donkeyGameScreen.gameObject.SetActive(false);
                if (unoGameScreen != null)
                {
                    unoGameScreen.gameObject.SetActive(true);
                    unoGameScreen.UpdateGameState(state);
                }
            }
            else
            {
                // Lock screen to Portrait for Donkey Master
                Screen.orientation = ScreenOrientation.Portrait;

                if (lobbyScreen != null) lobbyScreen.SetActive(false);
                if (unoGameScreen != null) unoGameScreen.gameObject.SetActive(false);
                if (donkeyGameScreen != null)
                {
                    donkeyGameScreen.gameObject.SetActive(true);
                    donkeyGameScreen.UpdateGameState(state);
                }
            }

            // Game Over modal
            if (gameOverModal != null)
            {
                gameOverModal.SetActive(state.status == RoomStatus.game_over);
            }
        }

        private void HandleGameTerminated(string reason)
        {
            Debug.Log($"[GameController] Game terminated: {reason}");
            ShowLobby();
        }

        private void ShowLobby()
        {
            // Default to Portrait for Lobby
            Screen.orientation = ScreenOrientation.Portrait;

            if (lobbyScreen != null) lobbyScreen.SetActive(true);
            if (unoGameScreen != null) unoGameScreen.gameObject.SetActive(false);
            if (donkeyGameScreen != null) donkeyGameScreen.gameObject.SetActive(false);
            if (gameOverModal != null) gameOverModal.SetActive(false);
        }
    }
}
