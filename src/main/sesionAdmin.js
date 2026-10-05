// sesionAdmin.js — las vistas del administrador solo se abren después de iniciar sesión, y la sesión
// se cierra al salir a una vista pública o tras ADMIN_INACTIVIDAD_MIN minutos sin usar la ventana.
const path = require('path');
const config = require('./config');

const VISTAS_ADMIN = new Set([
  'administradoropciones', 'notificaciones', 'recuperarqr', 'actualizardatospersonales',
  'buscarusuariosactivos', 'buscargrupodeusuarios', 'buscarusuarioespecifico',
  'generarreportes', 'generarreportedegrupodeusuarios', 'generarreporteusuarioespecifico'
]);
const VISTA_INICIO = path.join(__dirname, '..', 'renderer', 'views', 'index.html');
const REVISION_MS = 30 * 1000;

let sesion = null; // { contenido, ultimaActividad }

function esVistaAdmin(vista) {
  return VISTAS_ADMIN.has(vista);
}

function iniciar(contenido) {
  sesion = { contenido, ultimaActividad: Date.now() };
  // Teclas, clics, rueda o toques cuentan como actividad. El movimiento del mouse no: Chromium lo
  // genera solo cuando el cursor quedó encima de la ventana y cambia el contenido.
  if (!contenido.sesionAdminVigilada) {
    contenido.sesionAdminVigilada = true;
    contenido.on('input-event', (evento, entrada) => {
      if (!/^(rawKeyDown|keyDown|mouseDown|mouseWheel|touchStart)$/.test(entrada.type)) return;
      if (sesion && sesion.contenido === contenido) sesion.ultimaActividad = Date.now();
    });
    contenido.on('destroyed', () => {
      if (sesion && sesion.contenido === contenido) sesion = null;
    });
  }
}

function cerrar() {
  sesion = null;
}

// Decide si la ventana puede abrir la vista; salir a una vista pública cierra la sesión
function puedeAbrir(contenido, vista) {
  if (!esVistaAdmin(vista)) {
    if (sesion && sesion.contenido === contenido) cerrar();
    return true;
  }
  return Boolean(sesion && sesion.contenido === contenido);
}

function revisarInactividad() {
  if (!sesion) return;
  const limite = config.admin.inactividadMinutos * 60 * 1000;
  if (Date.now() - sesion.ultimaActividad < limite) return;
  const { contenido } = sesion;
  cerrar();
  if (!contenido.isDestroyed()) {
    console.log('[ADMIN] Sesión cerrada por inactividad');
    contenido.loadFile(VISTA_INICIO).catch((e) => console.error('[ADMIN] No se pudo volver al inicio:', e));
  }
}

function setupSesionAdmin() {
  setInterval(revisarInactividad, REVISION_MS);
}

module.exports = { setupSesionAdmin, iniciar, cerrar, puedeAbrir, esVistaAdmin };
