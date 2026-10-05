// registro.js — alta de usuarios con confirmación por correo
//
// 1. El administrador llena el formulario: los datos quedan en registro_pendiente y
//    el usuario recibe los Términos y Condiciones con un enlace al buzón (worker/).
// 2. El usuario acepta o rechaza desde su celular, aunque la PC esté apagada.
// 3. La app consulta el buzón al iniciar y cada minuto: al aceptar se inserta el
//    usuario y se le envía su credencial con QR; en todos los casos se notifica al admin.
const crypto = require('crypto');
const { ipcMain } = require('electron');
const config = require('./config');
const { enviarCorreoTerminos, enviarCredencial } = require('./sendemails');
const { crearNotificacion } = require('./notificaciones');

// Margen para no vencer una solicitud cuya respuesta aún no se replica en el buzón
const MINUTOS_GRACIA = 10;

let pool;
let sincronizando = false;

function nombreCompleto(r) {
  return [r.nombre, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(' ');
}

async function llamarBuzon(ruta, { method = 'GET', body } = {}) {
  const { url, apiKey } = config.confirmacion;
  if (!url || !apiKey) throw new Error('Falta configurar CONFIRMACION_URL y CONFIRMACION_API_KEY en .env');
  const respuesta = await fetch(`${url}${ruta}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  if (!respuesta.ok) throw new Error(`El servicio de confirmación respondió ${respuesta.status}`);
  return respuesta.json();
}

async function registrarSolicitud(datos) {
  const [usuarios] = await pool.query('SELECT 1 FROM usuario WHERE matricula = ?', [datos.matricula]);
  if (usuarios.length) return { estado: 'usuario-ya-existe' };
  const [pendientes] = await pool.query('SELECT 1 FROM registro_pendiente WHERE matricula = ?', [datos.matricula]);
  if (pendientes.length) return { estado: 'solicitud-pendiente' };

  const token = crypto.randomBytes(24).toString('base64url');
  const expiraEn = new Date(Date.now() + config.confirmacion.horasVigencia * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO registro_pendiente (
       token, matricula, nombre, apellido_paterno, apellido_materno, fecha_nacimiento,
       numero_telefono, correo, turno, rol_facultad, id_carrera, expira_en
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [token, datos.matricula, datos.nombre, datos.apellido_paterno, datos.apellido_materno, datos.fecha_nacimiento,
      datos.numero_telefono, datos.correo, datos.turno, datos.rol_facultad, datos.id_carrera, expiraEn]
  );

  try {
    await llamarBuzon('/api/pendientes', {
      method: 'POST',
      body: { token, nombre: datos.nombre, expiraEn: expiraEn.getTime() }
    });
    await enviarCorreoTerminos({
      correo: datos.correo,
      nombre: datos.nombre,
      enlace: `${config.confirmacion.url}/confirmar/${token}`,
      expiraEn
    });
  } catch (error) {
    await pool.query('DELETE FROM registro_pendiente WHERE token = ?', [token]);
    throw error;
  }
  console.log(`[REGISTRO] Solicitud enviada a ${datos.correo} (matrícula ${datos.matricula})`);
  return { estado: 'enviado' };
}

async function eliminarPendiente(token) {
  await pool.query('DELETE FROM registro_pendiente WHERE token = ?', [token]);
}

// Idempotente: si falla a medias, la decisión se vuelve a procesar en la siguiente sincronización
async function procesarDecision({ token, accion, fecha }) {
  const [filas] = await pool.query('SELECT * FROM registro_pendiente WHERE token = ?', [token]);
  if (!filas.length) return; // ya procesada
  const pendiente = filas[0];
  const nombre = nombreCompleto(pendiente);
  const quien = `${nombre} (${pendiente.matricula})`;

  if (accion === 'rechazar') {
    await eliminarPendiente(token);
    await crearNotificacion({
      tipo: 'REGISTRO_RECHAZADO',
      matricula: pendiente.matricula,
      titulo: 'Registro rechazado',
      mensaje: `${quien} no aceptó los Términos y Condiciones. Sus datos no se guardaron.`
    });
    return;
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query(
      `INSERT INTO usuario (
         matricula, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, fecha_registro,
         numero_telefono, correo, turno, rol_facultad, estatus, id_carrera, fecha_aceptacion_terminos
       ) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, 'Inactivo', ?, ?)`,
      [pendiente.matricula, pendiente.nombre, pendiente.apellido_paterno, pendiente.apellido_materno,
        pendiente.fecha_nacimiento, pendiente.numero_telefono, pendiente.correo, pendiente.turno,
        pendiente.rol_facultad, pendiente.id_carrera, new Date(fecha)]
    );
    await conexion.query('DELETE FROM registro_pendiente WHERE token = ?', [token]);
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    if (error.code !== 'ER_DUP_ENTRY') throw error;
    await eliminarPendiente(token);
    await crearNotificacion({
      tipo: 'REGISTRO_ERROR',
      matricula: pendiente.matricula,
      titulo: 'Error en el registro',
      mensaje: `${quien} aceptó los Términos y Condiciones, pero la matrícula ya estaba registrada. No se modificó el usuario existente.`
    });
    return;
  } finally {
    conexion.release();
  }

  try {
    await enviarCredencial({ correo: pendiente.correo, nombre, matricula: pendiente.matricula });
    await crearNotificacion({
      tipo: 'REGISTRO_CONFIRMADO',
      matricula: pendiente.matricula,
      titulo: 'Registro confirmado',
      mensaje: `${quien} aceptó los Términos y Condiciones. Se le envió su credencial con código QR a ${pendiente.correo}.`
    });
  } catch (error) {
    console.error('[REGISTRO] No se pudo enviar la credencial:', error);
    await crearNotificacion({
      tipo: 'REGISTRO_ERROR',
      matricula: pendiente.matricula,
      titulo: 'Registro confirmado sin credencial',
      mensaje: `${quien} confirmó su registro, pero no se pudo enviar su código QR (${error.message}). Reenvíalo desde "Recuperar QR".`
    });
  }
}

async function procesarVencidas() {
  const [vencidas] = await pool.query(
    'SELECT * FROM registro_pendiente WHERE expira_en < NOW() - INTERVAL ? MINUTE',
    [MINUTOS_GRACIA]
  );
  for (const pendiente of vencidas) {
    await eliminarPendiente(pendiente.token);
    await crearNotificacion({
      tipo: 'REGISTRO_EXPIRADO',
      matricula: pendiente.matricula,
      titulo: 'Solicitud de registro vencida',
      mensaje: `${nombreCompleto(pendiente)} (${pendiente.matricula}) no respondió a tiempo. Si aún desea registrarse, captura de nuevo sus datos.`
    });
  }
}

async function sincronizar() {
  if (sincronizando) return;
  sincronizando = true;
  try {
    const { decisiones } = await llamarBuzon('/api/decisiones');
    const procesadas = [];
    for (const decision of decisiones) {
      try {
        await procesarDecision(decision);
        procesadas.push(decision.token);
      } catch (error) {
        console.error('[REGISTRO] Error al procesar una decisión, se reintentará:', error);
      }
    }
    if (procesadas.length) {
      await llamarBuzon('/api/decisiones/ack', { method: 'POST', body: { tokens: procesadas } });
    }
    // Solo se vencen solicitudes después de leer el buzón, para no ignorar respuestas recibidas de noche
    await procesarVencidas();
  } catch (error) {
    console.warn('[REGISTRO] No se pudo sincronizar con el servicio de confirmación:', error.message);
  } finally {
    sincronizando = false;
  }
}

function setupRegistro(poolDB) {
  pool = poolDB;

  ipcMain.handle('registrar-usuario', async (event, datos) => {
    try {
      return await registrarSolicitud(datos);
    } catch (error) {
      console.error('[REGISTRO] Error al registrar la solicitud:', error);
      return { estado: 'error', mensaje: error.message };
    }
  });

  sincronizar();
  setInterval(sincronizar, config.confirmacion.intervaloSegundos * 1000);
}

module.exports = { setupRegistro };
