const { app, BrowserWindow, protocol, net, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const os = require('os');
const { machineIdSync } = require('node-machine-id');

// 1. Register scheme privileges before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
    },
  },
]);

// 2. Hardware ID Handlers
ipcMain.handle('get-device-id', async () => {
  try {
    return machineIdSync();
  } catch (err) {
    return os.hostname();
  }
});

ipcMain.handle('get-device-name', async () => {
  return os.hostname();
});

function createWindow() {
  const preloadPath = path.resolve(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'assets/icon.ico'),
    webPreferences: {
      preload: preloadPath,         // <-- Links the preload bridge
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,           // <-- Prevents CORS errors on API calls
      sandbox: false,
    },
  });

  win.setMenuBarVisibility(false);

  const distDir = app.isPackaged
    ? path.join(__dirname, 'dist')
    : path.join(__dirname, '../dist');

  protocol.handle('app', (request) => {
    const requestUrl = new URL(request.url);
    let pathname = decodeURIComponent(requestUrl.pathname);

    // If path ends with / or is empty, serve root index.html
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    let filePath = path.join(distDir, pathname);

    // Single Page App fallback for sub-routes
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }

    return net.fetch(url.pathToFileURL(filePath).toString());
  });

  win.loadURL('app://smartpos/');

  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});