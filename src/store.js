// Simple JSON-file backed store for notes. No database needed for a sticky
// notes app — just durable, atomic writes to a file in the user's app data
// directory.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE_NAME = 'notes.json';

const DEFAULT_COLORS = ['pink', 'lavender', 'mint', 'peach', 'sky', 'lemon'];

let GIF_FILES = [];
try {
  GIF_FILES = fs.readdirSync(path.join(__dirname, '..', 'assets', 'gif')).filter(f => f.endsWith('.gif'));
} catch (err) {
  console.warn('Failed to load gif files', err);
}

function getRandomGif() {
  if (GIF_FILES.length === 0) return null;
  return GIF_FILES[Math.floor(Math.random() * GIF_FILES.length)];
}

function uid() {
  return crypto.randomBytes(8).toString('hex');
}

class NoteStore {
  constructor(userDataDir) {
    this.filePath = path.join(userDataDir, FILE_NAME);
    this.data = { notes: [] };
    this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.notes)) {
        this.data = parsed;
      }
    } catch (err) {
      // First run, or corrupt file — start fresh rather than crash.
      this.data = { notes: [] };
    }
  }

  _save() {
    try {
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  }

  getAll() {
    return this.data.notes;
  }

  getById(id) {
    const note = this.data.notes.find((n) => n.id === id) || null;
    if (note && !note.gifAsset && GIF_FILES.length > 0) {
      note.gifAsset = getRandomGif();
      this._save();
    }
    return note;
  }

  create(overrides = {}) {
    const color = overrides.color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
    const now = Date.now();
    const note = {
      id: uid(),
      color,
      gifAsset: getRandomGif(),
      html: '',
      favorite: false,
      archived: false,
      trashed: false,
      pinned: false,
      x: null,
      y: null,
      width: 280,
      height: 300,
      isOpen: true,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    this.data.notes.unshift(note);
    this._save();
    return note;
  }

  update(id, patch) {
    const note = this.getById(id);
    if (!note) return null;
    Object.assign(note, patch, { updatedAt: Date.now() });
    this._save();
    return note;
  }

  trash(id) {
    return this.update(id, { trashed: true, archived: false, isOpen: false });
  }

  restore(id) {
    return this.update(id, { trashed: false, archived: false });
  }

  archive(id) {
    return this.update(id, { archived: true, isOpen: false });
  }

  unarchive(id) {
    return this.update(id, { archived: false });
  }

  permanentlyDelete(id) {
    const before = this.data.notes.length;
    this.data.notes = this.data.notes.filter((n) => n.id !== id);
    if (this.data.notes.length !== before) this._save();
    return true;
  }

  emptyTrash() {
    const before = this.data.notes.length;
    this.data.notes = this.data.notes.filter((n) => !n.trashed);
    if (this.data.notes.length !== before) this._save();
    return true;
  }

  toggleFavorite(id) {
    const note = this.getById(id);
    if (!note) return null;
    return this.update(id, { favorite: !note.favorite });
  }
}

module.exports = { NoteStore, DEFAULT_COLORS };
