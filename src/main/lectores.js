// lectores.js — escáneres QR conectados como puertos serie (COM)
//
// Se leen desde el proceso principal, así registran accesos aunque la ventana del lector no
// tenga el foco o esté minimizada. Cada puerto COM se asigna a un lector (1, 2 o 3) en .env
// desde "Configurar lectores" en la ventana del lector.
const { SerialPort } = require('serialport');
const { ipcMain, BrowserWindow } = require('electron');
const config = require('./config');
const { LECTORES, registrarAcceso } = require('./acceso');

const ROLES = Object.keys(LECTORES);
const VARIABLE_ENV = {
  PEATONAL: 'LECTOR_PEATONAL',
  ENTRADA_VEHICULAR: 'LECTOR_ENTRADA_VEHICULAR',
  SALIDA_VEHICULAR: 'LECTOR_SALIDA_VEHICULAR'
};
const INTERVALO_RECONEXION_MS = 10000;
// Si el escáner no envía CR/LF al final, la lectura se da por terminada tras esta pausa
const ESPERA_SIN_TERMINADOR_MS = 120;

const puertos = new Map(); // ruta COM -> { puerto, abierto }
let calibracion = null;    // { excluir: Set, resolver } mientras se identifica un escáner

function mismoPuerto(a, b) {
  return Boolean(a && b) && a.toUpperCase() === b.toUpperCase();
}

function rolDePuerto(ruta) {
  return ROLES.find((rol) => mismoPuerto(config.lectores[rol], ruta)) || null;
}

// Convierte el flujo de bytes del puerto en lecturas completas
function crearSeparador(alLeer) {
  let buffer = '';
  let temporizador = null;
  const vaciar = () => {
    const texto = buffer.trim();
    buffer = '';
    if (texto) alLeer(texto);
  };
  return (bytes) => {
    buffer += bytes.toString('utf8');
    const partes = buffer.split(/\r\n|\r|\n/);
    buffer = partes.pop();
    partes.map((p) => p.trim()).filter(Boolean).forEach(alLeer);
    clearTimeout(temporizador);
    if (buffer) temporizador = setTimeout(vaciar, ESPERA_SIN_TERMINADOR_MS);
  };
}

function estado() {
  return {
    lectores: ROLES.map((rol) => {
      const ruta = config.lectores[rol];
      const entrada = ruta && [...puertos].find(([p]) => mismoPuerto(p, ruta));
      return { rol, ...LECTORES[rol], puerto: ruta, conectado: Boolean(entrada && entrada[1].abierto) };
    }),
    sinAsignar: [...puertos].filter(([ruta, p]) => p.abierto && !rolDePuerto(ruta)).map(([ruta]) => ruta)
  };
}

function publicarEstado() {
  const actual = estado();
  BrowserWindow.getAllWindows().forEach((ventana) => ventana.webContents.send('estado-lectores', actual));
}

function alLeerPuerto(ruta, texto) {
  if (calibracion) {
    if (calibracion.excluir.has(ruta.toUpperCase())) return;
    const { resolver } = calibracion;
    calibracion = null;
    resolver({ puerto: ruta });
    return;
  }
  const rol = rolDePuerto(ruta);
  if (!rol) {
    console.warn(`[LECTORES] Lectura en ${ruta}, que no está asignado a ningún lector`);
    BrowserWindow.getAllWindows().forEach((v) => v.webContents.send('lectura-sin-asignar', { puerto: ruta }));
    return;
  }
  registrarAcceso(texto, rol, 'serial').catch((e) => console.error(`[LECTORES] Error al procesar lectura de ${ruta}:`, e));
}

function abrir(ruta) {
  const existente = puertos.get(ruta);
  if (existente && (existente.abierto || existente.abriendo)) return;

  const puerto = new SerialPort({ path: ruta, baudRate: config.lectores.baudios, autoOpen: false });
  const registro = { puerto, abierto: false, abriendo: true };
  puertos.set(ruta, registro);

  puerto.on('data', crearSeparador((texto) => alLeerPuerto(ruta, texto)));
  puerto.on('close', () => {
    registro.abierto = false;
    console.warn(`[LECTORES] ${ruta} desconectado`);
    publicarEstado();
  });
  puerto.on('error', (error) => console.error(`[LECTORES] Error en ${ruta}:`, error.message));
  puerto.open((error) => {
    registro.abriendo = false;
    if (error) {
      console.error(`[LECTORES] No se pudo abrir ${ruta}: ${error.message}`);
      return;
    }
    registro.abierto = true;
    console.log(`[LECTORES] ${ruta} conectado${rolDePuerto(ruta) ? ` como lector ${LECTORES[rolDePuerto(ruta)].numero}` : ' (sin asignar)'}`);
    publicarEstado();
  });
}

// Abre los escáneres USB-serie conectados y reintenta los que se desconectaron
async function revisarPuertos() {
  try {
    const lista = await SerialPort.list();
    lista
      .filter((p) => p.vendorId && /^USB/i.test(p.pnpId || ''))
      .forEach((p) => abrir(p.path));
  } catch (error) {
    console.error('[LECTORES] No se pudo listar los puertos serie:', error.message);
  }
}

function guardarAsignacion(asignacion) {
  const variables = {};
  for (const rol of ROLES) {
    const ruta = asignacion[rol] || '';
    if (ruta && !/^COM\d+$/i.test(ruta)) throw new Error(`Puerto inválido: ${ruta}`);
    variables[VARIABLE_ENV[rol]] = ruta.toUpperCase();
    config.lectores[rol] = ruta.toUpperCase() || null;
  }
  config.guardarEnEnv(variables);
  console.log('[LECTORES] Asignación guardada:', variables);
  publicarEstado();
  return estado();
}

function setupLectores() {
  ipcMain.handle('estado-lectores', () => estado());
  // Calibración: resuelve con el puerto del siguiente escáner que lea un código
  ipcMain.handle('calibrar-esperar', (event, { excluir = [] } = {}) => new Promise((resolver) => {
    if (calibracion) calibracion.resolver(null);
    calibracion = { excluir: new Set(excluir.map((r) => r.toUpperCase())), resolver };
  }));
  ipcMain.handle('calibrar-cancelar', () => {
    if (calibracion) calibracion.resolver(null);
    calibracion = null;
  });
  ipcMain.handle('guardar-lectores', (event, asignacion) => guardarAsignacion(asignacion));

  revisarPuertos();
  setInterval(revisarPuertos, INTERVALO_RECONEXION_MS);
}

module.exports = { setupLectores, crearSeparador };
