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
        [SerializeField] private GameObject wildWheelObject;
        [SerializeField] private GameObject selectedOutline;

        [Header("State")]
        public bool IsSelected { get; private set; }
        public bool IsValid { get; private set; } = true;

        public UnoCard UnoData { get; private set; }
        public DonkeyCard DonkeyData { get; private set; }

        public event Action<CardView> OnCardClicked;

        // Uno Color Palette
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

            if (cardBackground != null)
            {
                cardBackground.color = GetColor(card.color);
            }

            string symbol = GetSymbol(card.type, card.value);
            if (cornerTopLeft != null) cornerTopLeft.text = symbol;
            if (cornerBottomRight != null) cornerBottomRight.text = symbol;

            if (wildWheelObject != null)
            {
                wildWheelObject.SetActive(card.color == UnoColor.wild);
            }

            if (centerText != null)
            {
                centerText.text = GetCenterLabel(card.type, card.value);
            }

            UpdateVisualState();
        }

        public void SetupDonkeyCard(DonkeyCard card, bool isValid)
        {
            DonkeyData = card;
            UnoData = null;
            IsValid = isValid;

            Color suitColor = (card.suit == Suit.HEARTS || card.suit == Suit.DIAMONDS) ? RedColor : Color.black;
            string suitChar = GetSuitChar(card.suit);

            if (cardBackground != null) cardBackground.color = Color.white;
            if (cornerTopLeft != null)
            {
                cornerTopLeft.text = $"{card.value}\n{suitChar}";
                cornerTopLeft.color = suitColor;
            }
            if (cornerBottomRight != null)
            {
                cornerBottomRight.text = $"{card.value}\n{suitChar}";
                cornerBottomRight.color = suitColor;
            }
            if (centerText != null)
            {
                centerText.text = suitChar;
                centerText.color = suitColor;
            }
            if (wildWheelObject != null) wildWheelObject.SetActive(false);

            UpdateVisualState();
        }

        public void SetSelected(bool selected)
        {
            IsSelected = selected;
            UpdateVisualState();
        }

        private void UpdateVisualState()
        {
            if (disabledOverlay != null)
            {
                disabledOverlay.gameObject.SetActive(!IsValid);
            }

            if (selectedOutline != null)
            {
                selectedOutline.SetActive(IsSelected);
            }

            // Lift card vertically when selected (Smooth 2.5D lift)
            var rect = transform as RectTransform;
            if (rect != null)
            {
                Vector2 pos = rect.anchoredPosition;
                pos.y = IsSelected ? 24f : 0f;
                rect.anchoredPosition = pos;
            }
        }

        public void OnPointerClick(PointerEventData eventData)
        {
            if (!IsValid) return;
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
