// config.js — lee la configuración sensible desde el archivo .env de la raíz del proyecto
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '..', '.env');

try {
  process.loadEnvFile(ENV_PATH);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.warn('[CONFIG] No se encontró el archivo .env; copia .env.example y complétalo');
}

const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    usuario: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    nombre: process.env.DB_NAME || 'sistemaaccesofacultad'
  },
  admin: {
    usuario: process.env.ADMIN_USUARIO,
    password: process.env.ADMIN_PASSWORD
  },
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
  },
  // Puerto COM de cada escáner; se asignan desde "Configurar lectores" en la ventana del lector
  lectores: {
    PEATONAL: process.env.LECTOR_PEATONAL || null,
    ENTRADA_VEHICULAR: process.env.LECTOR_ENTRADA_VEHICULAR || null,
    SALIDA_VEHICULAR: process.env.LECTOR_SALIDA_VEHICULAR || null,
    baudios: Number(process.env.LECTOR_BAUDIOS) || 9600,
    // Lecturas repetidas del mismo QR en el mismo lector dentro de este lapso se ignoran
    antirreboteSegundos: Number(process.env.LECTOR_ANTIRREBOTE_SEG) || 8
  },
  cierre: {
    hora: process.env.CIERRE_HORA || '20:00',
    carpeta: process.env.CIERRE_CARPETA || null
  }
};

// Escribe (o reemplaza) variables en el .env y las aplica a la configuración en memoria
function guardarEnEnv(variables) {
  let contenido = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  for (const [clave, valor] of Object.entries(variables)) {
    const linea = `${clave}=${valor ?? ''}`;
    const patron = new RegExp(`^${clave}=.*$`, 'm');
    contenido = patron.test(contenido)
      ? contenido.replace(patron, linea)
      : `${contenido.replace(/\s*$/, '')}\n${linea}\n`;
    process.env[clave] = valor ?? '';
  }
  fs.writeFileSync(ENV_PATH, contenido);
}

module.exports = config;
module.exports.guardarEnEnv = guardarEnEnv;
