// visitantes.js — registro unificado de visitantes (Ocasional / Frecuente)
//
// El folio es la credencial: se teclea en "Acceder" o se lee del código de barras del pase,
// que se envía por correo cuando el visitante da uno. Sin correo, el folio se muestra en pantalla.
const crypto = require('crypto');
const { ipcMain } = require('electron');
const { enviarPaseVisitante } = require('./sendemails');

const TIPOS = ['Ocasional', 'Frecuente'];
const MESES_VIGENCIA_FRECUENTE = 6;
// Sin 0/O ni 1/I para que el folio se pueda teclear sin confusiones (32 símbolos: reparto uniforme)
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LONGITUD_FOLIO = 8;
const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,50}$/;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let pool;

function generarFolio() {
  return Array.from(crypto.randomBytes(LONGITUD_FOLIO), (b) => ALFABETO[b % ALFABETO.length]).join('');
}

function calcularVigencia(tipo) {
  const fecha = new Date();
  if (tipo === 'Frecuente') {
    fecha.setMonth(fecha.getMonth() + MESES_VIGENCIA_FRECUENTE);
  } else {
    fecha.setHours(23, 59, 59, 0); // el ocasional solo entra el día que se registra
  }
  return fecha;
}

function normalizar(datos = {}) {
  const limpio = (v) => String(v || '').trim();
  return {
    tipo: limpio(datos.tipo),
    motivo: limpio(datos.motivo),
    nombre: limpio(datos.nombre),
    apellidoP: limpio(datos.apellidoP),
    apellidoM: limpio(datos.apellidoM),
    correo: limpio(datos.correo).toLowerCase(),
    telefono: limpio(datos.telefono)
  };
}

function validar(d) {
  const errores = [];
  if (!TIPOS.includes(d.tipo)) errores.push('Tipo de visitante inválido');
  if (d.motivo.length < 3) errores.push('Motivo de al menos 3 caracteres');
  if (!SOLO_LETRAS.test(d.nombre)) errores.push('Nombre inválido');
  if (!SOLO_LETRAS.test(d.apellidoP)) errores.push('Apellido paterno inválido');
  if (!SOLO_LETRAS.test(d.apellidoM)) errores.push('Apellido materno inválido');
  if (d.correo && !CORREO_VALIDO.test(d.correo)) errores.push('Correo electrónico inválido');
  if (!/^\d{10,15}$/.test(d.telefono)) errores.push('Teléfono debe tener 10–15 dígitos');
  return errores;
}

async function insertarConFolioUnico(d, vigenteHasta) {
  for (let intento = 0; intento < 5; intento++) {
    const folio = generarFolio();
    try {
      await pool.query(
        `INSERT INTO visitante
           (nombre, apellido_paterno, apellido_materno, fecha_registro, numero_telefono, correo,
            codigo_acceso, motivo, tipo, vigente_hasta)
         VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
        [d.nombre, d.apellidoP, d.apellidoM, d.telefono, d.correo || null, folio, d.motivo, d.tipo, vigenteHasta]
      );
      return folio;
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }
  }
  throw new Error('No se pudo generar un folio único');
}

async function registrarVisitante(datos) {
  const d = normalizar(datos);
  const errores = validar(d);
  if (errores.length) return { estado: 'invalido', mensaje: errores.join('. ') };

  const vigenteHasta = calcularVigencia(d.tipo);
  let folio;
  let renovado = false;

  // El visitante frecuente conserva su folio: se renueva su vigencia y se le reenvía el pase
  if (d.tipo === 'Frecuente' && d.correo) {
    const [[existente]] = await pool.query(
      "SELECT id_visitante, codigo_acceso FROM visitante WHERE correo = ? AND tipo = 'Frecuente' ORDER BY id_visitante DESC LIMIT 1",
      [d.correo]
    );
    if (existente) {
      await pool.query(
        `UPDATE visitante SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, numero_telefono = ?,
                motivo = ?, fecha_registro = CURDATE(), vigente_hasta = ?
          WHERE id_visitante = ?`,
        [d.nombre, d.apellidoP, d.apellidoM, d.telefono, d.motivo, vigenteHasta, existente.id_visitante]
      );
      folio = existente.codigo_acceso;
      renovado = true;
    }
  }
  if (!folio) folio = await insertarConFolioUnico(d, vigenteHasta);

  let correoEnviado = false;
  let errorCorreo = null;
  if (d.correo) {
    try {
      const nombre = `${d.nombre} ${d.apellidoP} ${d.apellidoM}`;
      await enviarPaseVisitante({ correo: d.correo, nombre, folio, tipo: d.tipo, vigenteHasta });
      correoEnviado = true;
    } catch (error) {
      console.error('[VISITANTES] No se pudo enviar el pase:', error);
      errorCorreo = error.message;
    }
  }

  console.log(`[VISITANTES] ${renovado ? 'Renovado' : 'Registrado'} visitante ${d.tipo} con folio ${folio}`);
  return { estado: 'ok', folio, tipo: d.tipo, vigenteHasta: vigenteHasta.toISOString(), correo: d.correo, correoEnviado, errorCorreo, renovado };
}

function setupVisitantes(poolDB) {
  pool = poolDB;
  ipcMain.handle('registrar-visitante', async (event, datos) => {
    try {
      return await registrarVisitante(datos);
    } catch (error) {
      console.error('[VISITANTES] Error al registrar visitante:', error);
      return { estado: 'error', mensaje: error.message };
    }
  });
}

module.exports = { setupVisitantes };
