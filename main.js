const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { NoteStore } = require('./src/store');

// Ensure only a single instance runs. If user tries to launch again,
// we bring the overview window to the front instead of silently exiting.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  // Must exit immediately — without this, the rest of the module still
  // executes in a half-alive state, causing broken IPC and empty UI.
  process.exit(0);
}

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

let store;
let tray = null;
let overviewWindow = null;
const noteWindows = new Map(); // id -> BrowserWindow

const ICON_PATH = path.join(__dirname, 'assets', 'icon.png');
const TRAY_ICON_PATH = path.join(__dirname, 'assets', 'tray-icon.png');

const NOTE_DEFAULT_WIDTH = 280;
const NOTE_DEFAULT_HEIGHT = 300;

function cascadePosition(index) {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const baseX = Math.round(width * 0.55);
  const baseY = Math.round(height * 0.12);
  const offset = (index % 8) * 28;
  return { x: baseX + offset, y: baseY + offset };
}

function broadcastToOverview(channel, payload) {
  if (overviewWindow && !overviewWindow.isDestroyed()) {
    overviewWindow.webContents.send(channel, payload);
  }
}

function createNoteWindow(note) {
  const existing = noteWindows.get(note.id);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }

  const pos = note.x != null && note.y != null
    ? { x: note.x, y: note.y }
    : cascadePosition(noteWindows.size);

  const win = new BrowserWindow({
    width: note.width || NOTE_DEFAULT_WIDTH,
    height: note.height || NOTE_DEFAULT_HEIGHT,
    minWidth: 200,
    minHeight: 180,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: true,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#00000000',
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'note', 'note.html'), {
    query: { id: note.id },
  });

  win.webContents.on('will-navigate', (e) => e.preventDefault());

  if (note.pinned) win.setAlwaysOnTop(true);

  win.once('ready-to-show', () => win.show());

  const persistBounds = () => {
    const [x, y] = win.getPosition();
    const [width, height] = win.getSize();
    store.update(note.id, { x, y, width, height });
  };

  win.on('moved', persistBounds);
  win.on('resized', persistBounds);

  win.on('closed', () => {
    noteWindows.delete(note.id);
    // Closing the window just hides the note; content is preserved.
    const current = store.getById(note.id);
    if (current && !current.trashed) {
      store.update(note.id, { isOpen: false });
      broadcastToOverview('notes:changed', store.getAll());
    }
  });

  noteWindows.set(note.id, win);
  return win;
}

function closeNoteWindow(id) {
  const win = noteWindows.get(id);
  if (win && !win.isDestroyed()) {
    win.destroy();
  }
  noteWindows.delete(id);
}

function createOverviewWindow() {
  if (overviewWindow && !overviewWindow.isDestroyed()) {
    overviewWindow.show();
    overviewWindow.focus();
    return overviewWindow;
  }

  overviewWindow = new BrowserWindow({
    width: 380,
    height: 560,
    minWidth: 320,
    minHeight: 400,
    frame: false,
    backgroundColor: '#FBF1E7',
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overviewWindow.loadFile(path.join(__dirname, 'src', 'overview', 'overview.html'));
  overviewWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  overviewWindow.on('closed', () => { overviewWindow = null; });
  return overviewWindow;
}

function newNote(overrides = {}) {
  const note = store.create(overrides);
  createNoteWindow(note);
  broadcastToOverview('notes:changed', store.getAll());
  return note;
}

function buildTray() {
  let image = nativeImage.createFromPath(TRAY_ICON_PATH);
  if (image.isEmpty()) image = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(image);
  tray.setToolTip('Kawaii Sticky Notes');
  const menu = Menu.buildFromTemplate([
    { label: 'New Note', click: () => newNote() },
    { label: 'Show All Notes', click: () => createOverviewWindow() },
    { type: 'separator' },
    { label: 'Quit Kawaii Sticky Notes', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => createOverviewWindow());
}

function registerIpc() {
  ipcMain.handle('notes:getAll', () => store.getAll());

  ipcMain.handle('notes:create', (e, overrides) => newNote(overrides || {}));

  ipcMain.handle('notes:update', (e, { id, patch }) => {
    const note = store.update(id, patch);
    broadcastToOverview('notes:changed', store.getAll());
    return note;
  });

  ipcMain.handle('notes:trash', (e, id) => {
    const note = store.trash(id);
    closeNoteWindow(id);
    broadcastToOverview('notes:changed', store.getAll());
    return note;
  });

  ipcMain.handle('notes:restore', (e, id) => {
    const note = store.restore(id);
    broadcastToOverview('notes:changed', store.getAll());
    return note;
  });

  ipcMain.handle('notes:archive', (e, id) => {
    const note = store.archive(id);
    closeNoteWindow(id);
    broadcastToOverview('notes:changed', store.getAll());
    return note;
  });

  ipcMain.handle('notes:unarchive', (e, id) => {
    const note = store.unarchive(id);
    broadcastToOverview('notes:changed', store.getAll());
    return note;
  });

  ipcMain.handle('notes:permanentDelete', async (e, id) => {
    const note = store.getById(id);
    const win = BrowserWindow.fromWebContents(e.sender);
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Cancel', 'Delete Forever'],
      defaultId: 0,
      cancelId: 0,
      title: 'Delete note',
      message: 'Delete this note forever? This can\u2019t be undone.',
    });
    if (response === 1) {
      closeNoteWindow(id);
      store.permanentlyDelete(id);
      broadcastToOverview('notes:changed', store.getAll());
      return true;
    }
    return false;
  });

  ipcMain.handle('notes:emptyTrash', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Cancel', 'Empty Trash'],
      defaultId: 0,
      cancelId: 0,
      title: 'Empty Trash',
      message: 'Permanently delete all notes in Trash?',
    });
    if (response === 1) {
      store.emptyTrash();
      broadcastToOverview('notes:changed', store.getAll());
      return true;
    }
    return false;
  });

  ipcMain.handle('notes:toggleFavorite', (e, id) => {
    const note = store.toggleFavorite(id);
    broadcastToOverview('notes:changed', store.getAll());
    return note;
  });

  ipcMain.handle('notes:open', (e, id) => {
    const note = store.getById(id);
    if (!note) return null;
    if (note.trashed) return null;
    store.update(id, { isOpen: true });
    createNoteWindow(store.getById(id));
    return note;
  });

  ipcMain.handle('window:hide', (e, id) => {
    closeNoteWindow(id);
    store.update(id, { isOpen: false });
    broadcastToOverview('notes:changed', store.getAll());
  });

  ipcMain.handle('window:trashFromNote', (e, id) => {
    closeNoteWindow(id);
    store.trash(id);
    broadcastToOverview('notes:changed', store.getAll());
  });

  ipcMain.handle('window:confirmTrash', async (e, hasContent) => {
    if (!hasContent) return true;
    const win = BrowserWindow.fromWebContents(e.sender);
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Cancel', 'Delete'],
      defaultId: 1,
      cancelId: 0,
      title: 'Delete note',
      message: 'Move this note to Trash?',
    });
    return response === 1;
  });

  ipcMain.handle('window:pickImage', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Insert image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (canceled || !filePaths.length) return null;
    try {
      const filePath = filePaths[0];
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
      const buffer = fs.readFileSync(filePath);
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.error('Failed to read image:', err);
      return null;
    }
  });

  ipcMain.handle('window:togglePin', (e, id) => {
    const note = store.getById(id);
    if (!note) return false;
    const next = !note.pinned;
    const win = noteWindows.get(id);
    if (win && !win.isDestroyed()) win.setAlwaysOnTop(next);
    store.update(id, { pinned: next });
    return next;
  });

  // Open the overview window from a note's renderer process.
  ipcMain.handle('window:openOverview', () => {
    createOverviewWindow();
  });

  // Minimize a note window (the renderer has no access to BrowserWindow).
  ipcMain.handle('window:minimize', (e, id) => {
    const win = noteWindows.get(id);
    if (win && !win.isDestroyed()) win.minimize();
  });

  // Close (hide) a note window — same as hide but triggered from a
  // dedicated close button in the top bar.
  ipcMain.handle('window:close', (e, id) => {
    closeNoteWindow(id);
    store.update(id, { isOpen: false });
    broadcastToOverview('notes:changed', store.getAll());
  });
}

function restoreOpenNotes() {
  const notes = store.getAll();
  if (notes.length === 0) {
    // Truly fresh install — nothing has ever been created yet.
    newNote({
      html: '<p>Welcome to <b>Kawaii Sticky Notes</b> \ud83c\udf38</p>'
        + '<p>Drag this note by its top bar, pick a color from the dot, '
        + 'and use the toolbar below to format text, make checklists, or add images.</p>'
        + '<p>Click the cork-board icon in the tray to see every note you\u2019ve made.</p>',
    });
    return;
  }
  const toOpen = notes.filter((n) => n.isOpen && !n.trashed && !n.archived);
  if (toOpen.length === 0) {
    // No notes were left open — show the overview so the app isn't invisible.
    createOverviewWindow();
    return;
  }
  toOpen.forEach((n) => createNoteWindow(n));
}

app.whenReady().then(() => {
  store = new NoteStore(app.getPath('userData'));
  registerIpc();
  buildTray();
  restoreOpenNotes();

  try {
    globalShortcut.register('Control+Alt+N', () => newNote());
  } catch (err) {
    // Shortcut registration can fail on some window managers; non-fatal.
  }

  // macOS: re-click dock icon.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOverviewWindow();
  });

  // Linux / Windows: user launched the app a second time. The single-
  // instance lock above prevents a duplicate process; this handler lets
  // us bring the overview window to the front instead.
  app.on('second-instance', () => {
    createOverviewWindow();
  });
});

app.on('window-all-closed', () => {
  // Intentionally do nothing: Kawaii Sticky Notes lives in the tray, just
  // like real Sticky Notes does, even with no note windows open.
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
