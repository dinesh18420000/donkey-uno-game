using System.Collections;
using System.Collections.Generic;
using System.Linq;
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
    public class UnoGameUI : MonoBehaviour
    {
        [Header("Managers")]
        [SerializeField] private TableLayoutManager tableLayoutManager;
        [SerializeField] private HandManager handManager;

        [Header("Piles")]
        [SerializeField] private CardView activeDiscardCardView;
        [SerializeField] private Image activeColorHalo;
        [SerializeField] private TextMeshProUGUI activeColorText;
        [SerializeField] private Button drawPileButton;
        [SerializeField] private TextMeshProUGUI deckRemainingText;

        [Header("Stacking Banner")]
        [SerializeField] private GameObject stackingBannerObject;
        [SerializeField] private TextMeshProUGUI stackingCountText;

        [Header("Mercy Meter")]
        [SerializeField] private Slider mercySlider;
        [SerializeField] private TextMeshProUGUI mercyCountText;
        [SerializeField] private Image mercyFillImage;

        [Header("Turn & HUD")]
        [SerializeField] private TextMeshProUGUI turnStatusText;
        [SerializeField] private TextMeshProUGUI timerText;
        [SerializeField] private TextMeshProUGUI lastActionText;

        [Header("Uno Call & Catch & Deal")]
        [SerializeField] private Button callUnoButton;
        [SerializeField] private TextMeshProUGUI callUnoButtonText;
        [SerializeField] private Button catchUnoButton;
        [SerializeField] private TextMeshProUGUI catchUnoButtonText;
        [SerializeField] private Button dealButton;
        [SerializeField] private TextMeshProUGUI dealButtonText;

        [Header("Modals & Pickers")]
        [SerializeField] private GameObject wildColorPickerModal;
        [SerializeField] private GameObject swapPickerModal;
        [SerializeField] private Transform swapButtonsContainer;
        [SerializeField] private GameObject swapPlayerButtonPrefab;

        private ClientGameState _currentState;
        private UnoCard _pendingWildCard;
        private UnoCard _pendingSwapCard;
        private string _lastDiscardCardId;

        private void Start()
        {
            if (handManager != null)
            {
                handManager.OnUnoCardPlayed += HandleCardPlayedFromHand;
            }

            if (drawPileButton != null)
            {
                drawPileButton.onClick.AddListener(OnDrawPileClicked);
            }

            if (callUnoButton != null)
            {
                callUnoButton.onClick.AddListener(OnCallUnoClicked);
            }

            if (catchUnoButton != null)
            {
                catchUnoButton.onClick.AddListener(OnCatchUnoClicked);
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
            var me = state.players?.Find(p => p.id == myId);

            // 1. Table Seats Layout
            if (tableLayoutManager != null)
            {
                tableLayoutManager.UpdateTableLayout(state.players, myId, state.currentTurnPlayerId, state.direction);
            }

            // 2. Local Hand
            if (handManager != null)
            {
                var myUnoHand = state.GetMyUnoHand();
                handManager.UpdateUnoHand(
                    myUnoHand,
                    state.activeUnoCard,
                    state.activeUnoColor ?? UnoColor.red,
                    state.drawStackCount,
                    isMyTurn
                );

                // Update Mercy Meter
                int myCardCount = myUnoHand.Count;
                if (mercySlider != null)
                {
                    mercySlider.value = Mathf.Clamp01(myCardCount / 25f);
                }
                if (mercyCountText != null)
                {
                    mercyCountText.text = $"{myCardCount} / 25 Cards";
                }
                if (mercyFillImage != null)
                {
                    mercyFillImage.color = myCardCount >= 20 ? Color.red : (myCardCount >= 14 ? Color.yellow : Color.green);
                }
            }

            // 3. Discard Pile & Flip-and-Settle
            if (state.activeUnoCard != null)
            {
                if (activeDiscardCardView != null)
                {
                    activeDiscardCardView.SetupUnoCard(state.activeUnoCard, false);

                    // If new card played onto pile, trigger 3D slam animation
                    if (_lastDiscardCardId != state.activeUnoCard.id)
                    {
                        _lastDiscardCardId = state.activeUnoCard.id;
                        StartCoroutine(AnimateDiscardSlam());
                    }
                }

                if (activeColorHalo != null && state.activeUnoColor.HasValue)
                {
                    activeColorHalo.color = CardView.GetColor(state.activeUnoColor.Value);
                }

                if (activeColorText != null)
                {
                    activeColorText.text = $"Color: {state.activeUnoColor?.ToString().ToUpper()}";
                }
            }

            // 4. Stacking Banner (+N and climbing)
            if (stackingBannerObject != null)
            {
                bool isStacking = state.drawStackCount > 0;
                stackingBannerObject.SetActive(isStacking);
                if (isStacking && stackingCountText != null)
                {
                    stackingCountText.text = $"+{state.drawStackCount} AND CLIMBING!";
                }
            }

            // 5. Deck count
            if (deckRemainingText != null)
            {
                deckRemainingText.text = $"Deck: {state.deckRemainingCount}";
            }

            // 6. Action status & Timer
            if (lastActionText != null)
            {
                lastActionText.text = state.lastAction ?? "";
            }

            if (turnStatusText != null)
            {
                var cur = state.players?.Find(p => p.id == state.currentTurnPlayerId);
                turnStatusText.text = isMyTurn ? "YOUR TURN!" : $"{cur?.name ?? "Opponent"}'s Turn";
            }

            // 7. Uno Call Button (Visible when holding 1 or 2 cards)
            int currentHandCount = state.GetMyUnoHand().Count;
            if (callUnoButton != null)
            {
                bool canCallUno = currentHandCount <= 2 && !(me?.calledUno ?? false);
                callUnoButton.gameObject.SetActive(canCallUno || (me?.calledUno ?? false));
                if (callUnoButtonText != null)
                {
                    callUnoButtonText.text = (me?.calledUno ?? false) ? "UNO CALLED! ✓" : "CALL UNO!";
                }
            }

            // 8. Catch Uno Button (Pulsing siren when an opponent forgot to call Uno)
            var uncaughtOpponent = state.players?.FirstOrDefault(p =>
                p.id != myId && p.cardsCount == 1 && !p.calledUno && !p.rank.HasValue && !p.isMercyEliminated);

            if (catchUnoButton != null)
            {
                catchUnoButton.gameObject.SetActive(uncaughtOpponent != null);
                if (catchUnoButtonText != null && uncaughtOpponent != null)
                {
                    catchUnoButtonText.text = $"CATCH UNO on {uncaughtOpponent.name}!";
                }
            }

            // 9. DEAL Button (Consistent with Donkey Master)
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

        private IEnumerator AnimateDiscardSlam()
        {
            if (activeDiscardCardView == null) yield break;

            var rect = activeDiscardCardView.transform as RectTransform;
            if (rect == null) yield break;

            Vector3 origScale = Vector3.one;
            rect.localScale = origScale * 1.25f;
            rect.localRotation = Quaternion.Euler(0, 0, Random.Range(-12f, 12f));

            float elapsed = 0f;
            float duration = 0.22f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                rect.localScale = Vector3.Lerp(origScale * 1.25f, origScale, t);
                yield return null;
            }

            rect.localScale = origScale;
        }

        private void HandleCardPlayedFromHand(UnoCard card)
        {
            if (_currentState == null) return;

            if (card.color == UnoColor.wild)
            {
                _pendingWildCard = card;
                if (wildColorPickerModal != null) wildColorPickerModal.SetActive(true);
                return;
            }

            if (card.type == UnoCardType.swap_7)
            {
                _pendingSwapCard = card;
                OpenSwapPicker();
                return;
            }

            ExecutePlay(card, null, null);
        }

        public void SelectWildColor(string colorName)
        {
            if (_pendingWildCard == null || _currentState == null) return;
            if (System.Enum.TryParse<UnoColor>(colorName.ToLower(), out var chosen))
            {
                ExecutePlay(_pendingWildCard, chosen, null);
            }
            if (wildColorPickerModal != null) wildColorPickerModal.SetActive(false);
            _pendingWildCard = null;
        }

        private void OpenSwapPicker()
        {
            if (swapPickerModal == null || _currentState == null) return;
            swapPickerModal.SetActive(true);

            // Populate opponents to swap with
            string myId = SocketService.Instance.PlayerId;
            foreach (Transform child in swapButtonsContainer)
            {
                Destroy(child.gameObject);
            }

            var opponents = _currentState.players.Where(p => p.id != myId && !p.rank.HasValue && !p.isMercyEliminated);
            foreach (var opp in opponents)
            {
                var btnObj = Instantiate(swapPlayerButtonPrefab, swapButtonsContainer);
                var btn = btnObj.GetComponent<Button>();
                var txt = btnObj.GetComponentInChildren<TextMeshProUGUI>();
                if (txt != null) txt.text = $"{opp.name} ({opp.cardsCount} cards)";

                string targetId = opp.id;
                btn.onClick.AddListener(() =>
                {
                    ExecutePlay(_pendingSwapCard, null, targetId);
                    if (swapPickerModal != null) swapPickerModal.SetActive(false);
                    _pendingSwapCard = null;
                });
            }
        }

        private void ExecutePlay(UnoCard card, UnoColor? chosenColor, string swapTargetId)
        {
            int remaining = _currentState.GetMyUnoHand().Count - 1;
            bool callUno = remaining == 1;

            SocketService.Instance.PlayUnoCard(_currentState.roomCode, card.id, chosenColor, swapTargetId, callUno);
            AudioManager.Instance?.PlayCardPlay();
        }

        private void OnDrawPileClicked()
        {
            if (_currentState == null) return;
            SocketService.Instance.DrawUnoCard(_currentState.roomCode);
            AudioManager.Instance?.PlayCardDeal();
        }

        private void OnCallUnoClicked()
        {
            if (_currentState == null) return;
            SocketService.Instance.CallUno(_currentState.roomCode);
            AudioManager.Instance?.PlayUnoCall();
        }

        private void OnCatchUnoClicked()
        {
            if (_currentState == null) return;
            string myId = SocketService.Instance.PlayerId;
            var target = _currentState.players?.FirstOrDefault(p =>
                p.id != myId && p.cardsCount == 1 && !p.calledUno && !p.rank.HasValue && !p.isMercyEliminated);

            if (target != null)
            {
                SocketService.Instance.CatchUno(_currentState.roomCode, target.id);
                AudioManager.Instance?.PlayUnoCatch();
            }
        }
    }
}
