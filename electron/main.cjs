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

  // 3. Inject our HTML with beautiful, offline-safe CSS
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1F4E79; text-align: center; font-size: 28px; margin-bottom: 5px; }
          h2 { color: #666; text-align: center; font-size: 14px; margin-top: 0; margin-bottom: 30px; font-weight: normal; }
          h3 { color: #1F4E79; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #1F4E79; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
          th { background-color: #1F4E79; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary-container { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 30px; }
          .summary-card { flex: 1; border: 1px solid #ddd; padding: 15px; text-align: center; border-radius: 6px; }
          .summary-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
          .text-primary { color: #1F4E79; }
          .text-secondary { color: #2E7D32; }
          .text-accent { color: #F57C00; }
          .text-danger { color: #D32F2F; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

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