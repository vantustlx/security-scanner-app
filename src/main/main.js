const { app, BrowserWindow, screen } = require('electron');
const { setupRouting } = require('./router'); // Asegúrate de la ruta correcta
const path = require('path');

let win;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    fullscreenable: true,
    maximizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // ¡Necesario para que funcione ipcRenderer!
    }
  });

  win.maximize();

  win.loadFile(path.join(__dirname, '..', 'renderer', 'views', 'index.html'));
  win.once('ready-to-show', () => {
    win.show();
  });
  setupRouting(win);
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
