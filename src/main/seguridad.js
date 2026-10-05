// seguridad.js — la PC del acceso la usa el público: nada de herramientas de desarrollo, recargas,
// ventanas nuevas ni páginas externas. Con "npm run dev" (--dev) se permiten las herramientas.
const { Menu } = require('electron');

const MODO_DESARROLLO = process.argv.includes('--dev');

// Ctrl+Shift+I/J/C y F12 abren las herramientas; Ctrl+R, Ctrl+Shift+R y F5 recargan
function esAtajoBloqueado(input) {
  if (input.type !== 'keyDown') return false;
  const tecla = (input.key || '').toLowerCase();
  const ctrl = input.control || input.meta;
  if (tecla === 'f12' || tecla === 'f5') return true;
  if (ctrl && tecla === 'r') return true;
  if (ctrl && input.shift && ['i', 'j', 'c'].includes(tecla)) return true;
  return false;
}

function protegerVentana(ventana) {
  const contenido = ventana.webContents;

  // Ninguna vista abre ventanas ni navega fuera de la app
  contenido.setWindowOpenHandler(() => ({ action: 'deny' }));
  contenido.on('will-navigate', (evento, url) => {
    if (!url.startsWith('file://')) evento.preventDefault();
  });

  if (!MODO_DESARROLLO) {
    contenido.on('before-input-event', (evento, input) => {
      if (esAtajoBloqueado(input)) evento.preventDefault();
    });
    contenido.on('devtools-opened', () => contenido.closeDevTools());
  }
}

// Sin menú no existen sus atajos (herramientas de desarrollo, recargar, zoom)
function quitarMenu() {
  if (!MODO_DESARROLLO) Menu.setApplicationMenu(null);
}

module.exports = { MODO_DESARROLLO, protegerVentana, quitarMenu };
