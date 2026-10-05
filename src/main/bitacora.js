// bitacora.js — copia lo que la app escribe en consola a un archivo por día, para diagnosticar fallas
// en la PC del acceso (que corre sin consola). Por defecto: Documentos\Sistema de Acceso FCBIyT\Bitacora
const fs = require('fs');
const path = require('path');
const util = require('util');
const { app } = require('electron');
const config = require('./config');

let carpeta;
let dia = '';
let archivo = null;

function abrirArchivoDelDia() {
  const hoy = new Date().toLocaleDateString('en-CA');
  if (hoy === dia && archivo) return archivo;
  if (archivo) archivo.end();
  dia = hoy;
  archivo = fs.createWriteStream(path.join(carpeta, `app_${hoy}.log`), { flags: 'a' });
  archivo.on('error', () => { archivo = null; });
  return archivo;
}

function borrarAntiguos() {
  const limite = Date.now() - config.bitacora.dias * 24 * 60 * 60 * 1000;
  fs.readdir(carpeta, (error, archivos) => {
    if (error) return;
    archivos.filter((a) => /^app_\d{4}-\d{2}-\d{2}\.log$/.test(a)).forEach((a) => {
      const ruta = path.join(carpeta, a);
      fs.stat(ruta, (e, info) => { if (!e && info.mtimeMs < limite) fs.unlink(ruta, () => {}); });
    });
  });
}

function escribir(nivel, args) {
  try {
    const hora = new Date().toLocaleTimeString('es-MX', { hourCycle: 'h23' });
    abrirArchivoDelDia()?.write(`${hora} ${nivel} ${util.format(...args)}\n`);
  } catch {
    // La bitácora nunca debe tumbar la app
  }
}

function setupBitacora() {
  carpeta = config.bitacora.carpeta || path.join(app.getPath('documents'), 'Sistema de Acceso FCBIyT', 'Bitacora');
  try {
    fs.mkdirSync(carpeta, { recursive: true });
  } catch (error) {
    console.error('[BITACORA] No se pudo crear la carpeta:', error.message);
    return;
  }
  for (const [metodo, nivel] of [['log', 'INFO'], ['info', 'INFO'], ['warn', 'AVISO'], ['error', 'ERROR']]) {
    const original = console[metodo].bind(console);
    console[metodo] = (...args) => {
      original(...args);
      escribir(nivel, args);
    };
  }
  // Un error no atrapado se anota en lugar de cerrar la app con un cuadro de diálogo
  process.on('uncaughtException', (error) => console.error('[APP] Error no atrapado:', error));
  process.on('unhandledRejection', (error) => console.error('[APP] Promesa rechazada sin atrapar:', error));
  borrarAntiguos();
  console.log(`[APP] Inicio de la aplicación (bitácora en ${carpeta})`);
}

module.exports = { setupBitacora };
