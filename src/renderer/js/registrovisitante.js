// registrovisitante.js — registro unificado de visitantes (Ocasional / Frecuente)
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.formulario');
  const btnRegistrar = document.getElementById('boton-verde');
  const campos = ['tipo', 'motivo', 'nombre', 'apellidoP', 'apellidoM', 'telefono', 'correo']
    .reduce((acc, id) => ({ ...acc, [id]: document.getElementById(id) }), {});

  const modalExito = document.getElementById('modal-visitante-exito');
  const modalError = document.getElementById('modal-error');

  function limpiarFormulario() {
    ['motivo', 'nombre', 'apellidoP', 'apellidoM', 'telefono', 'correo'].forEach((id) => { campos[id].value = ''; });
    campos.tipo.value = 'Ocasional';
    form.querySelectorAll('.error').forEach((e) => e.remove());
  }

  function mostrarError(input, msg) {
    const span = document.createElement('span');
    span.className = 'error';
    span.style.color = '#f77474';
    span.style.fontSize = '12px';
    span.textContent = msg;
    input.parentElement.appendChild(span);
  }

  function validar() {
    form.querySelectorAll('.error').forEach((e) => e.remove());
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,50}$/;
    const errores = [];
    const revisar = (ok, input, msg) => { if (!ok) { mostrarError(input, msg); errores.push(input); } };

    revisar(campos.motivo.value.trim().length >= 3, campos.motivo, 'Motivo de al menos 3 caracteres');
    revisar(soloLetras.test(campos.nombre.value.trim()), campos.nombre, 'Nombre inválido');
    revisar(soloLetras.test(campos.apellidoP.value.trim()), campos.apellidoP, 'Apellido paterno inválido');
    revisar(soloLetras.test(campos.apellidoM.value.trim()), campos.apellidoM, 'Apellido materno inválido');
    revisar(/^\d{10,15}$/.test(campos.telefono.value.trim()), campos.telefono, 'Teléfono debe tener 10–15 dígitos');
    const correo = campos.correo.value.trim();
    revisar(!correo || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo), campos.correo, 'Correo electrónico inválido');

    if (errores.length) errores[0].focus();
    return errores.length === 0;
  }

  function mostrarExito(r) {
    const vigencia = new Date(r.vigenteHasta).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('titulo-exito').textContent = r.renovado ? '¡Registro renovado!' : '¡Registro exitoso!';
    document.getElementById('texto-folio').textContent = r.folio;
    document.getElementById('texto-vigencia').textContent = r.tipo === 'Frecuente'
      ? `Visitante frecuente · vigente hasta el ${vigencia}`
      : `Visitante ocasional · válido solo hoy (${vigencia})`;

    let pase;
    if (r.correoEnviado) pase = `Enviamos tu pase con código de barras a ${r.correo}. Preséntalo en cualquier lector de la entrada.`;
    else if (r.correo) pase = 'No se pudo enviar el correo. Anota tu folio: con él puedes entrar tecleándolo en "Acceder".';
    else pase = 'Anota tu folio: con él puedes entrar tecleándolo en "Acceder".';
    document.getElementById('texto-pase').textContent = pase;

    UI.abrirModal(modalExito, { alEscape: cerrarExito });
  }

  function cerrarExito() {
    UI.cerrarModal(modalExito);
    limpiarFormulario();
  }

  async function registrar() {
    if (!validar()) return;
    btnRegistrar.disabled = true; // evita registros duplicados por doble clic
    try {
      const resultado = await ipcRenderer.invoke('registrar-visitante', {
        tipo: campos.tipo.value,
        motivo: campos.motivo.value,
        nombre: campos.nombre.value,
        apellidoP: campos.apellidoP.value,
        apellidoM: campos.apellidoM.value,
        telefono: campos.telefono.value,
        correo: campos.correo.value
      });
      if (resultado.estado === 'ok') {
        mostrarExito(resultado);
      } else {
        document.getElementById('texto-error').textContent = resultado.mensaje;
        UI.abrirModal(modalError);
      }
    } catch (error) {
      document.getElementById('texto-error').textContent = error.message;
      UI.abrirModal(modalError);
    } finally {
      btnRegistrar.disabled = false;
    }
  }

  document.getElementById('boton-rojo').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'registroguest');
  });
  btnRegistrar.addEventListener('click', registrar);
  // Enter avanza al siguiente campo; en el último registra
  UI.enterAvanza(form, { alFinal: () => btnRegistrar.click() });

  document.getElementById('btn-aceptar-exito').addEventListener('click', cerrarExito);
  modalExito.addEventListener('click', (e) => { if (e.target === modalExito) cerrarExito(); });
  document.getElementById('btn-aceptar-error').addEventListener('click', () => UI.cerrarModal(modalError));
  modalError.addEventListener('click', (e) => { if (e.target === modalError) UI.cerrarModal(modalError); });
});
