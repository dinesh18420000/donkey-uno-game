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
        [MenuItem("Tools/Setup Game Scene (Auto-Configure)")]
        public static void SetupMainGameScene()
        {
            // 1. Ensure folders exist
            string scenesDir = "Assets/_Project/Scenes";
            string prefabsDir = "Assets/_Project/Prefabs";
            if (!Directory.Exists(scenesDir)) Directory.CreateDirectory(scenesDir);
            if (!Directory.Exists(prefabsDir)) Directory.CreateDirectory(prefabsDir);

            // 2. Generate Card & Seat Prefabs
            GameObject cardPrefab = CreateOrUpdateCardPrefab(prefabsDir + "/CardPrefab.prefab");
            GameObject seatPrefab = CreateOrUpdateSeatPrefab(prefabsDir + "/SeatPrefab.prefab");

            // 3. Create a new scene
            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);

            // 4. Setup Camera
            Camera mainCam = Camera.main;
            if (mainCam != null)
            {
                mainCam.clearFlags = CameraClearFlags.SolidColor;
                mainCam.backgroundColor = new Color(0.06f, 0.08f, 0.14f); // Rich midnight navy
            }

            // 5. Setup EventSystem
            if (Object.FindFirstObjectByType<EventSystem>() == null)
            {
                new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
            }

            // 6. Setup Canvas
            GameObject canvasGO = new GameObject("Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas canvas = canvasGO.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            CanvasScaler scaler = canvasGO.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.5f;

            // 7. Setup Game Managers
            GameObject managersGO = new GameObject("--- MANAGERS ---");
            SocketService socketService = managersGO.AddComponent<SocketService>();
            AudioManager audioManager = managersGO.AddComponent<AudioManager>();
            GameController gameController = managersGO.AddComponent<GameController>();

            // 8. Build Complete Lobby Screen UI
            GameObject lobbyGO = BuildLobbyScreen(canvasGO.transform);
            LobbyUI lobbyUI = lobbyGO.GetComponent<LobbyUI>();

            // 9. Build Complete Donkey Master Screen UI (With prominent DEAL button!)
            GameObject donkeyGO = BuildDonkeyScreen(canvasGO.transform, cardPrefab, seatPrefab);
            DonkeyGameUI donkeyUI = donkeyGO.GetComponent<DonkeyGameUI>();

            // 10. Build Complete Uno No Mercy Screen UI (With prominent DEAL button!)
            GameObject unoGO = BuildUnoScreen(canvasGO.transform, cardPrefab, seatPrefab);
            UnoGameUI unoUI = unoGO.GetComponent<UnoGameUI>();

            // 11. Build Game Over Modal
            GameObject gameOverGO = BuildGameOverModal(canvasGO.transform);
            GameOverModal gameOverModal = gameOverGO.GetComponent<GameOverModal>();

            // 12. Wire GameController SerializedObject
            SerializedObject soGC = new SerializedObject(gameController);
            soGC.FindProperty("lobbyScreen").objectReferenceValue = lobbyGO;
            soGC.FindProperty("unoGameScreen").objectReferenceValue = unoUI;
            soGC.FindProperty("donkeyGameScreen").objectReferenceValue = donkeyUI;
            soGC.FindProperty("gameOverModal").objectReferenceValue = gameOverGO;
            soGC.ApplyModifiedProperties();

            // Default display state
            lobbyGO.SetActive(true);
            donkeyGO.SetActive(false);
            unoGO.SetActive(false);
            gameOverGO.SetActive(false);

            // 13. Save Scene & Register in Build Settings
            string scenePath = scenesDir + "/MainGame.unity";
            EditorSceneManager.SaveScene(scene, scenePath);

            var buildScenes = EditorBuildSettings.scenes;
            bool alreadyInBuild = false;
            foreach (var s in buildScenes)
            {
                if (s.path == scenePath) { alreadyInBuild = true; break; }
            }
            if (!alreadyInBuild)
            {
                var newBuildScenes = new EditorBuildSettingsScene[buildScenes.Length + 1];
                buildScenes.CopyTo(newBuildScenes, 0);
                newBuildScenes[newBuildScenes.Length - 1] = new EditorBuildSettingsScene(scenePath, true);
                EditorBuildSettings.scenes = newBuildScenes;
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            EditorUtility.DisplayDialog("Setup Complete! 🎉", 
                "Game scene and UI controls successfully generated!\n\n" +
                "✓ Prominent DEAL buttons configured\n" +
                "✓ Lobby room creation & join controls wired\n" +
                "✓ Cards & Seats prefabs built\n" +
                "✓ Scene saved to: " + scenePath + "\n\n" +
                "Now click Play (▶) to start playing!", "Awesome!");
        }

        private static GameObject CreateOrUpdateCardPrefab(string path)
        {
            GameObject cardGO = new GameObject("CardTemplate", typeof(RectTransform), typeof(Image), typeof(CardView));
            RectTransform rt = cardGO.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(80, 115);

            Image bg = cardGO.GetComponent<Image>();
            bg.color = new Color(0.95f, 0.95f, 0.98f);

            // Center text
            TextMeshProUGUI center = CreateText("CenterText", cardGO.transform, "A", 28, Color.black, TextAlignmentOptions.Center);
            RectTransform rtCenter = center.GetComponent<RectTransform>();
            rtCenter.anchorMin = Vector2.zero; rtCenter.anchorMax = Vector2.one;
            rtCenter.offsetMin = Vector2.zero; rtCenter.offsetMax = Vector2.zero;

            // Corner Top Left
            TextMeshProUGUI cornerTL = CreateText("CornerTL", cardGO.transform, "A", 12, Color.black, TextAlignmentOptions.TopLeft);
            RectTransform rtTL = cornerTL.GetComponent<RectTransform>();
            rtTL.anchorMin = new Vector2(0, 1); rtTL.anchorMax = new Vector2(0, 1);
            rtTL.pivot = new Vector2(0, 1);
            rtTL.anchoredPosition = new Vector2(5, -4);
            rtTL.sizeDelta = new Vector2(30, 20);

            // Corner Bottom Right
            TextMeshProUGUI cornerBR = CreateText("CornerBR", cardGO.transform, "A", 12, Color.black, TextAlignmentOptions.BottomRight);
            RectTransform rtBR = cornerBR.GetComponent<RectTransform>();
            rtBR.anchorMin = new Vector2(1, 0); rtBR.anchorMax = new Vector2(1, 0);
            rtBR.pivot = new Vector2(1, 0);
            rtBR.anchoredPosition = new Vector2(-5, 4);
            rtBR.sizeDelta = new Vector2(30, 20);

            // Selected Outline
            GameObject outline = CreateUIContainer("SelectedOutline", cardGO.transform);
            Image outlineImg = outline.AddComponent<Image>();
            outlineImg.color = new Color(1f, 0.85f, 0.2f, 0.8f);
            RectTransform rtOutline = outline.GetComponent<RectTransform>();
            rtOutline.anchorMin = Vector2.zero; rtOutline.anchorMax = Vector2.one;
            rtOutline.offsetMin = new Vector2(-4, -4); rtOutline.offsetMax = new Vector2(4, 4);
            outline.SetActive(false);

            // Wire CardView serialized fields
            CardView view = cardGO.GetComponent<CardView>();
            SerializedObject so = new SerializedObject(view);
            so.FindProperty("cardBackground").objectReferenceValue = bg;
            so.FindProperty("centerText").objectReferenceValue = center;
            so.FindProperty("cornerTopLeft").objectReferenceValue = cornerTL;
            so.FindProperty("cornerBottomRight").objectReferenceValue = cornerBR;
            so.FindProperty("selectedOutline").objectReferenceValue = outline;
            so.ApplyModifiedProperties();

            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(cardGO, path);
            Object.DestroyImmediate(cardGO);
            return prefab;
        }

        private static GameObject CreateOrUpdateSeatPrefab(string path)
        {
            GameObject seatGO = new GameObject("SeatTemplate", typeof(RectTransform), typeof(SeatView));
            RectTransform rt = seatGO.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(100, 110);

            // Avatar circle
            GameObject avatarGO = new GameObject("Avatar", typeof(RectTransform), typeof(Image));
            avatarGO.transform.SetParent(seatGO.transform, false);
            Image avatarImg = avatarGO.GetComponent<Image>();
            avatarImg.color = new Color(0.2f, 0.35f, 0.6f);
            RectTransform rtAvatar = avatarGO.GetComponent<RectTransform>();
            rtAvatar.sizeDelta = new Vector2(56, 56);
            rtAvatar.anchoredPosition = new Vector2(0, 15);

            // Name text
            TextMeshProUGUI nameText = CreateText("NameText", seatGO.transform, "Player", 13, Color.white);
            RectTransform rtName = nameText.GetComponent<RectTransform>();
            rtName.anchoredPosition = new Vector2(0, -22);
            rtName.sizeDelta = new Vector2(120, 20);

            // Card Count text
            TextMeshProUGUI cardCount = CreateText("CardCount", seatGO.transform, "🃏 5", 11, new Color(1f, 0.85f, 0.3f));
            RectTransform rtCards = cardCount.GetComponent<RectTransform>();
            rtCards.anchoredPosition = new Vector2(0, -38);
            rtCards.sizeDelta = new Vector2(100, 18);

            // Turn Indicator
            GameObject turnIndicator = CreateUIContainer("TurnIndicator", seatGO.transform);
            Image turnImg = turnIndicator.AddComponent<Image>();
            turnImg.color = new Color(0.2f, 1f, 0.4f, 0.6f);
            RectTransform rtTurn = turnIndicator.GetComponent<RectTransform>();
            rtTurn.sizeDelta = new Vector2(64, 64);
            rtTurn.anchoredPosition = new Vector2(0, 15);
            turnIndicator.SetActive(false);

            SeatView seatView = seatGO.GetComponent<SeatView>();
            SerializedObject so = new SerializedObject(seatView);
            so.FindProperty("avatarImage").objectReferenceValue = avatarImg;
            so.FindProperty("nameText").objectReferenceValue = nameText;
            so.FindProperty("cardCountText").objectReferenceValue = cardCount;
            so.FindProperty("turnIndicator").objectReferenceValue = turnIndicator;
            so.ApplyModifiedProperties();

            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(seatGO, path);
            Object.DestroyImmediate(seatGO);
            return prefab;
        }

        private static GameObject BuildLobbyScreen(Transform parent)
        {
            GameObject lobbyGO = CreateUIContainer("LobbyScreen", parent);
            LobbyUI lobbyUI = lobbyGO.AddComponent<LobbyUI>();

            // Dark Casino Background
            Image bg = lobbyGO.AddComponent<Image>();
            bg.color = new Color(0.08f, 0.06f, 0.15f, 0.98f);

            // Title
            TextMeshProUGUI title = CreateText("Title", lobbyGO.transform, "DONKEY MASTER & UNO NO MERCY", 34, new Color(1f, 0.84f, 0.25f));
            title.fontStyle = FontStyles.Bold;
            RectTransform rtTitle = title.GetComponent<RectTransform>();
            rtTitle.anchoredPosition = new Vector2(0, 360);
            rtTitle.sizeDelta = new Vector2(800, 60);

            // Subtitle
            TextMeshProUGUI sub = CreateText("SubTitle", lobbyGO.transform, "Select a game mode, enter your name, and start playing!", 16, new Color(0.7f, 0.7f, 0.85f));
            RectTransform rtSub = sub.GetComponent<RectTransform>();
            rtSub.anchoredPosition = new Vector2(0, 310);
            rtSub.sizeDelta = new Vector2(600, 30);

            // Profile Panel
            GameObject panel = CreatePanel("MainPanel", lobbyGO.transform, new Color(0.12f, 0.1f, 0.24f, 0.9f), new Vector2(500, 480));
            RectTransform rtPanel = panel.GetComponent<RectTransform>();
            rtPanel.anchoredPosition = new Vector2(0, 40);

            // Player Name Input
            var nameInput = CreateInputField("NameInput", panel.transform, "Enter your name...", "Thala", new Vector2(0, 160), new Vector2(400, 48));
            
            // Server URL Input
            var serverInput = CreateInputField("ServerInput", panel.transform, "Server URL...", "http://localhost:3001", new Vector2(0, 100), new Vector2(400, 48));

            // Game Type Dropdown
            GameObject ddGO = new GameObject("GameTypeDropdown", typeof(RectTransform), typeof(Image), typeof(TMP_Dropdown));
            ddGO.transform.SetParent(panel.transform, false);
            RectTransform rtDD = ddGO.GetComponent<RectTransform>();
            rtDD.anchoredPosition = new Vector2(0, 40);
            rtDD.sizeDelta = new Vector2(400, 48);
            ddGO.GetComponent<Image>().color = new Color(0.18f, 0.15f, 0.35f);
            TMP_Dropdown dropdown = ddGO.GetComponent<TMP_Dropdown>();
            dropdown.options.Add(new TMP_Dropdown.OptionData("UNO No Mercy (🔥 168 Cards • Stacking)"));
            dropdown.options.Add(new TMP_Dropdown.OptionData("Donkey Master (🫏 52 Cards • Penalty Cut)"));

            // Max Players Slider
            var slider = CreateSlider("MaxPlayersSlider", panel.transform, 2, 10, 4, new Vector2(0, -20), new Vector2(300, 24));
            TextMeshProUGUI maxPlayersText = CreateText("MaxPlayersText", panel.transform, "Max Players: 4", 14, Color.white);
            maxPlayersText.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 5);

            // CREATE ROOM Button
            var createBtn = CreateButton("CreateRoomButton", panel.transform, "CREATE ROOM", new Color(0.95f, 0.72f, 0.1f), new Color(0.1f, 0.05f, 0.02f), new Vector2(0, -75), new Vector2(400, 52));

            // Room Code Input & Join Button
            var roomInput = CreateInputField("RoomCodeInput", panel.transform, "Room Code...", "", new Vector2(-105, -145), new Vector2(180, 48));
            var joinBtn = CreateButton("JoinRoomButton", panel.transform, "JOIN ROOM", new Color(0.2f, 0.6f, 0.95f), Color.white, new Vector2(105, -145), new Vector2(180, 48));

            // Waiting Room Panel
            GameObject waitPanel = CreatePanel("WaitingRoomPanel", lobbyGO.transform, new Color(0.1f, 0.08f, 0.2f, 0.96f), new Vector2(550, 420));
            waitPanel.SetActive(false);

            TextMeshProUGUI roomCodeDisplay = CreateText("RoomCodeDisplay", waitPanel.transform, "ROOM CODE: ----", 24, new Color(1f, 0.84f, 0.25f));
            roomCodeDisplay.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 150);

            TextMeshProUGUI playersList = CreateText("PlayersList", waitPanel.transform, "Connected Players:\n• Waiting for players...", 16, Color.white);
            RectTransform rtPL = playersList.GetComponent<RectTransform>();
            rtPL.anchoredPosition = new Vector2(0, 40);
            rtPL.sizeDelta = new Vector2(450, 150);

            var addBotBtn = CreateButton("AddBotButton", waitPanel.transform, "+ Add Computer Bot", new Color(0.4f, 0.25f, 0.75f), Color.white, new Vector2(0, -80), new Vector2(320, 44));
            var startBtn = CreateButton("StartGameButton", waitPanel.transform, "START GAME ▶", new Color(0.15f, 0.8f, 0.35f), Color.white, new Vector2(0, -140), new Vector2(320, 50));
            var leaveBtn = CreateButton("LeaveButton", waitPanel.transform, "Leave Room", new Color(0.4f, 0.15f, 0.15f), Color.white, new Vector2(0, -195), new Vector2(200, 36));

            // Wire serialized fields on LobbyUI
            SerializedObject so = new SerializedObject(lobbyUI);
            so.FindProperty("nameInputField").objectReferenceValue = nameInput;
            so.FindProperty("serverUrlInputField").objectReferenceValue = serverInput;
            so.FindProperty("gameTypeDropdown").objectReferenceValue = dropdown;
            so.FindProperty("maxPlayersSlider").objectReferenceValue = slider;
            so.FindProperty("maxPlayersText").objectReferenceValue = maxPlayersText;
            so.FindProperty("createRoomButton").objectReferenceValue = createBtn;
            so.FindProperty("roomCodeInputField").objectReferenceValue = roomInput;
            so.FindProperty("joinRoomButton").objectReferenceValue = joinBtn;
            so.FindProperty("waitingRoomPanel").objectReferenceValue = waitPanel;
            so.FindProperty("roomCodeDisplayText").objectReferenceValue = roomCodeDisplay;
            so.FindProperty("playersListText").objectReferenceValue = playersList;
            so.FindProperty("addBotButton").objectReferenceValue = addBotBtn;
            so.FindProperty("startGameButton").objectReferenceValue = startBtn;
            so.FindProperty("leaveRoomButton").objectReferenceValue = leaveBtn;
            so.ApplyModifiedProperties();

            return lobbyGO;
        }

        private static GameObject BuildDonkeyScreen(Transform parent, GameObject cardPrefab, GameObject seatPrefab)
        {
            GameObject donkeyGO = CreateUIContainer("DonkeyGameScreen", parent);
            DonkeyGameUI donkeyUI = donkeyGO.AddComponent<DonkeyGameUI>();

            // Dark Blue Casino Felt Table
            Image tableBg = donkeyGO.AddComponent<Image>();
            tableBg.color = new Color(0.04f, 0.12f, 0.28f);

            // TableLayoutManager
            TableLayoutManager table = donkeyGO.AddComponent<TableLayoutManager>();
            GameObject tableBoundsGO = CreateUIContainer("TableBounds", donkeyGO.transform);
            RectTransform rtBounds = tableBoundsGO.GetComponent<RectTransform>();
            rtBounds.sizeDelta = new Vector2(1000, 550);
            rtBounds.anchoredPosition = new Vector2(0, 60);

            // Turn Status
            TextMeshProUGUI turnText = CreateText("TurnStatus", donkeyGO.transform, "WAITING TO START...", 22, new Color(1f, 0.85f, 0.2f));
            turnText.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 480);

            // Lead Suit text
            TextMeshProUGUI leadText = CreateText("LeadSuitText", donkeyGO.transform, "Lead Suit: Any", 18, Color.white);
            leadText.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 180);

            // Trick container
            GameObject trickGO = CreateUIContainer("TrickContainer", donkeyGO.transform);
            RectTransform rtTrick = trickGO.GetComponent<RectTransform>();
            rtTrick.sizeDelta = new Vector2(400, 130);
            rtTrick.anchoredPosition = new Vector2(0, 60);

            // Cut banner
            GameObject cutGO = CreatePanel("CutBanner", donkeyGO.transform, new Color(0.9f, 0.1f, 0.15f, 0.9f), new Vector2(360, 45));
            cutGO.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 120);
            TextMeshProUGUI cutText = CreateText("CutText", cutGO.transform, "⚡ CUT BY OPPONENT!", 16, Color.white);
            cutGO.SetActive(false);

            // Hand Container & HandManager
            GameObject handGO = CreateUIContainer("HandContainer", donkeyGO.transform);
            RectTransform rtHand = handGO.GetComponent<RectTransform>();
            rtHand.sizeDelta = new Vector2(900, 140);
            rtHand.anchoredPosition = new Vector2(0, -320);
            HandManager handManager = donkeyGO.AddComponent<HandManager>();

            // BOTTOM CONTROL BAR WITH PROMINENT 3D GOLDEN DEAL BUTTON!
            GameObject bottomBar = CreatePanel("BottomBar", donkeyGO.transform, new Color(0.02f, 0.05f, 0.12f, 0.95f), new Vector2(1920, 85));
            RectTransform rtBar = bottomBar.GetComponent<RectTransform>();
            rtBar.anchorMin = new Vector2(0, 0); rtBar.anchorMax = new Vector2(1, 0);
            rtBar.pivot = new Vector2(0.5f, 0);
            rtBar.anchoredPosition = Vector2.zero;

            // Big 3D Golden DEAL Button
            Button dealBtn = CreateButton("DealButton", bottomBar.transform, "DEAL CARD", new Color(0.98f, 0.78f, 0.15f), new Color(0.15f, 0.05f, 0.02f), new Vector2(650, 0), new Vector2(220, 60));
            TextMeshProUGUI dealBtnText = dealBtn.GetComponentInChildren<TextMeshProUGUI>();
            dealBtnText.fontStyle = FontStyles.Bold;

            // Wire DonkeyGameUI
            SerializedObject so = new SerializedObject(donkeyUI);
            so.FindProperty("tableLayoutManager").objectReferenceValue = table;
            so.FindProperty("handManager").objectReferenceValue = handManager;
            so.FindProperty("trickContainer").objectReferenceValue = rtTrick;
            so.FindProperty("trickCardPrefab").objectReferenceValue = cardPrefab;
            so.FindProperty("leadSuitText").objectReferenceValue = leadText;
            so.FindProperty("cutBannerObject").objectReferenceValue = cutGO;
            so.FindProperty("cutBannerText").objectReferenceValue = cutText;
            so.FindProperty("turnStatusText").objectReferenceValue = turnText;
            so.FindProperty("dealButton").objectReferenceValue = dealBtn;
            so.FindProperty("dealButtonText").objectReferenceValue = dealBtnText;
            so.ApplyModifiedProperties();

            // Wire TableLayoutManager
            SerializedObject soTable = new SerializedObject(table);
            soTable.FindProperty("tableBounds").objectReferenceValue = rtBounds;
            soTable.FindProperty("seatPrefab").objectReferenceValue = seatPrefab;
            soTable.ApplyModifiedProperties();

            // Wire HandManager
            SerializedObject soHand = new SerializedObject(handManager);
            soHand.FindProperty("handContainer").objectReferenceValue = rtHand;
            soHand.FindProperty("cardPrefab").objectReferenceValue = cardPrefab;
            soHand.ApplyModifiedProperties();

            return donkeyGO;
        }

        private static GameObject BuildUnoScreen(Transform parent, GameObject cardPrefab, GameObject seatPrefab)
        {
            GameObject unoGO = CreateUIContainer("UnoGameScreen", parent);
            UnoGameUI unoUI = unoGO.AddComponent<UnoGameUI>();

            // Dark Violet Casino Felt Table
            Image tableBg = unoGO.AddComponent<Image>();
            tableBg.color = new Color(0.12f, 0.04f, 0.18f);

            TableLayoutManager table = unoGO.AddComponent<TableLayoutManager>();
            GameObject tableBoundsGO = CreateUIContainer("TableBounds", unoGO.transform);
            RectTransform rtBounds = tableBoundsGO.GetComponent<RectTransform>();
            rtBounds.sizeDelta = new Vector2(1000, 550);
            rtBounds.anchoredPosition = new Vector2(0, 60);

            // Turn Status
            TextMeshProUGUI turnText = CreateText("TurnStatus", unoGO.transform, "UNO NO MERCY", 22, new Color(1f, 0.85f, 0.2f));
            turnText.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 480);

            // Stacking Banner
            GameObject stackBanner = CreatePanel("StackingBanner", unoGO.transform, new Color(0.95f, 0.15f, 0.25f, 0.95f), new Vector2(400, 46));
            stackBanner.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 200);
            TextMeshProUGUI stackText = CreateText("StackText", stackBanner.transform, "🔥 +10 STACK ACTIVE!", 18, Color.white);
            stackBanner.SetActive(false);

            // Draw Pile Button
            Button drawPileBtn = CreateButton("DrawPileButton", unoGO.transform, "DRAW\nPILE", new Color(0.2f, 0.15f, 0.35f), Color.white, new Vector2(-120, 60), new Vector2(90, 125));

            // Active Discard Card
            GameObject discardGO = Object.Instantiate(cardPrefab, unoGO.transform);
            discardGO.name = "ActiveDiscardCard";
            RectTransform rtDiscard = discardGO.GetComponent<RectTransform>();
            rtDiscard.anchoredPosition = new Vector2(120, 60);
            CardView discardView = discardGO.GetComponent<CardView>();

            // Active Color Halo
            GameObject haloGO = CreateUIContainer("ColorHalo", unoGO.transform);
            Image halo = haloGO.AddComponent<Image>();
            halo.color = new Color(1f, 0.85f, 0.2f, 0.4f);
            RectTransform rtHalo = haloGO.GetComponent<RectTransform>();
            rtHalo.sizeDelta = new Vector2(120, 155);
            rtHalo.anchoredPosition = new Vector2(120, 60);

            // Hand Container & HandManager
            GameObject handGO = CreateUIContainer("HandContainer", unoGO.transform);
            RectTransform rtHand = handGO.GetComponent<RectTransform>();
            rtHand.sizeDelta = new Vector2(900, 140);
            rtHand.anchoredPosition = new Vector2(0, -320);
            HandManager handManager = unoGO.AddComponent<HandManager>();

            // Uno Call & Catch Buttons
            Button callUnoBtn = CreateButton("CallUnoButton", unoGO.transform, "CALL UNO! 🔥", new Color(0.95f, 0.2f, 0.2f), Color.white, new Vector2(-280, -220), new Vector2(180, 48));
            Button catchUnoBtn = CreateButton("CatchUnoButton", unoGO.transform, "CATCH UNO! 🚨", new Color(1f, 0.6f, 0.1f), Color.white, new Vector2(280, -220), new Vector2(180, 48));
            callUnoBtn.gameObject.SetActive(false);
            catchUnoBtn.gameObject.SetActive(false);

            // BOTTOM CONTROL BAR WITH PROMINENT 3D GOLDEN DEAL BUTTON!
            GameObject bottomBar = CreatePanel("BottomBar", unoGO.transform, new Color(0.05f, 0.02f, 0.1f, 0.95f), new Vector2(1920, 85));
            RectTransform rtBar = bottomBar.GetComponent<RectTransform>();
            rtBar.anchorMin = new Vector2(0, 0); rtBar.anchorMax = new Vector2(1, 0);
            rtBar.pivot = new Vector2(0.5f, 0);
            rtBar.anchoredPosition = Vector2.zero;

            // Draw Card Button
            Button drawCardBtn = CreateButton("DrawCardBtn", bottomBar.transform, "DRAW CARD", new Color(0.7f, 0.15f, 0.25f), Color.white, new Vector2(380, 0), new Vector2(200, 56));

            // DEAL Button
            Button dealBtn = CreateButton("DealButton", bottomBar.transform, "DEAL CARD", new Color(0.98f, 0.78f, 0.15f), new Color(0.15f, 0.05f, 0.02f), new Vector2(650, 0), new Vector2(220, 60));
            TextMeshProUGUI dealBtnText = dealBtn.GetComponentInChildren<TextMeshProUGUI>();
            dealBtnText.fontStyle = FontStyles.Bold;

            // Wire UnoGameUI
            SerializedObject so = new SerializedObject(unoUI);
            so.FindProperty("tableLayoutManager").objectReferenceValue = table;
            so.FindProperty("handManager").objectReferenceValue = handManager;
            so.FindProperty("activeDiscardCardView").objectReferenceValue = discardView;
            so.FindProperty("activeColorHalo").objectReferenceValue = halo;
            so.FindProperty("drawPileButton").objectReferenceValue = drawPileBtn;
            so.FindProperty("stackingBannerObject").objectReferenceValue = stackBanner;
            so.FindProperty("stackingCountText").objectReferenceValue = stackText;
            so.FindProperty("turnStatusText").objectReferenceValue = turnText;
            so.FindProperty("callUnoButton").objectReferenceValue = callUnoBtn;
            so.FindProperty("catchUnoButton").objectReferenceValue = catchUnoBtn;
            so.FindProperty("dealButton").objectReferenceValue = dealBtn;
            so.FindProperty("dealButtonText").objectReferenceValue = dealBtnText;
            so.ApplyModifiedProperties();

            // Wire Table
            SerializedObject soTable = new SerializedObject(table);
            soTable.FindProperty("tableBounds").objectReferenceValue = rtBounds;
            soTable.FindProperty("seatPrefab").objectReferenceValue = seatPrefab;
            soTable.ApplyModifiedProperties();

            // Wire Hand
            SerializedObject soHand = new SerializedObject(handManager);
            soHand.FindProperty("handContainer").objectReferenceValue = rtHand;
            soHand.FindProperty("cardPrefab").objectReferenceValue = cardPrefab;
            soHand.ApplyModifiedProperties();

            return unoGO;
        }

        private static GameObject BuildGameOverModal(Transform parent)
        {
            GameObject modalGO = CreatePanel("GameOverModal", parent, new Color(0.04f, 0.04f, 0.08f, 0.92f), new Vector2(600, 500));
            GameOverModal modal = modalGO.AddComponent<GameOverModal>();

            TextMeshProUGUI title = CreateText("Title", modalGO.transform, "🏆 GAME OVER 🏆", 28, new Color(1f, 0.85f, 0.2f));
            title.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 180);

            TextMeshProUGUI body = CreateText("Body", modalGO.transform, "Winner details...", 16, Color.white);
            RectTransform rtBody = body.GetComponent<RectTransform>();
            rtBody.anchoredPosition = new Vector2(0, 40);
            rtBody.sizeDelta = new Vector2(500, 200);

            Button lobbyBtn = CreateButton("LobbyBtn", modalGO.transform, "Return to Lobby", new Color(0.2f, 0.6f, 0.95f), Color.white, new Vector2(0, -160), new Vector2(280, 50));

            modalGO.SetActive(false);
            return modalGO;
        }

        // UI Creation Helpers
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
            go.GetComponent<RectTransform>().sizeDelta = size;
            return go;
        }

        private static TextMeshProUGUI CreateText(string name, Transform parent, string content, float fontSize, Color color, TextAlignmentOptions align = TextAlignmentOptions.Center)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(TextMeshProUGUI));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI tmp = go.GetComponent<TextMeshProUGUI>();
            tmp.text = content;
            tmp.fontSize = fontSize;
            tmp.color = color;
            tmp.alignment = align;
            return tmp;
        }

        private static Button CreateButton(string name, Transform parent, string label, Color bgColor, Color textColor, Vector2 pos, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = bgColor;
            RectTransform rt = go.GetComponent<RectTransform>();
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;

            TextMeshProUGUI txt = CreateText("Label", go.transform, label, 16, textColor);
            RectTransform rtTxt = txt.GetComponent<RectTransform>();
            rtTxt.anchorMin = Vector2.zero; rtTxt.anchorMax = Vector2.one;
            rtTxt.offsetMin = Vector2.zero; rtTxt.offsetMax = Vector2.zero;

            return go.GetComponent<Button>();
        }

        private static TMP_InputField CreateInputField(string name, Transform parent, string placeholderText, string defaultText, Vector2 pos, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(TMP_InputField));
            go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = new Color(0.18f, 0.15f, 0.32f);
            RectTransform rt = go.GetComponent<RectTransform>();
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;

            TextMeshProUGUI placeholder = CreateText("Placeholder", go.transform, placeholderText, 14, new Color(0.6f, 0.6f, 0.7f, 0.6f), TextAlignmentOptions.MidlineLeft);
            RectTransform rtPlace = placeholder.GetComponent<RectTransform>();
            rtPlace.anchorMin = Vector2.zero; rtPlace.anchorMax = Vector2.one;
            rtPlace.offsetMin = new Vector2(15, 0); rtPlace.offsetMax = new Vector2(-15, 0);

            TextMeshProUGUI text = CreateText("Text", go.transform, defaultText, 15, Color.white, TextAlignmentOptions.MidlineLeft);
            RectTransform rtText = text.GetComponent<RectTransform>();
            rtText.anchorMin = Vector2.zero; rtText.anchorMax = Vector2.one;
            rtText.offsetMin = new Vector2(15, 0); rtText.offsetMax = new Vector2(-15, 0);

            TMP_InputField input = go.GetComponent<TMP_InputField>();
            input.placeholder = placeholder;
            input.textComponent = text;
            input.text = defaultText;

            return input;
        }

        private static Slider CreateSlider(string name, Transform parent, float min, float max, float current, Vector2 pos, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Slider));
            go.transform.SetParent(parent, false);
            RectTransform rt = go.GetComponent<RectTransform>();
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;

            Slider slider = go.GetComponent<Slider>();
            slider.minValue = min;
            slider.maxValue = max;
            slider.wholeNumbers = true;
            slider.value = current;

            // Background
            GameObject bg = new GameObject("Background", typeof(RectTransform), typeof(Image));
            bg.transform.SetParent(go.transform, false);
            bg.GetComponent<Image>().color = new Color(0.18f, 0.15f, 0.32f);
            RectTransform rtBg = bg.GetComponent<RectTransform>();
            rtBg.anchorMin = Vector2.zero; rtBg.anchorMax = Vector2.one;
            rtBg.offsetMin = Vector2.zero; rtBg.offsetMax = Vector2.zero;

            return slider;
        }
    }
}
