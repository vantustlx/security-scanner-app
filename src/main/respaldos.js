// respaldos.js — respaldo diario de la BD con mysqldump, después de la hora de cierre.
// Por defecto en Documentos\Sistema de Acceso FCBIyT\Respaldos; conviene que RESPALDO_CARPETA apunte a
// una carpeta sincronizada (OneDrive, Google Drive) para tener una copia fuera de la PC.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { app } = require('electron');
const config = require('./config');
const { crearNotificacion } = require('./notificaciones');

const HORA_MS = 60 * 60 * 1000;
const RUTAS_MYSQLDUMP = [
  'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe'
];
const PATRON = /^respaldo_\d{4}-\d{2}-\d{2}_\d{4}\.sql$/;

let respaldando = false;
let ultimoAviso = 0;

function carpetaRespaldos() {
  const carpeta = config.respaldo.carpeta || path.join(app.getPath('documents'), 'Sistema de Acceso FCBIyT', 'Respaldos');
  fs.mkdirSync(carpeta, { recursive: true });
  return carpeta;
}

function rutaMysqldump() {
  return config.respaldo.mysqldump || RUTAS_MYSQLDUMP.find((r) => fs.existsSync(r)) || 'mysqldump';
}

function respaldosExistentes(carpeta) {
  return fs.readdirSync(carpeta)
    .filter((a) => PATRON.test(a))
    .map((a) => ({ archivo: path.join(carpeta, a), fecha: fs.statSync(path.join(carpeta, a)).mtimeMs }))
    .sort((a, b) => b.fecha - a.fecha);
}

function respaldar(archivo) {
  const { host, port, usuario, password, nombre } = config.db;
  // Las credenciales van en un archivo temporal de opciones, no en la línea de comandos
  const opciones = path.join(os.tmpdir(), `respaldo_${crypto.randomBytes(8).toString('hex')}.cnf`);
  const entrecomillado = `"${String(password || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const lineas = ['[client]', `host=${host}`, `port=${port}`, `user=${usuario}`, `password=${entrecomillado}`];
  fs.writeFileSync(opciones, `${lineas.join('\n')}\n`, { mode: 0o600 });
  return new Promise((resolve, reject) => {
    const salida = fs.createWriteStream(archivo);
    const proceso = spawn(rutaMysqldump(), [
      `--defaults-extra-file=${opciones}`, '--default-character-set=utf8mb4',
      '--single-transaction', '--no-tablespaces', '--routines', '--triggers', nombre
    ], { windowsHide: true });
    let errores = '';
    proceso.stdout.pipe(salida);
    proceso.stderr.on('data', (d) => { errores += d; });
    proceso.on('error', (error) => { salida.end(); reject(error); });
    proceso.on('close', (codigo) => {
      salida.end(() => {
        if (codigo === 0) resolve();
        else reject(new Error(errores.trim() || `mysqldump terminó con código ${codigo}`));
      });
    });
  }).finally(() => fs.unlink(opciones, () => {}));
}

/**
 * Hace el respaldo si el último tiene más de 20 h y ya pasó la hora de cierre, o si tiene más de 48 h
 * (la app estuvo apagada a esa hora varios días). Borra los de más de RESPALDO_DIAS días.
 */
async function respaldoDiario({ despuesDelCierre }) {
  if (respaldando) return;
  respaldando = true;
  let archivo;
  try {
    const carpeta = carpetaRespaldos();
    const [ultimo] = respaldosExistentes(carpeta);
    const edad = ultimo ? Date.now() - ultimo.fecha : Infinity;
    if (!(edad > 48 * HORA_MS || (despuesDelCierre && edad > 20 * HORA_MS))) return;

    const ahora = new Date();
    const sello = `${ahora.toLocaleDateString('en-CA')}_${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}`;
    archivo = path.join(carpeta, `respaldo_${sello}.sql`);
    await respaldar(archivo);
    console.log(`[RESPALDO] BD respaldada en ${archivo}`);

    const limite = Date.now() - config.respaldo.dias * 24 * HORA_MS;
    respaldosExistentes(carpeta).filter((r) => r.fecha < limite).forEach((r) => fs.unlinkSync(r.archivo));
  } catch (error) {
    if (archivo) fs.unlink(archivo, () => {});
    console.error('[RESPALDO] No se pudo respaldar la BD:', error.message);
    // Se reintenta en cada revisión, pero el administrador recibe a lo más un aviso cada 12 h
    if (Date.now() - ultimoAviso < 12 * HORA_MS) return;
    ultimoAviso = Date.now();
    await crearNotificacion({
      tipo: 'CIERRE_DIARIO', // el respaldo es parte del cierre; el ENUM de notificacion no tiene otro tipo
      titulo: 'No se pudo respaldar la base de datos',
      mensaje: `${error.message}. Se reintentará en unos minutos; si persiste, revisa RESPALDO_MYSQLDUMP en .env.`
    }).catch(() => {});
  } finally {
    respaldando = false;
  }
}

module.exports = { respaldoDiario };
