const { ipcRenderer } = require('electron');

let currentUser = null;  // Guarda aquí el usuario encontrado

document.addEventListener('DOMContentLoaded', () => {
  // Botón “Regresar”
  document.getElementById('boton-rojo').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'opcionvehiculo');
  });

  // 1) Buscar usuario por matrícula
  document.getElementById('boton-verde').addEventListener('click', () => {
    const matricula = document.getElementById('matricula').value.trim();
    if (!matricula) return;
    ipcRenderer.send('verificar-matricula', matricula);
  });

  // 2) Recibe el resultado de la verificación
  ipcRenderer.on('resultado-verificacion', (event, { success }) => {
    if (!success) {
      document.getElementById('modal-asociacion-fallida').classList.add('active');
    } else {
      ipcRenderer.send('obtener-ultimo-usuario');
    }
  });

  // 3) Recibe los datos completos del usuario
  ipcRenderer.on('enviar-ultimo-usuario', (event, user) => {
    if (!user) {
      document.getElementById('modal-asociacion-fallida').classList.add('active');
      return;
    }
    currentUser = user;  // { nombre, apellido_paterno, apellido_materno, matricula }
    document.getElementById('modal-user-exito').classList.add('active');
  });

  // Cerrar modal de “usuario no encontrado”
  document.getElementById('btn-aceptar-asociacion').addEventListener('click', () => {
    document.getElementById('modal-asociacion-fallida').classList.remove('active');
  });

  // Preparo validación de placa
  const inputPlaca = document.getElementById('placa');
  let errorPlaca = document.getElementById('error-placa');
  if (!errorPlaca) {
    errorPlaca = document.createElement('p');
    errorPlaca.id = 'error-placa';
    Object.assign(errorPlaca.style, {
      color: 'red',
      fontSize: '12px',
      marginTop: '8px',
      display: 'none'
    });
    inputPlaca.parentNode.appendChild(errorPlaca);
  }
  const regexPlaca = /^[A-Z]{3}-\d{3}-[A-Z]$/;

  // 4) Click en “Asociar”
  document.getElementById('btn-asociar').addEventListener('click', () => {
    const placa = inputPlaca.value.trim().toUpperCase();
    if (!regexPlaca.test(placa)) {
      errorPlaca.textContent = 'Error, número de placas no válido';
      errorPlaca.style.display = 'block';
      return;
    }
    errorPlaca.style.display = 'none';

    // Llamo al backend para guardar la asociación
    ipcRenderer.send('asociar-placa', {
      matricula: currentUser.matricula,
      placa
    });
  });

  // 5) Manejo de la respuesta de asociación
  ipcRenderer.on('asociacion-exitosa', (event, { success }) => {
    if (!success) {
      document.getElementById('modal-asociacion-fallida').classList.add('active');
      return;
    }

    // Cierro modal anterior y abro el de éxito final
    document.getElementById('modal-user-exito').classList.remove('active');
    const texto = document.getElementById('texto-exito');
    texto.innerHTML = `
      Nombre: ${currentUser.nombre} ${currentUser.apellido_paterno} ${currentUser.apellido_materno}<br>
      Matrícula: ${currentUser.matricula}<br>
      Placas: ${inputPlaca.value.trim().toUpperCase()}
    `;
    document.getElementById('modal-exito-final').classList.add('active');
  });

  // 6) Si hay error en la consulta de asociación
  ipcRenderer.on('asociacion-error', (event, errorMsg) => {
    console.error('Error al asociar placa:', errorMsg);
    document.getElementById('modal-asociacion-fallida').classList.add('active');
  });

  // 7) Regresar tras “Aceptar” del éx ito final
  document.getElementById('btn-aceptar-final').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'opcionvehiculo');
  });
});
