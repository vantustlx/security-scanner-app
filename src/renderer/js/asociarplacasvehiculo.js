const { ipcRenderer } = require('electron');

let currentUser = null;  // Guarda aquí el usuario encontrado

document.addEventListener('DOMContentLoaded', () => {
  // Botón “Regresar”
  document.getElementById('boton-rojo').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'acceder');
  });

  const modalFallida = document.getElementById('modal-asociacion-fallida');
  const modalPlaca = document.getElementById('modal-user-exito');
  const btnAsociar = document.getElementById('btn-asociar');
  const mostrarFallida = () => UI.abrirModal(modalFallida);

  // 1) Buscar usuario por matrícula (solo consulta: no registra entrada ni salida)
  document.getElementById('boton-verde').addEventListener('click', async () => {
    const matricula = document.getElementById('matricula').value.trim();
    if (!matricula) return;
    const user = await ipcRenderer.invoke('buscar-usuario-por-matricula', matricula);
    if (!user) {
      mostrarFallida();
      return;
    }
    currentUser = user;  // { nombre, apellido_paterno, apellido_materno, matricula }
    // Cada búsqueda empieza con el campo de placa limpio y enfocado
    inputPlaca.value = '';
    errorPlaca.style.display = 'none';
    UI.abrirModal(modalPlaca);
  });

  // Cerrar modal de “usuario no encontrado”
  document.getElementById('btn-aceptar-asociacion').addEventListener('click', () => {
    UI.cerrarModal(modalFallida);
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

  // Enter en el campo de placa asocia
  UI.enterAvanza(modalPlaca.querySelector('.modal-content'), { alFinal: () => btnAsociar.click() });

  // 4) Click en “Asociar”
  btnAsociar.addEventListener('click', () => {
    if (!currentUser) return;
    const placa = inputPlaca.value.trim().toUpperCase();
    if (!regexPlaca.test(placa)) {
      errorPlaca.textContent = 'Error, número de placas no válido';
      errorPlaca.style.display = 'block';
      inputPlaca.focus();
      return;
    }
    errorPlaca.style.display = 'none';

    // Llamo al backend para guardar la asociación
    btnAsociar.disabled = true; // evita asociar dos veces por doble clic
    ipcRenderer.send('asociar-placa', {
      matricula: currentUser.matricula,
      placa
    });
  });

  // 5) Manejo de la respuesta de asociación
  ipcRenderer.on('asociacion-exitosa', (event, { success }) => {
    btnAsociar.disabled = false;
    if (!success) {
      mostrarFallida();
      return;
    }

    // Cierro modal anterior y abro el de éxito final
    UI.cerrarModal(modalPlaca);
    const texto = document.getElementById('texto-exito');
    texto.innerHTML = `
      Nombre: ${UI.escapar(currentUser.nombre)} ${UI.escapar(currentUser.apellido_paterno)} ${UI.escapar(currentUser.apellido_materno)}<br>
      Matrícula: ${UI.escapar(currentUser.matricula)}<br>
      Placas: ${UI.escapar(inputPlaca.value.trim().toUpperCase())}
    `;
    UI.abrirModal(document.getElementById('modal-exito-final'), { alEscape: regresarAlMenu });
  });

  // 6) Si hay error en la consulta de asociación
  ipcRenderer.on('asociacion-error', (event, errorMsg) => {
    btnAsociar.disabled = false;
    console.error('Error al asociar placa:', errorMsg);
    mostrarFallida();
  });

  // 7) Regresar tras “Aceptar” del éxito final
  function regresarAlMenu() {
    ipcRenderer.send('navigate', 'acceder');
  }
  document.getElementById('btn-aceptar-final').addEventListener('click', regresarAlMenu);
});
