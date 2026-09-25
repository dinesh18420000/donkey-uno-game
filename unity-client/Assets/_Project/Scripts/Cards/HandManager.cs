using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DonkeyUno.Core;

namespace DonkeyUno.Cards
{
    public class HandManager : MonoBehaviour
    {
        [Header("Containers & Prefabs")]
        [SerializeField] private RectTransform handContainer;
        [SerializeField] private GameObject cardPrefab;
        [SerializeField] private TextMeshProUGUI cardCountText;
        [SerializeField] private GameObject playButtonObject;

        [Header("Layout Tuning")]
        [SerializeField] private float cardWidth = 80f;
        [SerializeField] private float minStep = 22f;
        [SerializeField] private float naturalGap = 8f;

        private readonly List<CardView> _spawnedCards = new List<CardView>();
        private CardView _selectedCard;
        private bool _isMyTurn;

        public event Action<UnoCard> OnUnoCardPlayed;
        public event Action<DonkeyCard> OnDonkeyCardPlayed;

        public void UpdateUnoHand(List<UnoCard> hand, UnoCard activeCard, UnoColor activeColor, int drawStackCount, bool isMyTurn)
        {
            _isMyTurn = isMyTurn;
            ClearHand();

            if (hand == null || hand.Count == 0)
            {
                UpdateCountText(0);
                return;
            }

            // Sort cards: Color then value
            var sorted = hand.OrderBy(c => (int)c.color).ThenBy(c => c.value ?? 99).ToList();
            int count = sorted.Count;

            float containerWidth = handContainer.rect.width > 0 ? handContainer.rect.width : 700f;
            float availableWidth = Mathf.Max(100f, containerWidth - cardWidth);
            float naturalWidth = count * (cardWidth + naturalGap);

            float step = (count <= 1) ? cardWidth :
                (naturalWidth <= containerWidth) ? (cardWidth + naturalGap) :
                Mathf.Max(minStep, availableWidth / (count - 1));

            float totalWidth = (count - 1) * step;
            float startX = -totalWidth / 2f;

            for (int i = 0; i < count; i++)
            {
                var card = sorted[i];
                var cardObj = Instantiate(cardPrefab, handContainer);
                var view = cardObj.GetComponent<CardView>();

                bool isValid = isMyTurn && activeCard != null &&
                    UnoGameRules.CanPlayUnoCard(card, activeCard, activeColor, drawStackCount);

                view.SetupUnoCard(card, isValid);

                var rect = cardObj.GetComponent<RectTransform>();
                rect.anchoredPosition = new Vector2(startX + i * step, 0);

                view.OnCardClicked += HandleCardClicked;
                _spawnedCards.Add(view);
            }

            UpdateCountText(count);
            UpdatePlayButton();
        }

        public void UpdateDonkeyHand(List<DonkeyCard> hand, Suit? leadSuit, bool isMyTurn, bool isFirstTrick)
        {
            _isMyTurn = isMyTurn;
            ClearHand();

            if (hand == null || hand.Count == 0)
            {
                UpdateCountText(0);
                return;
            }

            // Sort cards: Suit then rank
            var sorted = hand.OrderBy(c => (int)c.suit).ThenByDescending(c => c.rank).ToList();
            int count = sorted.Count;

            bool hasLeadSuit = leadSuit.HasValue && sorted.Any(c => c.suit == leadSuit.Value);

            float containerWidth = handContainer.rect.width > 0 ? handContainer.rect.width : 700f;
            float availableWidth = Mathf.Max(100f, containerWidth - cardWidth);
            float naturalWidth = count * (cardWidth + naturalGap);

            float step = (count <= 1) ? cardWidth :
                (naturalWidth <= containerWidth) ? (cardWidth + naturalGap) :
                Mathf.Max(minStep, availableWidth / (count - 1));

            float totalWidth = (count - 1) * step;
            float startX = -totalWidth / 2f;

            for (int i = 0; i < count; i++)
            {
                var card = sorted[i];
                var cardObj = Instantiate(cardPrefab, handContainer);
                var view = cardObj.GetComponent<CardView>();

                bool isValid = isMyTurn && (!hasLeadSuit || card.suit == leadSuit.Value);
                if (isFirstTrick && isMyTurn && card.suit == Suit.SPADES && card.value == "A")
                {
                    isValid = true;
                }

                view.SetupDonkeyCard(card, isValid);

                var rect = cardObj.GetComponent<RectTransform>();
                rect.anchoredPosition = new Vector2(startX + i * step, 0);

                view.OnCardClicked += HandleCardClicked;
                _spawnedCards.Add(view);
            }

            UpdateCountText(count);
            UpdatePlayButton();
        }

        private void HandleCardClicked(CardView cardView)
        {
            if (!_isMyTurn || !cardView.IsValid) return;

            if (_selectedCard == cardView)
            {
                // Second tap on the same card -> Confirm play!
                ConfirmPlaySelected();
            }
            else
            {
                // First tap -> Select card and lift it
                if (_selectedCard != null) _selectedCard.SetSelected(false);
                _selectedCard = cardView;
                _selectedCard.SetSelected(true);
                UpdatePlayButton();
            }
        }

        public void ConfirmPlaySelected()
        {
            if (!_isMyTurn) return;

            if (_selectedCard == null)
            {
                // Auto-pick the first valid card in hand
                _selectedCard = _spawnedCards.FirstOrDefault(c => c.IsValid);
                if (_selectedCard == null) return;
            }

            if (_selectedCard.UnoData != null)
            {
                OnUnoCardPlayed?.Invoke(_selectedCard.UnoData);
            }
            else if (_selectedCard.DonkeyData != null)
            {
                OnDonkeyCardPlayed?.Invoke(_selectedCard.DonkeyData);
            }

            _selectedCard = null;
            UpdatePlayButton();
        }

        private void UpdatePlayButton()
        {
            if (playButtonObject != null)
            {
                playButtonObject.SetActive(_selectedCard != null && _selectedCard.IsValid && _isMyTurn);
            }
        }

        private void UpdateCountText(int count)
        {
            if (cardCountText != null)
            {
                cardCountText.text = $"🃏 Hand: {count} cards";
            }
        }

        private void ClearHand()
        {
            _selectedCard = null;
            foreach (var card in _spawnedCards)
            {
                if (card != null) Destroy(card.gameObject);
            }
            _spawnedCards.Clear();
        }
    }
}
