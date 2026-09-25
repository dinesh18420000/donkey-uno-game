using System.IO;
using UnityEngine;
using UnityEditor;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;
using DonkeyUno.Networking;
using DonkeyUno.Audio;
using DonkeyUno.UI;
using DonkeyUno.Cards;
using DonkeyUno.Table;
using UnityEditor.SceneManagement;

namespace DonkeyUno.Editor
{
    public static class SceneSetupHelper
    {
        // ─── Color palette (matches web app) ───────────────────────────────────
        // bg-gradient-to-b from-purple-950 via-[#260a38] to-slate-950
        private static Color C_BG_TOP    = new Color(0.07f, 0.02f, 0.14f);   // purple-950
        private static Color C_BG_MID    = new Color(0.15f, 0.04f, 0.22f);   // #260a38
        private static Color C_BG_BOT    = new Color(0.04f, 0.05f, 0.10f);   // slate-950

        // Panel glass (bg-white/10 backdrop-blur)
        private static Color C_GLASS     = new Color(1f, 1f, 1f, 0.10f);
        private static Color C_GLASS2    = new Color(1f, 1f, 1f, 0.06f);
        private static Color C_BORDER    = new Color(0.55f, 0.25f, 0.85f, 0.30f); // purple-500/30

        // Accent colours
        private static Color C_GOLD      = new Color(1.00f, 0.84f, 0.20f);   // amber-300
        private static Color C_GREEN     = new Color(0.16f, 0.88f, 0.42f);   // emerald-400
        private static Color C_GREEN_BTN = new Color(0.04f, 0.55f, 0.25f);   // emerald-700 text bg
        private static Color C_INDIGO    = new Color(0.25f, 0.40f, 0.95f);   // indigo-600
        private static Color C_PURPLE    = new Color(0.42f, 0.15f, 0.78f);   // purple-600
        private static Color C_DONKEY    = new Color(0.28f, 0.18f, 0.55f);   // purple-800
        private static Color C_UNO_RED   = new Color(0.55f, 0.08f, 0.15f);   // rose-900
        private static Color C_RED_BTN   = new Color(0.60f, 0.10f, 0.10f);   // red-600/80
        private static Color C_AMBER     = new Color(0.98f, 0.78f, 0.15f);   // amber-400

        private static Color C_TXT_WHITE = Color.white;
        private static Color C_TXT_PURP  = new Color(0.78f, 0.65f, 0.95f);  // purple-200
        private static Color C_TXT_AMBER = new Color(1f, 0.75f, 0.20f);     // amber-300
        private static Color C_TXT_GREEN = new Color(0.50f, 1f, 0.60f);     // emerald-300
        private static Color C_DARK_TXT  = new Color(0.06f, 0.06f, 0.12f);  // slate-950 for btn text

        [MenuItem("Tools/Setup Game Scene (Auto-Configure)")]
        public static void SetupMainGameScene()
        {
            // 1. Ensure folders exist
            string scenesDir  = "Assets/_Project/Scenes";
            string prefabsDir = "Assets/_Project/Prefabs";
            if (!Directory.Exists(scenesDir))  Directory.CreateDirectory(scenesDir);
            if (!Directory.Exists(prefabsDir)) Directory.CreateDirectory(prefabsDir);

            // 2. Generate Card & Seat Prefabs
            GameObject cardPrefab = CreateOrUpdateCardPrefab(prefabsDir + "/CardPrefab.prefab");
            GameObject seatPrefab = CreateOrUpdateSeatPrefab(prefabsDir + "/SeatPrefab.prefab");

            // 3. Create a new scene
            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);

            // 4. Setup Camera  (deep midnight behind all UI)
            Camera mainCam = Camera.main;
            if (mainCam != null)
            {
                mainCam.clearFlags = CameraClearFlags.SolidColor;
                mainCam.backgroundColor = C_BG_TOP;
            }

            // 5. EventSystem
            if (Object.FindFirstObjectByType<EventSystem>() == null)
                new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));

            // 6. Canvas  (portrait reference 430×932 = typical tall phone)
            GameObject canvasGO = new GameObject("Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas canvas = canvasGO.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            CanvasScaler scaler = canvasGO.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(430, 932);
            scaler.matchWidthOrHeight = 0.5f;

            // 7. Game Managers
            GameObject managersGO = new GameObject("--- MANAGERS ---");
            SocketService socketService = managersGO.AddComponent<SocketService>();
            AudioManager  audioManager  = managersGO.AddComponent<AudioManager>();
            GameController gameController = managersGO.AddComponent<GameController>();

            // 8–11. Screens
            GameObject lobbyGO  = BuildLobbyScreen(canvasGO.transform);
            GameObject donkeyGO = BuildDonkeyScreen(canvasGO.transform, cardPrefab, seatPrefab);
            GameObject unoGO    = BuildUnoScreen(canvasGO.transform, cardPrefab, seatPrefab);
            GameObject gameOverGO = BuildGameOverModal(canvasGO.transform);

            LobbyUI       lobbyUI   = lobbyGO.GetComponent<LobbyUI>();
            DonkeyGameUI  donkeyUI  = donkeyGO.GetComponent<DonkeyGameUI>();
            UnoGameUI     unoUI     = unoGO.GetComponent<UnoGameUI>();
            GameOverModal goModal   = gameOverGO.GetComponent<GameOverModal>();

            // 12. Wire GameController
            SerializedObject soGC = new SerializedObject(gameController);
            soGC.FindProperty("lobbyScreen").objectReferenceValue     = lobbyGO;
            soGC.FindProperty("unoGameScreen").objectReferenceValue   = unoUI;
            soGC.FindProperty("donkeyGameScreen").objectReferenceValue= donkeyUI;
            soGC.FindProperty("gameOverModal").objectReferenceValue   = gameOverGO;
            soGC.ApplyModifiedProperties();

            // Visibility defaults
            lobbyGO.SetActive(true);
            donkeyGO.SetActive(false);
            unoGO.SetActive(false);
            gameOverGO.SetActive(false);

            // 13. Save Scene
            string scenePath = scenesDir + "/MainGame.unity";
            EditorSceneManager.SaveScene(scene, scenePath);

            var buildScenes = EditorBuildSettings.scenes;
            bool alreadyInBuild = false;
            foreach (var s in buildScenes)
                if (s.path == scenePath) { alreadyInBuild = true; break; }
            if (!alreadyInBuild)
            {
                var ns = new EditorBuildSettingsScene[buildScenes.Length + 1];
                buildScenes.CopyTo(ns, 0);
                ns[ns.Length - 1] = new EditorBuildSettingsScene(scenePath, true);
                EditorBuildSettings.scenes = ns;
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            EditorUtility.DisplayDialog("Setup Complete! 🎉",
                "Game scene & UI fully generated — matching the web app visual style!\n\n" +
                "✓ Dark purple gradient lobby (matches http://localhost:3001)\n" +
                "✓ Gold JOIN FAMILY & FRIENDS TABLE button\n" +
                "✓ Game mode selector: 🫏 Donkey Master / 🔥 UNO No Mercy\n" +
                "✓ Waiting room with player list & host controls\n" +
                "✓ Casino felt game screens with prominent DEAL button\n" +
                "✓ Scene saved to: " + scenePath + "\n\n" +
                "Click Play (▶) to test — switch Game tab to Simulator for phone view!",
                "Let's Play!");
        }

        // ───────────────────────────────────────────────────────────────────────
        //  LOBBY SCREEN  (matches React LobbyScreen.tsx)
        // ───────────────────────────────────────────────────────────────────────
        private static GameObject BuildLobbyScreen(Transform parent)
        {
            // Root — full-screen, anchored to fill
            GameObject lobbyGO = CreateFullScreenContainer("LobbyScreen", parent);
            LobbyUI lobbyUI = lobbyGO.AddComponent<LobbyUI>();

            // Dark background (approximates the gradient; Unity UGUI = solid colour)
            Image bg = lobbyGO.AddComponent<Image>();
            bg.color = C_BG_MID;

            // ── Connection Status Badge (top-centre) ──────────────────────────
            TextMeshProUGUI connBadge = CreateText("ConnectionBadge", lobbyGO.transform,
                "🟡 CONNECTING...", 12, C_GOLD);
            SetAnchors(connBadge.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0,1));
            connBadge.rectTransform.sizeDelta = new Vector2(0, 28);
            connBadge.rectTransform.anchoredPosition = new Vector2(0, -36);

            // ── Header row (🃏 logo + CARDS ARENA title) ─────────────────────
            // Gold icon box
            GameObject logoBox = CreatePanel("LogoBox", lobbyGO.transform,
                new Color(0.95f, 0.70f, 0.12f), new Vector2(44, 44));
            SetAnchors(logoBox.rectTransform, new Vector2(0,1), new Vector2(0,1), new Vector2(0,1));
            logoBox.rectTransform.anchoredPosition = new Vector2(20, -72);
            TextMeshProUGUI logoEmoji = CreateText("Emoji", logoBox.transform, "🃏", 22, C_DARK_TXT);
            StretchToParent(logoEmoji.rectTransform);

            TextMeshProUGUI headerTitle = CreateText("HeaderTitle", lobbyGO.transform,
                "CARDS ARENA", 17, C_TXT_WHITE);
            headerTitle.fontStyle = FontStyles.Bold;
            SetAnchors(headerTitle.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0,1));
            headerTitle.rectTransform.sizeDelta = new Vector2(-120, 22);
            headerTitle.rectTransform.anchoredPosition = new Vector2(60, -66);
            headerTitle.alignment = TextAlignmentOptions.Left;

            TextMeshProUGUI headerSub = CreateText("HeaderSub", lobbyGO.transform,
                "Donkey Master & UNO No Mercy", 11, C_TXT_AMBER);
            SetAnchors(headerSub.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0,1));
            headerSub.rectTransform.sizeDelta = new Vector2(-120, 18);
            headerSub.rectTransform.anchoredPosition = new Vector2(60, -88);
            headerSub.alignment = TextAlignmentOptions.Left;

            // ── MAIN PANEL — glass card ────────────────────────────────────────
            // MainPanel = the whole scrollable area that is shown pre-game
            GameObject mainPanel = CreatePanel("MainPanel", lobbyGO.transform, C_GLASS, Vector2.zero);
            SetAnchors(mainPanel.rectTransform, new Vector2(0,0), new Vector2(1,1), new Vector2(0.5f,0.5f));
            mainPanel.rectTransform.offsetMin = new Vector2(12, 12);
            mainPanel.rectTransform.offsetMax = new Vector2(-12, -110);
            Image mainBorder = mainPanel.GetComponent<Image>();
            mainBorder.color = C_GLASS;

            // ── Profile section (inside mainPanel) ────────────────────────────
            TextMeshProUGUI profileLabel = CreateText("ProfileLabel", mainPanel.transform,
                "YOUR PLAYER PROFILE", 10, C_TXT_PURP);
            profileLabel.fontStyle = FontStyles.Bold;
            profileLabel.characterSpacing = 2;
            SetAnchors(profileLabel.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            profileLabel.rectTransform.sizeDelta = new Vector2(-24, 18);
            profileLabel.rectTransform.anchoredPosition = new Vector2(0, -16);
            profileLabel.alignment = TextAlignmentOptions.Left;

            // Avatar circle placeholder
            GameObject avatarCircle = CreatePanel("AvatarCircle", mainPanel.transform,
                new Color(0.1f, 0.3f, 0.5f), new Vector2(56, 56));
            SetAnchors(avatarCircle.rectTransform, new Vector2(0,1), new Vector2(0,1), new Vector2(0,1));
            avatarCircle.rectTransform.anchoredPosition = new Vector2(40, -56);
            TextMeshProUGUI avatarTxt = CreateText("AvatarTxt", avatarCircle.transform, "🤖", 26, Color.white);
            StretchToParent(avatarTxt.rectTransform);

            // Player name input
            var nameInput = CreateInputField("NameInput", mainPanel.transform,
                "Your nickname (e.g. Thala)", "Thala",
                new Vector2(0, -56), new Vector2(-78, 44));
            SetAnchors(nameInput.GetComponent<RectTransform>(), new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            nameInput.GetComponent<RectTransform>().offsetMin = new Vector2(86, -84);
            nameInput.GetComponent<RectTransform>().offsetMax = new Vector2(-12, -42);

            // Server URL input (below name — settings-style)
            var serverInput = CreateInputField("ServerInput", mainPanel.transform,
                "Server URL...", "http://localhost:3001",
                Vector2.zero, Vector2.zero);
            SetAnchors(serverInput.GetComponent<RectTransform>(), new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            serverInput.GetComponent<RectTransform>().offsetMin = new Vector2(12, -138);
            serverInput.GetComponent<RectTransform>().offsetMax = new Vector2(-12, -100);

            // ── Game Mode Selector ────────────────────────────────────────────
            TextMeshProUGUI modeLabel = CreateText("ModeLabel", mainPanel.transform,
                "SELECT GAME MODE", 10, C_TXT_PURP);
            modeLabel.fontStyle = FontStyles.Bold;
            modeLabel.characterSpacing = 2;
            SetAnchors(modeLabel.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            modeLabel.rectTransform.sizeDelta = new Vector2(-24, 18);
            modeLabel.rectTransform.anchoredPosition = new Vector2(0, -154);
            modeLabel.alignment = TextAlignmentOptions.Left;

            // Donkey mode card
            GameObject donkeyCard = CreatePanel("DonkeyModeCard", mainPanel.transform,
                C_DONKEY, Vector2.zero);
            SetAnchors(donkeyCard.rectTransform, new Vector2(0,1), new Vector2(0.5f,1), new Vector2(0.5f,1));
            donkeyCard.rectTransform.offsetMin = new Vector2(12, -232);
            donkeyCard.rectTransform.offsetMax = new Vector2(-4, -178);
            TextMeshProUGUI donkeyEmoji = CreateText("DonkeyEmoji", donkeyCard.transform, "🫏", 22, Color.white);
            donkeyEmoji.rectTransform.anchoredPosition = new Vector2(-50, 8);
            TextMeshProUGUI donkeyName = CreateText("DonkeyName", donkeyCard.transform, "Donkey Master", 12, Color.white);
            donkeyName.fontStyle = FontStyles.Bold;
            donkeyName.rectTransform.anchoredPosition = new Vector2(14, 8);
            TextMeshProUGUI donkeySub = CreateText("DonkeySub", donkeyCard.transform,
                "52 Cards • 4 Suits • Cut Penalty", 9, C_TXT_PURP);
            donkeySub.rectTransform.anchoredPosition = new Vector2(14, -10);

            // Uno mode card
            GameObject unoCard = CreatePanel("UnoModeCard", mainPanel.transform,
                C_UNO_RED, Vector2.zero);
            SetAnchors(unoCard.rectTransform, new Vector2(0.5f,1), new Vector2(1,1), new Vector2(0.5f,1));
            unoCard.rectTransform.offsetMin = new Vector2(4, -232);
            unoCard.rectTransform.offsetMax = new Vector2(-12, -178);
            TextMeshProUGUI unoEmoji = CreateText("UnoEmoji", unoCard.transform, "🔥", 22, Color.white);
            unoEmoji.rectTransform.anchoredPosition = new Vector2(-50, 8);
            TextMeshProUGUI unoName = CreateText("UnoName", unoCard.transform, "UNO No Mercy", 12, Color.white);
            unoName.fontStyle = FontStyles.Bold;
            unoName.rectTransform.anchoredPosition = new Vector2(14, 8);
            TextMeshProUGUI unoSub = CreateText("UnoSub", unoCard.transform,
                "168 Cards • +10 Stacking", 9, new Color(1f, 0.65f, 0.65f));
            unoSub.rectTransform.anchoredPosition = new Vector2(14, -10);

            // Game Type Dropdown (hidden select, drives the mode cards)
            GameObject ddGO = new GameObject("GameTypeDropdown", typeof(RectTransform), typeof(Image), typeof(TMP_Dropdown));
            ddGO.transform.SetParent(mainPanel.transform, false);
            SetAnchors(ddGO.GetComponent<RectTransform>(), new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            ddGO.GetComponent<RectTransform>().offsetMin = new Vector2(12, -242);
            ddGO.GetComponent<RectTransform>().offsetMax = new Vector2(-12, -234);
            ddGO.GetComponent<Image>().color = new Color(0, 0, 0, 0); // invisible — driven by taps on the cards above
            TMP_Dropdown dropdown = ddGO.GetComponent<TMP_Dropdown>();
            dropdown.options.Add(new TMP_Dropdown.OptionData("Donkey Master 🫏"));
            dropdown.options.Add(new TMP_Dropdown.OptionData("UNO No Mercy 🔥"));

            // Max Players row
            TextMeshProUGUI maxPlayersText = CreateText("MaxPlayersText", mainPanel.transform,
                "Max Players: 10", 11, C_TXT_WHITE);
            SetAnchors(maxPlayersText.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            maxPlayersText.rectTransform.sizeDelta = new Vector2(-24, 18);
            maxPlayersText.rectTransform.anchoredPosition = new Vector2(0, -250);
            maxPlayersText.alignment = TextAlignmentOptions.Left;
            var slider = CreateSlider("MaxPlayersSlider", mainPanel.transform, 2, 10, 10,
                new Vector2(0, -272), new Vector2(0, 20));
            SetAnchors(slider.GetComponent<RectTransform>(), new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            slider.GetComponent<RectTransform>().offsetMin = new Vector2(12, -280);
            slider.GetComponent<RectTransform>().offsetMax = new Vector2(-12, -260);

            // ── PRIMARY ACTION: JOIN FAMILY & FRIENDS TABLE ───────────────────
            Button familyBtn = CreateButton("FamilyTableButton", mainPanel.transform,
                "🏠 JOIN FAMILY & FRIENDS TABLE",
                C_GREEN, C_DARK_TXT,
                Vector2.zero, Vector2.zero);
            SetAnchors(familyBtn.GetComponent<RectTransform>(), new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            familyBtn.GetComponent<RectTransform>().offsetMin = new Vector2(12, -342);
            familyBtn.GetComponent<RectTransform>().offsetMax = new Vector2(-12, -294);
            TextMeshProUGUI fTxt = familyBtn.GetComponentInChildren<TextMeshProUGUI>();
            fTxt.fontStyle = FontStyles.Bold;
            fTxt.fontSize = 14;

            TextMeshProUGUI familyHint = CreateText("FamilyHint", mainPanel.transform,
                "⭐ No code needed! Instant 1-tap join (Up to 10 players)", 9, C_TXT_GREEN);
            SetAnchors(familyHint.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            familyHint.rectTransform.sizeDelta = new Vector2(-24, 18);
            familyHint.rectTransform.anchoredPosition = new Vector2(0, -350);

            // Status feedback (shows "Joining Family Table…" etc.)
            TextMeshProUGUI statusFeedback = CreateText("StatusFeedback", mainPanel.transform,
                "", 12, C_GOLD);
            SetAnchors(statusFeedback.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            statusFeedback.rectTransform.sizeDelta = new Vector2(-24, 22);
            statusFeedback.rectTransform.anchoredPosition = new Vector2(0, -370);

            // ── PRIVATE ROOM SECTION ──────────────────────────────────────────
            TextMeshProUGUI privateLabel = CreateText("PrivateLabel", mainPanel.transform,
                "Need a Private Room?", 10, C_TXT_PURP);
            SetAnchors(privateLabel.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            privateLabel.rectTransform.sizeDelta = new Vector2(-24, 16);
            privateLabel.rectTransform.anchoredPosition = new Vector2(0, -390);

            Button createBtn = CreateButton("CreateRoomButton", mainPanel.transform,
                "CREATE PRIVATE ROOM",
                C_INDIGO, C_TXT_WHITE,
                Vector2.zero, Vector2.zero);
            SetAnchors(createBtn.GetComponent<RectTransform>(), new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            createBtn.GetComponent<RectTransform>().offsetMin = new Vector2(12, -434);
            createBtn.GetComponent<RectTransform>().offsetMax = new Vector2(-12, -404);

            // Room code input + JOIN button
            var roomInput = CreateInputField("RoomCodeInput", mainPanel.transform,
                "6-DIGIT CODE", "", Vector2.zero, Vector2.zero);
            SetAnchors(roomInput.GetComponent<RectTransform>(), new Vector2(0,1), new Vector2(0.6f,1), new Vector2(0.5f,1));
            roomInput.GetComponent<RectTransform>().offsetMin = new Vector2(12, -478);
            roomInput.GetComponent<RectTransform>().offsetMax = new Vector2(-4, -440);
            // Set mono font style on text
            var roomInputText = roomInput.textComponent;
            if (roomInputText != null) { roomInputText.color = C_GOLD; roomInputText.fontSize = 15; }

            Button joinBtn = CreateButton("JoinRoomButton", mainPanel.transform,
                "JOIN", C_AMBER, C_DARK_TXT,
                Vector2.zero, Vector2.zero);
            SetAnchors(joinBtn.GetComponent<RectTransform>(), new Vector2(0.62f,1), new Vector2(1,1), new Vector2(0.5f,1));
            joinBtn.GetComponent<RectTransform>().offsetMin = new Vector2(0, -478);
            joinBtn.GetComponent<RectTransform>().offsetMax = new Vector2(-12, -440);
            joinBtn.GetComponentInChildren<TextMeshProUGUI>().fontStyle = FontStyles.Bold;

            // ─────────────────────────────────────────────────────────────────
            // WAITING ROOM PANEL  (shown after joining / creating a room)
            // ─────────────────────────────────────────────────────────────────
            GameObject waitPanel = CreatePanel("WaitingRoomPanel", lobbyGO.transform, C_BG_MID, Vector2.zero);
            SetAnchors(waitPanel.rectTransform, Vector2.zero, Vector2.one, new Vector2(0.5f, 0.5f));
            waitPanel.rectTransform.offsetMin = Vector2.zero;
            waitPanel.rectTransform.offsetMax = Vector2.zero;
            waitPanel.SetActive(false);

            // Waiting room header row
            TextMeshProUGUI gameModeBadge = CreateText("GameModeBadge", waitPanel.transform,
                "🫏 DONKEY MASTER", 15, C_TXT_WHITE);
            gameModeBadge.fontStyle = FontStyles.Bold;
            SetAnchors(gameModeBadge.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            gameModeBadge.rectTransform.sizeDelta = new Vector2(0, 30);
            gameModeBadge.rectTransform.anchoredPosition = new Vector2(0, -60);

            // Room code display
            TextMeshProUGUI roomCodeDisplay = CreateText("RoomCodeDisplay", waitPanel.transform,
                "🏠 FAMILY & FRIENDS TABLE", 20, C_GOLD);
            roomCodeDisplay.fontStyle = FontStyles.Bold;
            SetAnchors(roomCodeDisplay.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            roomCodeDisplay.rectTransform.sizeDelta = new Vector2(0, 36);
            roomCodeDisplay.rectTransform.anchoredPosition = new Vector2(0, -100);

            // Open table message
            TextMeshProUGUI openTableMsg = CreateText("OpenTableMsg", waitPanel.transform,
                "🏠 OPEN TABLE FOR FAMILY & FRIENDS\nAny family member opening the app joins automatically!", 11, C_TXT_GREEN);
            SetAnchors(openTableMsg.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            openTableMsg.rectTransform.sizeDelta = new Vector2(-24, 44);
            openTableMsg.rectTransform.anchoredPosition = new Vector2(0, -148);

            // Bot note
            TextMeshProUGUI botNote = CreateText("BotNote", waitPanel.transform,
                "🤖 If anyone disconnects, a bot holds their turn until they return!", 10, new Color(0.8f,0.7f,1f));
            SetAnchors(botNote.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            botNote.rectTransform.sizeDelta = new Vector2(-24, 28);
            botNote.rectTransform.anchoredPosition = new Vector2(0, -182);

            // Players list
            TextMeshProUGUI playersList = CreateText("PlayersList", waitPanel.transform,
                "Connected Players:\n\n• Waiting for players...", 13, Color.white);
            SetAnchors(playersList.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            playersList.rectTransform.sizeDelta = new Vector2(-24, 240);
            playersList.rectTransform.anchoredPosition = new Vector2(0, -340);
            playersList.alignment = TextAlignmentOptions.Left;
            playersList.overflowMode = TextOverflowModes.ScrollRect;

            // Add Bot Button
            Button addBotBtn = CreateButton("AddBotButton", waitPanel.transform,
                "＋ Add Computer Bot",
                C_PURPLE, Color.white, Vector2.zero, Vector2.zero);
            SetAnchors(addBotBtn.GetComponent<RectTransform>(), new Vector2(0,0), new Vector2(1,0), new Vector2(0.5f,0));
            addBotBtn.GetComponent<RectTransform>().sizeDelta = new Vector2(-24, 44);
            addBotBtn.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 192);

            // Start Game Button (gold — host only)
            Button startBtn = CreateButton("StartGameButton", waitPanel.transform,
                "▶ START GAME",
                C_AMBER, C_DARK_TXT, Vector2.zero, Vector2.zero);
            SetAnchors(startBtn.GetComponent<RectTransform>(), new Vector2(0,0), new Vector2(1,0), new Vector2(0.5f,0));
            startBtn.GetComponent<RectTransform>().sizeDelta = new Vector2(-24, 52);
            startBtn.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 136);
            startBtn.GetComponentInChildren<TextMeshProUGUI>().fontStyle = FontStyles.Bold;
            startBtn.GetComponentInChildren<TextMeshProUGUI>().fontSize = 16;

            // Waiting-for-host hint
            TextMeshProUGUI waitingHint = CreateText("WaitingHint", waitPanel.transform,
                "Waiting for host to start game...", 12, C_TXT_PURP);
            SetAnchors(waitingHint.rectTransform, new Vector2(0,0), new Vector2(1,0), new Vector2(0.5f,0));
            waitingHint.rectTransform.sizeDelta = new Vector2(-24, 36);
            waitingHint.rectTransform.anchoredPosition = new Vector2(0, 96);

            // Leave Room Button (bottom-left)
            Button leaveBtn = CreateButton("LeaveButton", waitPanel.transform,
                "Leave Room",
                C_RED_BTN, Color.white, Vector2.zero, Vector2.zero);
            SetAnchors(leaveBtn.GetComponent<RectTransform>(), new Vector2(0,0), new Vector2(0.45f,0), new Vector2(0,0));
            leaveBtn.GetComponent<RectTransform>().sizeDelta = new Vector2(-12, 38);
            leaveBtn.GetComponent<RectTransform>().anchoredPosition = new Vector2(12, 52);

            // ── Wire LobbyUI serialized fields ────────────────────────────────
            SerializedObject so = new SerializedObject(lobbyUI);
            so.FindProperty("mainPanel").objectReferenceValue            = mainPanel;
            so.FindProperty("waitingRoomPanel").objectReferenceValue     = waitPanel;
            so.FindProperty("connectionBadgeText").objectReferenceValue  = connBadge;
            so.FindProperty("statusFeedbackText").objectReferenceValue   = statusFeedback;
            so.FindProperty("nameInputField").objectReferenceValue       = nameInput;
            so.FindProperty("serverUrlInputField").objectReferenceValue  = serverInput;
            so.FindProperty("joinFamilyTableButton").objectReferenceValue= familyBtn;
            so.FindProperty("joinFamilyTableButtonText").objectReferenceValue = fTxt;
            so.FindProperty("gameTypeDropdown").objectReferenceValue     = dropdown;
            so.FindProperty("maxPlayersSlider").objectReferenceValue     = slider;
            so.FindProperty("maxPlayersText").objectReferenceValue       = maxPlayersText;
            so.FindProperty("createRoomButton").objectReferenceValue     = createBtn;
            so.FindProperty("roomCodeInputField").objectReferenceValue   = roomInput;
            so.FindProperty("joinRoomButton").objectReferenceValue       = joinBtn;
            so.FindProperty("roomCodeDisplayText").objectReferenceValue  = roomCodeDisplay;
            so.FindProperty("gameModeBadgeText").objectReferenceValue    = gameModeBadge;
            so.FindProperty("playersListText").objectReferenceValue      = playersList;
            so.FindProperty("addBotButton").objectReferenceValue         = addBotBtn;
            so.FindProperty("startGameButton").objectReferenceValue      = startBtn;
            so.FindProperty("leaveRoomButton").objectReferenceValue      = leaveBtn;
            so.ApplyModifiedProperties();

            return lobbyGO;
        }

        // ───────────────────────────────────────────────────────────────────────
        //  DONKEY MASTER SCREEN
        // ───────────────────────────────────────────────────────────────────────
        private static GameObject BuildDonkeyScreen(Transform parent, GameObject cardPrefab, GameObject seatPrefab)
        {
            GameObject donkeyGO = CreateFullScreenContainer("DonkeyGameScreen", parent);
            DonkeyGameUI donkeyUI = donkeyGO.AddComponent<DonkeyGameUI>();

            // Dark blue casino felt table
            Image tableBg = donkeyGO.AddComponent<Image>();
            tableBg.color = new Color(0.04f, 0.12f, 0.22f);

            // TableLayoutManager
            TableLayoutManager table = donkeyGO.AddComponent<TableLayoutManager>();
            GameObject tableBoundsGO = CreateUIContainer("TableBounds", donkeyGO.transform);
            RectTransform rtBounds = tableBoundsGO.GetComponent<RectTransform>();
            SetAnchors(rtBounds, new Vector2(0,0.15f), new Vector2(1,0.88f), new Vector2(0.5f,0.5f));
            rtBounds.offsetMin = Vector2.zero; rtBounds.offsetMax = Vector2.zero;

            // Header strip
            GameObject headerStrip = CreatePanel("HeaderStrip", donkeyGO.transform,
                new Color(0.02f, 0.06f, 0.14f, 0.9f), Vector2.zero);
            SetAnchors(headerStrip.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            headerStrip.rectTransform.sizeDelta = new Vector2(0, 60);
            headerStrip.rectTransform.anchoredPosition = Vector2.zero;

            TextMeshProUGUI turnText = CreateText("TurnStatus", headerStrip.transform,
                "🫏 DONKEY MASTER — Waiting to start...", 15, C_GOLD);
            turnText.fontStyle = FontStyles.Bold;
            StretchToParent(turnText.rectTransform, 12, 0);

            // Lead Suit text
            TextMeshProUGUI leadText = CreateText("LeadSuitText", donkeyGO.transform,
                "Lead Suit: Play Any Card to Lead", 13, Color.white);
            SetAnchors(leadText.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            leadText.rectTransform.sizeDelta = new Vector2(0, 24);
            leadText.rectTransform.anchoredPosition = new Vector2(0, -66);

            // Trick container (centre of table)
            GameObject trickGO = CreateUIContainer("TrickContainer", donkeyGO.transform);
            RectTransform rtTrick = trickGO.GetComponent<RectTransform>();
            SetAnchors(rtTrick, new Vector2(0.1f, 0.3f), new Vector2(0.9f, 0.72f), new Vector2(0.5f, 0.5f));
            rtTrick.offsetMin = Vector2.zero; rtTrick.offsetMax = Vector2.zero;

            // Cut banner
            GameObject cutGO = CreatePanel("CutBanner", donkeyGO.transform,
                new Color(0.9f, 0.1f, 0.15f, 0.92f), Vector2.zero);
            SetAnchors(cutGO.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            cutGO.rectTransform.sizeDelta = new Vector2(0, 48);
            cutGO.rectTransform.anchoredPosition = new Vector2(0, -64);
            TextMeshProUGUI cutText = CreateText("CutText", cutGO.transform,
                "⚡ CUT BY OPPONENT!", 16, Color.white);
            cutText.fontStyle = FontStyles.Bold;
            StretchToParent(cutText.rectTransform);
            cutGO.SetActive(false);

            // Hand Container
            GameObject handGO = CreateUIContainer("HandContainer", donkeyGO.transform);
            RectTransform rtHand = handGO.GetComponent<RectTransform>();
            SetAnchors(rtHand, new Vector2(0,0), new Vector2(1,0.17f), new Vector2(0.5f,0));
            rtHand.offsetMin = Vector2.zero; rtHand.offsetMax = Vector2.zero;
            HandManager handManager = donkeyGO.AddComponent<HandManager>();

            // Bottom bar
            GameObject bottomBar = CreatePanel("BottomBar", donkeyGO.transform,
                new Color(0.02f, 0.04f, 0.10f, 0.96f), Vector2.zero);
            SetAnchors(bottomBar.rectTransform, new Vector2(0,0), new Vector2(1,0), new Vector2(0.5f,0));
            bottomBar.rectTransform.sizeDelta = new Vector2(0, 72);
            bottomBar.rectTransform.anchoredPosition = Vector2.zero;

            // DEAL button — prominent gold
            Button dealBtn = CreateButton("DealButton", bottomBar.transform,
                "DEAL CARD", C_AMBER, C_DARK_TXT,
                new Vector2(0, 0), new Vector2(0, 56));
            SetAnchors(dealBtn.GetComponent<RectTransform>(), new Vector2(0.5f,0.5f), new Vector2(1,0.5f), new Vector2(0.5f,0.5f));
            dealBtn.GetComponent<RectTransform>().offsetMin = new Vector2(8, -28);
            dealBtn.GetComponent<RectTransform>().offsetMax = new Vector2(-12, 28);
            TextMeshProUGUI dealBtnText = dealBtn.GetComponentInChildren<TextMeshProUGUI>();
            dealBtnText.fontStyle = FontStyles.Bold;
            dealBtnText.fontSize = 16;

            TextMeshProUGUI lastAction = CreateText("LastAction", bottomBar.transform,
                "", 11, C_TXT_PURP);
            SetAnchors(lastAction.rectTransform, new Vector2(0,0), new Vector2(0.5f,1), new Vector2(0,0.5f));
            lastAction.rectTransform.offsetMin = new Vector2(8,0); lastAction.rectTransform.offsetMax = new Vector2(-4,0);
            lastAction.alignment = TextAlignmentOptions.Left;

            // Wire DonkeyGameUI
            SerializedObject so = new SerializedObject(donkeyUI);
            so.FindProperty("tableLayoutManager").objectReferenceValue = table;
            so.FindProperty("handManager").objectReferenceValue        = handManager;
            so.FindProperty("trickContainer").objectReferenceValue     = rtTrick;
            so.FindProperty("trickCardPrefab").objectReferenceValue    = cardPrefab;
            so.FindProperty("leadSuitText").objectReferenceValue       = leadText;
            so.FindProperty("cutBannerObject").objectReferenceValue    = cutGO;
            so.FindProperty("cutBannerText").objectReferenceValue      = cutText;
            so.FindProperty("turnStatusText").objectReferenceValue     = turnText;
            so.FindProperty("lastActionText").objectReferenceValue     = lastAction;
            so.FindProperty("dealButton").objectReferenceValue         = dealBtn;
            so.FindProperty("dealButtonText").objectReferenceValue     = dealBtnText;
            so.ApplyModifiedProperties();

            SerializedObject soTable = new SerializedObject(table);
            soTable.FindProperty("tableBounds").objectReferenceValue = rtBounds;
            soTable.FindProperty("seatPrefab").objectReferenceValue  = seatPrefab;
            soTable.ApplyModifiedProperties();

            SerializedObject soHand = new SerializedObject(handManager);
            soHand.FindProperty("handContainer").objectReferenceValue = rtHand;
            soHand.FindProperty("cardPrefab").objectReferenceValue    = cardPrefab;
            soHand.ApplyModifiedProperties();

            return donkeyGO;
        }

        // ───────────────────────────────────────────────────────────────────────
        //  UNO NO MERCY SCREEN  (landscape layout)
        // ───────────────────────────────────────────────────────────────────────
        private static GameObject BuildUnoScreen(Transform parent, GameObject cardPrefab, GameObject seatPrefab)
        {
            GameObject unoGO = CreateFullScreenContainer("UnoGameScreen", parent);
            UnoGameUI unoUI = unoGO.AddComponent<UnoGameUI>();

            // Deep violet casino felt
            Image tableBg = unoGO.AddComponent<Image>();
            tableBg.color = new Color(0.10f, 0.03f, 0.18f);

            TableLayoutManager table = unoGO.AddComponent<TableLayoutManager>();
            GameObject tableBoundsGO = CreateUIContainer("TableBounds", unoGO.transform);
            RectTransform rtBounds = tableBoundsGO.GetComponent<RectTransform>();
            SetAnchors(rtBounds, new Vector2(0,0.18f), new Vector2(1,0.85f), new Vector2(0.5f,0.5f));
            rtBounds.offsetMin = Vector2.zero; rtBounds.offsetMax = Vector2.zero;

            // Header strip
            GameObject headerStrip = CreatePanel("HeaderStrip", unoGO.transform,
                new Color(0.06f, 0.02f, 0.12f, 0.92f), Vector2.zero);
            SetAnchors(headerStrip.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            headerStrip.rectTransform.sizeDelta = new Vector2(0, 58);
            headerStrip.rectTransform.anchoredPosition = Vector2.zero;

            TextMeshProUGUI turnText = CreateText("TurnStatus", headerStrip.transform,
                "🔥 UNO NO MERCY — Waiting to start...", 15, C_GOLD);
            turnText.fontStyle = FontStyles.Bold;
            StretchToParent(turnText.rectTransform, 12, 0);

            // Stacking Banner
            GameObject stackBanner = CreatePanel("StackingBanner", unoGO.transform,
                new Color(0.92f, 0.12f, 0.22f, 0.95f), Vector2.zero);
            SetAnchors(stackBanner.rectTransform, new Vector2(0,1), new Vector2(1,1), new Vector2(0.5f,1));
            stackBanner.rectTransform.sizeDelta = new Vector2(0, 44);
            stackBanner.rectTransform.anchoredPosition = new Vector2(0, -60);
            TextMeshProUGUI stackText = CreateText("StackText", stackBanner.transform,
                "🔥 +10 STACK ACTIVE!", 16, Color.white);
            stackText.fontStyle = FontStyles.Bold;
            StretchToParent(stackText.rectTransform);
            stackBanner.SetActive(false);

            // Centre area: Draw pile + Discard card
            GameObject centreRow = CreateUIContainer("CentreRow", unoGO.transform);
            SetAnchors(centreRow.GetComponent<RectTransform>(),
                new Vector2(0.28f, 0.38f), new Vector2(0.72f, 0.65f),
                new Vector2(0.5f, 0.5f));
            centreRow.GetComponent<RectTransform>().offsetMin = Vector2.zero;
            centreRow.GetComponent<RectTransform>().offsetMax = Vector2.zero;

            // Draw pile button
            Button drawPileBtn = CreateButton("DrawPileButton", centreRow.transform,
                "DRAW\nPILE", new Color(0.18f, 0.12f, 0.32f), Color.white,
                new Vector2(-60, 0), new Vector2(90, 125));
            drawPileBtn.GetComponent<RectTransform>().anchoredPosition = new Vector2(-60, 0);

            TextMeshProUGUI deckRemaining = CreateText("DeckRemaining", centreRow.transform,
                "52", 11, C_TXT_PURP);
            deckRemaining.rectTransform.anchoredPosition = new Vector2(-60, -72);
            deckRemaining.rectTransform.sizeDelta = new Vector2(90, 18);

            // Discard pile
            GameObject discardGO = Object.Instantiate(cardPrefab, centreRow.transform);
            discardGO.name = "ActiveDiscardCard";
            discardGO.GetComponent<RectTransform>().anchoredPosition = new Vector2(60, 0);
            CardView discardView = discardGO.GetComponent<CardView>();

            // Color halo ring
            GameObject haloGO = CreateUIContainer("ColorHalo", centreRow.transform);
            Image halo = haloGO.AddComponent<Image>();
            halo.color = new Color(1f, 0.85f, 0.2f, 0.35f);
            haloGO.GetComponent<RectTransform>().sizeDelta = new Vector2(96, 128);
            haloGO.GetComponent<RectTransform>().anchoredPosition = new Vector2(60, 0);

            TextMeshProUGUI activeColorText = CreateText("ActiveColorText", centreRow.transform,
                "ACTIVE: —", 10, Color.white);
            activeColorText.rectTransform.anchoredPosition = new Vector2(60, -72);
            activeColorText.rectTransform.sizeDelta = new Vector2(90, 18);

            // Hand container (bottom strip)
            GameObject handGO = CreateUIContainer("HandContainer", unoGO.transform);
            RectTransform rtHand = handGO.GetComponent<RectTransform>();
            SetAnchors(rtHand, new Vector2(0,0), new Vector2(1,0.18f), new Vector2(0.5f,0));
            rtHand.offsetMin = Vector2.zero; rtHand.offsetMax = Vector2.zero;
            HandManager handManager = unoGO.AddComponent<HandManager>();

            // Uno Call / Catch buttons
            Button callUnoBtn = CreateButton("CallUnoButton", unoGO.transform,
                "CALL UNO! 🔥", new Color(0.9f, 0.15f, 0.15f), Color.white,
                new Vector2(-120, 76), new Vector2(160, 44));
            Button catchUnoBtn = CreateButton("CatchUnoButton", unoGO.transform,
                "CATCH UNO! 🚨", new Color(1f, 0.55f, 0.1f), Color.white,
                new Vector2(120, 76), new Vector2(160, 44));
            callUnoBtn.gameObject.SetActive(false);
            catchUnoBtn.gameObject.SetActive(false);

            // Bottom bar
            GameObject bottomBar = CreatePanel("BottomBar", unoGO.transform,
                new Color(0.04f, 0.02f, 0.08f, 0.96f), Vector2.zero);
            SetAnchors(bottomBar.rectTransform, new Vector2(0,0), new Vector2(1,0), new Vector2(0.5f,0));
            bottomBar.rectTransform.sizeDelta = new Vector2(0, 64);
            bottomBar.rectTransform.anchoredPosition = Vector2.zero;

            TextMeshProUGUI lastAction = CreateText("LastAction", bottomBar.transform, "", 10, C_TXT_PURP);
            SetAnchors(lastAction.rectTransform, new Vector2(0,0), new Vector2(0.45f,1), new Vector2(0,0.5f));
            lastAction.rectTransform.offsetMin = new Vector2(10,0); lastAction.rectTransform.offsetMax = Vector2.zero;
            lastAction.alignment = TextAlignmentOptions.Left;

            // DEAL button (gold, right side)
            Button dealBtn = CreateButton("DealButton", bottomBar.transform,
                "DEAL CARD", C_AMBER, C_DARK_TXT,
                Vector2.zero, Vector2.zero);
            SetAnchors(dealBtn.GetComponent<RectTransform>(), new Vector2(0.55f,0), new Vector2(1,1), new Vector2(0.5f,0.5f));
            dealBtn.GetComponent<RectTransform>().offsetMin = new Vector2(4,6);
            dealBtn.GetComponent<RectTransform>().offsetMax = new Vector2(-10,-6);
            TextMeshProUGUI dealBtnText = dealBtn.GetComponentInChildren<TextMeshProUGUI>();
            dealBtnText.fontStyle = FontStyles.Bold;
            dealBtnText.fontSize = 15;

            // Wild Color picker modal
            GameObject wildModal = CreatePanel("WildColorPickerModal", unoGO.transform,
                new Color(0.04f, 0.04f, 0.10f, 0.95f), new Vector2(300, 200));
            wildModal.SetActive(false);

            // Swap picker modal
            GameObject swapModal = CreatePanel("SwapPickerModal", unoGO.transform,
                new Color(0.04f, 0.04f, 0.10f, 0.95f), new Vector2(300, 300));
            swapModal.SetActive(false);
            GameObject swapContainer = CreateUIContainer("SwapButtons", swapModal.transform);
            swapContainer.GetComponent<RectTransform>().sizeDelta = new Vector2(280, 260);

            // Wire UnoGameUI
            SerializedObject so = new SerializedObject(unoUI);
            so.FindProperty("tableLayoutManager").objectReferenceValue    = table;
            so.FindProperty("handManager").objectReferenceValue           = handManager;
            so.FindProperty("activeDiscardCardView").objectReferenceValue = discardView;
            so.FindProperty("activeColorHalo").objectReferenceValue       = halo;
            so.FindProperty("activeColorText").objectReferenceValue       = activeColorText;
            so.FindProperty("drawPileButton").objectReferenceValue        = drawPileBtn;
            so.FindProperty("deckRemainingText").objectReferenceValue     = deckRemaining;
            so.FindProperty("stackingBannerObject").objectReferenceValue  = stackBanner;
            so.FindProperty("stackingCountText").objectReferenceValue     = stackText;
            so.FindProperty("turnStatusText").objectReferenceValue        = turnText;
            so.FindProperty("lastActionText").objectReferenceValue        = lastAction;
            so.FindProperty("callUnoButton").objectReferenceValue         = callUnoBtn;
            so.FindProperty("callUnoButtonText").objectReferenceValue     = callUnoBtn.GetComponentInChildren<TextMeshProUGUI>();
            so.FindProperty("catchUnoButton").objectReferenceValue        = catchUnoBtn;
            so.FindProperty("catchUnoButtonText").objectReferenceValue    = catchUnoBtn.GetComponentInChildren<TextMeshProUGUI>();
            so.FindProperty("dealButton").objectReferenceValue            = dealBtn;
            so.FindProperty("dealButtonText").objectReferenceValue        = dealBtnText;
            so.FindProperty("wildColorPickerModal").objectReferenceValue  = wildModal;
            so.FindProperty("swapPickerModal").objectReferenceValue       = swapModal;
            so.FindProperty("swapButtonsContainer").objectReferenceValue  = swapContainer.transform;
            so.FindProperty("swapPlayerButtonPrefab").objectReferenceValue= cardPrefab; // placeholder
            so.ApplyModifiedProperties();

            SerializedObject soTable = new SerializedObject(table);
            soTable.FindProperty("tableBounds").objectReferenceValue = rtBounds;
            soTable.FindProperty("seatPrefab").objectReferenceValue  = seatPrefab;
            soTable.ApplyModifiedProperties();

            SerializedObject soHand = new SerializedObject(handManager);
            soHand.FindProperty("handContainer").objectReferenceValue = rtHand;
            soHand.FindProperty("cardPrefab").objectReferenceValue    = cardPrefab;
            soHand.ApplyModifiedProperties();

            return unoGO;
        }

        // ───────────────────────────────────────────────────────────────────────
        //  GAME OVER MODAL
        // ───────────────────────────────────────────────────────────────────────
        private static GameObject BuildGameOverModal(Transform parent)
        {
            GameObject modalGO = CreatePanel("GameOverModal", parent,
                new Color(0.04f, 0.04f, 0.10f, 0.95f), new Vector2(380, 480));
            GameOverModal modal = modalGO.AddComponent<GameOverModal>();

            TextMeshProUGUI title = CreateText("Title", modalGO.transform,
                "🏆 GAME OVER 🏆", 28, C_GOLD);
            title.fontStyle = FontStyles.Bold;
            title.rectTransform.anchoredPosition = new Vector2(0, 170);

            TextMeshProUGUI body = CreateText("Body", modalGO.transform,
                "Winner details...", 14, Color.white);
            body.rectTransform.anchoredPosition = new Vector2(0, 40);
            body.rectTransform.sizeDelta = new Vector2(340, 200);
            body.overflowMode = TextOverflowModes.Overflow;

            Button lobbyBtn = CreateButton("LobbyBtn", modalGO.transform,
                "Return to Lobby",
                C_INDIGO, Color.white,
                new Vector2(0, -145), new Vector2(280, 50));

            // Wire GameOverModal serialized fields
            SerializedObject so = new SerializedObject(modal);
            var titleProp        = so.FindProperty("titleText");
            var winnerNameProp   = so.FindProperty("winnerNameText");
            var rankingsProp     = so.FindProperty("rankingsListText");
            var backLobbyProp    = so.FindProperty("backToLobbyButton");
            if (titleProp != null)      titleProp.objectReferenceValue      = title;
            if (winnerNameProp != null) winnerNameProp.objectReferenceValue = body;   // reuse body TMP for winner
            if (rankingsProp != null)   rankingsProp.objectReferenceValue   = body;
            if (backLobbyProp != null)  backLobbyProp.objectReferenceValue  = lobbyBtn;
            so.ApplyModifiedProperties();

            modalGO.SetActive(false);
            return modalGO;
        }

        // ═══════════════════════════════════════════════════════════════════════
        //  PREFAB BUILDERS
        // ═══════════════════════════════════════════════════════════════════════
        private static GameObject CreateOrUpdateCardPrefab(string path)
        {
            GameObject cardGO = new GameObject("CardTemplate",
                typeof(RectTransform), typeof(Image), typeof(CardView));
            RectTransform rt = cardGO.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(80, 115);

            Image bg = cardGO.GetComponent<Image>();
            bg.color = new Color(0.96f, 0.96f, 0.98f);

            TextMeshProUGUI center = CreateText("CenterText", cardGO.transform,
                "A", 28, Color.black, TextAlignmentOptions.Center);
            StretchToParent(center.rectTransform);

            TextMeshProUGUI cornerTL = CreateText("CornerTL", cardGO.transform, "A", 12, Color.black, TextAlignmentOptions.TopLeft);
            cornerTL.rectTransform.anchorMin = new Vector2(0,1); cornerTL.rectTransform.anchorMax = new Vector2(0,1);
            cornerTL.rectTransform.pivot = new Vector2(0,1);
            cornerTL.rectTransform.anchoredPosition = new Vector2(5,-4);
            cornerTL.rectTransform.sizeDelta = new Vector2(30,20);

            TextMeshProUGUI cornerBR = CreateText("CornerBR", cardGO.transform, "A", 12, Color.black, TextAlignmentOptions.BottomRight);
            cornerBR.rectTransform.anchorMin = new Vector2(1,0); cornerBR.rectTransform.anchorMax = new Vector2(1,0);
            cornerBR.rectTransform.pivot = new Vector2(1,0);
            cornerBR.rectTransform.anchoredPosition = new Vector2(-5,4);
            cornerBR.rectTransform.sizeDelta = new Vector2(30,20);

            GameObject outline = CreateUIContainer("SelectedOutline", cardGO.transform);
            Image outlineImg = outline.AddComponent<Image>();
            outlineImg.color = new Color(1f, 0.85f, 0.2f, 0.85f);
            StretchToParent(outline.GetComponent<RectTransform>(), -4, -4);
            outline.SetActive(false);

            CardView view = cardGO.GetComponent<CardView>();
            SerializedObject so = new SerializedObject(view);
            so.FindProperty("cardBackground").objectReferenceValue  = bg;
            so.FindProperty("centerText").objectReferenceValue      = center;
            so.FindProperty("cornerTopLeft").objectReferenceValue   = cornerTL;
            so.FindProperty("cornerBottomRight").objectReferenceValue = cornerBR;
            so.FindProperty("selectedOutline").objectReferenceValue = outline;
            so.ApplyModifiedProperties();

            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(cardGO, path);
            Object.DestroyImmediate(cardGO);
            return prefab;
        }

        private static GameObject CreateOrUpdateSeatPrefab(string path)
        {
            GameObject seatGO = new GameObject("SeatTemplate",
                typeof(RectTransform), typeof(SeatView));
            seatGO.GetComponent<RectTransform>().sizeDelta = new Vector2(100, 110);

            // Avatar circle
            GameObject avatarGO = new GameObject("Avatar", typeof(RectTransform), typeof(Image));
            avatarGO.transform.SetParent(seatGO.transform, false);
            Image avatarImg = avatarGO.GetComponent<Image>();
            avatarImg.color = new Color(0.18f, 0.30f, 0.55f);
            avatarGO.GetComponent<RectTransform>().sizeDelta = new Vector2(60, 60);
            avatarGO.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 18);

            // Turn indicator ring
            GameObject turnIndicator = CreateUIContainer("TurnIndicator", seatGO.transform);
            Image turnImg = turnIndicator.AddComponent<Image>();
            turnImg.color = new Color(0.2f, 1f, 0.4f, 0.55f);
            turnIndicator.GetComponent<RectTransform>().sizeDelta = new Vector2(68, 68);
            turnIndicator.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 18);
            turnIndicator.SetActive(false);

            TextMeshProUGUI nameText = CreateText("NameText", seatGO.transform, "Player", 12, Color.white);
            nameText.rectTransform.anchoredPosition = new Vector2(0, -20);
            nameText.rectTransform.sizeDelta = new Vector2(110, 18);

            TextMeshProUGUI cardCount = CreateText("CardCount", seatGO.transform, "🃏 5", 10, C_GOLD);
            cardCount.rectTransform.anchoredPosition = new Vector2(0, -36);
            cardCount.rectTransform.sizeDelta = new Vector2(100, 16);

            SeatView seatView = seatGO.GetComponent<SeatView>();
            SerializedObject so = new SerializedObject(seatView);
            so.FindProperty("avatarImage").objectReferenceValue    = avatarImg;
            so.FindProperty("nameText").objectReferenceValue       = nameText;
            so.FindProperty("cardCountText").objectReferenceValue  = cardCount;
            so.FindProperty("turnIndicator").objectReferenceValue  = turnIndicator;
            so.ApplyModifiedProperties();

            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(seatGO, path);
            Object.DestroyImmediate(seatGO);
            return prefab;
        }

        // ═══════════════════════════════════════════════════════════════════════
        //  HELPERS
        // ═══════════════════════════════════════════════════════════════════════
        private static GameObject CreateFullScreenContainer(string name, Transform parent)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            RectTransform rt = go.GetComponent<RectTransform>();
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            return go;
        }

        private static GameObject CreateUIContainer(string name, Transform parent)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        private static GameObject CreatePanel(string name, Transform parent, Color color, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = color;
            if (size != Vector2.zero)
                go.GetComponent<RectTransform>().sizeDelta = size;
            return go;
        }

        private static TextMeshProUGUI CreateText(string name, Transform parent, string content,
            float fontSize, Color color, TextAlignmentOptions align = TextAlignmentOptions.Center)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(TextMeshProUGUI));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI tmp = go.GetComponent<TextMeshProUGUI>();
            tmp.text      = content;
            tmp.fontSize  = fontSize;
            tmp.color     = color;
            tmp.alignment = align;
            return tmp;
        }

        private static Button CreateButton(string name, Transform parent,
            string label, Color bgColor, Color textColor, Vector2 pos, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = bgColor;
            RectTransform rt = go.GetComponent<RectTransform>();
            rt.anchoredPosition = pos;
            if (size != Vector2.zero) rt.sizeDelta = size;

            TextMeshProUGUI txt = CreateText("Label", go.transform, label, 14, textColor);
            StretchToParent(txt.rectTransform);

            return go.GetComponent<Button>();
        }

        private static TMP_InputField CreateInputField(string name, Transform parent,
            string placeholderText, string defaultText, Vector2 pos, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(TMP_InputField));
            go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = new Color(0.14f, 0.10f, 0.26f);
            RectTransform rt = go.GetComponent<RectTransform>();
            rt.anchoredPosition = pos;
            if (size != Vector2.zero) rt.sizeDelta = size;

            TextMeshProUGUI placeholder = CreateText("Placeholder", go.transform,
                placeholderText, 13, new Color(0.6f, 0.6f, 0.7f, 0.55f), TextAlignmentOptions.MidlineLeft);
            StretchToParent(placeholder.rectTransform, 14, 0);

            TextMeshProUGUI text = CreateText("Text", go.transform,
                defaultText, 14, Color.white, TextAlignmentOptions.MidlineLeft);
            StretchToParent(text.rectTransform, 14, 0);

            TMP_InputField input = go.GetComponent<TMP_InputField>();
            input.placeholder   = placeholder;
            input.textComponent = text;
            input.text          = defaultText;
            return input;
        }

        private static Slider CreateSlider(string name, Transform parent,
            float min, float max, float current, Vector2 pos, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Slider));
            go.transform.SetParent(parent, false);
            RectTransform rt = go.GetComponent<RectTransform>();
            rt.anchoredPosition = pos;
            if (size != Vector2.zero) rt.sizeDelta = size;

            Slider s = go.GetComponent<Slider>();
            s.minValue = min; s.maxValue = max; s.value = current;
            return s;
        }

        // Anchor helpers
        private static void SetAnchors(RectTransform rt,
            Vector2 anchorMin, Vector2 anchorMax, Vector2 pivot)
        {
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.pivot     = pivot;
        }

        private static void StretchToParent(RectTransform rt, float xPad = 0, float yPad = 0)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(xPad, yPad);
            rt.offsetMax = new Vector2(-xPad, -yPad);
        }
    }
}
