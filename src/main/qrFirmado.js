// qrFirmado.js — contenido del QR de la credencial: matrícula + firma HMAC con QR_SECRETO (.env)
//
// Formato: FCB<matrícula>K<firma>, p. ej. FCB20222009KQ4ZB7M2XWJ5RT6NA
// Solo letras mayúsculas y dígitos: los lectores tipo teclado no alteran símbolos según la distribución
// del teclado, y se acepta en minúsculas por si el lector tiene Bloq Mayús activado.
// Sin la firma, cualquiera podría generar el QR de otra persona escribiendo su matrícula.
const crypto = require('crypto');
const config = require('./config');

const FORMATO = /^FCB(\d{1,9})K([A-Z2-7]{16})$/;
const SOLO_MATRICULA = /^\d{1,9}$/;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Si el .env no tiene secreto se crea uno: cambiarlo o perderlo invalida todas las credenciales emitidas
function secreto() {
  if (!process.env.QR_SECRETO) {
    config.guardarEnEnv({ QR_SECRETO: crypto.randomBytes(32).toString('hex') });
    console.warn('[QR] Se generó QR_SECRETO en .env. Respáldalo: sin él, las credenciales emitidas dejan de servir');
  }
  return process.env.QR_SECRETO;
}

// 80 bits de la HMAC en base32 (16 caracteres)
function firma(matricula) {
  const bytes = crypto.createHmac('sha256', secreto()).update(String(matricula)).digest().subarray(0, 10);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  return bits.match(/.{5}/g).map((b) => BASE32[parseInt(b, 2)]).join('');
}

function contenidoQR(matricula) {
  return `FCB${Number(matricula)}K${firma(Number(matricula))}`;
}

/**
 * Interpreta lo leído por un lector.
 * { matricula } si es válido; { error: 'FIRMA_INVALIDA' | 'SIN_FIRMA' } si parece de usuario pero no
 * se acepta; null si no es un QR de usuario (p. ej. un pase de visitante u otro código).
 */
function leerQR(texto) {
  const limpio = String(texto || '').trim().toUpperCase();
  const firmado = FORMATO.exec(limpio);
  if (firmado) {
    const matricula = Number(firmado[1]);
    const esperado = Buffer.from(firma(matricula));
    const recibido = Buffer.from(firmado[2]);
    return crypto.timingSafeEqual(esperado, recibido) ? { matricula } : { error: 'FIRMA_INVALIDA' };
  }
  if (SOLO_MATRICULA.test(limpio)) {
    // Credenciales anteriores a la firma: solo mientras se reenvían (QR_ACEPTAR_SIN_FIRMA=si)
    return config.qr.aceptarSinFirma ? { matricula: Number(limpio) } : { error: 'SIN_FIRMA' };
  }
  return null;
}

module.exports = { contenidoQR, leerQR };
