// acceso.js — registro de entradas y salidas desde los lectores (serial, cámara o lector tipo teclado)
//
// Lector 1 · Peatonal ............ alterna entrada/salida
// Lector 2 · Entrada vehicular ... siempre registra entrada
// Lector 3 · Salida vehicular .... siempre cierra la entrada abierta (sin importar por dónde entró)
// Las incoherencias no bloquean el paso: se muestran al vigilante y se notifican al administrador.
// Visitantes ("V-" + folio): entran y salen por cualquier lector; se alterna entrada/salida.
const { ipcMain, BrowserWindow } = require('electron');
const config = require('./config');
const { crearNotificacion, registrarAccesoFallido } = require('./notificaciones');

const LECTORES = {
  PEATONAL: { numero: 1, nombre: 'Peatonal', medio: 'PEATONAL' },
  ENTRADA_VEHICULAR: { numero: 2, nombre: 'Entrada vehicular', medio: 'VEHICULAR' },
  SALIDA_VEHICULAR: { numero: 3, nombre: 'Salida vehicular', medio: 'VEHICULAR' }
};

// Solo dígitos: evita que un QR ajeno (texto o URL) coincida con la matrícula 0
const MATRICULA_VALIDA = /^\d{1,9}$/;
// Pase de visitante: el código de barras contiene "V-" + folio; en "Acceder" se teclea solo el folio
const CODIGO_VISITANTE = /^V-([A-Z0-9]{6,10})$/;
const FOLIO_VISITANTE = /^[A-Z0-9]{6,10}$/;

let pool;
const ultimasLecturas = new Map(); // "LECTOR:matricula" -> ms de la última lectura

function nombreCompleto(u) {
  return [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' ');
}

function inicioDeHoy() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

function formatoHora(fecha) {
  return new Date(fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function publicar(resultado) {
  BrowserWindow.getAllWindows().forEach((ventana) => ventana.webContents.send('lectura-acceso', resultado));
}

function esRepetida(lector, matricula) {
  const clave = `${lector}:${matricula}`;
  const ahora = Date.now();
  const ventana = config.lectores.antirreboteSegundos * 1000;
  const anterior = ultimasLecturas.get(clave);
  ultimasLecturas.set(clave, ahora);
  if (ultimasLecturas.size > 500) {
    for (const [k, t] of ultimasLecturas) if (ahora - t > ventana) ultimasLecturas.delete(k);
  }
  return anterior !== undefined && ahora - anterior < ventana;
}

async function rechazar(base, texto, tipoError, mensaje) {
  const donde = base.lector ? `lector ${base.numero} · ${LECTORES[base.lector].nombre}` : base.origen;
  await registrarAccesoFallido(texto, tipoError, `${mensaje} (${donde})`)
    .catch((e) => console.error('[ACCESO] No se pudo registrar el acceso fallido:', e));
  return { ...base, estado: 'RECHAZADO', mensaje };
}

/**
 * Registra la lectura de un QR en el lector indicado y publica el resultado a las ventanas.
 * origen: 'serial' | 'camara' | 'teclado'
 */
async function registrarAcceso(textoLeido, lector, origen) {
  const info = LECTORES[lector];
  if (!info) throw new Error(`Lector desconocido: ${lector}`);

  const texto = String(textoLeido || '').trim();
  const base = { lector, numero: info.numero, origen, hora: new Date().toISOString(), avisos: [], placas: [] };
  let resultado;

  if (!texto) return { ...base, estado: 'REPETIDO' };
  if (esRepetida(lector, texto)) {
    // El escáner o la cámara releen mientras la persona sostiene el QR: no se publica nada
    return { ...base, estado: 'REPETIDO' };
  }

  const visitante = CODIGO_VISITANTE.exec(texto.toUpperCase());
  if (!visitante && !MATRICULA_VALIDA.test(texto)) {
    resultado = await rechazar(base, texto, 'QR_INVALIDO', 'Código no válido');
  } else {
    try {
      resultado = visitante
        ? await registrarVisitanteEnBD(base, visitante[1])
        : await registrarEnBD(base, Number(texto), info);
    } catch (error) {
      console.error('[ACCESO] Error al registrar el acceso:', error);
      resultado = { ...base, estado: 'RECHAZADO', mensaje: 'Error del sistema, intenta de nuevo' };
    }
  }

  publicar(resultado);
  return resultado;
}

async function registrarEnBD(base, matricula, info) {
  const conexion = await pool.getConnection();
  const avisos = [];
  let resultado;
  try {
    await conexion.beginTransaction();

    // Bloquea al usuario: dos lectores con la misma persona se procesan uno tras otro
    const [[usuario]] = await conexion.query(
      'SELECT matricula, nombre, apellido_paterno, apellido_materno, rol_facultad FROM usuario WHERE matricula = ? FOR UPDATE',
      [matricula]
    );
    if (!usuario) {
      await conexion.rollback();
      return await rechazar(base, matricula, 'MATRICULA_NO_ENCONTRADA', 'Matrícula no registrada');
    }

    const [vehiculos] = await conexion.query('SELECT placa FROM vehiculo WHERE matricula = ? ORDER BY placa', [matricula]);
    const placas = vehiculos.map((v) => v.placa);

    let [[abierto]] = await conexion.query(
      `SELECT id_registro, fecha_entrada, medio_entrada FROM registroacceso
        WHERE matricula = ? AND fecha_salida IS NULL AND cierre_automatico IS NULL
        ORDER BY fecha_entrada DESC LIMIT 1 FOR UPDATE`,
      [matricula]
    );

    const cerrarAbierto = async (motivo) => {
      await conexion.query('UPDATE registroacceso SET cierre_automatico = NOW() WHERE id_registro = ?', [abierto.id_registro]);
      avisos.push(motivo);
      abierto = null;
    };

    // Entrada de un día anterior que el cierre diario no alcanzó a cerrar
    if (abierto && new Date(abierto.fecha_entrada) < inicioDeHoy()) {
      await cerrarAbierto(`Tenía una entrada del ${formatoHora(abierto.fecha_entrada)} sin salida; se cerró automáticamente`);
    }

    let tipo;
    if (base.lector === 'PEATONAL') {
      tipo = abierto ? 'SALIDA' : 'ENTRADA';
    } else if (base.lector === 'ENTRADA_VEHICULAR') {
      if (abierto) {
        await cerrarAbierto(`Entró en vehículo con una entrada abierta desde ${formatoHora(abierto.fecha_entrada)} sin salida registrada`);
      }
      tipo = 'ENTRADA';
    } else {
      tipo = 'SALIDA';
      if (!abierto) avisos.push('Salió en vehículo sin una entrada registrada');
    }

    if (base.lector !== 'PEATONAL' && placas.length === 0) {
      avisos.push(`${tipo === 'ENTRADA' ? 'Entró' : 'Salió'} en vehículo sin vehículo registrado`);
    }

    if (tipo === 'ENTRADA') {
      await conexion.query(
        'INSERT INTO registroacceso (matricula, fecha_entrada, medio_entrada) VALUES (?, NOW(), ?)',
        [matricula, info.medio]
      );
      await conexion.query("UPDATE usuario SET estatus = 'Activo' WHERE matricula = ?", [matricula]);
    } else {
      if (abierto) {
        await conexion.query(
          'UPDATE registroacceso SET fecha_salida = NOW(), medio_salida = ? WHERE id_registro = ?',
          [info.medio, abierto.id_registro]
        );
      }
      await conexion.query("UPDATE usuario SET estatus = 'Inactivo' WHERE matricula = ?", [matricula]);
    }

    await conexion.commit();
    resultado = {
      ...base,
      estado: tipo,
      matricula,
      nombre: nombreCompleto(usuario),
      rol: usuario.rol_facultad,
      placas,
      avisos,
      mensaje: tipo === 'ENTRADA' ? 'Entrada registrada' : 'Salida registrada'
    };
  } catch (error) {
    await conexion.rollback().catch(() => {});
    throw error;
  } finally {
    conexion.release();
  }

  for (const aviso of avisos) {
    await crearNotificacion({
      tipo: 'ACCESO_INCONSISTENTE',
      matricula,
      titulo: `Acceso inconsistente · lector ${info.numero} (${info.nombre})`,
      mensaje: `${resultado.nombre} (${matricula}): ${aviso}.`
    }).catch((e) => console.error('[ACCESO] No se pudo notificar la inconsistencia:', e));
  }
  return resultado;
}

// Visitantes: entran y salen por cualquiera de los tres lectores (o tecleando el folio);
// se alterna entrada/salida sin registrar el medio ni el estatus
async function registrarVisitanteEnBD(base, folio) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [[visitante]] = await conexion.query(
      `SELECT id_visitante, nombre, apellido_paterno, apellido_materno, tipo, vigente_hasta
         FROM visitante WHERE codigo_acceso = ? FOR UPDATE`,
      [folio]
    );
    if (!visitante) {
      await conexion.rollback();
      return await rechazar(base, folio, 'VISITANTE_NO_VALIDO', 'Folio de visitante no válido');
    }
    if (!visitante.vigente_hasta || new Date(visitante.vigente_hasta) < new Date()) {
      await conexion.rollback();
      return await rechazar(base, folio, 'VISITANTE_VENCIDO', 'Pase de visitante vencido');
    }

    let [[abierto]] = await conexion.query(
      `SELECT id_registro, fecha_entrada FROM registroacceso
        WHERE id_visitante = ? AND fecha_salida IS NULL AND cierre_automatico IS NULL
        ORDER BY fecha_entrada DESC LIMIT 1 FOR UPDATE`,
      [visitante.id_visitante]
    );
    // Una entrada de otro día sin salida no convierte la visita de hoy en salida
    if (abierto && new Date(abierto.fecha_entrada) < inicioDeHoy()) {
      await conexion.query('UPDATE registroacceso SET cierre_automatico = NOW() WHERE id_registro = ?', [abierto.id_registro]);
      abierto = null;
    }

    if (abierto) {
      await conexion.query('UPDATE registroacceso SET fecha_salida = NOW() WHERE id_registro = ?', [abierto.id_registro]);
    } else {
      await conexion.query('INSERT INTO registroacceso (id_visitante, fecha_entrada) VALUES (?, NOW())', [visitante.id_visitante]);
    }
    await conexion.commit();

    const estado = abierto ? 'SALIDA' : 'ENTRADA';
    return {
      ...base,
      estado,
      visitante: true,
      folio,
      nombre: nombreCompleto(visitante),
      rol: `Visitante ${visitante.tipo.toLowerCase()}`,
      mensaje: estado === 'ENTRADA' ? 'Entrada registrada' : 'Salida registrada'
    };
  } catch (error) {
    await conexion.rollback().catch(() => {});
    throw error;
  } finally {
    conexion.release();
  }
}

// Folio tecleado en "Acceder" (para quien no trae el pase en el celular)
async function registrarFolioVisitante(textoFolio) {
  const folio = String(textoFolio || '').trim().toUpperCase().replace(/^V-/, '');
  const base = { lector: null, origen: 'folio', hora: new Date().toISOString(), avisos: [], placas: [] };
  if (!FOLIO_VISITANTE.test(folio)) return rechazar(base, folio, 'VISITANTE_NO_VALIDO', 'Folio de visitante no válido');
  try {
    return await registrarVisitanteEnBD(base, folio);
  } catch (error) {
    console.error('[ACCESO] Error al registrar el folio del visitante:', error);
    return { ...base, estado: 'RECHAZADO', mensaje: 'Error del sistema, intenta de nuevo' };
  }
}

// Para asociar placas: solo consulta, no registra ningún acceso
async function buscarUsuario(matricula) {
  const texto = String(matricula || '').trim();
  if (!MATRICULA_VALIDA.test(texto)) return null;
  const [[usuario]] = await pool.query(
    'SELECT matricula, nombre, apellido_paterno, apellido_materno FROM usuario WHERE matricula = ?',
    [Number(texto)]
  );
  return usuario || null;
}

function setupAcceso(poolDB) {
  pool = poolDB;
  // Lecturas de la cámara o de un lector tipo teclado en la ventana del lector
  ipcMain.handle('registrar-acceso', (event, { texto, lector, origen }) => registrarAcceso(texto, lector, origen || 'camara'));
  ipcMain.handle('buscar-usuario-por-matricula', (event, matricula) => buscarUsuario(matricula));
  ipcMain.handle('registrar-acceso-visitante', (event, folio) => registrarFolioVisitante(folio));
}

module.exports = { LECTORES, setupAcceso, registrarAcceso };
