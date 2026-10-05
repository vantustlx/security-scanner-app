// notificaciones.js — avisos para el administrador (registro, accesos y cierre diario)
const fs = require('fs');
const { ipcMain, BrowserWindow, shell } = require('electron');

let pool;

function avisarCambio() {
  BrowserWindow.getAllWindows().forEach((ventana) => ventana.webContents.send('notificaciones-actualizadas'));
}

async function crearNotificacion({ tipo, matricula = null, titulo, mensaje, archivo = null }) {
  await pool.query(
    'INSERT INTO notificacion (tipo, matricula, titulo, mensaje, archivo) VALUES (?, ?, ?, ?, ?)',
    [tipo, matricula, titulo, mensaje, archivo]
  );
  console.log(`[NOTIFICACION] ${tipo}: ${titulo}`);
  avisarCambio();
}

// Intentos de acceso rechazados por los lectores (CU-08)
async function registrarAccesoFallido(matriculaIntentada, tipoError, descripcion) {
  await pool.query(
    'INSERT INTO accesos_fallidos (matricula_intentada, tipo_error, descripcion) VALUES (?, ?, ?)',
    [String(matriculaIntentada).slice(0, 50), tipoError, descripcion]
  );
  avisarCambio();
}

// Une las notificaciones del sistema con los intentos de acceso fallidos
async function obtenerNotificaciones(limite = 100) {
  const [filas] = await pool.query(`
    SELECT CONCAT('n', id) AS id, tipo, matricula, titulo, mensaje, archivo, fecha_hora, leido
      FROM notificacion
    UNION ALL
    SELECT CONCAT('a', id), CONCAT('ACCESO_', tipo_error), matricula_intentada, 'Intento de acceso fallido', descripcion, NULL, fecha_hora, leido
      FROM accesos_fallidos
    ORDER BY fecha_hora DESC
    LIMIT ?`, [limite]);
  const [[{ sinLeer }]] = await pool.query(`
    SELECT (SELECT COUNT(*) FROM notificacion WHERE leido = 0)
         + (SELECT COUNT(*) FROM accesos_fallidos WHERE leido = 0) AS sinLeer`);
  return {
    notificaciones: filas.map((f) => ({ ...f, leido: Boolean(f.leido), tieneArchivo: Boolean(f.archivo), archivo: undefined })),
    sinLeer: Number(sinLeer)
  };
}

async function marcarTodasLeidas() {
  await pool.query('UPDATE notificacion SET leido = 1 WHERE leido = 0');
  await pool.query('UPDATE accesos_fallidos SET leido = 1 WHERE leido = 0');
}

// La ruta del PDF se toma de la BD, nunca del renderer
async function abrirArchivo(idNotificacion) {
  const id = /^n(\d+)$/.exec(String(idNotificacion));
  if (!id) return { ok: false, error: 'Notificación sin archivo' };
  const [[fila]] = await pool.query('SELECT archivo FROM notificacion WHERE id = ?', [Number(id[1])]);
  if (!fila || !fila.archivo || !fs.existsSync(fila.archivo)) return { ok: false, error: 'El archivo ya no existe' };
  const error = await shell.openPath(fila.archivo);
  return error ? { ok: false, error } : { ok: true };
}

function setupNotificaciones(poolDB) {
  pool = poolDB;
  ipcMain.handle('obtener-notificaciones', (event, { limite } = {}) => obtenerNotificaciones(limite));
  ipcMain.handle('marcar-notificaciones-leidas', () => marcarTodasLeidas());
  ipcMain.handle('abrir-archivo-notificacion', (event, id) => abrirArchivo(id));
}

module.exports = { setupNotificaciones, crearNotificacion, registrarAccesoFallido };
