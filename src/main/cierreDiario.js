// cierreDiario.js — cierre de accesos al final del día (por defecto a las 20:00, CIERRE_HORA en .env)
//
// 1. Genera un PDF con las personas que no registraron su salida (auditoría).
// 2. Marca sus entradas con cierre_automatico, para que al día siguiente su primera lectura sea una entrada.
// 3. Deja a todos los usuarios con estatus Inactivo y notifica al administrador con el PDF adjunto.
// Si la app estaba apagada a la hora del cierre, al iniciar se cierran las entradas de días anteriores.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const config = require('./config');
const { crearNotificacion } = require('./notificaciones');
const { generarPdfCierre } = require('./utils/pdfCierreDiario');

const INTERVALO_REVISION_MS = 60 * 1000;

let pool;
let revisando = false;

function horaDeCierreHoy(ahora) {
  const [h, m] = config.cierre.hora.split(':').map(Number);
  const hora = new Date(ahora);
  hora.setHours(Number.isFinite(h) ? h : 20, Number.isFinite(m) ? m : 0, 0, 0);
  return hora;
}

function inicioDeHoy() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

// Carpeta visible para auditorías (CIERRE_CARPETA en .env o Documentos)
function carpetaCierres() {
  const carpeta = config.cierre.carpeta || path.join(app.getPath('documents'), 'Sistema de Acceso FCBIyT', 'Cierres');
  fs.mkdirSync(carpeta, { recursive: true });
  return carpeta;
}

function nombreArchivo(fecha, tipo) {
  const dos = (n) => String(n).padStart(2, '0');
  const sello = `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}_${dos(fecha.getHours())}${dos(fecha.getMinutes())}`;
  return path.join(carpetaCierres(), `cierre_${sello}_${tipo.toLowerCase()}.pdf`);
}

/**
 * Cierra las entradas abiertas anteriores a "limite".
 * PROGRAMADO: todos los usuarios quedan Inactivo.
 * RECUPERACION: solo los usuarios cerrados (puede haber gente que ya entró hoy).
 */
async function ejecutarCierre(tipo, limite) {
  const ahora = new Date();
  const archivo = nombreArchivo(ahora, tipo);
  const conexion = await pool.getConnection();
  let pendientes;
  try {
    await conexion.beginTransaction();
    [pendientes] = await conexion.query(
      `SELECT ra.id_registro, ra.matricula, ra.fecha_entrada, ra.medio_entrada,
              COALESCE(u.nombre, v.nombre) AS nombre,
              COALESCE(u.apellido_paterno, v.apellido_paterno) AS apellido_paterno,
              COALESCE(u.apellido_materno, v.apellido_materno) AS apellido_materno,
              CASE WHEN ra.id_visitante IS NOT NULL THEN 'Visitante' ELSE u.rol_facultad END AS rol,
              COALESCE(u.numero_telefono, v.numero_telefono) AS telefono
         FROM registroacceso ra
         LEFT JOIN usuario u ON u.matricula = ra.matricula
         LEFT JOIN visitante v ON v.id_visitante = ra.id_visitante
        WHERE ra.fecha_salida IS NULL AND ra.cierre_automatico IS NULL AND ra.fecha_entrada < ?
        ORDER BY ra.fecha_entrada
          FOR UPDATE OF ra`,
      [limite]
    );

    await generarPdfCierre({ archivo, pendientes, fechaCierre: ahora, tipo });

    if (pendientes.length) {
      await conexion.query('UPDATE registroacceso SET cierre_automatico = NOW() WHERE id_registro IN (?)',
        [pendientes.map((p) => p.id_registro)]);
    }
    if (tipo === 'PROGRAMADO') {
      await conexion.query("UPDATE usuario SET estatus = 'Inactivo' WHERE estatus <> 'Inactivo'");
    } else {
      const matriculas = pendientes.map((p) => p.matricula).filter((m) => m != null);
      if (matriculas.length) {
        await conexion.query(
          `UPDATE usuario u SET u.estatus = 'Inactivo'
            WHERE u.matricula IN (?)
              AND NOT EXISTS (SELECT 1 FROM registroacceso r
                               WHERE r.matricula = u.matricula AND r.fecha_salida IS NULL AND r.cierre_automatico IS NULL)`,
          [matriculas]
        );
      }
    }
    await conexion.query(
      'INSERT INTO cierre_diario (fecha_operacion, tipo, registros_cerrados, archivo) VALUES (CURDATE(), ?, ?, ?)',
      [tipo, pendientes.length, archivo]
    );
    await conexion.commit();
  } catch (error) {
    await conexion.rollback().catch(() => {});
    fs.unlink(archivo, () => {});
    throw error;
  } finally {
    conexion.release();
  }

  const n = pendientes.length;
  const cuantas = `${n} ${n === 1 ? 'persona' : 'personas'}`;
  await crearNotificacion({
    tipo: 'CIERRE_DIARIO',
    titulo: tipo === 'PROGRAMADO' ? `Cierre del día: ${cuantas} sin registro de salida` : `Cierre de días anteriores: ${cuantas} sin registro de salida`,
    mensaje: n
      ? `${cuantas} no registraron su salida; sus entradas se cerraron automáticamente${tipo === 'PROGRAMADO' ? ' y todos los usuarios quedaron como Inactivo' : ''}. Abre el PDF para la auditoría.`
      : 'Todas las personas registraron su salida. Todos los usuarios quedaron como Inactivo.',
    archivo
  });
  console.log(`[CIERRE] ${tipo}: ${n} entradas cerradas (${archivo})`);
  return { tipo, cerrados: n, archivo };
}

async function revisar() {
  if (revisando) return;
  revisando = true;
  try {
    // 1) Entradas abiertas de días anteriores: la app estaba apagada a la hora del cierre
    const hoy = inicioDeHoy();
    const [[{ atrasadas }]] = await pool.query(
      'SELECT COUNT(*) AS atrasadas FROM registroacceso WHERE fecha_salida IS NULL AND cierre_automatico IS NULL AND fecha_entrada < ?',
      [hoy]
    );
    if (atrasadas > 0) await ejecutarCierre('RECUPERACION', hoy);

    // 2) Cierre programado de hoy (también si la app se encendió después de la hora de cierre)
    const ahora = new Date();
    if (ahora >= horaDeCierreHoy(ahora)) {
      const [[hecho]] = await pool.query(
        "SELECT id FROM cierre_diario WHERE fecha_operacion = CURDATE() AND tipo = 'PROGRAMADO' LIMIT 1"
      );
      if (!hecho) await ejecutarCierre('PROGRAMADO', ahora);
    }
  } catch (error) {
    console.error('[CIERRE] Error en el cierre diario, se reintentará:', error);
  } finally {
    revisando = false;
  }
}

// Devuelve la primera revisión para esperarla antes de abrir los lectores
function setupCierreDiario(poolDB) {
  pool = poolDB;
  setInterval(revisar, INTERVALO_REVISION_MS);
  return revisar();
}

module.exports = { setupCierreDiario, ejecutarCierre };
