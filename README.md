# Surf Timer

A minimalist focus and Pomodoro desktop timer widget for Windows, inspired by modern Nordic application aesthetics.

---

## Overview

Surf Timer is designed to keep you in the flow while working on Windows. It floats unobtrusively on your desktop with an ultra-clean horizontal card design, smooth frosted glassmorphism, and intuitive session tracking.

---

## Key Features

### Clean Horizontal Layout
- Optimized wide horizontal aspect ratio (390 x 245 px) that occupies minimal screen estate.
- Clear 58px typography for effortless glanceability.
- Seamless frosted glassmorphism with delicate borders and soft shadows in both light and dark themes.

### Focus and Break Cycles
- Focus Session (Surf): Default 25 minutes (adjustable from 5 to 90 minutes, with quick presets for 15m, 25m, 45m, 50m, and 60m).
- Short Break: Default 5 minutes (adjustable from 1 to 30 minutes, with quick presets for 3m, 5m, 10m, and 15m).
- Long Break: Default 15 minutes, configurable interval (default every 4 completed cycles).
- Optional automatic transitions for breaks and subsequent focus sessions.
- Session extension (+5m) and instant skip controls.

### Daily Session Dot Indicator and Reset
- Completed cycles are rendered directly beneath the timer display as pill-shaped indicator dots.
- Active sessions pulse gently to indicate ongoing progress.
- Flexible one-click reset option: Click the counter dots or the reset icon in the top header to reset today's completed cycle count at any time.

### Desktop Widget Controls
- Always on Top: Pin the widget to keep it visible above code editors, browsers, and reference materials.
- Compact Menu Bar Mode: Collapse the widget into a slim pill (170 x 48 px) that fits neatly into any screen corner.
- Free Dragging: Grab anywhere on the header or background card to move the widget across multiple monitors.
- System Tray Integration: Minimize to the Windows system tray and manage visibility seamlessly.

### Pure Synthesized Zen Chimes
- Built-in Web Audio API harmonic sound generator replicating tranquil singing bowl and marimba tones.
- No external audio assets or downloads required; plays instantaneously.

---

## Getting Started

### Prerequisites
- Windows 10 / 11
- Node.js (v18 or higher recommended)

### Quick Launch
- Double-click `Surf Timer.lnk` on your Desktop.
- Or double-click `run-widget.vbs` inside the project folder to run silently without an open console window.
- Or double-click `start-timer.bat`.

### Command Line
```bash
# Navigate to the directory
cd timer

# Install dependencies (first time only)
npm install

# Start the desktop widget
npm start
```

### Browser Access
If you prefer running inside a web browser, open `index.html` directly in any modern browser. All timer logic, settings, and audio synthesis function identically without Electron dependencies.

---

## Keyboard Shortcuts

- `Space`: Start or pause the current session.
- `Esc`: Close the preferences modal.

---

## License

MIT License. Free for personal and commercial productivity use.
