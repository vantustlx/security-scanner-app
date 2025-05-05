const { ipcRenderer } = require('electron');


document.getElementById('boton-rojo').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'accederhuella');
});

document.getElementById('boton-verde').addEventListener('click', () => {
  const nombre = document.getElementById('nombre').value.trim().toLowerCase();

  // Si contiene "test", muestra el modal de error
  if (nombre.includes('test')) {
      const modal = document.getElementById('modal-asociacion-fallida');
      modal.classList.add('active');
      return;
  }

  // Si no contiene "test", continúa con la lógica normal
  // Aquí puedes agregar la lógica real de asociación
  //ipcRenderer.send('navigate', 'waitconfirm'); // o el destino que tengas
});

// Lógica para cerrar el modal con botón aceptar
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-asociacion-fallida');
  const btnAceptar = document.getElementById('btn-aceptar-asociacion');

  if (btnAceptar) {
      btnAceptar.addEventListener('click', () => {
          modal.classList.remove('active');
      });
  }

  modal.addEventListener('click', function (e) {
      if (e.target === modal) {
          modal.classList.remove('active');
      }
  });
});
