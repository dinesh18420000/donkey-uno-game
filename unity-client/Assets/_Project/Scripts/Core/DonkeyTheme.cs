using System;
using System.Collections.Generic;
using UnityEngine;

namespace DonkeyUno.Core
{
    [Serializable]
    public class DonkeyTheme
    {
        public int id;
        public string name;
        public Color accentColor;
        public Color ringColor;
        public Color pillTextColor;
        public string cardBackResource;

        public DonkeyTheme(int id, string name, Color accent, Color ring, Color text, string backRes)
        {
            this.id = id;
            this.name = name;
            this.accentColor = accent;
            this.ringColor = ring;
            this.pillTextColor = text;
            this.cardBackResource = backRes;
        }

        public static readonly DonkeyTheme[] Themes = new DonkeyTheme[]
        {
            // 1: Yellow (Godwin / Player 1)
            new DonkeyTheme(1, "Yellow", new Color32(234, 179, 8, 255), new Color32(250, 204, 21, 255), new Color32(15, 23, 42, 255), "card_back_yellow"),
            // 2: Blue (Player 2)
            new DonkeyTheme(2, "Blue", new Color32(37, 99, 235, 255), new Color32(56, 189, 248, 255), Color.white, "card_back_blue"),
            // 3: Pink (Player 3)
            new DonkeyTheme(3, "Pink", new Color32(219, 39, 119, 255), new Color32(244, 114, 182, 255), Color.white, "card_back_pink"),
            // 4: Green (Player 4)
            new DonkeyTheme(4, "Green", new Color32(22, 163, 74, 255), new Color32(74, 222, 128, 255), Color.white, "card_back_green"),
            // 5: Purple
            new DonkeyTheme(5, "Purple", new Color32(147, 51, 234, 255), new Color32(192, 132, 252, 255), Color.white, "card_back_pink"),
            // 6: Red
            new DonkeyTheme(6, "Red", new Color32(220, 38, 38, 255), new Color32(248, 113, 113, 255), Color.white, "card_back_pink"),
            // 7: Cyan
            new DonkeyTheme(7, "Cyan", new Color32(8, 145, 178, 255), new Color32(34, 211, 238, 255), new Color32(15, 23, 42, 255), "card_back_blue"),
            // 8: Orange
            new DonkeyTheme(8, "Orange", new Color32(234, 88, 12, 255), new Color32(251, 146, 60, 255), Color.white, "card_back_yellow"),
            // 9: Lime
            new DonkeyTheme(9, "Lime", new Color32(132, 204, 22, 255), new Color32(163, 230, 53, 255), new Color32(15, 23, 42, 255), "card_back_green"),
            // 10: Maroon
            new DonkeyTheme(10, "Maroon", new Color32(190, 18, 60, 255), new Color32(244, 63, 94, 255), Color.white, "card_back_pink"),
        };

        public static DonkeyTheme GetTheme(int originalIndex)
        {
            if (originalIndex < 0) originalIndex = 0;
            return Themes[originalIndex % Themes.Length];
        }

        public class RotatedPlayer
        {
            public PlayerPublic Player;
            public int OriginalIndex;
            public int DisplayIndex;
            public DonkeyTheme Theme;
        }

        public static List<RotatedPlayer> RotatePlayersForViewer(List<PlayerPublic> players, string viewerId)
        {
            var result = new List<RotatedPlayer>();
            if (players == null || players.Count == 0) return result;

            int total = players.Count;
            int viewerIdx = players.FindIndex(p => p.id == viewerId);
            if (viewerIdx < 0) viewerIdx = 0;

            for (int offset = 0; offset < total; offset++)
            {
                int originalIndex = (viewerIdx + offset) % total;
                var player = players[originalIndex];
                result.Add(new RotatedPlayer
                {
                    Player = player,
                    OriginalIndex = originalIndex,
                    DisplayIndex = offset,
                    Theme = GetTheme(originalIndex)
                });
            }

            return result;
        }
    }
}
