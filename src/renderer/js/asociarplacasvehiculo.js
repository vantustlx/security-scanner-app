const { ipcRenderer } = require('electron');

document.getElementById('boton-rojo').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'opcionvehiculo'); // carga acceder.html
});

document.getElementById('boton-verde').addEventListener('click', () => {
  const nombre = document.getElementById('nombre').value.trim().toLowerCase();

  if (nombre.includes('test')) {
    const modal = document.getElementById('modal-asociacion-fallida');
    modal.classList.add('active');
    return;
  }

  if (nombre.includes('exito')) {
    const modal = document.getElementById('modal-user-exito');
    modal.classList.add('active');
    return;
  }

  // Aquí puedes agregar la lógica real de asociación
  ipcRenderer.send('navigate', ''); // Acción por defecto si no hay coincidencia
});

// ========== MODAL DE ERROR "USUARIO NO ENCONTRADO" ==========
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

// ========== MODAL DE INGRESO DE PLACA Y VALIDACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
  const btnAsociar = document.getElementById('btn-asociar');
  const inputPlaca = document.getElementById('placa');

  // Crear mensaje de error si no existe
  let errorPlaca = document.getElementById('error-placa');
  if (!errorPlaca) {
    errorPlaca = document.createElement('p');
    errorPlaca.id = 'error-placa';
    errorPlaca.style.color = 'red';
    errorPlaca.style.fontSize = '12px';
    errorPlaca.style.marginTop = '8px';
    errorPlaca.style.display = 'none';
    inputPlaca.parentNode.appendChild(errorPlaca);
  }

  const regexPlaca = /^[A-Z]{3}-\d{3}-[A-Z]$/;

  btnAsociar.addEventListener('click', () => {
    const placa = inputPlaca.value.trim().toUpperCase();

    if (!regexPlaca.test(placa)) {
      errorPlaca.textContent = 'Error, número de placas no válido';
      errorPlaca.style.display = 'block';
      return;
    }

    errorPlaca.style.display = 'none';

    // Cerrar modal actual
    document.getElementById('modal-user-exito').classList.remove('active');

    // Simular datos traídos de la BD
    const nombre = "Jose Antonio Huerta Salguero";
    const matricula = "20229739";

    const modalFinal = document.getElementById('modal-exito-final');
    const textoExito = document.getElementById('texto-exito');

    textoExito.innerHTML = `Nombre: ${nombre}<br>Matrícula: ${matricula}<br>Placas: ${placa}`;

    modalFinal.classList.add('active');

    const btnAceptarFinal = document.getElementById('btn-aceptar-final');
    btnAceptarFinal.addEventListener('click', () => {
        ipcRenderer.send('navigate', 'opcionvehiculo'); // carga acceder.html
      });
    });
  });

