const { ipcRenderer } = require('electron');

// Placas de vehículo (modo administrador): se busca a la persona con coincidencias parciales,
// y al elegirla se administran sus placas (puede tener varias).
const REGEX_PLACA = /^[A-Z]{3}-\d{3}-[A-Z]$/;
const CAMPOS = ['nombre', 'apellidoP', 'apellidoM', 'matricula', 'correo'];
const ESPERA_BUSQUEDA_MS = 250;

let usuarioActual = null; // persona elegida en la tabla
let placaEnEdicion = null; // placa que se está cambiando (null = agregar una nueva)
let ultimaBusqueda = 0;   // descarta respuestas de búsquedas anteriores

document.addEventListener('DOMContentLoaded', () => {
  const modalPlacas = document.getElementById('modal-placas');
  const inputPlaca = document.getElementById('placa');
  const errorPlaca = document.getElementById('error-placa');
  const btnGuardar = document.getElementById('btn-guardar-placa');
  const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
  let temporizador = null;

  // Volver a "Acceder" cierra la sesión del administrador (es una vista pública)
  document.getElementById('boton-rojo').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'acceder');
  });

  // ---------------------------------------------------------------
  // Búsqueda con coincidencias
  // ---------------------------------------------------------------
  const valor = (id) => document.getElementById(id).value.trim();
  const crear = (etiqueta, texto) => {
    const el = document.createElement(etiqueta);
    if (texto !== undefined) el.textContent = texto;
    return el;
  };

  async function buscar() {
    clearTimeout(temporizador);
    const filtros = Object.fromEntries(CAMPOS.map((c) => [c, valor(c)]));
    const resultados = document.getElementById('resultados');
    if (!Object.values(filtros).some(Boolean)) {
      resultados.hidden = true;
      return;
    }
    const numero = ++ultimaBusqueda;
    let usuarios;
    try {
      usuarios = await ipcRenderer.invoke('buscar-usuarios-placas', filtros);
    } catch (error) {
      UI.notificar(`Error en la búsqueda: ${error.message}`, 'error');
      return;
    }
    if (numero !== ultimaBusqueda) return;

    const cuerpo = document.getElementById('tabla-usuarios');
    cuerpo.replaceChildren();
    resultados.hidden = false;
    document.getElementById('resultados-titulo').textContent = usuarios.length
      ? `${usuarios.length === 20 ? 'Primeras 20' : usuarios.length} coincidencia(s). Elige a la persona para administrar sus placas.`
      : '';
    if (!usuarios.length) {
      const fila = crear('tr');
      const celda = crear('td', 'No se encontraron usuarios con esos datos');
      celda.colSpan = 4;
      celda.className = 'sin-resultados';
      fila.appendChild(celda);
      cuerpo.appendChild(fila);
      return;
    }
    usuarios.forEach((usuario) => {
      const fila = crear('tr');
      fila.tabIndex = 0;
      fila.title = 'Administrar las placas de esta persona';
      [
        [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' '),
        usuario.matricula,
        usuario.correo || '—',
        usuario.placas || '—'
      ].forEach((texto) => fila.appendChild(crear('td', String(texto ?? ''))));
      const elegir = () => abrirPlacas(usuario);
      fila.addEventListener('click', elegir);
      fila.addEventListener('keydown', (e) => { if (e.key === 'Enter') elegir(); });
      cuerpo.appendChild(fila);
    });
  }

  CAMPOS.forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(buscar, ESPERA_BUSQUEDA_MS);
    });
  });
  document.getElementById('boton-verde').addEventListener('click', buscar);
  document.querySelector('.formulario').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input')) {
      e.preventDefault();
      buscar();
    }
  });

  // ---------------------------------------------------------------
  // Placas de la persona elegida
  // ---------------------------------------------------------------
  function modoAgregar() {
    placaEnEdicion = null;
    inputPlaca.value = '';
    errorPlaca.style.display = 'none';
    document.getElementById('etiqueta-placa').textContent = 'Agregar placa';
    btnGuardar.textContent = 'Agregar';
    btnCancelarEdicion.hidden = true;
  }

  function mostrarError(mensaje) {
    errorPlaca.textContent = mensaje;
    errorPlaca.style.display = 'block';
    inputPlaca.focus();
  }

  async function cargarPlacas() {
    const lista = document.getElementById('lista-placas');
    const placas = await ipcRenderer.invoke('placas-de-usuario', usuarioActual.matricula);
    lista.replaceChildren();
    if (!placas.length) {
      lista.appendChild(crear('li', 'Sin placas registradas')).className = 'sin-placas';
      return;
    }
    placas.forEach((placa) => {
      const item = crear('li');
      const texto = crear('span', placa);
      texto.className = 'placa';

      const editar = crear('button', 'Cambiar');
      editar.type = 'button';
      editar.className = 'btn-placa';
      editar.addEventListener('click', () => {
        placaEnEdicion = placa;
        inputPlaca.value = placa;
        errorPlaca.style.display = 'none';
        document.getElementById('etiqueta-placa').textContent = `Nueva placa en lugar de ${placa}`;
        btnGuardar.textContent = 'Guardar cambio';
        btnCancelarEdicion.hidden = false;
        inputPlaca.focus();
        inputPlaca.select();
      });

      // Quitar pide un segundo clic para confirmar
      const quitar = crear('button', 'Quitar');
      quitar.type = 'button';
      quitar.className = 'btn-placa peligro';
      let confirmar = null;
      quitar.addEventListener('click', async () => {
        if (!confirmar) {
          quitar.textContent = '¿Quitar?';
          confirmar = setTimeout(() => { quitar.textContent = 'Quitar'; confirmar = null; }, 4000);
          return;
        }
        clearTimeout(confirmar);
        const resultado = await ipcRenderer.invoke('quitar-placa', { matricula: usuarioActual.matricula, placa });
        if (!resultado.ok) UI.notificar(resultado.error, 'error');
        else UI.notificar(`Placa ${placa} quitada`, 'success');
        if (placaEnEdicion === placa) modoAgregar();
        await cargarPlacas();
        buscar();
      });

      item.append(texto, editar, quitar);
      lista.appendChild(item);
    });
  }

  async function abrirPlacas(usuario) {
    usuarioActual = usuario;
    document.getElementById('placas-usuario').textContent =
      `${[usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' ')} · Matrícula ${usuario.matricula}`;
    modoAgregar();
    await cargarPlacas();
    UI.abrirModal(modalPlacas, { enfocar: inputPlaca, alEscape: cerrarPlacas });
  }

  function cerrarPlacas() {
    UI.cerrarModal(modalPlacas);
    usuarioActual = null;
  }

  // Se escribe en mayúsculas mientras se teclea
  inputPlaca.addEventListener('input', () => {
    const posicion = inputPlaca.selectionStart;
    inputPlaca.value = inputPlaca.value.toUpperCase();
    inputPlaca.setSelectionRange(posicion, posicion);
  });

  async function guardarPlaca() {
    if (!usuarioActual) return;
    const placa = inputPlaca.value.trim().toUpperCase();
    if (!REGEX_PLACA.test(placa)) {
      mostrarError('Número de placa no válido (formato ABC-123-D)');
      return;
    }
    btnGuardar.disabled = true; // evita guardar dos veces por doble clic
    try {
      const resultado = placaEnEdicion
        ? await ipcRenderer.invoke('actualizar-placa', { matricula: usuarioActual.matricula, anterior: placaEnEdicion, nueva: placa })
        : await ipcRenderer.invoke('agregar-placa', { matricula: usuarioActual.matricula, placa });
      if (!resultado.ok) {
        mostrarError(resultado.error);
        return;
      }
      UI.notificar(placaEnEdicion ? `Placa cambiada a ${placa}` : `Placa ${placa} agregada`, 'success');
      modoAgregar();
      await cargarPlacas();
      buscar(); // actualiza la columna de placas de la tabla
      inputPlaca.focus();
    } catch (error) {
      mostrarError(`No se pudo guardar: ${error.message}`);
    } finally {
      btnGuardar.disabled = false;
    }
  }

  btnGuardar.addEventListener('click', guardarPlaca);
  inputPlaca.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      guardarPlaca();
    }
  });
  btnCancelarEdicion.addEventListener('click', () => {
    modoAgregar();
    inputPlaca.focus();
  });
  document.getElementById('btn-cerrar-placas').addEventListener('click', cerrarPlacas);
  modalPlacas.addEventListener('click', (e) => {
    if (e.target === modalPlacas) cerrarPlacas();
  });
});
