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
        [Header("Managers")]
        [SerializeField] private TableLayoutManager tableLayoutManager;
        [SerializeField] private HandManager handManager;

        [Header("Trick Area")]
        [SerializeField] private RectTransform trickContainer;
        [SerializeField] private GameObject trickCardPrefab;
        [SerializeField] private TextMeshProUGUI leadSuitText;
        [SerializeField] private GameObject cutBannerObject;
        [SerializeField] private TextMeshProUGUI cutBannerText;

        [Header("HUD")]
        [SerializeField] private TextMeshProUGUI turnStatusText;
        [SerializeField] private TextMeshProUGUI lastActionText;

        [Header("Action Controls")]
        [SerializeField] private Button dealButton;
        [SerializeField] private TextMeshProUGUI dealButtonText;

        private ClientGameState _currentState;
        private readonly List<GameObject> _spawnedTrickCards = new List<GameObject>();

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
        }

        public void UpdateGameState(ClientGameState state)
        {
            _currentState = state;
            if (state == null) return;

            string myId = SocketService.Instance.PlayerId;
            bool isMyTurn = state.currentTurnPlayerId == myId;
            bool isFirstTrick = state.roundNumber == 1 && (state.currentTrick == null || state.currentTrick.Count == 0);

            // 1. Table Seats
            if (tableLayoutManager != null)
            {
                tableLayoutManager.UpdateTableLayout(state.players, myId, state.currentTurnPlayerId, state.direction);
            }

            // 2. Local Hand
            if (handManager != null)
            {
                var myDonkeyHand = state.GetMyDonkeyHand();
                handManager.UpdateDonkeyHand(myDonkeyHand, state.leadSuit, isMyTurn, isFirstTrick);
            }

            // 3. Lead Suit
            if (leadSuitText != null)
            {
                leadSuitText.text = state.leadSuit.HasValue ? $"Lead Suit: {state.leadSuit.Value}" : "Play Any Card to Lead";
            }

            // 4. Center Trick Cards
            UpdateTrick(state.currentTrick);

            // 5. Last Action
            if (lastActionText != null)
            {
                lastActionText.text = state.lastAction ?? "";
            }

            if (turnStatusText != null)
            {
                var cur = state.players?.Find(p => p.id == state.currentTurnPlayerId);
                turnStatusText.text = isMyTurn ? "YOUR TURN!" : $"{cur?.name ?? "Opponent"}'s Turn";
            }

            // 6. DEAL Button State
            if (dealButton != null)
            {
                dealButton.interactable = isMyTurn;
                if (dealButtonText != null)
                {
                    dealButtonText.text = isMyTurn ? "DEAL CARD" : "WAIT TURN";
                }
            }
        }

        private void OnDealButtonClicked()
        {
            if (_currentState == null) return;
            string myId = SocketService.Instance.PlayerId;
            if (_currentState.currentTurnPlayerId != myId) return;

            if (handManager != null)
            {
                handManager.ConfirmPlaySelected();
            }
        }

        private void UpdateTrick(List<TrickPlay> trick)
        {
            foreach (var card in _spawnedTrickCards)
            {
                if (card != null) Destroy(card);
            }
            _spawnedTrickCards.Clear();

            if (trick == null || trick.Count == 0)
            {
                if (cutBannerObject != null) cutBannerObject.SetActive(false);
                return;
            }

            bool hasCut = false;
            string cutPlayerName = "";

            for (int i = 0; i < trick.Count; i++)
            {
                var play = trick[i];
                var cardObj = Instantiate(trickCardPrefab, trickContainer);
                var view = cardObj.GetComponent<CardView>();
                view.SetupDonkeyCard(play.card, false);

                // Fan trick cards slightly
                var rect = cardObj.GetComponent<RectTransform>();
                rect.anchoredPosition = new Vector2((i - (trick.Count - 1) / 2f) * 36f, 0);

                if (play.isCut)
                {
                    hasCut = true;
                    cutPlayerName = play.playerName;
                }

                _spawnedTrickCards.Add(cardObj);
            }

            if (cutBannerObject != null)
            {
                cutBannerObject.SetActive(hasCut);
                if (hasCut && cutBannerText != null)
                {
                    cutBannerText.text = $"⚡ CUT BY {cutPlayerName.ToUpper()}!";
                }
            }
        }

        private void HandleDonkeyCardPlayed(DonkeyCard card)
        {
            if (_currentState == null) return;
            SocketService.Instance.PlayDonkeyCard(_currentState.roomCode, card.id);
            AudioManager.Instance?.PlayCardPlay();
        }
    }
}
