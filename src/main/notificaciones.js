// notificaciones.js — avisos para el administrador (registro de usuarios y accesos fallidos)
const { ipcMain, BrowserWindow } = require('electron');

let pool;

async function crearNotificacion({ tipo, matricula = null, titulo, mensaje }) {
  await pool.query(
    'INSERT INTO notificacion (tipo, matricula, titulo, mensaje) VALUES (?, ?, ?, ?)',
    [tipo, matricula, titulo, mensaje]
  );
  console.log(`[NOTIFICACION] ${tipo}: ${titulo}`);
  BrowserWindow.getAllWindows().forEach((ventana) => ventana.webContents.send('notificaciones-actualizadas'));
}

// Une las notificaciones de registro con los intentos de acceso fallidos (CU-08)
async function obtenerNotificaciones(limite = 100) {
  const [filas] = await pool.query(`
    SELECT CONCAT('n', id) AS id, tipo, matricula, titulo, mensaje, fecha_hora, leido
      FROM notificacion
    UNION ALL
    SELECT CONCAT('a', id), CONCAT('ACCESO_', tipo_error), matricula_intentada, 'Intento de acceso fallido', descripcion, fecha_hora, leido
      FROM accesos_fallidos
    ORDER BY fecha_hora DESC
    LIMIT ?`, [limite]);
  const [[{ sinLeer }]] = await pool.query(`
    SELECT (SELECT COUNT(*) FROM notificacion WHERE leido = 0)
         + (SELECT COUNT(*) FROM accesos_fallidos WHERE leido = 0) AS sinLeer`);
  return { notificaciones: filas.map((f) => ({ ...f, leido: Boolean(f.leido) })), sinLeer: Number(sinLeer) };
}

async function marcarTodasLeidas() {
  await pool.query('UPDATE notificacion SET leido = 1 WHERE leido = 0');
  await pool.query('UPDATE accesos_fallidos SET leido = 1 WHERE leido = 0');
}

function setupNotificaciones(poolDB) {
  pool = poolDB;
  ipcMain.handle('obtener-notificaciones', (event, { limite } = {}) => obtenerNotificaciones(limite));
  ipcMain.handle('marcar-notificaciones-leidas', () => marcarTodasLeidas());
}

module.exports = { setupNotificaciones, crearNotificacion };
