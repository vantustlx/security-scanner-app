const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { setupDBListeners, pool } = require('./database');
const { setupEmailListeners } = require('./sendemails');
const { setupNotificaciones } = require('./notificaciones');
const { setupRegistro } = require('./registro');
const { setupAuth } = require('./auth');
const { setupAcceso } = require('./acceso');
const { setupVisitantes } = require('./visitantes');
const { setupLectores } = require('./lectores');
const { setupCierreDiario } = require('./cierreDiario');
const { generateGroupReportPDF } = require('./utils/pdfGenerator'); 
const { generateUserReportPDF } = require('./utils/pdfGeneratorspecific'); 


let win;
let lectorWin;      // Ventana del lector de accesos, siempre abierta
let saliendo = false;

const VISTA_LECTOR = path.join(__dirname, '..', 'renderer', 'views', 'qrlector.html');

// El lector vive en su propia ventana para seguir registrando entradas y salidas
// mientras el administrador usa la ventana principal
function crearVentanaLector() {
  const principal = screen.getPrimaryDisplay();
  const secundaria = screen.getAllDisplays().find(d => d.id !== principal.id);
  const area = (secundaria || principal).workArea;

  lectorWin = new BrowserWindow({
    title: 'Lector de accesos',
    x: area.x + Math.max(0, Math.round((area.width - 900) / 2)),
    y: area.y + Math.max(0, Math.round((area.height - 800) / 2)),
    width: 900,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      mediaPermissions: true,
      backgroundThrottling: false // la cámara y los temporizadores siguen activos sin foco
    }
  });
  // En un segundo monitor (caseta de vigilancia) ocupa toda la pantalla
  if (secundaria) lectorWin.maximize();
  lectorWin.loadFile(VISTA_LECTOR);

  // Cerrarlo solo lo minimiza: se cierra junto con la ventana principal
  lectorWin.on('close', (e) => {
    if (!saliendo) {
      e.preventDefault();
      lectorWin.minimize();
    }
  });
  lectorWin.on('closed', () => { lectorWin = null; });
}

function mostrarVentana(ventana) {
  if (ventana.isMinimized()) ventana.restore();
  ventana.show();
  ventana.focus();
}

ipcMain.on('mostrar-lector', () => {
  if (!lectorWin) crearVentanaLector();
  mostrarVentana(lectorWin);
});

ipcMain.on('mostrar-ventana-principal', () => {
  if (win && !win.isDestroyed()) mostrarVentana(win);
});

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

  // Cerrar la ventana principal cierra la aplicación, incluido el lector
  win.on('close', () => { saliendo = true; });
  win.on('closed', () => {
    win = null;
    app.quit();
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

app.whenReady().then(async () => {
  setupAuth();
  setupAcceso(pool);
  setupVisitantes(pool);
  createWindow();
  crearVentanaLector();
  // Configurar listeners de email después de crear la ventana
  // porque necesita la referencia a win
  setupEmailListeners(win);
  setupNotificaciones(pool);
  // Recoge las confirmaciones de registro recibidas mientras la app estaba cerrada
  setupRegistro(pool);
  // Primero se cierran las entradas de días anteriores; después se abren los escáneres
  await setupCierreDiario(pool);
  setupLectores();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => { saliendo = true; });

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