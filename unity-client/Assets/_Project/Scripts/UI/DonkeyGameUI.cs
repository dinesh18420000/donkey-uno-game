using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DonkeyUno.Core;
using DonkeyUno.Cards;
using DonkeyUno.Table;
using DonkeyUno.Networking;
using DonkeyUno.Audio;

namespace DonkeyUno.UI
{
    public class DonkeyGameUI : MonoBehaviour
    {
        [Header("Managers & Layouts")]
        [SerializeField] private DonkeyTableLayout donkeyTableLayout;
        [SerializeField] private DonkeyTrickArea donkeyTrickArea;
        [SerializeField] private HandManager handManager;

        [Header("Action Controls")]
        [SerializeField] private Button dealButton;
        [SerializeField] private TextMeshProUGUI dealButtonText;
        [SerializeField] private Button leaveButton;
        [SerializeField] private Button giftButton;

        [Header("Banners & Feedback")]
        [SerializeField] private GameObject cutBannerObject;
        [SerializeField] private TextMeshProUGUI cutBannerText;
        [SerializeField] private TextMeshProUGUI leadSuitText;
        [SerializeField] private TextMeshProUGUI turnStatusText;

        private ClientGameState _currentState;

        private void Start()
        {
            if (handManager != null)
            {
                handManager.OnDonkeyCardPlayed += HandleDonkeyCardPlayed;
            }

            if (dealButton != null)
            {
                dealButton.onClick.AddListener(OnDealButtonClicked);
            }

            if (leaveButton != null)
            {
                leaveButton.onClick.AddListener(OnLeaveButtonClicked);
            }

            if (giftButton != null)
            {
                giftButton.onClick.AddListener(OnGiftButtonClicked);
            }
        }

        public void UpdateGameState(ClientGameState state)
        {
            _currentState = state;
            if (state == null) return;

            string myId = SocketService.Instance != null ? SocketService.Instance.PlayerId : state.myPlayerId;
            bool isMyTurn = state.currentTurnPlayerId == myId;
            bool isFirstTrick = state.roundNumber == 1 && (state.currentTrick == null || state.currentTrick.Count == 0);

            // Rotate players so local viewer is at displayIndex = 0 (Godwin)
            var orderedPlayers = DonkeyTheme.RotatePlayersForViewer(state.players, myId);

            // 1. Table Seats: Opponents on top row, Godwin at bottom
            if (donkeyTableLayout != null)
            {
                donkeyTableLayout.UpdateTable(orderedPlayers, state.currentTurnPlayerId);
            }

            // 2. Center Trick Slots (Yellow, Blue, Pink, Green slots with played cards or card backs)
            if (donkeyTrickArea != null)
            {
                donkeyTrickArea.UpdateTrickArea(orderedPlayers, state.currentTrick, state.currentTurnPlayerId);
            }

            // 3. Local Hand (4 Suit Cascading Columns)
            if (handManager != null)
            {
                var myDonkeyHand = state.GetMyDonkeyHand();
                handManager.UpdateDonkeyHand(myDonkeyHand, state.leadSuit, isMyTurn, isFirstTrick);
            }

            // 4. DEAL Button State
            if (dealButton != null)
            {
                dealButton.interactable = isMyTurn;
                if (dealButtonText != null)
                {
                    dealButtonText.text = "DEAL";
                }
            }

            // 5. Turn & Lead Suit text (if present)
            if (leadSuitText != null)
            {
                leadSuitText.text = state.leadSuit.HasValue ? $"Lead: {state.leadSuit.Value}" : "";
            }

            if (turnStatusText != null)
            {
                var cur = state.players?.Find(p => p.id == state.currentTurnPlayerId);
                turnStatusText.text = isMyTurn ? "YOUR TURN" : $"{cur?.name ?? "Opponent"}'s Turn";
            }

            // 6. Check for Cut
            UpdateCutBanner(state.currentTrick);
        }

        private void OnDealButtonClicked()
        {
            if (_currentState == null) return;
            string myId = SocketService.Instance != null ? SocketService.Instance.PlayerId : _currentState.myPlayerId;
            if (_currentState.currentTurnPlayerId != myId) return;

            if (handManager != null)
            {
                handManager.ConfirmPlaySelected();
            }
        }

        private void OnLeaveButtonClicked()
        {
            if (_currentState == null) return;
            if (SocketService.Instance != null)
            {
                SocketService.Instance.LeaveRoom(_currentState.roomCode);
            }
        }

        private void OnGiftButtonClicked()
        {
            if (_currentState == null) return;
            if (SocketService.Instance != null)
            {
                SocketService.Instance.SendEmote(_currentState.roomCode, "👏");
            }
        }

        private void UpdateCutBanner(List<TrickPlay> trick)
        {
            if (cutBannerObject == null) return;

            bool hasCut = false;
            string cutterName = "";

            if (trick != null)
            {
                foreach (var play in trick)
                {
                    if (play.isCut)
                    {
                        hasCut = true;
                        cutterName = play.playerName;
                        break;
                    }
                }
            }

            cutBannerObject.SetActive(hasCut);
            if (hasCut && cutBannerText != null)
            {
                cutBannerText.text = $"⚡ CUT BY {cutterName.ToUpper()}!";
            }
        }

        private void HandleDonkeyCardPlayed(DonkeyCard card)
        {
            if (_currentState == null) return;
            SocketService.Instance?.PlayDonkeyCard(_currentState.roomCode, card.id);
            AudioManager.Instance?.PlayCardPlay();
        }
    }
}
