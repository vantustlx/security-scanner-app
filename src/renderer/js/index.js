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

// Configuración de los modales cuando se carga el documento
document.addEventListener('DOMContentLoaded', function () {
  const modal = document.getElementById('modal-modo-administrador');
  const modalnoti = document.getElementById('modal-modo-noti');
  const btnAceptar = document.getElementById('btn-aceptar');
  const btnAceptarNoti = document.getElementById('btn-noti-aceptar');
  const btnCancelar = document.getElementById('btn-cancelar');
  const togglePassword = document.getElementById('toggle-password');
  const usuarioInput = document.getElementById('usuario');
  const passwordInput = document.getElementById('contraseña');

  // Aviso previo al modo administrador
  const abrirAviso = () => UI.abrirModal(modalnoti);
  document.getElementById('login-card-administrador').addEventListener('click', abrirAviso);
  document.getElementById('notis').addEventListener('click', abrirAviso);

  function cerrarModalAdministrador() {
    UI.cerrarModal(modal);
    passwordInput.value = '';
  }

  btnAceptarNoti.addEventListener('click', () => {
    UI.cerrarModal(modalnoti);
    UI.abrirModal(modal, { alEscape: cerrarModalAdministrador }); // enfoca "Usuario"
  });

  togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassword.classList.toggle('fa-eye');
    togglePassword.classList.toggle('fa-eye-slash');
  });

  btnAceptar.addEventListener('click', function () {
    const usuario = usuarioInput.value.trim();
    const contraseña = passwordInput.value;

    if (usuario === 'admin' && contraseña === 'root') {
      ipcRenderer.send('navigate', 'administradoropciones');
    } else {
      UI.notificar('Usuario o contraseña incorrectos 🤖', 'error', 3000);
      passwordInput.focus();
      passwordInput.select();
    }
  });

  // Enter: de "Usuario" pasa a "Contraseña"; en "Contraseña" (o con ambos llenos) ingresa
  UI.enterAvanza(modal.querySelector('.modal-content'), {
    alFinal: () => btnAceptar.click(),
    enviarSiCompleto: true
  });

  btnCancelar.addEventListener('click', cerrarModalAdministrador);

  // También se cierran al hacer clic fuera de ellos
  modal.addEventListener('click', function (e) {
    if (e.target === modal) cerrarModalAdministrador();
  });

  modalnoti.addEventListener('click', function (e) {
    if (e.target === modalnoti) UI.cerrarModal(modalnoti);
  });
});
