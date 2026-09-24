# 🃏 Donkey Master & UNO Show 'Em No Mercy: Multiplayer Mobile Game

A real-time online multiplayer mobile card game app built for up to **10 players** to play together over the internet using 6-digit room codes. It combines two thrilling party games:
1. **Donkey Master** (52-Card South Asian trick-shedding game with the exact 4-suit column mobile UI)
2. **UNO Show 'Em No Mercy** (168-Card brutal UNO variant with draw stacking, 0-pass, 7-swap, and 25-card Mercy knockout)

---

## 🚀 Key Features

### 1. 🫏 Donkey Master (Authentic Mobile UI)
- **Exact UI layout**: The player's hand is organized into **4 suit columns** (♠ Spades, ♥ Hearts, ♣ Clubs, ♦ Diamonds) with stacked overlapping cards and large base suit emblems.
- **Starting Card**: Round 1 automatically begins with whoever holds the **Ace of Spades (♠ A)**.
- **Suit Following & Cut Penalty**: Players must follow suit if they hold it. If a player has no cards of the lead suit, they can throw a **"Cut" / "Thulla" / Penalty** of another suit. The player with the highest lead card is forced to pick up all cards from the table!
- **Win & Donkey Crown**: Players exit safely as their hands empty (1st, 2nd, 3rd...). The final remaining player with cards is crowned the **Donkey**!

### 2. 🔥 UNO Show 'Em No Mercy
- **168 Cards Deck**: Includes +2, +4, Wild +6, Wild +10, Wild Reverse +4, Discard All, Skip All, 0 Pass, and 7 Swap!
- **Draw Stacking**: Players can stack equal or higher draw cards (+2, +4, +6, +10) to pass the penalty along to the next victim!
- **Mercy Rule (25-Card Elimination)**: Any player whose hand reaches 25 cards is instantly knocked out!
- **Interactive Modals**: Wild Color Chooser and 7-Swap Player Hand Selector.

### 3. 🤖 AI Bot Takeover & Seamless Reconnection
- **Zero Game Freezes**: If any player loses internet connectivity or closes their app mid-game, a smart **Computer Bot** immediately assumes control of that player's seat and plays valid moves on their turn.
- **Instant Reconnect**: When the player's connection returns or they re-open the app, the game automatically recognizes their session ID, re-binds their hand, and hands full control back to the player seamlessly!

---

## 📱 How to Play Right Now

### On Your PC:
Open your browser and navigate to:
```
http://localhost:5173
```

### On Your Android Phone (Same Wi-Fi):
Open Chrome on your phone and go to:
```
http://192.168.1.4:5173
```
*(Tip: In Chrome on Android, tap the three dots `⋮` and select **"Add to Home screen"** to install it as a fullscreen mobile app!)*

---

## 📦 How to Build the Android APK (`.apk` file)

The project is fully configured with **Capacitor 6 Android** in the `client/android/` directory and includes an automated cloud builder.

### Option 1: Cloud Build via GitHub Actions (Recommended - No Android SDK needed!)
1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Donkey Master & UNO No Mercy Mobile Game"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
2. In GitHub, click the **"Actions"** tab.
3. The **"Build Android APK"** workflow will automatically run and compile the APK.
4. Download the `Donkey-Uno-NoMercy-APK` artifact containing `app-debug.apk` directly to your phone and install it!

### Option 2: Build Locally with Android Studio
1. Open **Android Studio**.
2. Select **Open an Existing Project** and choose the `client/android` folder.
3. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. The generated `.apk` will be in `client/android/app/build/outputs/apk/debug/app-debug.apk`.

---

## ☁️ Hosting the Multiplayer Backend for Global Internet Play

To play with friends anywhere in the world across mobile cellular data (4G/5G):
1. Deploy the `server/` directory to any free cloud host like [Render](https://render.com), [Railway](https://railway.app), or [Fly.io](https://fly.io):
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Port: `3001` (or `$PORT`)
2. In the mobile app lobby, tap the ⚙️ **Settings** icon in the top right.
3. Paste your live cloud backend URL (e.g., `https://your-game.onrender.com`) and click **Save**.

---

## 🛠️ Project Structure

```
├── client/
│   ├── android/                     # Native Android Studio / Gradle Project
│   ├── src/
│   │   ├── components/
│   │   │   ├── DonkeyGameScreen.tsx # 4-suit column Donkey game UI
│   │   │   ├── DonkeyHand.tsx       # Spades, Hearts, Clubs, Diamonds columns
│   │   │   ├── DonkeyCardView.tsx   # Card component with suit emblems
│   │   │   ├── UnoGameScreen.tsx    # UNO No Mercy game board
│   │   │   ├── UnoCardView.tsx      # +2, +4, +6, +10, 0 Pass, 7 Swap cards
│   │   │   ├── PlayerAvatar.tsx     # Player ring, bot status, turn timer
│   │   │   └── LobbyScreen.tsx      # Room code sharing, bot adder, game picker
│   │   ├── services/
│   │   │   └── socket.ts            # Socket.IO connection & auto-reconnect
│   │   ├── utils/
│   │   │   └── audio.ts             # Synthesized card sounds & Donkey fanfare
│   │   ├── types.ts                 # Shared game state & card interfaces
│   │   └── App.tsx                  # Main router & reconnection banner
│   └── capacitor.config.ts          # Android app configuration
├── server/
│   ├── src/
│   │   ├── donkeyEngine.ts          # Donkey game rules, cuts, and bot AI
│   │   ├── unoEngine.ts             # UNO No Mercy stacking & 25 KO rules
│   │   ├── roomManager.ts           # 10-player room codes, bot takeover & rejoin
│   │   ├── types.ts                 # Server models
│   │   └── index.ts                 # Express + Socket.IO server
└── .github/workflows/
    └── build-apk.yml                # Automatic cloud APK compiler
```
