import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeIpcHandlers, registerActivityHandlers } from './ipc/handlers.js';
import { closeDatabase } from './database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';

/**
 * Create application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  const startUrl = isDev
    ? 'http://127.0.0.1:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('[Electron] Main window created');
}

/**
 * Create application menu
 */
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            console.log('About Dorian Mint Bot V2');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  console.log('[Electron] Application menu created');
}

/**
 * App ready event
 */
app.on('ready', () => {
  console.log('[Electron] App ready');
  
  // Initialize IPC handlers and database
  try {
    initializeIpcHandlers();
    registerActivityHandlers();
    console.log('[Electron] IPC handlers registered');
  } catch (error) {
    console.error('[Electron] Error initializing IPC handlers:', error);
  }

  createWindow();
  createMenu();
});

/**
 * Window all closed event
 */
app.on('window-all-closed', () => {
  console.log('[Electron] All windows closed');
  
  // On macOS, keep app running until user quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * App activate event (macOS)
 */
app.on('activate', () => {
  console.log('[Electron] App activated');
  
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Quit event
 */
app.on('quit', () => {
  console.log('[Electron] App quitting');
  try {
    closeDatabase();
  } catch (error) {
    console.error('[Electron] Error closing database:', error);
  }
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught exception:', error);
});

console.log('[Electron] Main process loaded');
