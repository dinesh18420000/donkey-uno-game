using System;

namespace DonkeyUno.Core
{
    public static class UnoGameRules
    {
        public static int GetDrawCardPenalty(UnoCardType type)
        {
            switch (type)
            {
                case UnoCardType.draw2:
                case UnoCardType.reverse_draw2:
                    return 2;
                case UnoCardType.draw4:
                case UnoCardType.wild_reverse_draw4:
                    return 4;
                case UnoCardType.wild_draw6:
                    return 6;
                case UnoCardType.wild_draw10:
                    return 10;
                default:
                    return 0;
            }
        }

        public static bool CanPlayUnoCard(
            UnoCard card,
            UnoCard activeCard,
            UnoColor activeColor,
            int drawStackCount)
        {
            if (card == null || activeCard == null) return false;

            // Mandatory Stacking Rule: Equal or higher penalty only
            if (drawStackCount > 0)
            {
                int currentPenalty = GetDrawCardPenalty(activeCard.type);
                int cardPenalty = GetDrawCardPenalty(card.type);
                return cardPenalty > 0 && cardPenalty >= currentPenalty;
            }

            // Wild cards can always be played
            if (card.color == UnoColor.wild) return true;

            // Matching color
            if (card.color == activeColor) return true;

            // Matching number
            if (card.type == UnoCardType.number && activeCard.type == UnoCardType.number && card.value == activeCard.value)
                return true;

            // Matching action type
            if (card.type != UnoCardType.number && card.type == activeCard.type)
                return true;

            // Reverse draw 2 cross matching
            if (card.type == UnoCardType.reverse_draw2 && (activeCard.type == UnoCardType.reverse || activeCard.type == UnoCardType.draw2))
                return true;
            if ((card.type == UnoCardType.reverse || card.type == UnoCardType.draw2) && activeCard.type == UnoCardType.reverse_draw2)
                return true;

            return false;
        }
    }
}
