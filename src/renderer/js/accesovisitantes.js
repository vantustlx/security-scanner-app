const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const inputCodigo  = document.getElementById('codigo');
  const btnVerificar = document.getElementById('btn-verificar');
  const btnVolver    = document.getElementById('btn-volver-gst-accs');

  const modalFail = document.getElementById('modal-acceso-fallido');
  const textoFail = modalFail.querySelector('p');
  const btnFail   = document.getElementById('btn-fallido');

  const modalOk   = document.getElementById('modal-acceso-exito');
  const tituloOk  = modalOk.querySelector('h2');
  const textoOk   = document.getElementById('texto-acceso');
  const btnOk     = document.getElementById('btn-exito');

  // Volver al menú de registro
  btnVolver.addEventListener('click', () => {
    ipcRenderer.send('navigate', 'registroguest');
  });

  // El folio tecleado registra la entrada o la salida, igual que el código de barras en los lectores
  btnVerificar.addEventListener('click', async () => {
    const folio = inputCodigo.value.trim();
    if (!folio) return;
    btnVerificar.disabled = true;
    try {
      const resultado = await ipcRenderer.invoke('registrar-acceso-visitante', folio);
      if (resultado.estado === 'RECHAZADO') {
        textoFail.textContent = resultado.mensaje;
        UI.abrirModal(modalFail, { alEscape: cerrarFallido });
        return;
      }
      tituloOk.textContent = resultado.estado === 'ENTRADA' ? '¡Bienvenido!' : '¡Hasta pronto!';
      textoOk.textContent = `${resultado.nombre} · ${resultado.rol} · ${resultado.mensaje}`;
      inputCodigo.value = '';
      UI.abrirModal(modalOk);
    } finally {
      btnVerificar.disabled = false;
    }
  });
  UI.enterAvanza(document.querySelector('.input-group'), { alFinal: () => btnVerificar.click() });

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
