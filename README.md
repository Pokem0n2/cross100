# Cross100 — Color Puzzle 🎮

A minimalist color puzzle game built with HTML5 + CSS + JavaScript.

## 🎯 Goal

On your **last tap**, clear **exactly 19 gray blocks** in a single move to win.

## 🕹️ How to Play

1. Tap any colored block.
2. The entire **row + column** of that block will each **drop one color level**.
3. Colorless (empty) blocks are unaffected.
4. Plan your taps so the final move clears exactly 19 gray blocks.

## 🎨 Color Levels

```
Black(8) → Purple(7) → Blue(6) → Cyan(5) → Green(4) → Yellow(3) → Orange(2) → Red(1) → Gray(0) → Empty(-1)
```

## ✨ Features

- **10×10 grid** with 9 color levels
- **Two themes**: Monument Valley (warm geometric) & Pixel (CRT neon)
- **Shockwave + particle effects** on each tap
- **CRACK button** — watch the solution demo play back
- **Universal solver** — solves any valid grid via linear algebra
- **Seed system** — deterministic PRNG, copy/share seed IDs
- **Import Matrix** — paste any 10×10 grid to play
- **EN/CN i18n** — one-tap language toggle
- **Undo** — step back through your moves
- **Stuck detection** — alerts when < 19 blocks remain
- Pure HTML5 — no dependencies, no build step

## 🚀 Play

Open `index.html` in any modern browser, or host it:

```bash
python3 -m http.server 8080
# Visit http://localhost:8080
```

## 📱 Build as Android APK

This game runs in an Android WebView wrapper. See the `apk/` directory for build instructions.

### Toolchain

| Tool | Version | Description |
|------|---------|-------------|
| **javac** | `21.0.11` | OpenJDK 21 |
| **aapt2** | `2.19` | Android Asset Packaging Tool 2 |
| **d8** | `3.3.20-dev` | D8 dexer (R8/AOSP build) |
| **apksigner** | `0.9` | APK signing tool |

### Build steps

```
javac → aapt2 → d8 → apksigner
```

```bash
ANDROID_JAR=$ANDROID_HOME/platforms/android-34/android-34/android.jar

# 1. Compile Java
javac -source 8 -target 8 -bootclasspath $ANDROID_JAR \
  -d build/obj apk/src/com/cross100/game/MainActivity.java

# 2. DEX
d8 --output build/dex build/obj/com/cross100/game/MainActivity.class

# 3. Package
aapt2 compile -o build/compiled/ --dir apk/res
aapt2 link -o build/cross100.unsigned.apk \
  -I $ANDROID_JAR --manifest apk/AndroidManifest.xml \
  --auto-add-overlay -A apk/assets build/compiled/*.flat

# 4. Add DEX
cd build && aapt add cross100.unsigned.apk dex/classes.dex

# 5. Sign
apksigner sign --ks debug.keystore \
  --ks-pass pass:android --key-pass pass:android \
  --out cross100.apk cross100.unsigned.apk
```

## 📄 License

MIT
