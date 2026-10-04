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

        [Header("Donkey 4-Suit Columns")]
        [SerializeField] private RectTransform spadesColumn;
        [SerializeField] private RectTransform heartsColumn;
        [SerializeField] private RectTransform clubsColumn;
        [SerializeField] private RectTransform diamondsColumn;

        [Header("Suit Sprites")]
        [SerializeField] private Sprite spadeSprite;
        [SerializeField] private Sprite heartSprite;
        [SerializeField] private Sprite clubSprite;
        [SerializeField] private Sprite diamondSprite;

        [Header("Layout Tuning")]
        [SerializeField] private float cardWidth = 72f;
        [SerializeField] private float cardHeight = 104f;
        [SerializeField] private float minStep = 22f;
        [SerializeField] private float naturalGap = 8f;
        [SerializeField] private float verticalStep = 26f;

        private readonly List<CardView> _spawnedCards = new List<CardView>();
        private CardView _selectedCard;
        private bool _isMyTurn;

        public event Action<UnoCard> OnUnoCardPlayed;
        public event Action<DonkeyCard> OnDonkeyCardPlayed;

        public CardView SelectedCard => _selectedCard;

        public void UpdateUnoHand(List<UnoCard> hand, UnoCard activeCard, UnoColor activeColor, int drawStackCount, bool isMyTurn)
        {
            _isMyTurn = isMyTurn;
            ClearHand();

            if (hand == null || hand.Count == 0)
            {
                UpdateCountText(0);
                return;
            }

            var sorted = hand.OrderBy(c => (int)c.color).ThenBy(c => c.value ?? 99).ToList();
            int count = sorted.Count;

            float containerWidth = handContainer != null && handContainer.rect.width > 0 ? handContainer.rect.width : 700f;
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
                rect.sizeDelta = new Vector2(cardWidth, cardHeight);
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

            bool hasLeadSuit = leadSuit.HasValue && hand.Any(c => c.suit == leadSuit.Value);

            // Check if 4 columns are configured
            if (spadesColumn != null && heartsColumn != null && clubsColumn != null && diamondsColumn != null)
            {
                PopulateSuitColumn(Suit.SPADES, spadesColumn, hand, leadSuit, hasLeadSuit, isMyTurn, isFirstTrick);
                PopulateSuitColumn(Suit.HEARTS, heartsColumn, hand, leadSuit, hasLeadSuit, isMyTurn, isFirstTrick);
                PopulateSuitColumn(Suit.CLUBS, clubsColumn, hand, leadSuit, hasLeadSuit, isMyTurn, isFirstTrick);
                PopulateSuitColumn(Suit.DIAMONDS, diamondsColumn, hand, leadSuit, hasLeadSuit, isMyTurn, isFirstTrick);
            }
            else
            {
                // Fallback to single horizontal row
                var sorted = hand.OrderBy(c => (int)c.suit).ThenBy(c => c.rank).ToList();
                int count = sorted.Count;

                float containerWidth = handContainer != null && handContainer.rect.width > 0 ? handContainer.rect.width : 700f;
                float availableWidth = Mathf.Max(100f, containerWidth - cardWidth);
                float step = (count <= 1) ? cardWidth : Mathf.Max(minStep, availableWidth / (count - 1));
                float totalWidth = (count - 1) * step;
                float startX = -totalWidth / 2f;

                for (int i = 0; i < count; i++)
                {
                    var card = sorted[i];
                    var cardObj = Instantiate(cardPrefab, handContainer);
                    var view = cardObj.GetComponent<CardView>();
                    view.SetSuitSprites(spadeSprite, heartSprite, clubSprite, diamondSprite);

                    bool isValid = isMyTurn && (!hasLeadSuit || card.suit == leadSuit.Value);
                    if (isFirstTrick && isMyTurn && card.suit == Suit.SPADES && card.value == "A") isValid = true;

                    view.SetupDonkeyCard(card, isValid, null, false);
                    var rect = cardObj.GetComponent<RectTransform>();
                    rect.sizeDelta = new Vector2(cardWidth, cardHeight);
                    rect.anchoredPosition = new Vector2(startX + i * step, 0);

                    view.OnCardClicked += HandleCardClicked;
                    _spawnedCards.Add(view);
                }
            }

            UpdateCountText(hand.Count);
            UpdatePlayButton();
        }

        private void PopulateSuitColumn(Suit suit, RectTransform colTransform, List<DonkeyCard> hand,
            Suit? leadSuit, bool hasLeadSuit, bool isMyTurn, bool isFirstTrick)
        {
            var suitCards = hand.Where(c => c.suit == suit).OrderBy(c => c.rank).ToList();
            int count = suitCards.Count;
            if (count == 0) return;

            // Compute dynamic vertical step if column has many cards
            float step = count > 5 ? Mathf.Max(18f, (180f - cardHeight) / (count - 1)) : verticalStep;

            for (int i = 0; i < count; i++)
            {
                var card = suitCards[i];
                var cardObj = Instantiate(cardPrefab, colTransform);
                cardObj.name = $"Card_{card.suit}_{card.value}";
                var view = cardObj.GetComponent<CardView>();
                view.SetSuitSprites(spadeSprite, heartSprite, clubSprite, diamondSprite);

                bool isBottomCard = (i == count - 1);
                bool isValid = isMyTurn && (!hasLeadSuit || card.suit == leadSuit.Value);
                if (isFirstTrick && isMyTurn)
                {
                    isValid = (card.suit == Suit.SPADES && card.value == "A");
                }

                view.SetupDonkeyCard(card, isValid, null, !isBottomCard);

                var rect = cardObj.GetComponent<RectTransform>();
                rect.sizeDelta = new Vector2(cardWidth, cardHeight);
                rect.anchorMin = new Vector2(0.5f, 1f);
                rect.anchorMax = new Vector2(0.5f, 1f);
                rect.pivot = new Vector2(0.5f, 1f);
                rect.anchoredPosition = new Vector2(0, -i * step);

                view.OnCardClicked += HandleCardClicked;
                _spawnedCards.Add(view);
            }
        }

        private void HandleCardClicked(CardView cardView)
        {
            if (!_isMyTurn || !cardView.IsValid) return;

            if (_selectedCard == cardView)
            {
                ConfirmPlaySelected();
            }
            else
            {
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
                cardCountText.text = $"Cards: {count}";
            }
        }

        public void SetSuitSprites(Sprite spade, Sprite heart, Sprite club, Sprite diamond)
        {
            spadeSprite = spade;
            heartSprite = heart;
            clubSprite = club;
            diamondSprite = diamond;
        }

        public void SetColumnContainers(RectTransform spades, RectTransform hearts, RectTransform clubs, RectTransform diamonds)
        {
            spadesColumn = spades;
            heartsColumn = hearts;
            clubsColumn = clubs;
            diamondsColumn = diamonds;
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
