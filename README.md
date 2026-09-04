# Surf Timer

A minimalist focus and Pomodoro desktop timer widget for Windows, inspired by modern Nordic application aesthetics.

---

## Why I Built This

While conducting academic research, I constantly found myself in need of a distraction-free, elegant timer to maintain deep focus during long study and writing sessions. Existing tools were often cluttered, distracting, or occupied too much valuable screen estate. I built Surf Timer to serve as a lightweight, beautiful companion that stays quietly on the desktop.

---

## For Students and Researchers

To all fellow students, researchers, and lifelong learners: please feel free to use Surf Timer freely in your daily work, experiments, and studies. May this small tool bring clarity to your deep work, calm to your breaks, and great success to everyone's research journeys.

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
- Precision Stepper Controls: Instant plus and minus stepper buttons for quick fine-tuning alongside smooth sliders.
- Optional automatic transitions for breaks and subsequent focus sessions.
- Session extension (+5m) and instant skip controls.

### Daily Session Dot Indicator and Reset
- Completed cycles are rendered directly beneath the timer display as pill-shaped indicator dots.
- Active sessions pulse gently to indicate ongoing progress.
- Flexible one-click reset: Click the counter dots or the reset icon in the top header to reset today's completed cycle count at any time.

### Desktop Widget Controls
- Always on Top: Pin the widget to keep it visible above code editors, PDF readers, and reference materials.
- Compact Menu Bar Mode: Collapse the widget into a slim pill (170 x 48 px) that fits neatly into any screen corner.
- Free Dragging: Grab anywhere on the header or card background to move the widget across multiple displays.
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

MIT License. Completely open source and free for all students, researchers, and creators to use, adapt, and share.
