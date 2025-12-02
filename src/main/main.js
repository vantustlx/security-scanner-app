const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { setupDBListeners } = require('./database');
const { setupEmailListeners } = require('./sendemails');
const { generateGroupReportPDF } = require('./utils/pdfGenerator'); 
const { generateUserReportPDF } = require('./utils/pdfGeneratorspecific'); 


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

}

// Configurar listeners de IPC una sola vez al inicio
// Esto evita registrar múltiples listeners cuando se recrea la ventana
setupDBListeners();

app.whenReady().then(() => {
  createWindow();
  // Configurar listeners de email después de crear la ventana
  // porque necesita la referencia a win
  setupEmailListeners(win);
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


ipcMain.on('generar-pdf-grupo-usuarios', async (event, data) => {
    console.log('Generando PDF con datos:', {
        usuariosCount: data.usuarios ? data.usuarios.length : 0,
        parametros: data.parametros
    });

    // Validar que los datos existen
    if (!data.usuarios || !Array.isArray(data.usuarios)) {
        event.reply('pdf-generado-error', 'No hay datos de usuarios válidos');
        return;
    }

    try {
        // ✅ CORREGIDO: Pasar los tres parámetros correctamente
        const filePath = await generateGroupReportPDF(
            data.usuarios, 
            data.parametros || {}, // Asegurar que siempre hay un objeto
            win
        );
        event.reply('pdf-generado-exito', `PDF generado exitosamente: ${filePath}`);
    } catch (err) {
        console.error('Error al generar PDF:', err);
        event.reply('pdf-generado-error', err.message);
    }
});


// En tu manejador IPC:
ipcMain.on('generar-pdf-usuario-especifico', async (event, data) => {
    console.log('Generando PDF con datos:', {
        usuario: data.usuario,
        registrosCount: data.registros ? data.registros.length : 0,
        rangoFechas: data.rangoFechas
    });

    if (!data.usuario) {
        event.reply('pdf-generado-error', 'No hay datos de usuario válidos');
        return;
    }

    try {
        const filePath = await generateUserReportPDF(
            data.usuario,
            data.registros || [],
            data.rangoFechas || {},
            win
        );
        event.reply('pdf-generado-exito', `PDF generado exitosamente: ${filePath}`);
    } catch (err) {
        console.error('Error al generar PDF:', err);
        event.reply('pdf-generado-error', err.message);
    }
});