const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const inputCodigo  = document.getElementById('codigo');
  const btnVerificar = document.getElementById('btn-verificar');
  const btnVolver    = document.getElementById('btn-volver-gst-accs');

  const modalFail = document.getElementById('modal-acceso-fallido');
  const btnFail   = document.getElementById('btn-fallido');

  const modalOk   = document.getElementById('modal-acceso-exito');
  const textoOk   = document.getElementById('texto-acceso');
  const btnOk     = document.getElementById('btn-exito');

  // Volver al menú de registro
  btnVolver.addEventListener('click', () => {
    ipcRenderer.send('navigate', 'registroguest');
  });

  // Verificar el folio ingresado
  btnVerificar.addEventListener('click', () => {
    const folio = inputCodigo.value.trim();
    if (!folio) return;
    ipcRenderer.send('verificar-codigo-acceso', folio);
  });

  // Respuestas del backend
  ipcRenderer.on('acceso-invalid', () => {
    UI.abrirModal(modalFail, { alEscape: cerrarFallido });
  });

  ipcRenderer.on('acceso-valid', (event, data) => {
    textoOk.innerHTML = `
      Nombre: ${data.nombre} ${data.apellidoP} ${data.apellidoM}<br>
      Tipo: ${data.tipo}
    `;
    UI.abrirModal(modalOk);
  });

  // Cerrar modal “denegado”: vuelve al folio, seleccionado para reescribirlo
  function cerrarFallido() {
    UI.cerrarModal(modalFail);
    inputCodigo.focus();
    inputCodigo.select();
  }
  btnFail.addEventListener('click', cerrarFallido);
  modalFail.addEventListener('click', e => {
    if (e.target === modalFail) cerrarFallido();
  });

  // Cerrar modal “éxito”
  btnOk.addEventListener('click', () => UI.cerrarModal(modalOk));
  modalOk.addEventListener('click', e => {
    if (e.target === modalOk) UI.cerrarModal(modalOk);
  });
});
