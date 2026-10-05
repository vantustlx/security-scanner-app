// auth.js — acceso al modo administrador con las credenciales de .env (ADMIN_USUARIO / ADMIN_PASSWORD)
const crypto = require('crypto');
const { ipcMain } = require('electron');
const config = require('./config');
const sesionAdmin = require('./sesionAdmin');

// Comparación en tiempo constante (se comparan los hash para igualar longitudes)
function iguales(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Tras varios intentos fallidos seguidos se espera antes de aceptar otro
const MAX_INTENTOS = 5;
const ESPERA_MS = 30 * 1000;
let fallidos = 0;
let bloqueadoHasta = 0;

function validarAdministrador({ usuario, password } = {}) {
  if (!config.admin.usuario || !config.admin.password) {
    console.error('[AUTH] Falta configurar ADMIN_USUARIO y ADMIN_PASSWORD en .env');
    return { ok: false, error: 'El acceso de administrador no está configurado' };
  }
  const restante = bloqueadoHasta - Date.now();
  if (restante > 0) {
    return { ok: false, error: `Demasiados intentos. Espera ${Math.ceil(restante / 1000)} segundos` };
  }
  const ok = iguales(String(usuario || '').trim(), config.admin.usuario) && iguales(password || '', config.admin.password);
  if (ok) {
    fallidos = 0;
    return { ok: true };
  }
  fallidos++;
  console.warn(`[AUTH] Intento fallido de acceso de administrador (${fallidos})`);
  if (fallidos >= MAX_INTENTOS) {
    fallidos = 0;
    bloqueadoHasta = Date.now() + ESPERA_MS;
  }
  return { ok: false, error: 'Usuario o contraseña incorrectos' };
}

function setupAuth() {
  ipcMain.handle('login-admin', (event, credenciales) => {
    const resultado = validarAdministrador(credenciales);
    if (resultado.ok) sesionAdmin.iniciar(event.sender);
    return resultado;
  });
}

module.exports = { setupAuth };
