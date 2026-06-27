# Kawaii Sticky Notes 🍡

A desktop Sticky Notes app for Linux and macOS with all the core functionality of Windows' Sticky Notes — multiple floating notes, rich text, checklists, images, colors, favorites, archive & trash — wrapped in a cute pastel "kawaii" look, now featuring **interactive desktop pets**!

![A pink sticky note with a desktop pet](docs/screenshot-note.png?v=2)
![The All Notes cork-board overview](docs/screenshot-board.png?v=2)

## ✨ Features

- **Floating sticky notes** — each note is its own small, frameless, rounded, draggable window, just like native Sticky Notes.
- **Companion Desktop Pets (NEW!)** — Every note gets a cute, randomly assigned companion GIF (like Bocchi!) that floats alongside it. They are interactive, draggable, and perfectly persistent.
- **Rich text** — bold, italic, underline, strikethrough.
- **Checklists** — click the checklist button to add tickable to‑do items.
- **Images** — insert via the toolbar button, or drag a picture straight onto a note.
- **6 pastel colors** per note (pink, lavender, mint, peach, sky, lemon).
- **Favorites & Archive** — star any note, or archive the ones you don't need on screen.
- **"Keep on top"** — pin an individual note above other windows.
- **All Notes board** — a cork‑board style overview of every note, with a sidebar for All Notes / Favorites / Archived / Trash. (Auto-minimizes when you open or interact with a note!)
- **System tray icon** — keeps the app running quietly in the background.

## 💻 Requirements

- **Linux**: Tested on X11/Wayland desktops with a compositor (GNOME, KDE, XFCE, Cinnamon, etc.).
- **macOS**: macOS 10.13 (High Sierra) or later.
- [Node.js](https://nodejs.org) 18 or newer (includes npm) to build from source.

## 🚀 Installation & Build

### macOS Installation 🍏
To build the macOS app (`.dmg` and `.zip`):
```bash
npm install
npm run dist:mac
```
After building, you will find the `.dmg` file in the `release/` folder. 
1. Double-click the `.dmg` file.
2. Drag **Kawaii Sticky Notes** to your `Applications` folder.
3. Launch it from Launchpad or Spotlight!

*(Note: On first launch, you might need to Right-Click -> Open depending on your Gatekeeper settings since the app isn't signed).*

### Linux Installation 🐧
This packages everything into a single app you can install or run on any Linux machine.
```bash
npm install
npm run dist:linux
```
After building in the `release/` folder:
- **AppImage**: `chmod +x release/*.AppImage` then double‑click it. *(Linux user-namespace sandbox issues are automatically handled by the bundled wrapper!)*
- **.deb**: `sudo apt install ./release/*.deb` (or `dpkg -i`) to install it system‑wide with a proper entry in your applications menu.

### Development Mode 🛠️
```bash
git clone https://github.com/amon-mr-error/kawaii-sticky-notes.git
cd kawaii-sticky-notes
npm install
npm start
```
That's it — the app will start in your system tray with a welcome note.

## 📂 Data Privacy & Storage

Notes are saved locally as plain JSON. **Nothing leaves your machine, no account, no sync.**
- **Linux**: `~/.config/kawaii-sticky-notes/notes.json`
- **macOS**: `~/Library/Application Support/kawaii-sticky-notes/notes.json`

Back this file up or copy it to another machine to carry your notes over.

## 🏗️ Project Layout

- `main.js` → Electron main process: windows, tray, IPC, persistence. Includes Linux sandbox fixes.
- `preload.js` → secure bridge exposing APIs to renderers.
- `src/store.js` → tiny JSON-file backed notes "database".
- `src/note/` → an individual sticky-note window (HTML/CSS/JS).
- `src/gif/` → companion desktop pet window.
- `src/overview/` → the "All Notes" cork-board window.
- `src/shared/theme.css` → shared design tokens, color palette, fonts.
- `assets/` → bundled fonts, desktop pet GIFs, and app icons.
- `scripts/` → build scripts, including the Linux `--no-sandbox` wrapper.

## 🎨 Tinkering

- Note colors live in `src/shared/theme.css` as CSS variables. You can easily add a 7th color!
- Keyboard shortcut `<kbd>Ctrl+Alt+N</kbd>` (or `<kbd>Cmd+Option+N</kbd>` on Mac) is registered in `main.js` via `globalShortcut.register`.
