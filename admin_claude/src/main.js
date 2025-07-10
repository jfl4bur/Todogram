const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const NotionService = require('./services/notion-service');
const CloudinaryService = require('./services/cloudinary-service');

// Configuración persistente
const store = new Store();

// Servicios
let notionService;
let cloudinaryService;

// Ventana principal
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, '../assets/icon.png'),
        titleBarStyle: 'hiddenInset',
        show: false
    });

    mainWindow.loadFile('src/renderer/index.html');
    
    // Mostrar ventana cuando esté lista
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Inicializar servicios si hay configuración
        const config = store.get('config');
        if (config && config.notionToken) {
            initializeServices(config);
        }
    });

    // Abrir DevTools en desarrollo
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

function initializeServices(config) {
    try {
        notionService = new NotionService(config.notionToken, config.databaseId);
        cloudinaryService = new CloudinaryService(config.cloudinary);
        
        // Notificar al renderer que los servicios están listos
        mainWindow.webContents.send('services-ready');
    } catch (error) {
        console.error('Error inicializando servicios:', error);
        mainWindow.webContents.send('services-error', error.message);
    }
}

// Eventos de la aplicación
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('get-config', () => {
    return store.get('config', {});
});

ipcMain.handle('save-config', (event, config) => {
    store.set('config', config);
    initializeServices(config);
    return true;
});

ipcMain.handle('get-movies', async () => {
    if (!notionService) throw new Error('Notion service not initialized');
    return await notionService.getMovies();
});

ipcMain.handle('get-pending-movies', async () => {
    if (!notionService) throw new Error('Notion service not initialized');
    return await notionService.getPendingMovies();
});

ipcMain.handle('create-movie', async (event, movieData) => {
    if (!notionService) throw new Error('Notion service not initialized');
    return await notionService.createMovie(movieData);
});

ipcMain.handle('update-movie', async (event, movieId, updates) => {
    if (!notionService) throw new Error('Notion service not initialized');
    return await notionService.updateMovie(movieId, updates);
});

ipcMain.handle('delete-movie', async (event, movieId) => {
    if (!notionService) throw new Error('Notion service not initialized');
    return await notionService.deleteMovie(movieId);
});

ipcMain.handle('upload-image', async (event, imagePath) => {
    if (!cloudinaryService) throw new Error('Cloudinary service not initialized');
    return await cloudinaryService.uploadImage(imagePath);
});

ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
    });
    
    if (!result.canceled) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('get-selector-data', () => {
    return {
        categoria: ['Películas', 'Series', 'Animes', 'Documentales'],
        generos: ['Terror', 'Comedia', 'Acción', 'Drama', 'Ciencia Ficción', 'Fantasía', 'Thriller', 'Romance', 'Aventura', 'Animación'],
        audios: ['🇦🇱 Albanés (Shqip)', '🇦🇲 Armenio (Հայերեն)', '🇪🇸 Español (Castellano)', '🇺🇸 Inglés (English)', '🇫🇷 Francés (Français)', '🇩🇪 Alemán (Deutsch)', '🇮🇹 Italiano (Italiano)', '🇵🇹 Portugués (Português)', '🇯🇵 Japonés (日本語)', '🇰🇷 Coreano (한국어)'],
        subtitulos: ['[㏄] Albanés (Shqip)', '[㏄] Armenio (Հայերեն)', '[㏄] Español (Castellano)', '[㏄] Inglés (English)', '[㏄] Francés (Français)', '[㏄] Alemán (Deutsch)', '[㏄] Italiano (Italiano)', '[㏄] Portugués (Português)', '[㏄] Japonés (日本語)', '[㏄] Coreano (한국어)']
    };
});