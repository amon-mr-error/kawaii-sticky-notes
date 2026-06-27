const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notesAPI', {
  getAll: () => ipcRenderer.invoke('notes:getAll'),
  create: (overrides) => ipcRenderer.invoke('notes:create', overrides),
  update: (id, patch) => ipcRenderer.invoke('notes:update', { id, patch }),
  trash: (id) => ipcRenderer.invoke('notes:trash', id),
  restore: (id) => ipcRenderer.invoke('notes:restore', id),
  archive: (id) => ipcRenderer.invoke('notes:archive', id),
  unarchive: (id) => ipcRenderer.invoke('notes:unarchive', id),
  permanentDelete: (id) => ipcRenderer.invoke('notes:permanentDelete', id),
  emptyTrash: () => ipcRenderer.invoke('notes:emptyTrash'),
  toggleFavorite: (id) => ipcRenderer.invoke('notes:toggleFavorite', id),
  open: (id) => ipcRenderer.invoke('notes:open', id),
  onChanged: (callback) => {
    const listener = (_e, notes) => callback(notes);
    ipcRenderer.on('notes:changed', listener);
    return () => ipcRenderer.removeListener('notes:changed', listener);
  },
});

contextBridge.exposeInMainWorld('windowAPI', {
  hide: (id) => ipcRenderer.invoke('window:hide', id),
  trashFromNote: (id) => ipcRenderer.invoke('window:trashFromNote', id),
  confirmTrash: (hasContent) => ipcRenderer.invoke('window:confirmTrash', hasContent),
  pickImage: () => ipcRenderer.invoke('window:pickImage'),
  togglePin: (id) => ipcRenderer.invoke('window:togglePin', id),
  openOverview: () => ipcRenderer.invoke('window:openOverview'),
  minimize: (id) => ipcRenderer.invoke('window:minimize', id),
  close: (id) => ipcRenderer.invoke('window:close', id),
});
