(() => {
  const noteRoot = document.getElementById('note-root');
  const noteBody = document.getElementById('note-body');
  const colorBtn = document.getElementById('color-btn');
  const colorPopover = document.getElementById('color-popover');
  const menuBtn = document.getElementById('menu-btn');
  const menuPopover = document.getElementById('menu-popover');
  const favBtn = document.getElementById('fav-btn');
  const newBtn = document.getElementById('new-btn');
  const pinAction = document.getElementById('pin-action');
  const pinLabel = pinAction.querySelector('.pin-label');
  const archiveAction = document.getElementById('archive-action');
  const hideAction = document.getElementById('hide-action');
  const trashAction = document.getElementById('trash-action');
  const toolbar = document.getElementById('note-toolbar');
  const checklistBtn = document.getElementById('checklist-btn');
  const imageBtn = document.getElementById('image-btn');
  const undoBtn = document.getElementById('undo-btn');
  const overviewBtn = document.getElementById('overview-btn');
  const closeBtn = document.getElementById('close-btn');

  let noteId = null;
  let pinned = false;
  let saveTimer = null;

  function placeCaretAtEnd(el) {
    // Chromium can misplace newly-typed text as a *sibling* of an empty
    // inline element instead of inside it. Seeding a zero-width space gives
    // the caret a real text node to anchor to.
    if (el.childNodes.length === 0) {
      el.appendChild(document.createTextNode('\u200B'));
    }
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function plainTextOf(el) {
    return el.textContent.replace(/\u200B/g, '').trim();
  }

  function updateEmptyState() {
    const empty = plainTextOf(noteBody) === '' && !noteBody.querySelector('img');
    noteBody.classList.toggle('is-empty', empty);
  }

  function scheduleSave() {
    updateEmptyState();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 450);
  }

  function flushSave() {
    clearTimeout(saveTimer);
    if (!noteId) return;
    window.notesAPI.update(noteId, { html: noteBody.innerHTML });
  }

  function closeAllPopovers() {
    colorPopover.hidden = true;
    menuPopover.hidden = true;
  }

  function applyFavoriteState(fav) {
    favBtn.classList.toggle('is-fav', !!fav);
  }

  function updatePinLabel() {
    pinLabel.textContent = pinned ? 'Unpin from top' : 'Keep on top';
  }

  // ---------- checklist items ----------
  function makeCheckItem(text, checked) {
    const item = document.createElement('div');
    item.className = 'check-item' + (checked ? ' done' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'chk';
    if (checked) cb.setAttribute('checked', '');
    const span = document.createElement('span');
    span.className = 'chk-text';
    span.contentEditable = 'true';
    span.textContent = text || '';
    item.append(cb, span);
    return item;
  }

  function insertChecklistItem() {
    noteBody.focus();
    const item = makeCheckItem('');
    const sel = window.getSelection();
    let ref = null;
    if (sel.rangeCount) {
      let node = sel.getRangeAt(0).startContainer;
      while (node && node.parentNode !== noteBody && node !== noteBody) node = node.parentNode;
      if (node && node !== noteBody) ref = node;
    }
    if (ref && ref.nextSibling) noteBody.insertBefore(item, ref.nextSibling);
    else noteBody.appendChild(item);
    placeCaretAtEnd(item.querySelector('.chk-text'));
    scheduleSave();
  }

  function activeCheckText() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    return node && node.closest ? node.closest('.chk-text') : null;
  }

  noteBody.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== 'Backspace') return;
    const textEl = activeCheckText();
    if (!textEl) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = textEl.closest('.check-item');
      const newItem = makeCheckItem('');
      item.after(newItem);
      placeCaretAtEnd(newItem.querySelector('.chk-text'));
      scheduleSave();
    } else if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel.isCollapsed && plainTextOf(textEl).length === 0) {
        e.preventDefault();
        const item = textEl.closest('.check-item');
        const prev = item.previousElementSibling;
        item.remove();
        if (prev) {
          const prevText = prev.classList.contains('check-item') ? prev.querySelector('.chk-text') : prev;
          placeCaretAtEnd(prevText);
        } else {
          noteBody.focus();
        }
        scheduleSave();
      }
    }
  });

  noteBody.addEventListener('change', (e) => {
    if (e.target.classList && e.target.classList.contains('chk')) {
      const item = e.target.closest('.check-item');
      const checked = e.target.checked;
      item.classList.toggle('done', checked);
      if (checked) e.target.setAttribute('checked', '');
      else e.target.removeAttribute('checked');
      scheduleSave();
    }
  });

  checklistBtn.addEventListener('click', insertChecklistItem);

  // ---------- formatting toolbar ----------
  toolbar.querySelectorAll('button[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      noteBody.focus();
      document.execCommand(btn.dataset.cmd);
      scheduleSave();
    });
  });

  undoBtn.addEventListener('click', () => {
    noteBody.focus();
    document.execCommand('undo');
    scheduleSave();
  });

  // ---------- images ----------
  function insertImageAtCursor(dataUrl) {
    noteBody.focus();
    document.execCommand('insertImage', false, dataUrl);
    scheduleSave();
  }

  imageBtn.addEventListener('click', async () => {
    const dataUrl = await window.windowAPI.pickImage();
    if (dataUrl) insertImageAtCursor(dataUrl);
  });

  noteBody.addEventListener('dragover', (e) => e.preventDefault());
  noteBody.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith('image/')) return;
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = () => insertImageAtCursor(reader.result);
    reader.readAsDataURL(file);
  });

  // ---------- autosave ----------
  noteBody.addEventListener('input', scheduleSave);
  window.addEventListener('blur', flushSave);

  // ---------- top bar actions ----------
  colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = colorPopover.hidden;
    closeAllPopovers();
    colorPopover.hidden = !willOpen;
  });

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = menuPopover.hidden;
    closeAllPopovers();
    menuPopover.hidden = !willOpen;
    updatePinLabel();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.popover') && !e.target.closest('#color-btn') && !e.target.closest('#menu-btn')) {
      closeAllPopovers();
    }
  });

  colorPopover.querySelectorAll('.swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      const color = sw.dataset.color;
      noteRoot.dataset.color = color;
      window.notesAPI.update(noteId, { color });
      closeAllPopovers();
    });
  });

  favBtn.addEventListener('click', async () => {
    const note = await window.notesAPI.toggleFavorite(noteId);
    if (note) applyFavoriteState(note.favorite);
  });

  newBtn.addEventListener('click', () => window.notesAPI.create());

  overviewBtn.addEventListener('click', () => window.windowAPI.openOverview());

  closeBtn.addEventListener('click', () => {
    flushSave();
    window.windowAPI.hide(noteId);
  });

  pinAction.addEventListener('click', async () => {
    pinned = await window.windowAPI.togglePin(noteId);
    updatePinLabel();
    closeAllPopovers();
  });

  archiveAction.addEventListener('click', () => {
    flushSave();
    window.notesAPI.archive(noteId);
    closeAllPopovers();
  });

  hideAction.addEventListener('click', () => {
    flushSave();
    window.windowAPI.hide(noteId);
    closeAllPopovers();
  });

  trashAction.addEventListener('click', async () => {
    closeAllPopovers();
    const hasContent = plainTextOf(noteBody).length > 0 || !!noteBody.querySelector('img');
    const ok = await window.windowAPI.confirmTrash(hasContent);
    if (ok) {
      flushSave();
      window.windowAPI.trashFromNote(noteId);
    }
  });

  // ---------- cross-window sync ----------
  window.notesAPI.onChanged((notes) => {
    const updated = notes.find((n) => n.id === noteId);
    if (!updated) return;
    if (noteRoot.dataset.color !== updated.color) noteRoot.dataset.color = updated.color;
    applyFavoriteState(updated.favorite);
    pinned = !!updated.pinned;
  });

  // ---------- init ----------
  async function init() {
    noteId = new URLSearchParams(location.search).get('id');
    const notes = await window.notesAPI.getAll();
    const note = notes.find((n) => n.id === noteId);
    if (!note) {
      noteBody.contentEditable = 'false';
      noteBody.textContent = "This note couldn't be found — it may have been deleted.";
      return;
    }
    noteRoot.dataset.color = note.color || 'pink';
    noteBody.innerHTML = note.html || '';
    applyFavoriteState(note.favorite);
    pinned = !!note.pinned;
    updatePinLabel();
    updateEmptyState();
  }

  init();
})();
