const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  // Referencias
  const btnRegresar = document.getElementById('boton-rojo');
  const btnRegistrar = document.getElementById('boton-verde');
  const form = document.querySelector('.formulario');

  const inputMotivo   = document.getElementById('motivo');
  const inputNombre   = document.getElementById('nombre');
  const inputApellidoP= document.getElementById('apellidoP');
  const inputApellidoM= document.getElementById('apellidoM');
  const inputCorreo   = document.getElementById('correo');
  const inputTelefono = document.getElementById('telefono');

  const modalExistente = document.getElementById('modal-usuario-existente');
  const btnAceptarExistente = document.getElementById('btn-aceptar');

  const modalExito    = document.getElementById('modal-visitante-exito');
  const textoFolio    = document.getElementById('texto-folio');
  const btnAceptarExito = document.getElementById('btn-aceptar-exito');

  // Función para limpiar formulario y errores
  function limpiarFormulario() {
    [ inputMotivo, inputNombre, inputApellidoP, inputApellidoM, inputCorreo, inputTelefono ]
      .forEach(i => i.value = '');
    form.querySelectorAll('.error').forEach(e => e.remove());
  }

  // Navegar atrás
  btnRegresar.addEventListener('click', () => {
    ipcRenderer.send('navigate', 'registrovisitantes');
  });

  // Validación y envío
  btnRegistrar.addEventListener('click', () => {
    // Limpio errores previos
    form.querySelectorAll('.error').forEach(e => e.remove());
    let valido = true;

    const soloLetras  = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/;
    const correoValido= /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const soloNumeros = /^\d+$/;

    function mostrarError(input, msg) {
      const span = document.createElement('span');
      span.className = 'error';
      span.style.color = '#f77474';
      span.style.fontSize = '12px';
      span.textContent = msg;
      input.parentElement.appendChild(span);
      valido = false;
    }

    if (inputMotivo.value.trim().length < 3)
      mostrarError(inputMotivo, 'Motivo de al menos 3 caracteres');

    if (!soloLetras.test(inputNombre.value))
      mostrarError(inputNombre, 'Nombre inválido');

    if (!soloLetras.test(inputApellidoP.value))
      mostrarError(inputApellidoP, 'Apellido paterno inválido');

    if (!soloLetras.test(inputApellidoM.value))
      mostrarError(inputApellidoM, 'Apellido materno inválido');

    if (!correoValido.test(inputCorreo.value))
      mostrarError(inputCorreo, 'Correo electrónico inválido');

    if (!soloNumeros.test(inputTelefono.value)
      || inputTelefono.value.length < 10
      || inputTelefono.value.length > 15)
      mostrarError(inputTelefono, 'Teléfono debe tener 10–15 dígitos');

    if (!valido) return;

    const datos = {
      motivo:    inputMotivo.value.trim(),
      nombre:    inputNombre.value.trim(),
      apellidoP: inputApellidoP.value.trim(),
      apellidoM: inputApellidoM.value.trim(),
      correo:    inputCorreo.value.trim(),
      telefono:  inputTelefono.value.trim()
    };

    btnRegistrar.disabled = true; // evita registros duplicados por doble clic
    ipcRenderer.send('registrar-visitante-frecuente', datos);
  });

  // 4.1 Ya existe → modal de existente
  ipcRenderer.on('registro-visitante-existente', (ev, { folio }) => {
    modalExistente.querySelector('h2').textContent = 'Visitante ya registrado';
    modalExistente.querySelector('p').textContent =
      `Ya tienes un folio permanente: ${folio}`;
    btnRegistrar.disabled = false;
    UI.abrirModal(modalExistente, { alEscape: cerrarExistente });
  });

  // 4.2 Registro exitoso → modal de éxito
  ipcRenderer.on('registro-visitante-exitoso', (ev, { folio }) => {
    btnRegistrar.disabled = false;
    textoFolio.textContent = `Tu folio permanente es: ${folio}`;
    UI.abrirModal(modalExito, { alEscape: cerrarExito });
  });

  // 4.3 Error en backend
  ipcRenderer.on('registro-visitante-error', (ev, err) => {
    btnRegistrar.disabled = false;
    UI.notificar(`Error al registrar visitante: ${err}`, 'error');
  });

  // Cierre de modal “existente”
  function cerrarExistente() {
    UI.cerrarModal(modalExistente);
    limpiarFormulario();
  }
  btnAceptarExistente.addEventListener('click', cerrarExistente);
  modalExistente.addEventListener('click', e => {
    if (e.target === modalExistente) cerrarExistente();
  });

  // Cierre de modal “éxito”
  function cerrarExito() {
    UI.cerrarModal(modalExito);
    limpiarFormulario();
  }
  btnAceptarExito.addEventListener('click', cerrarExito);
  modalExito.addEventListener('click', e => {
    if (e.target === modalExito) cerrarExito();
  });
});
