const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Operaciones con películas
  getMovies: () => ipcRenderer.invoke('get-movies'),
  createMovie: (movieData) => ipcRenderer.invoke('create-movie', movieData),
  updateMovie: (movieId, updateData) => ipcRenderer.invoke('update-movie', movieId, updateData),
  deleteMovie: (movieId) => ipcRenderer.invoke('delete-movie', movieId),
  
  // Operaciones con categorías
  getCategories: () => ipcRenderer.invoke('get-categories'),
  
  // Operaciones con archivos
  uploadImage: (filePath) => ipcRenderer.invoke('upload-image', filePath),
  
  // Configuración
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  
  // Utilidades
  showDialog: (options) => ipcRenderer.invoke('show-dialog', options),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Eventos
  onMovieUpdated: (callback) => ipcRenderer.on('movie-updated', callback),
  onMovieDeleted: (callback) => ipcRenderer.on('movie-deleted', callback),
  onMovieCreated: (callback) => ipcRenderer.on('movie-created', callback),
  
  // Ventana
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Desarrollo
  isDev: () => ipcRenderer.invoke('is-dev'),
  openDevTools: () => ipcRenderer.invoke('open-dev-tools')
});