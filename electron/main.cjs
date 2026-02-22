// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "TradeMaster Pro",
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false, // Security: Disable direct Node access
      contextIsolation: true, // Security: Enable context isolation
      preload: path.join(__dirname, 'preload.cjs'), // Load the bridge
      sandbox: false
    },
  });

  const devUrl = process.env.ELECTRON_START_URL;

  const startUrl = devUrl || `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in dev mode
  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// --- IPC Handlers for Dialogs ---
ipcMain.handle('app:getUserDataPath', () => app.getPath('userData'));


ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'TradeMaster Encrypted', extensions: ['tmd'] }]
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('dialog:saveFile', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'TradeMaster Encrypted', extensions: ['tmd'] }]
  });
  if (canceled) return null;
  return filePath;
});