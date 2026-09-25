using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace DonkeyUno.Core
{
    public enum Suit
    {
        SPADES,
        HEARTS,
        CLUBS,
        DIAMONDS
    }

    public enum UnoColor
    {
        red,
        blue,
        green,
        yellow,
        wild
    }

    public enum UnoCardType
    {
        number,
        skip,
        reverse,
        draw2,
        draw4,
        discard_all,
        skip_everyone,
        wild,
        wild_draw6,
        wild_draw10,
        wild_reverse_draw4,
        reverse_draw2,
        pass_0,
        swap_7
    }

    public enum GameType
    {
        donkey,
        uno_no_mercy
    }

    public enum RoomStatus
    {
        waiting,
        playing,
        round_end,
        game_over
    }

    [Serializable]
    public class DonkeyCard
    {
        public string id;
        [JsonConverter(typeof(StringEnumConverter))]
        public Suit suit;
        public string value;
        public int rank;
    }

    [Serializable]
    public class UnoCard
    {
        public string id;
        [JsonConverter(typeof(StringEnumConverter))]
        public UnoColor color;
        [JsonConverter(typeof(StringEnumConverter))]
        public UnoCardType type;
        public int? value;
    }

    [Serializable]
    public class PlayerPublic
    {
        public string id;
        public string name;
        public string avatar;
        public bool isHost;
        public bool isBot;
        public bool isDisconnected;
        public int cardsCount;
        public int? rank;
        public bool isDonkey;
        public bool isMercyEliminated;
        public bool isSpectator;
        public bool calledUno;
    }

    [Serializable]
    public class TrickPlay
    {
        public string playerId;
        public string playerName;
        public DonkeyCard card;
        public bool isCut;
    }

    [Serializable]
    public class ClientGameState
    {
        public string roomCode;
        [JsonConverter(typeof(StringEnumConverter))]
        public GameType gameType;
        [JsonConverter(typeof(StringEnumConverter))]
        public RoomStatus status;
        public string hostId;
        public string myPlayerId;

        // Raw hand received from server (polymorphic DonkeyCard or UnoCard)
        [JsonProperty("myHand")]
        public List<Newtonsoft.Json.Linq.JObject> myHandRaw;

        public List<PlayerPublic> players;
        public string currentTurnPlayerId;
        public int direction; // 1 = clockwise, -1 = counter-clockwise
        public string lastAction;
        public int roundNumber;
        public long turnExpiresAt;
        public int turnDuration;

        // Donkey game specific
        [JsonConverter(typeof(StringEnumConverter))]
        public Suit? leadSuit;
        public List<TrickPlay> currentTrick;

        // UNO No Mercy specific
        public UnoCard activeUnoCard;
        [JsonConverter(typeof(StringEnumConverter))]
        public UnoColor? activeUnoColor;
        public int drawStackCount;
        public int deckRemainingCount;

        // Helper accessors for parsed hands
        public List<UnoCard> GetMyUnoHand()
        {
            var list = new List<UnoCard>();
            if (myHandRaw == null) return list;
            foreach (var item in myHandRaw)
            {
                if (item["color"] != null && item["type"] != null)
                {
                    list.Add(item.ToObject<UnoCard>());
                }
            }
            return list;
        }

        public List<DonkeyCard> GetMyDonkeyHand()
        {
            var list = new List<DonkeyCard>();
            if (myHandRaw == null) return list;
            foreach (var item in myHandRaw)
            {
                if (item["suit"] != null && item["rank"] != null)
                {
                    list.Add(item.ToObject<DonkeyCard>());
                }
            }
            return list;
        }
    }
}
