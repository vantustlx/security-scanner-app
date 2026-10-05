// identidad.js — paleta y logos institucionales para los PDF y correos que genera la app
const path = require('path');
const { nativeImage } = require('electron');

// Paleta tomada de los logos de la UATx y la FCBIyT
const COLORES = {
  guinda: '#6B1719',
  guindaOscuro: '#2B0A0D',
  dorado: '#C49A40',
  gris: '#9B9B9B',
  texto: '#333333',
  rosaClaro: '#EADEDE'
};

const ASSETS_DIR = path.join(__dirname, '..', '..', 'renderer', 'assets');
let logos = null;

// Los logos originales pesan varios MB: se reducen una sola vez para no inflar cada archivo
function obtenerLogos() {
  if (!logos) {
    const reducir = (archivo, ancho) => nativeImage
      .createFromPath(path.join(ASSETS_DIR, archivo))
      .resize({ width: ancho, quality: 'best' })
      .toPNG();
    logos = {
      uatx: reducir('logo_uatx.png', 360),
      fcbiyt: reducir('logo_FCBIyT.png', 960)
    };
  }
  return logos;
}

module.exports = { COLORES, ASSETS_DIR, obtenerLogos };
