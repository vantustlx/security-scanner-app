// config.js — lee la configuración sensible desde el archivo .env de la raíz del proyecto
const path = require('path');

try {
  process.loadEnvFile(path.join(__dirname, '..', '..', '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.warn('[CONFIG] No se encontró el archivo .env; copia .env.example y complétalo');
}

const config = {
  correo: {
    usuario: process.env.GMAIL_USER,
    password: process.env.GMAIL_APP_PASSWORD,
    // Si se define, los correos se guardan como archivos en esta carpeta en lugar de enviarse
    vistaPreviaDir: process.env.CORREO_VISTA_PREVIA_DIR || null
  },
  confirmacion: {
    url: (process.env.CONFIRMACION_URL || '').replace(/\/+$/, ''),
    apiKey: process.env.CONFIRMACION_API_KEY,
    horasVigencia: Number(process.env.CONFIRMACION_HORAS_VIGENCIA) || 48,
    intervaloSegundos: Number(process.env.CONFIRMACION_INTERVALO_SEG) || 60
  }
};

module.exports = config;
