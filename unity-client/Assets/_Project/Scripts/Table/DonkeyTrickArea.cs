using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using DonkeyUno.Core;
using DonkeyUno.Cards;

namespace DonkeyUno.Table
{
    public class DonkeyTrickArea : MonoBehaviour
    {
        [Header("Containers")]
        [SerializeField] private RectTransform slotsContainer;
        [SerializeField] private GameObject cardSlotPrefab;
        [SerializeField] private RectTransform tiltedDeckTransform;
        [SerializeField] private Image dealerPuckImage;

        [Header("Card Back Sprites")]
        [SerializeField] private Sprite cardBackYellow;
        [SerializeField] private Sprite cardBackBlue;
        [SerializeField] private Sprite cardBackPink;
        [SerializeField] private Sprite cardBackGreen;
        [SerializeField] private Sprite deckTiltedDonkey;

        [Header("Suit Sprites")]
        [SerializeField] private Sprite spadeSprite;
        [SerializeField] private Sprite heartSprite;
        [SerializeField] private Sprite clubSprite;
        [SerializeField] private Sprite diamondSprite;

        private readonly List<GameObject> _spawnedSlots = new List<GameObject>();

        private void Awake()
        {
            if (tiltedDeckTransform != null && deckTiltedDonkey != null)
            {
                var img = tiltedDeckTransform.GetComponent<Image>();
                if (img != null) img.sprite = deckTiltedDonkey;
            }
        }

        public void UpdateTrickArea(List<DonkeyTheme.RotatedPlayer> orderedPlayers, List<TrickPlay> currentTrick, string currentTurnPlayerId)
        {
            if (orderedPlayers == null || orderedPlayers.Count == 0) return;

            int count = orderedPlayers.Count;

            // Ensure we have exactly `count` slot objects
            while (_spawnedSlots.Count < count)
            {
                var slotObj = Instantiate(cardSlotPrefab, slotsContainer);
                _spawnedSlots.Add(slotObj);
            }
            while (_spawnedSlots.Count > count)
            {
                int lastIdx = _spawnedSlots.Count - 1;
                if (_spawnedSlots[lastIdx] != null) Destroy(_spawnedSlots[lastIdx]);
                _spawnedSlots.RemoveAt(lastIdx);
            }

            // Layout math for horizontal slot row
            float slotW = count <= 4 ? 68f : count <= 6 ? 56f : 44f;
            float slotH = slotW * 1.45f;
            float gap = count <= 4 ? 12f : 8f;
            float totalW = count * slotW + (count - 1) * gap;
            float startX = -totalW / 2f + slotW / 2f;

            for (int i = 0; i < count; i++)
            {
                var rotPlayer = orderedPlayers[i];
                var slotObj = _spawnedSlots[i];
                slotObj.name = $"TrickSlot_{rotPlayer.Player.name}_{rotPlayer.DisplayIndex}";

                var rt = slotObj.GetComponent<RectTransform>();
                rt.sizeDelta = new Vector2(slotW, slotH);
                rt.anchoredPosition = new Vector2(startX + i * (slotW + gap), 0);

                var cardView = slotObj.GetComponent<CardView>();
                if (cardView != null)
                {
                    cardView.SetSuitSprites(spadeSprite, heartSprite, clubSprite, diamondSprite);

                    // Check if player has played a card in current trick
                    TrickPlay play = currentTrick?.Find(t => t.playerId == rotPlayer.Player.id);

                    if (play != null && play.card != null)
                    {
                        // Show face-up card with player's theme border!
                        cardView.SetupDonkeyCard(play.card, false, rotPlayer.Theme.accentColor, false);

                        // If this card is the latest card played in the trick, slight lift
                        bool isLatest = currentTrick[currentTrick.Count - 1] == play;
                        rt.anchoredPosition = new Vector2(startX + i * (slotW + gap), isLatest ? 8f : 0f);
                    }
                    else
                    {
                        // Show face-down card back with player's theme color
                        Sprite backSpr = GetCardBackSprite(rotPlayer.Theme.id);
                        cardView.SetupFaceDown(backSpr, rotPlayer.Theme.accentColor);
                    }
                }
            }
        }

        private Sprite GetCardBackSprite(int themeId)
        {
            switch (themeId)
            {
                case 1: return cardBackYellow;
                case 2: return cardBackBlue;
                case 3: return cardBackPink;
                case 4: return cardBackGreen;
                default: return cardBackYellow;
            }
        }

        public void SetSprites(Sprite yellow, Sprite blue, Sprite pink, Sprite green, Sprite tiltedDeck,
            Sprite spade, Sprite heart, Sprite club, Sprite diamond)
        {
            cardBackYellow = yellow;
            cardBackBlue = blue;
            cardBackPink = pink;
            cardBackGreen = green;
            deckTiltedDonkey = tiltedDeck;
            spadeSprite = spade;
            heartSprite = heart;
            clubSprite = club;
            diamondSprite = diamond;

            if (tiltedDeckTransform != null && deckTiltedDonkey != null)
            {
                var img = tiltedDeckTransform.GetComponent<Image>();
                if (img != null) img.sprite = deckTiltedDonkey;
            }
        }
    }
}
