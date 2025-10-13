// qrsuccess.js
document.addEventListener('DOMContentLoaded', () => {
  const { ipcRenderer } = require('electron');

  // 1) Ajustar la altura mínima del layout
  const layout = document.querySelector('.layout');
  const vh = window.innerHeight;
  layout.style.minHeight = vh + 'px';

  // 2) Pedimos al main el último usuario verificado
  ipcRenderer.send('obtener-ultimo-usuario');

  // 3) Cuando el main responda, rellenamos el <p class="user-name">
  ipcRenderer.on('enviar-ultimo-usuario', (event, usuario) => {
    const pNombre = document.querySelector('.user-name');

    if (usuario) {
      // Construimos “Nombre ApellidoP ApellidoM”
      const nombreCompleto = `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno}\n${usuario.entrada_salida}`;
      pNombre.textContent = nombreCompleto;
    } else {
      // Si no viene nada (por ejemplo, si alguien abrió qrsuccess sin pasar por el QR)
      pNombre.textContent = 'Usuario desconocido';
    }
  });

  // 4) Botón “Aceptar” para volver a la pantalla de acceso
  document.getElementById('btn-volver-qr-sccs').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'acceder');
  });
});
