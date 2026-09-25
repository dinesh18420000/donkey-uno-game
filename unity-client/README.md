# Donkey Master & Uno No Mercy — Unity Client

This is the complete **Unity Engine (C#)** cross-platform client for **Donkey Master** and **Uno No Mercy**.

It connects directly to your existing authoritative Node.js WebSocket server, providing:
- **Instant cross-play:** Android, iOS, WebGL, and PC players can play together in the same room.
- **Snappy 2.5D visual style:** Crisp vector cards, 3D perspective lifts, 60–120 FPS performance, low battery consumption.
- **Simultaneous platform support:** Android APK, iOS Xcode project, WebGL browser build, Windows/Mac desktop.

---

## 1. Project Requirements
* **Unity Version:** Unity 2022.3 LTS (recommended) or Unity 6 (6000.x).
* **Render Pipeline:** Universal Render Pipeline (URP).
* **Target Platforms:**
  * **Android** (API 24+, ARM64 / IL2CPP)
  * **iOS** (iOS 13+, Metal)
  * **WebGL** (Modern browser WebAssembly)
  * **PC / Mac** (Standalone desktop)

---

## 2. Opening the Project in Unity
1. Open **Unity Hub**.
2. Click **Add > Add project from disk**.
3. Select the `unity-client` folder inside this repository:
   ```
   c:\Users\Thala Dinesh\Documents\Donkey master and uno game\unity-client
   ```
4. Unity Hub will load the packages (`URP`, `TextMeshPro`, `Newtonsoft.Json`, `uGUI`) automatically from `Packages/manifest.json`.

---

## 3. Server Connection Configuration
In `SocketService.cs` (or inside the Lobby UI input field in the game):
* **Local Testing on PC:** `http://localhost:3001`
* **Local Testing on Android/iOS via Wi-Fi:** `http://<YOUR_COMPUTER_LAN_IP>:3001` (e.g. `http://192.168.1.10:3001`)
* **Online Cloud Server:** `https://donkey-uno-server.onrender.com` (or your cloud server domain)

The server URL is automatically remembered in `PlayerPrefs` after entering it once.

---

## 4. Scene Hierarchy Setup (MainScene)

To create the gameplay scene in Unity:
1. Create a Canvas (`Render Mode: Screen Space - Overlay` or `Camera`).
2. Add a `GameController` GameObject with:
   - `SocketService.cs`
   - `AudioManager.cs`
   - `GameController.cs`
3. Add child panels to the Canvas:
   - **LobbyScreen** (`LobbyUI.cs`)
   - **UnoGameScreen** (`UnoGameUI.cs`, `TableLayoutManager.cs`, `HandManager.cs`)
   - **DonkeyGameScreen** (`DonkeyGameUI.cs`, `TableLayoutManager.cs`, `HandManager.cs`)
   - **GameOverModal** (`GameOverModal.cs`)

---

## 5. Building for Target Platforms

### A. Android APK Build
1. Go to **File > Build Settings**.
2. Select **Android** and click **Switch Platform**.
3. Open **Player Settings > Player > Other Settings**:
   - **Scripting Backend:** `IL2CPP`
   - **Target Architectures:** check `ARM64`
   - **Minimum API Level:** Android 7.0 (API Level 24)
4. Click **Build** and choose output location to generate `DonkeyUnoGame.apk`.
5. Transfer the `.apk` to your phone or install via USB (`adb install DonkeyUnoGame.apk`).

### B. WebGL Build (Browser)
1. Go to **File > Build Settings**.
2. Select **WebGL** and click **Switch Platform**.
3. Open **Player Settings > WebGL > Publishing Settings**:
   - **Compression Format:** `Gzip` or `Brotli`
4. Click **Build** and select output folder (e.g. `build-webgl`).
5. Upload the resulting folder to any web host (e.g. GitHub Pages, Netlify, or serve directly via your Node.js server `public/` directory).
   *(Uses `WebSocketBridge.jslib` for seamless browser WebSocket networking).*

### C. iOS Build
1. Go to **File > Build Settings**.
2. Select **iOS** and click **Switch Platform**.
3. Click **Build** to produce the Xcode project.
4. Open the `.xcodeproj` in Xcode on macOS, select your developer signing team, and deploy to your iPhone/iPad.

---

## 6. Architecture & Code Map

| File | Purpose |
| :--- | :--- |
| `Core/GameTypes.cs` | C# data models for `UnoCard`, `DonkeyCard`, `PlayerPublic`, and `ClientGameState`. |
| `Core/UnoGameRules.cs` | C# stacking and validation rules (equal-or-higher stacking). |
| `Networking/SocketService.cs` | Universal Socket.io / WebSocket client for Android, iOS, PC, and WebGL. |
| `Cards/CardView.cs` | 2.5D visual cards with saturated colors, 44px tap targets, lift on selection. |
| `Cards/HandManager.cs` | Dynamic overlap formula, grouping (`×N`), fanning, two-tap play confirmation. |
| `Table/TableLayoutManager.cs` | Procedural 2–10 player elliptical seating, avatar scaling, curved turn arrow track. |
| `Table/SeatView.cs` | Opponent avatars, card badges, turn indicator, Uno call/catch alerts. |
| `UI/UnoGameUI.cs` | Landscape Uno screen: Stacking counter banner, Mercy progress bar, Uno buttons, Wild color picker. |
| `UI/DonkeyGameUI.cs` | Portrait Donkey screen: Lead suit, trick table, dramatic cut banner. |
| `UI/LobbyUI.cs` | Room creation (2–10 players), room code joining, bots, waiting room. |
| `UI/GameController.cs` | Automatic orientation lock (Landscape for Uno, Portrait for Donkey) and screen routing. |
| `Audio/AudioManager.cs` | Audio manager with pitch variation and synthesized sound triggers. |
| `Plugins/WebGL/WebSocketBridge.jslib` | JavaScript WebSocket bridge for WebGL browser builds. |
