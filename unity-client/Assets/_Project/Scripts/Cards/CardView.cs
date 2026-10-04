using System;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;
using DonkeyUno.Core;

namespace DonkeyUno.Cards
{
    public class CardView : MonoBehaviour, IPointerClickHandler
    {
        [Header("UI Elements")]
        [SerializeField] private Image cardBackground;
        [SerializeField] private Image cardBorder;
        [SerializeField] private Image disabledOverlay;
        [SerializeField] private TextMeshProUGUI cornerTopLeft;
        [SerializeField] private TextMeshProUGUI cornerBottomRight;
        [SerializeField] private TextMeshProUGUI centerText;
        [SerializeField] private Image centerSuitImage;
        [SerializeField] private Image cornerSuitImage;
        [SerializeField] private Image cardBackImage;
        [SerializeField] private GameObject wildWheelObject;
        [SerializeField] private GameObject selectedOutline;

        [Header("Suit Sprites (Optional)")]
        [SerializeField] private Sprite spadeSprite;
        [SerializeField] private Sprite heartSprite;
        [SerializeField] private Sprite clubSprite;
        [SerializeField] private Sprite diamondSprite;

        [Header("State")]
        public bool IsSelected { get; private set; }
        public bool IsValid { get; private set; } = true;
        public bool IsFaceDown { get; private set; }

        public UnoCard UnoData { get; private set; }
        public DonkeyCard DonkeyData { get; private set; }

        public event Action<CardView> OnCardClicked;

        // Colors
        public static readonly Color RedSuitColor = new Color32(234, 29, 44, 255);
        public static readonly Color DarkSuitColor = new Color32(15, 23, 42, 255);

        // Uno Colors
        public static readonly Color RedColor = new Color32(255, 42, 75, 255);
        public static readonly Color BlueColor = new Color32(0, 153, 255, 255);
        public static readonly Color GreenColor = new Color32(0, 200, 83, 255);
        public static readonly Color YellowColor = new Color32(255, 170, 0, 255);
        public static readonly Color WildColor = new Color32(20, 12, 38, 255);

        public void SetupUnoCard(UnoCard card, bool isValid)
        {
            UnoData = card;
            DonkeyData = null;
            IsValid = isValid;
            IsFaceDown = false;

            if (cardBackImage != null) cardBackImage.gameObject.SetActive(false);
            if (centerSuitImage != null) centerSuitImage.gameObject.SetActive(false);
            if (cornerSuitImage != null) cornerSuitImage.gameObject.SetActive(false);

            if (cardBackground != null)
            {
                cardBackground.gameObject.SetActive(true);
                cardBackground.color = GetColor(card.color);
            }

            string symbol = GetSymbol(card.type, card.value);
            if (cornerTopLeft != null) { cornerTopLeft.gameObject.SetActive(true); cornerTopLeft.text = symbol; cornerTopLeft.color = Color.white; }
            if (cornerBottomRight != null) { cornerBottomRight.gameObject.SetActive(true); cornerBottomRight.text = symbol; cornerBottomRight.color = Color.white; }

            if (wildWheelObject != null)
            {
                wildWheelObject.SetActive(card.color == UnoColor.wild);
            }

            if (centerText != null)
            {
                centerText.gameObject.SetActive(true);
                centerText.text = GetCenterLabel(card.type, card.value);
                centerText.color = Color.white;
            }

            UpdateVisualState();
        }

        public void SetupDonkeyCard(DonkeyCard card, bool isValid, Color? borderColor = null, bool isCompact = false)
        {
            DonkeyData = card;
            UnoData = null;
            IsValid = isValid;
            IsFaceDown = false;

            if (cardBackImage != null) cardBackImage.gameObject.SetActive(false);

            bool isRed = (card.suit == Suit.HEARTS || card.suit == Suit.DIAMONDS);
            Color suitColor = isRed ? RedSuitColor : DarkSuitColor;
            string suitChar = GetSuitChar(card.suit);
            Sprite suitSpr = GetSuitSprite(card.suit);

            if (cardBackground != null)
            {
                cardBackground.gameObject.SetActive(true);
                cardBackground.color = Color.white;
            }

            // Colored border outline when card is played on table
            if (cardBorder != null)
            {
                if (borderColor.HasValue)
                {
                    cardBorder.gameObject.SetActive(true);
                    cardBorder.color = borderColor.Value;
                }
                else
                {
                    cardBorder.gameObject.SetActive(false);
                }
            }

            // Corner Top Left Rank
            if (cornerTopLeft != null)
            {
                cornerTopLeft.gameObject.SetActive(true);
                cornerTopLeft.text = card.value;
                cornerTopLeft.color = suitColor;
            }

            // Corner Suit Icon / Text
            if (cornerSuitImage != null && suitSpr != null)
            {
                cornerSuitImage.gameObject.SetActive(true);
                cornerSuitImage.sprite = suitSpr;
                cornerSuitImage.color = suitColor;
            }
            else if (cornerTopLeft != null && cornerSuitImage == null)
            {
                // Fallback: append suit char if no separate sprite
                cornerTopLeft.text = $"{card.value}\n{suitChar}";
            }

            if (cornerBottomRight != null)
            {
                cornerBottomRight.gameObject.SetActive(!isCompact);
                cornerBottomRight.text = card.value;
                cornerBottomRight.color = suitColor;
            }

            // Center large suit emblem
            if (centerSuitImage != null)
            {
                if (!isCompact && suitSpr != null)
                {
                    centerSuitImage.gameObject.SetActive(true);
                    centerSuitImage.sprite = suitSpr;
                    centerSuitImage.color = suitColor;
                }
                else
                {
                    centerSuitImage.gameObject.SetActive(false);
                }
            }

            if (centerText != null)
            {
                if (!isCompact && (centerSuitImage == null || suitSpr == null))
                {
                    centerText.gameObject.SetActive(true);
                    centerText.text = suitChar;
                    centerText.color = suitColor;
                }
                else
                {
                    centerText.gameObject.SetActive(false);
                }
            }

            if (wildWheelObject != null) wildWheelObject.SetActive(false);

            UpdateVisualState();
        }

        public void SetupFaceDown(Sprite backSprite = null, Color? tintColor = null)
        {
            IsFaceDown = true;
            IsValid = false;
            DonkeyData = null;
            UnoData = null;

            if (cardBackImage != null)
            {
                cardBackImage.gameObject.SetActive(true);
                if (backSprite != null) cardBackImage.sprite = backSprite;
                cardBackImage.color = tintColor ?? Color.white;
            }

            if (cornerTopLeft != null) cornerTopLeft.gameObject.SetActive(false);
            if (cornerBottomRight != null) cornerBottomRight.gameObject.SetActive(false);
            if (centerSuitImage != null) centerSuitImage.gameObject.SetActive(false);
            if (cornerSuitImage != null) cornerSuitImage.gameObject.SetActive(false);
            if (centerText != null) centerText.gameObject.SetActive(false);
            if (wildWheelObject != null) wildWheelObject.SetActive(false);
            if (disabledOverlay != null) disabledOverlay.gameObject.SetActive(false);
            if (selectedOutline != null) selectedOutline.SetActive(false);
        }

        public void SetSelected(bool selected)
        {
            IsSelected = selected;
            UpdateVisualState();
        }

        public void SetSuitSprites(Sprite spade, Sprite heart, Sprite club, Sprite diamond)
        {
            spadeSprite = spade;
            heartSprite = heart;
            clubSprite = club;
            diamondSprite = diamond;
        }

        private Sprite GetSuitSprite(Suit suit)
        {
            switch (suit)
            {
                case Suit.SPADES: return spadeSprite;
                case Suit.HEARTS: return heartSprite;
                case Suit.CLUBS: return clubSprite;
                case Suit.DIAMONDS: return diamondSprite;
                default: return null;
            }
        }

        private float _basePosY = 0f;

        public void SetBasePosition(Vector2 pos)
        {
            _basePosY = pos.y;
            var rect = transform as RectTransform;
            if (rect != null)
            {
                rect.anchoredPosition = new Vector2(pos.x, _basePosY + (IsSelected ? 16f : 0f));
            }
        }

        private void UpdateVisualState()
        {
            if (IsFaceDown) return;

            if (disabledOverlay != null)
            {
                disabledOverlay.gameObject.SetActive(!IsValid);
            }

            if (selectedOutline != null)
            {
                selectedOutline.SetActive(IsSelected);
            }

            var rect = transform as RectTransform;
            if (rect != null)
            {
                Vector2 pos = rect.anchoredPosition;
                pos.y = _basePosY + (IsSelected ? 16f : 0f);
                rect.anchoredPosition = pos;
            }
        }

        public void OnPointerClick(PointerEventData eventData)
        {
            if (IsFaceDown || !IsValid) return;
            OnCardClicked?.Invoke(this);
        }

        public static Color GetColor(UnoColor col)
        {
            switch (col)
            {
                case UnoColor.red: return RedColor;
                case UnoColor.blue: return BlueColor;
                case UnoColor.green: return GreenColor;
                case UnoColor.yellow: return YellowColor;
                default: return WildColor;
            }
        }

        private string GetSymbol(UnoCardType type, int? val)
        {
            switch (type)
            {
                case UnoCardType.number: return val?.ToString() ?? "0";
                case UnoCardType.draw2: return "+2";
                case UnoCardType.reverse_draw2: return "⇄+2";
                case UnoCardType.draw4: return "+4";
                case UnoCardType.wild_draw6: return "+6";
                case UnoCardType.wild_draw10: return "+10";
                case UnoCardType.wild_reverse_draw4: return "⇄+4";
                case UnoCardType.discard_all: return "ALL";
                case UnoCardType.skip_everyone: return "⊘";
                case UnoCardType.skip: return "⊘";
                case UnoCardType.reverse: return "⇄";
                case UnoCardType.pass_0: return "0";
                case UnoCardType.swap_7: return "7";
                case UnoCardType.wild: return "★";
                default: return "★";
            }
        }

        private string GetCenterLabel(UnoCardType type, int? val)
        {
            switch (type)
            {
                case UnoCardType.number: return val?.ToString() ?? "0";
                case UnoCardType.draw2: return "+2";
                case UnoCardType.reverse_draw2: return "⇄+2\nREV";
                case UnoCardType.draw4: return "+4";
                case UnoCardType.wild_draw6: return "+6\nWILD";
                case UnoCardType.wild_draw10: return "+10\nNO MERCY";
                case UnoCardType.wild_reverse_draw4: return "⇄+4\nWILD";
                case UnoCardType.discard_all: return "DISCARD\nALL";
                case UnoCardType.skip_everyone: return "SKIP\nALL";
                case UnoCardType.skip: return "⊘";
                case UnoCardType.reverse: return "⇄";
                case UnoCardType.pass_0: return "0\nPASS";
                case UnoCardType.swap_7: return "7\nSWAP";
                default: return "";
            }
        }

        private string GetSuitChar(Suit suit)
        {
            switch (suit)
            {
                case Suit.SPADES: return "♠";
                case Suit.HEARTS: return "♥";
                case Suit.CLUBS: return "♣";
                case Suit.DIAMONDS: return "♦";
                default: return "";
            }
        }
    }
}
