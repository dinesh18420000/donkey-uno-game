using System.Collections.Generic;
using UnityEngine;
using DonkeyUno.Core;

namespace DonkeyUno.Table
{
    public class TableLayoutManager : MonoBehaviour
    {
        [Header("Table Configuration")]
        [SerializeField] private RectTransform tableBounds;
        [SerializeField] private GameObject seatPrefab;
        [SerializeField] private RectTransform turnArrowTrack;

        [Header("Elliptical Radii (Percentage of Table Size)")]
        [SerializeField] private float radiusXPercentage = 0.42f;
        [SerializeField] private float radiusYPercentage = 0.32f;

        private readonly List<SeatView> _spawnedSeats = new List<SeatView>();

        public void UpdateTableLayout(List<PlayerPublic> players, string localPlayerId, string currentTurnPlayerId, int direction)
        {
            ClearSeats();

            if (players == null || players.Count == 0) return;

            // Reorder players so local player is at index 0 (bottom)
            var ordered = ReorderForLocalView(players, localPlayerId);
            int count = ordered.Count;
            bool hideOpponentNames = count >= 8;

            float tableWidth = tableBounds != null ? tableBounds.rect.width : 900f;
            float tableHeight = tableBounds != null ? tableBounds.rect.height : 500f;

            float rx = tableWidth * radiusXPercentage;
            float ry = tableHeight * radiusYPercentage;

            // Update Direction Arrow Rotation & Flip
            if (turnArrowTrack != null)
            {
                // Smooth scale flip for reverse
                Vector3 scale = turnArrowTrack.localScale;
                scale.x = direction == -1 ? -1f : 1f;
                turnArrowTrack.localScale = scale;
            }

            // Spawn seats (Index 0 is local player, placed near bottom or HUD; index 1..count-1 around ellipse)
            for (int i = 0; i < count; i++)
            {
                var player = ordered[i];
                bool isSelf = player.id == localPlayerId;

                // Angle math: local player (i=0) is at 90 degrees (bottom)
                float angleDeg = (90f + i * (360f / count)) % 360f;
                float angleRad = angleDeg * Mathf.Deg2Rad;

                float x = rx * Mathf.Cos(angleRad);
                float y = ry * Mathf.Sin(angleRad);

                var seatObj = Instantiate(seatPrefab, tableBounds);
                var seatView = seatObj.GetComponent<SeatView>();

                var rect = seatObj.GetComponent<RectTransform>();
                rect.anchoredPosition = new Vector2(x, y);

                // Avatar scaling inversely with player count
                float avatarScale = count <= 4 ? 1.0f : count <= 7 ? 0.85f : 0.72f;
                rect.localScale = new Vector3(avatarScale, avatarScale, 1f);

                seatView.Setup(player, player.id == currentTurnPlayerId, hideOpponentNames, isSelf);
                _spawnedSeats.Add(seatView);
            }
        }

        private List<PlayerPublic> ReorderForLocalView(List<PlayerPublic> players, string localPlayerId)
        {
            int myIdx = players.FindIndex(p => p.id == localPlayerId);
            if (myIdx <= 0) return new List<PlayerPublic>(players);

            var list = new List<PlayerPublic>();
            list.AddRange(players.GetRange(myIdx, players.Count - myIdx));
            list.AddRange(players.GetRange(0, myIdx));
            return list;
        }

        private void ClearSeats()
        {
            foreach (var seat in _spawnedSeats)
            {
                if (seat != null) Destroy(seat.gameObject);
            }
            _spawnedSeats.Clear();
        }
    }
}
