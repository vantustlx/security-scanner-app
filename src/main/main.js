const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { setupRouting } = require('./router');
const { setupDBListeners } = require('./database');
const { setupEmailListeners } = require('./sendemails');

let win;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    fullscreenable: true,
    maximizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.maximize();
  win.loadFile(path.join(__dirname, '..', 'renderer', 'views', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
  });

  setupRouting(win);
  setupDBListeners();       // Base de datos
  setupEmailListeners(win); // Correos
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});