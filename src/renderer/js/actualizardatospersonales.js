
const { ipcRenderer } = require('electron');

// Variables globales
let usuariosEncontrados = [];
let usuarioSeleccionado = null;
let selectorAreas = null; // Selector de áreas del modal (se crea al cargar los catálogos de la BD)

document.addEventListener('DOMContentLoaded', async function () {
    // Configurar búsqueda
    const buscarBtn = document.getElementById('buscarBtn');
    if (buscarBtn) {
        buscarBtn.addEventListener('click', buscarUsuarios);
    }

    // Enter avanza entre los campos de búsqueda; en el último, busca
    UI.enterAvanza(document.querySelector('.search-section .form-section'), { alFinal: buscarUsuarios });

    // Botón de regresar
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'administradoropciones');
    });

    // Un solo listener para los íconos de edición, aunque la lista se vuelva a pintar
    document.querySelector('.list-section').addEventListener('click', (e) => {
        const icono = e.target.closest('.edit-icon');
        if (icono) abrirModalEdicion(icono.dataset.matricula);
    });

    // Configurar modal de edición
    document.querySelector('.close-modal').addEventListener('click', cerrarModal);
    document.getElementById('btn-cancelar').addEventListener('click', cerrarModal);
    document.getElementById('btn-actualizar').addEventListener('click', actualizarUsuario);
    UI.enterAvanza(document.querySelector('#modal-edicion .form-container'), {
        alFinal: () => document.getElementById('btn-actualizar').click()
    });

    // Escuchar para usuarios encontrados
    ipcRenderer.on('usuarios-encontrados', (event, data) => {
        mostrarResultados(data.usuarios);
    });

    // Respuestas de la actualización (se registran una sola vez)
    ipcRenderer.on('actualizacion-exitosa', () => terminarActualizacion(true));
    ipcRenderer.on('actualizacion-no-encontrada', () => terminarActualizacion(false, 'No se encontró el usuario a actualizar'));
    ipcRenderer.on('actualizacion-error', (event, { error }) => terminarActualizacion(false, `No se pudo actualizar: ${error}`));

    try {
        const catalogos = await ipcRenderer.invoke('obtener-catalogos');
        selectorAreas = AreasUsuario.crear(document.getElementById('edit-areas'), catalogos);
    } catch (error) {
        console.error('No se pudieron cargar las áreas:', error);
        mostrarMensaje('No se pudieron cargar las áreas. Verifique la conexión con la base de datos.', 'error');
    }
});

// Función para validar entrada de texto
function validarTexto(texto, campo) {
    if (!texto || texto.trim() === '') {
        return { valido: false, mensaje: `El campo ${campo} no puede estar vacío` };
    }

    if (texto.trim().length < 2) {
        return { valido: false, mensaje: `El campo ${campo} debe tener al menos 2 caracteres` };
    }

    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regex.test(texto.trim())) {
        return { valido: false, mensaje: `El campo ${campo} solo puede contener letras y espacios` };
    }

    return { valido: true, mensaje: '' };
}

// Función para buscar usuarios
function buscarUsuarios() {
    const nombre = document.getElementById('nombre').value.trim();
    const apellidoP = document.getElementById('apellidoP').value.trim();
    const apellidoM = document.getElementById('apellidoM').value.trim();

    // Verificar que al menos un campo tenga contenido
    if (!nombre && !apellidoP && !apellidoM) {
        mostrarMensaje('Por favor, ingresa al menos un parámetro de búsqueda', 'warning');
        return;
    }

    // Validar cada campo que tenga contenido
    const validaciones = [];

    if (nombre) {
        const validacionNombre = validarTexto(nombre, 'Nombre');
        if (!validacionNombre.valido) {
            validaciones.push(validacionNombre.mensaje);
        }
    }

    if (apellidoP) {
        const validacionApellidoP = validarTexto(apellidoP, 'Apellido Paterno');
        if (!validacionApellidoP.valido) {
            validaciones.push(validacionApellidoP.mensaje);
        }
    }

    if (apellidoM) {
        const validacionApellidoM = validarTexto(apellidoM, 'Apellido Materno');
        if (!validacionApellidoM.valido) {
            validaciones.push(validacionApellidoM.mensaje);
        }
    }

    // Si hay errores de validación, mostrarlos
    if (validaciones.length > 0) {
        mostrarMensaje(validaciones.join('. '), 'error');
        return;
    }

    // Enviar parámetros de búsqueda
    const parametrosBusqueda = {
        nombre: nombre || '',
        apellido_paterno: apellidoP || '',
        apellido_materno: apellidoM || ''
    };

    ipcRenderer.send('buscar-usuarios', parametrosBusqueda);
}

function escaparHTML(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Función para mostrar resultados
function mostrarResultados(usuarios) {
    usuariosEncontrados = usuarios;
    const listSection = document.querySelector('.list-section');

    if (usuarios.length === 0) {
        listSection.innerHTML = `
                    <div class="no-results">
                        <p>No se encontraron usuarios con los criterios especificados.</p>
                    </div>
                `;
        return;
    }

    let listHTML = '';
    usuarios.forEach((usuario, index) => {
        listHTML += `
                    <div class="list-item">
                        <div class="user-info">
                            <span class="user-id">${String(index + 1).padStart(3, '0')} |</span>
                            <span>${escaparHTML(usuario.nombre)} ${escaparHTML(usuario.apellido_paterno)} ${escaparHTML(usuario.apellido_materno)} (${escaparHTML(usuario.matricula)})</span>
                        </div>
                        <i class="fas fa-edit edit-icon" data-matricula="${escaparHTML(usuario.matricula)}"></i>
                    </div>
                `;
    });

    listSection.innerHTML = listHTML;
}

// Función para abrir modal de edición
function abrirModalEdicion(matricula) {
    // Buscar usuario por matrícula
    usuarioSeleccionado = usuariosEncontrados.find(u => u.matricula == matricula);

    if (!usuarioSeleccionado) {
        mostrarMensaje('No se encontró el usuario seleccionado', 'error');
        return;
    }
    const fecha = usuarioSeleccionado.fecha_nacimiento
  ? new Date(usuarioSeleccionado.fecha_nacimiento).toISOString().split('T')[0]
  : '';
    // Llenar formulario con datos del usuario
    document.getElementById('edit-nombre').value = usuarioSeleccionado.nombre || '';
    document.getElementById('edit-apellidoP').value = usuarioSeleccionado.apellido_paterno || '';
    document.getElementById('edit-apellidoM').value = usuarioSeleccionado.apellido_materno || '';
    document.getElementById('edit-fechaNacimiento').value = fecha;
    document.getElementById('edit-correo').value = usuarioSeleccionado.correo || '';
    document.getElementById('edit-matricula').value = usuarioSeleccionado.matricula || '';
    document.getElementById('edit-telefono').value = usuarioSeleccionado.numero_telefono || '';
    document.getElementById('edit-estatus').value = usuarioSeleccionado.estatus || 'Activo';
    if (selectorAreas) selectorAreas.establecer(usuarioSeleccionado.areas || []);

    // Mostrar modal (enfoca el primer campo; Escape lo cierra)
    UI.abrirModal(document.getElementById('modal-edicion'));
}

// Función para cerrar modal
function cerrarModal() {
    UI.cerrarModal(document.getElementById('modal-edicion'));
}

function validarEdicion(datos) {
    const errores = [];
    [['nombre', 'Nombre'], ['apellido_paterno', 'Apellido Paterno'], ['apellido_materno', 'Apellido Materno']]
        .forEach(([campo, etiqueta]) => {
            const validacion = validarTexto(datos[campo], etiqueta);
            if (!validacion.valido) errores.push(validacion.mensaje);
        });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) errores.push('Ingresa un correo válido');
    if (!/^\d{10,15}$/.test(datos.numero_telefono)) errores.push('El teléfono debe tener entre 10 y 15 dígitos');
    if (!datos.fecha_nacimiento) errores.push('Ingresa la fecha de nacimiento');
    if (!selectorAreas) errores.push('No se pudieron cargar las áreas');
    else errores.push(...selectorAreas.validar());
    return errores;
}

// Función para actualizar usuario
function actualizarUsuario() {
    // Recopilar datos del formulario
    const datosActualizados = {
        matricula: document.getElementById('edit-matricula').value,
        nombre: document.getElementById('edit-nombre').value.trim(),
        apellido_paterno: document.getElementById('edit-apellidoP').value.trim(),
        apellido_materno: document.getElementById('edit-apellidoM').value.trim(),
        fecha_nacimiento: document.getElementById('edit-fechaNacimiento').value,
        correo: document.getElementById('edit-correo').value.trim(),
        numero_telefono: document.getElementById('edit-telefono').value.trim(),
        estatus: document.getElementById('edit-estatus').value,
        areas: selectorAreas ? selectorAreas.obtener() : []
    };

    const errores = validarEdicion(datosActualizados);
    if (errores.length) {
        mostrarMensaje(errores.join('. '), 'error');
        return;
    }

    // Se espera la respuesta de la BD antes de cerrar el modal o confirmar
    const boton = document.getElementById('btn-actualizar');
    boton.disabled = true;
    boton.textContent = 'Actualizando...';
    ipcRenderer.send('actualizar-usuario', datosActualizados);
}

function terminarActualizacion(exito, mensajeError) {
    const boton = document.getElementById('btn-actualizar');
    boton.disabled = false;
    boton.textContent = 'Actualizar';

    if (!exito) {
        mostrarMensaje(mensajeError, 'error');
        return;
    }

    // Refleja los cambios en la lista para que al reabrir el usuario se vean los datos nuevos
    const matricula = document.getElementById('edit-matricula').value;
    const usuario = usuariosEncontrados.find(u => u.matricula == matricula);
    if (usuario) {
        Object.assign(usuario, {
            nombre: document.getElementById('edit-nombre').value.trim(),
            apellido_paterno: document.getElementById('edit-apellidoP').value.trim(),
            apellido_materno: document.getElementById('edit-apellidoM').value.trim(),
            fecha_nacimiento: document.getElementById('edit-fechaNacimiento').value,
            correo: document.getElementById('edit-correo').value.trim(),
            numero_telefono: document.getElementById('edit-telefono').value.trim(),
            estatus: document.getElementById('edit-estatus').value,
            areas: selectorAreas.obtener()
        });
        mostrarResultados(usuariosEncontrados);
    }

    cerrarModal();
    mostrarMensaje('Usuario actualizado correctamente', 'success');
}

// Avisos dentro de la página: alert() deja los inputs sin foco en Electron
function mostrarMensaje(mensaje, tipo = 'info') {
    UI.notificar(mensaje, tipo);
}
