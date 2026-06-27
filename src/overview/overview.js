(() => {
  const noteList = document.getElementById('note-list');
  const emptyState = document.getElementById('empty-state');
  const emptyText = document.getElementById('empty-text');
  const trashActions = document.getElementById('trash-actions');
  const navList = document.getElementById('nav-list');
  const searchInput = document.getElementById('search-input');
  const newNoteBtn = document.getElementById('new-note-btn');
  const winCloseBtn = document.getElementById('win-close-btn');
  const emptyTrashBtn = document.getElementById('empty-trash-btn');

  let allNotes = [];
  let currentView = 'all';
  let searchQuery = '';

  const ICONS = {
    star: '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 3l2.4 5.5 6 .5-4.6 4 1.4 5.9L12 15.8 6.8 18.9l1.4-5.9-4.6-4 6-.5z"/></svg>',
    starOutline: '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 3l2.4 5.5 6 .5-4.6 4 1.4 5.9L12 15.8 6.8 18.9l1.4-5.9-4.6-4 6-.5z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    archive: '<svg viewBox="0 0 24 24" width="13" height="13"><rect x="3" y="4" width="18" height="5" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 9v9a2 2 0 002 2h10a2 2 0 002-2V9M10 13h4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    unarchive: '<svg viewBox="0 0 24 24" width="13" height="13"><rect x="3" y="4" width="18" height="5" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 9v9a2 2 0 002 2h10a2 2 0 002-2V9M9 17l3-3 3 3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-9 0l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || '';
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function actionBtn(svg, title, cls) {
    const btn = document.createElement('button');
    btn.className = 'note-action' + (cls ? ' ' + cls : '');
    btn.title = title;
    btn.innerHTML = svg;
    return btn;
  }

  function filteredNotes() {
    let list = allNotes;
    if (currentView === 'all') list = list.filter((n) => !n.trashed && !n.archived);
    else if (currentView === 'favorites') list = list.filter((n) => n.favorite && !n.trashed && !n.archived);
    else if (currentView === 'archived') list = list.filter((n) => n.archived && !n.trashed);
    else if (currentView === 'trash') list = list.filter((n) => n.trashed);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((n) => stripHtml(n.html || '').toLowerCase().includes(q));
    }
    return list.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function buildItem(note) {
    const item = document.createElement('div');
    item.className = 'note-item';

    // color strip
    const strip = document.createElement('div');
    strip.className = 'note-color-strip';
    strip.dataset.color = note.color || 'pink';
    item.appendChild(strip);

    // content column
    const content = document.createElement('div');
    content.className = 'note-content';

    const preview = document.createElement('div');
    const text = stripHtml(note.html || '').trim();
    if (text) {
      preview.className = 'note-preview';
      preview.textContent = text;
    } else {
      preview.className = 'note-preview note-preview-empty';
      preview.textContent = 'Empty note';
    }
    content.appendChild(preview);

    const meta = document.createElement('div');
    meta.className = 'note-meta';
    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatDate(note.updatedAt);
    meta.appendChild(dateSpan);
    if (note.favorite) {
      const fav = document.createElement('span');
      fav.className = 'fav-badge';
      fav.textContent = '★';
      meta.appendChild(fav);
    }
    if (note.pinned) {
      const pin = document.createElement('span');
      pin.className = 'pin-badge';
      pin.textContent = '📌';
      meta.appendChild(pin);
    }
    content.appendChild(meta);

    // trash view: restore row
    if (currentView === 'trash') {
      const row = document.createElement('div');
      row.className = 'note-restore-row';
      const restoreBtn = document.createElement('button');
      restoreBtn.textContent = 'Restore';
      restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.notesAPI.restore(note.id).then(loadNotes);
      });
      const delBtn = document.createElement('button');
      delBtn.className = 'danger';
      delBtn.textContent = 'Delete Forever';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.notesAPI.permanentDelete(note.id).then(loadNotes);
      });
      row.append(restoreBtn, delBtn);
      content.appendChild(row);
    }

    item.appendChild(content);

    // action buttons (non-trash)
    if (currentView !== 'trash') {
      const actions = document.createElement('div');
      actions.className = 'note-actions';

      const favBtn = actionBtn(note.favorite ? ICONS.star : ICONS.starOutline, 'Favorite');
      if (note.favorite) favBtn.style.color = '#e0a526';
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.notesAPI.toggleFavorite(note.id);
      });
      actions.appendChild(favBtn);

      if (currentView === 'archived') {
        const unBtn = actionBtn(ICONS.unarchive, 'Unarchive');
        unBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.notesAPI.unarchive(note.id);
        });
        actions.appendChild(unBtn);
      } else {
        const archBtn = actionBtn(ICONS.archive, 'Archive');
        archBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.notesAPI.archive(note.id);
        });
        actions.appendChild(archBtn);
      }

      const trashBtn = actionBtn(ICONS.trash, 'Delete', 'danger');
      trashBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.notesAPI.trash(note.id);
      });
      actions.appendChild(trashBtn);

      item.appendChild(actions);

      // click to open
      item.addEventListener('click', () => window.notesAPI.open(note.id));
    }

    return item;
  }

  const EMPTY_TITLES = {
    all: 'No notes yet — tap + to start!',
    favorites: 'No favorites yet',
    archived: 'Nothing archived',
    trash: 'Trash is empty',
  };

  function render() {
    const list = filteredNotes();
    noteList.innerHTML = '';
    list.forEach((note) => noteList.appendChild(buildItem(note)));

    const hasNotes = list.length > 0;
    noteList.hidden = !hasNotes;
    emptyState.hidden = hasNotes;
    emptyText.textContent = EMPTY_TITLES[currentView] || 'Nothing here';
    trashActions.hidden = !(currentView === 'trash' && hasNotes);
  }

  async function loadNotes() {
    allNotes = await window.notesAPI.getAll();
    render();
  }

  navList.querySelectorAll('.filter-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      navList.querySelectorAll('.filter-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      render();
    });
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    render();
  });

  newNoteBtn.addEventListener('click', () => window.notesAPI.create());
  winCloseBtn.addEventListener('click', () => window.close());
  emptyTrashBtn.addEventListener('click', async () => {
    const ok = await window.notesAPI.emptyTrash();
    if (ok) loadNotes();
  });

  window.notesAPI.onChanged((notes) => {
    allNotes = notes;
    render();
  });

  loadNotes();
})();
