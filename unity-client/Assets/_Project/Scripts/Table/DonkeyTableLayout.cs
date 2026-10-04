using System.Collections.Generic;
using UnityEngine;
using DonkeyUno.Core;

namespace DonkeyUno.Table
{
    public class DonkeyTableLayout : MonoBehaviour
    {
        [Header("Containers")]
        [SerializeField] private RectTransform opponentsRow;
        [SerializeField] private RectTransform localSeatContainer;
        [SerializeField] private GameObject seatPrefab;

        [Header("Sprites")]
        [SerializeField] private Sprite ninjaAvatarSprite;
        [SerializeField] private Sprite playerAvatarSprite;

        private readonly List<SeatView> _spawnedOpponentSeats = new List<SeatView>();
        private SeatView _localSeatView;

        public void UpdateTable(List<DonkeyTheme.RotatedPlayer> orderedPlayers, string currentTurnPlayerId)
        {
            if (orderedPlayers == null || orderedPlayers.Count == 0) return;

            // 1. Local Player (Godwin - DisplayIndex 0)
            var localRot = orderedPlayers[0];
            if (localSeatContainer != null && seatPrefab != null)
            {
                if (_localSeatView == null)
                {
                    var go = Instantiate(seatPrefab, localSeatContainer);
                    go.name = "LocalSeat_Godwin";
                    var rt = go.GetComponent<RectTransform>();
                    rt.anchoredPosition = Vector2.zero;
                    _localSeatView = go.GetComponent<SeatView>();
                }

                bool isMyTurn = localRot.Player.id == currentTurnPlayerId;
                _localSeatView.SetupDonkey(localRot.Player, isMyTurn, localRot.Theme, true, playerAvatarSprite);
            }

            // 2. Opponents (DisplayIndex 1..N-1)
            int oppCount = orderedPlayers.Count - 1;
            while (_spawnedOpponentSeats.Count < oppCount)
            {
                var go = Instantiate(seatPrefab, opponentsRow);
                _spawnedOpponentSeats.Add(go.GetComponent<SeatView>());
            }
            while (_spawnedOpponentSeats.Count > oppCount)
            {
                int lastIdx = _spawnedOpponentSeats.Count - 1;
                if (_spawnedOpponentSeats[lastIdx] != null) Destroy(_spawnedOpponentSeats[lastIdx].gameObject);
                _spawnedOpponentSeats.RemoveAt(lastIdx);
            }

            // Space opponents across the top row
            float seatWidth = oppCount <= 3 ? 92f : oppCount <= 5 ? 78f : 64f;
            float gap = oppCount <= 3 ? 36f : 16f;
            float totalW = oppCount * seatWidth + (oppCount - 1) * gap;
            float startX = -totalW / 2f + seatWidth / 2f;

            for (int i = 0; i < oppCount; i++)
            {
                var oppRot = orderedPlayers[i + 1];
                var seat = _spawnedOpponentSeats[i];
                seat.name = $"Opponent_{oppRot.Player.name}_{oppRot.DisplayIndex}";

                var rt = seat.GetComponent<RectTransform>();
                rt.anchoredPosition = new Vector2(startX + i * (seatWidth + gap), 0);
                float scale = oppCount <= 3 ? 1.0f : oppCount <= 5 ? 0.9f : 0.78f;
                rt.localScale = new Vector3(scale, scale, 1f);

                bool isTurn = oppRot.Player.id == currentTurnPlayerId;
                seat.SetupDonkey(oppRot.Player, isTurn, oppRot.Theme, false, ninjaAvatarSprite);
            }
        }

        public void SetSprites(Sprite ninja, Sprite player)
        {
            ninjaAvatarSprite = ninja;
            playerAvatarSprite = player;
        }
    }
}
