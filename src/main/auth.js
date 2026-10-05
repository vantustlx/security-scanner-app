// auth.js — acceso al modo administrador con las credenciales de .env (ADMIN_USUARIO / ADMIN_PASSWORD)
const crypto = require('crypto');
const { ipcMain } = require('electron');
const config = require('./config');

// Comparación en tiempo constante (se comparan los hash para igualar longitudes)
function iguales(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function validarAdministrador({ usuario, password } = {}) {
  if (!config.admin.usuario || !config.admin.password) {
    console.error('[AUTH] Falta configurar ADMIN_USUARIO y ADMIN_PASSWORD en .env');
    return { ok: false, error: 'El acceso de administrador no está configurado' };
  }
  const ok = iguales(String(usuario || '').trim(), config.admin.usuario) && iguales(password || '', config.admin.password);
  return ok ? { ok: true } : { ok: false, error: 'Usuario o contraseña incorrectos' };
}

function setupAuth() {
  ipcMain.handle('login-admin', (event, credenciales) => validarAdministrador(credenciales));
}

module.exports = { setupAuth };
