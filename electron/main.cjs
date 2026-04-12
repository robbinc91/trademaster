// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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

ipcMain.handle('export-pdf', async (event, htmlContent, defaultFilename) => {
  // 1. Show the native OS "Save As" dialog
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultFilename || 'report.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  // 2. Create a hidden, off-screen Chromium window
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  // 3. htmlContent is a full HTML document from the renderer (wrapReportHtml + fragment)
  const fullHtml = typeof htmlContent === 'string' ? htmlContent : '';

  // 4. Load the HTML string into the hidden window
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

  try {
    // 5. Tell Chromium to take a PDF snapshot
    const pdfData = await printWindow.webContents.printToPDF({
      printBackground: true, // Ensures our table header colors show up
      margins: { marginType: 'printableArea' }
    });

    // 6. Save the file to the user's chosen location
    fs.writeFileSync(filePath, pdfData);
    printWindow.close();

    return { success: true, filePath };
  } catch (error) {
    printWindow.close();
    console.error("PDF generation error:", error);
    throw error;
  }
});