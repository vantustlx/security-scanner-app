
const { ipcRenderer } = require('electron');

// Variables globales
let usuariosEncontrados = [];
let usuarioSeleccionado = null;

document.addEventListener('DOMContentLoaded', function () {
    // Configurar búsqueda
    const buscarBtn = document.getElementById('buscarBtn');
    if (buscarBtn) {
        buscarBtn.addEventListener('click', buscarUsuarios);
    }

    // Permitir búsqueda con Enter
    ['nombre', 'apellidoP', 'apellidoM'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    buscarUsuarios();
                }
            });
        }
    });

    // Botón de regresar
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'administradoropciones');
    });

    // Configurar eventos de edición
    document.querySelectorAll('.edit-icon').forEach(icon => {
        icon.addEventListener('click', function () {
            const listItem = this.closest('.list-item');
            const userId = listItem.querySelector('.user-id').textContent.replace('|', '').trim();
            abrirModalEdicion(userId);
        });
    });

    // Configurar modal de edición
    document.querySelector('.close-modal').addEventListener('click', cerrarModal);
    document.getElementById('btn-cancelar').addEventListener('click', cerrarModal);
    document.getElementById('btn-actualizar').addEventListener('click', actualizarUsuario);

    // Escuchar para usuarios encontrados
    ipcRenderer.on('usuarios-encontrados', (event, data) => {
        mostrarResultados(data.usuarios);
    });
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
                            <span>${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno} (${usuario.matricula})</span>
                        </div>
                        <i class="fas fa-edit edit-icon" data-matricula="${usuario.matricula}"></i>
                    </div>
                `;
    });

    listSection.innerHTML = listHTML;

    // Configurar eventos de edición para los nuevos elementos
    document.querySelectorAll('.edit-icon').forEach(icon => {
        icon.addEventListener('click', function () {
            const matricula = this.getAttribute('data-matricula');
            abrirModalEdicion(matricula);
        });
    });
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
    document.getElementById('edit-turno').value = usuarioSeleccionado.turno || 'Vespertino';
    document.getElementById('edit-carrera').value = usuarioSeleccionado.id_carrera || '1';
    document.getElementById('edit-rol').value = usuarioSeleccionado.rol_facultad || 'Estudiante';
    document.getElementById('edit-estatus').value = usuarioSeleccionado.estatus || 'Activo';

    // Mostrar modal
    document.getElementById('modal-edicion').classList.add('active');
}

// Función para cerrar modal
function cerrarModal() {
    document.getElementById('modal-edicion').classList.remove('active');
}

// Función para actualizar usuario
function actualizarUsuario() {
    // Recopilar datos del formulario
    const datosActualizados = {
        matricula: document.getElementById('edit-matricula').value,
        nombre: document.getElementById('edit-nombre').value,
        apellido_paterno: document.getElementById('edit-apellidoP').value,
        apellido_materno: document.getElementById('edit-apellidoM').value,
        fecha_nacimiento: document.getElementById('edit-fechaNacimiento').value,
        correo: document.getElementById('edit-correo').value,
        numero_telefono: document.getElementById('edit-telefono').value,
        turno: document.getElementById('edit-turno').value,
        id_carrera: document.getElementById('edit-carrera').value,
        rol_facultad: document.getElementById('edit-rol').value,
        estatus: document.getElementById('edit-estatus').value
    };

    // Validar datos (similar a la validación de registro)
    // ... (implementar validación similar a tu formulario de registro)

    // Enviar datos para actualizar
    ipcRenderer.send('actualizar-usuario', datosActualizados);

    // Cerrar modal
    cerrarModal();

    // Mostrar mensaje de éxito
    mostrarMensaje('Usuario actualizado correctamente', 'success');
}

// Función para mostrar mensajes
function mostrarMensaje(mensaje, tipo = 'info') {
    // Implementación similar a la que ya tienes
    alert(`${tipo}: ${mensaje}`); // Esto sería temporal
}