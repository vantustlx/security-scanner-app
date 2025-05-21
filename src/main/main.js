const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
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
      contextIsolation: false,
      webSecurity: true, // Mantén esto activo para seguridad
      allowRunningInsecureContent: false,
      // Estas opciones son importantes para la cámara
      mediaPermissions: true, // Habilita permisos de cámara explícitamente
    }
  });

  win.maximize();
  win.loadFile(path.join(__dirname, '..', 'renderer', 'views', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
  });

  // Configuración de permisos de cámara explícitos (MUY IMPORTANTE)
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      // Permitir acceso a la cámara siempre
      return callback(true);
    }
    
    // Para otros permisos, puedes decidir caso por caso
    if (permission === 'notifications' || permission === 'geolocation') {
      return callback(false);
    }
    
    callback(false);
  });

  // Configuración del router
  ipcMain.on('navigate', (event, destino) => {
    if (destino === 'qrsuccess') {
      win.loadFile(path.join(__dirname, '..', 'renderer', 'views', 'qrsuccess.html'));
    } else if (destino === 'qrdontsucces') {
      win.loadFile(path.join(__dirname, '..', 'renderer', 'views', 'qrdontsucces.html'));
    } else if (destino === 'acceder') {
      win.loadFile(path.join(__dirname, '..', 'renderer', 'views', 'acceder.html'));
    }
  });

  setupDBListeners();
  setupEmailListeners(win);
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
