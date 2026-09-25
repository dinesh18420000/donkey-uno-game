using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DonkeyUno.Core;

namespace DonkeyUno.Table
{
    public class SeatView : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private Image avatarImage;
        [SerializeField] private Image avatarBorder;
        [SerializeField] private TextMeshProUGUI nameText;
        [SerializeField] private TextMeshProUGUI cardCountText;
        [SerializeField] private GameObject turnIndicator;
        [SerializeField] private GameObject unoAlertObject;
        [SerializeField] private TextMeshProUGUI unoAlertText;
        [SerializeField] private GameObject mercyWarningObject;
        [SerializeField] private GameObject botIcon;
        [SerializeField] private GameObject disconnectedIcon;

        public PlayerPublic PlayerData { get; private set; }

        public void Setup(PlayerPublic player, bool isCurrentTurn, bool hideName, bool isSelf)
        {
            PlayerData = player;

            if (nameText != null)
            {
                nameText.text = player.name;
                nameText.gameObject.SetActive(!hideName || isSelf);
            }

            if (cardCountText != null)
            {
                cardCountText.text = $"🃏 {player.cardsCount}";
                cardCountText.gameObject.SetActive(!player.isMercyEliminated && !player.rank.HasValue);
            }

            if (turnIndicator != null)
            {
                turnIndicator.SetActive(isCurrentTurn);
            }

            if (botIcon != null)
            {
                botIcon.SetActive(player.isBot);
            }

            if (disconnectedIcon != null)
            {
                disconnectedIcon.SetActive(player.isDisconnected);
            }

            // Uno Alert Badge
            if (unoAlertObject != null)
            {
                bool hasOneCard = player.cardsCount == 1 && !player.isMercyEliminated && !player.rank.HasValue;
                unoAlertObject.SetActive(hasOneCard);
                if (hasOneCard && unoAlertText != null)
                {
                    unoAlertText.text = player.calledUno ? "📢 UNO!" : "🚨 NO UNO!";
                }
            }

            // Mercy Warning (> 18 cards)
            if (mercyWarningObject != null)
            {
                mercyWarningObject.SetActive(player.cardsCount >= 18 && !player.isMercyEliminated);
            }
        }
    }
}
