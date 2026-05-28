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

## 📄 License

MIT
