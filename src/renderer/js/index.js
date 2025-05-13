const { ipcRenderer } = require('electron');


document.getElementById('login-card-acceder').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'acceder'); // carga acceder.html
});

document.getElementById('login-card-visitantes').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'registroguest'); // carga registroguest
});

document.getElementById('login-card-registro').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'registrarusuario'); // carga registrarusuario.html
});

document.getElementById('login-card-administrador').addEventListener('click', () => {
  const modal = document.getElementById('modal-modo-administrador');
  if (modal) modal.classList.add('active');
});




// Configuración del modal cuando se carga el documento
document.addEventListener('DOMContentLoaded', function () {
  const modal = document.getElementById('modal-modo-administrador');
  const btnAceptar = document.getElementById('btn-aceptar');
  const togglePassword = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('contraseña');

  togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassword.classList.toggle('fa-eye');
    togglePassword.classList.toggle('fa-eye-slash');
  });


  // Evento para cerrar el modal con el botón Aceptar
  if (btnAceptar) {
    btnAceptar.addEventListener('click', function () {
      modal.classList.remove('active');
      // Limpiar el formulario después de cerrar el modal
      limpiarFormulario();
    });
  }

  // También puedes cerrar el modal al hacer clic fuera de él
  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      modal.classList.remove('active');
      // Limpiar el formulario después de cerrar el modal
      limpiarFormulario();
    }
  });

  // Para pruebas: Si quieres mostrar el modal automáticamente al cargar la página
  // Descomenta la siguiente línea:
  // setTimeout(() => modal.classList.add('active'), 1000);
});