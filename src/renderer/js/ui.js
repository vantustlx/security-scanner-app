// ui.js — utilidades compartidas de formularios y modales (cargar antes del script de cada vista).
//
// No usar alert()/confirm() en el renderer: en Electron (Windows), al cerrarse el diálogo nativo la
// página pierde el foco del teclado y los inputs dejan de aceptar texto hasta que la ventana se
// desenfoca y se vuelve a enfocar. Para avisos usar UI.notificar().
(function () {
  // Campos que avanzan con Enter (se excluyen textarea, botones y enlaces)
  const SELECTOR_CAMPOS = 'input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]), select';
  const SELECTOR_ENFOCABLES = 'input:not([type=hidden]), select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])';
  const TIPOS_SELECCIONABLES = /^(text|email|tel|password|search|number|url)$/;

  const COLORES = { success: '#2e7d32', error: '#c62828', warning: '#ef6c00', info: '#1565c0' };

  // Modales abiertos con abrirModal(); el último es el que está encima
  const pila = [];

  function esVisible(el) {
    return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  }

  function esEditable(el) {
    return !el.disabled && !el.readOnly && esVisible(el);
  }

  function enfocar(el) {
    el.focus();
    if (TIPOS_SELECCIONABLES.test(el.type) && typeof el.select === 'function') el.select();
  }

  // ---------------------------------------------------------------------------
  // Avisos no bloqueantes (reemplazan a alert)
  // ---------------------------------------------------------------------------

  function contenedorAvisos() {
    let contenedor = document.getElementById('ui-avisos');
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.id = 'ui-avisos';
      contenedor.setAttribute('role', 'status');
      contenedor.setAttribute('aria-live', 'polite');
      Object.assign(contenedor.style, {
        position: 'fixed', top: '20px', right: '20px', zIndex: '10000',
        display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px'
      });
      document.body.appendChild(contenedor);
    }
    return contenedor;
  }

  function notificar(mensaje, tipo = 'info', duracionMs = 4000) {
    const aviso = document.createElement('div');
    aviso.textContent = mensaje;
    Object.assign(aviso.style, {
      background: COLORES[tipo] || COLORES.info, color: '#fff', padding: '12px 18px',
      borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,.25)', fontFamily: 'Arial, sans-serif',
      fontSize: '15px', lineHeight: '1.4', opacity: '0', transition: 'opacity .25s'
    });
    contenedorAvisos().appendChild(aviso);
    requestAnimationFrame(() => { aviso.style.opacity = '1'; });
    setTimeout(() => {
      aviso.style.opacity = '0';
      setTimeout(() => aviso.remove(), 300);
    }, duracionMs);
  }

  // ---------------------------------------------------------------------------
  // Modales: foco automático, Escape para cerrar y Tab contenido en el modal
  // ---------------------------------------------------------------------------

  function limpiarPila() {
    for (let i = pila.length - 1; i >= 0; i--) {
      if (!pila[i].modal.classList.contains('active')) pila.splice(i, 1);
    }
  }

  function primerEnfocable(modal) {
    const campos = [...modal.querySelectorAll(SELECTOR_CAMPOS)].filter(esEditable);
    if (campos.length) return campos[0];
    return [...modal.querySelectorAll('button, a[href]')].find((b) => !b.disabled && esVisible(b)) || null;
  }

  // Algunas hojas de estilo retrasan la visibilidad del overlay unos milisegundos
  function enfocarAlAbrir(modal, elegido) {
    const intentar = () => {
      if (modal.contains(document.activeElement)) return true;
      const objetivo = elegido || primerEnfocable(modal);
      if (objetivo && esVisible(objetivo)) enfocar(objetivo);
      return modal.contains(document.activeElement);
    };
    requestAnimationFrame(() => {
      if (!intentar()) setTimeout(intentar, 300);
    });
  }

  /**
   * Abre un modal (clase .active) y enfoca su primer campo, o su primer botón si no tiene campos.
   * opciones.alEscape: qué hacer con Escape (por defecto, cerrar el modal).
   * opciones.enfocar: elemento a enfocar en lugar del primero.
   */
  function abrirModal(modal, opciones = {}) {
    if (!modal) return;
    limpiarPila();
    const existente = pila.findIndex((e) => e.modal === modal);
    const previo = existente >= 0 ? pila.splice(existente, 1)[0].previo : document.activeElement;
    pila.push({ modal, previo, alEscape: opciones.alEscape || (() => cerrarModal(modal)) });
    modal.classList.add('active');
    enfocarAlAbrir(modal, opciones.enfocar);
  }

  // Cierra el modal y devuelve el foco al elemento que lo tenía antes de abrirlo
  function cerrarModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    const i = pila.findIndex((e) => e.modal === modal);
    if (i < 0) return;
    const { previo } = pila.splice(i, 1)[0];
    if (previo && previo !== document.body && document.contains(previo) && esVisible(previo)) previo.focus();
  }

  function modalSuperior() {
    limpiarPila();
    return pila[pila.length - 1] || null;
  }

  document.addEventListener('keydown', (e) => {
    const superior = modalSuperior();
    if (!superior) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      superior.alEscape();
      return;
    }

    // Tab y Shift+Tab no salen del modal hacia la página de fondo
    if (e.key === 'Tab') {
      const enfocables = [...superior.modal.querySelectorAll(SELECTOR_ENFOCABLES)]
        .filter((el) => !el.disabled && esVisible(el));
      if (!enfocables.length) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const dentro = superior.modal.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === primero || !dentro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) {
        e.preventDefault();
        primero.focus();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Enter avanza al siguiente campo; en el último ejecuta la acción principal
  // ---------------------------------------------------------------------------

  /**
   * contenedor: elemento que agrupa los campos del formulario.
   * opciones.alFinal: acción principal (normalmente () => boton.click()).
   * opciones.enviarSiCompleto: si todos los campos tienen valor, Enter ejecuta la acción desde cualquiera.
   */
  function enterAvanza(contenedor, { alFinal, enviarSiCompleto = false } = {}) {
    if (!contenedor) return;
    contenedor.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      const campo = e.target;
      if (!campo.matches(SELECTOR_CAMPOS)) return;

      const campos = [...contenedor.querySelectorAll(SELECTOR_CAMPOS)].filter(esEditable);
      const i = campos.indexOf(campo);
      if (i < 0) return;
      e.preventDefault();

      const completo = enviarSiCompleto && campos.every((c) => c.value.trim() !== '');
      if (i === campos.length - 1 || completo) {
        if (alFinal) alFinal();
        return;
      }
      enfocar(campos[i + 1]);
    });
  }

  // Para insertar datos de la BD dentro de plantillas HTML (innerHTML)
  function escapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.UI = { notificar, abrirModal, cerrarModal, enterAvanza, escapar };
})();
