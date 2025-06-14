
// Variables globales actualizadas
let usuariosEncontrados = []; // Almacena todos los usuarios encontrados
let usuariosSeleccionados = []; // Almacena objetos de usuario completos
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', function () {
    // Configurar listeners de IPC
    setupIPCListeners();

    // Configurar búsqueda
    const buscarBtn = document.getElementById('buscarBtn');
    if (buscarBtn) {
        buscarBtn.addEventListener('click', buscarUsuarios);
    }

    // También permitir búsqueda con Enter
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

    // Funcionalidad original para filas estáticas (si existen)
    const resultRows = document.querySelectorAll('.result-row');
    let selectedRow = null;

    resultRows.forEach(row => {
        const originalBgColor = row.style.backgroundColor || '#c1c1c1';

        row.addEventListener('mouseenter', function () {
            if (this !== selectedRow) {
                this.style.backgroundColor = '#D9D9D9';
            }
        });

        row.addEventListener('mouseleave', function () {
            if (this !== selectedRow) {
                this.style.backgroundColor = originalBgColor;
            }
        });

        row.addEventListener('click', function () {
            // Restaurar el color de la fila previamente seleccionada
            if (selectedRow) {
                selectedRow.style.backgroundColor = originalBgColor;
            }

            // Marcar nueva fila seleccionada
            selectedRow = this;
            this.style.backgroundColor = '#999999';
        });
    });
});

// Navegación de los botones
// Botón de volver
document.getElementById('btn-regresar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'administradoropciones');
});

document.getElementById('btn-recuperarqr').addEventListener('click', recuperarQR);

// Configurar listeners de IPC
function setupIPCListeners() {
    // Escuchar respuesta de búsqueda exitosa
    ipcRenderer.on('usuarios-encontrados', (event, data) => {
        mostrarCargando(false);
        mostrarResultados(data.usuarios);
        mostrarMensaje(`Se encontraron ${data.total} resultado(s)`, 'success');
    });

    // Escuchar errores de búsqueda
    ipcRenderer.on('busqueda-error', (event, error) => {
        mostrarCargando(false);
        mostrarMensaje('Error en la búsqueda: ' + error, 'error');
        limpiarResultados();
    });


    // Escuchar respuesta de recuperación
    ipcRenderer.on('recuperar-qr-respuesta', (event, data) => {
        if (data.success) {
            console.log(`QR recuperado para ${data.matricula}`);
        } else {
            console.error(`Error recuperando QR: ${data.error}`);
        }
    });
}

// Función para validar entrada de texto
function validarTexto(texto, campo) {
    // Verificar si está vacío
    if (!texto || texto.trim() === '') {
        return { valido: false, mensaje: `El campo ${campo} no puede estar vacío` };
    }

    // Verificar longitud mínima
    if (texto.trim().length < 2) {
        return { valido: false, mensaje: `El campo ${campo} debe tener al menos 2 caracteres` };
    }

    // Verificar que solo contenga letras, espacios y acentos
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regex.test(texto.trim())) {
        return { valido: false, mensaje: `El campo ${campo} solo puede contener letras y espacios` };
    }

    return { valido: true, mensaje: '' };
}

// Función para buscar usuarios con validación
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

    // Mostrar indicador de carga
    mostrarCargando(true);

    // Enviar parámetros de búsqueda via IPC
    const parametrosBusqueda = {
        nombre: nombre || '',
        apellido_paterno: apellidoP || '',
        apellido_materno: apellidoM || ''
    };

    console.log('Enviando parámetros de búsqueda:', parametrosBusqueda);
    ipcRenderer.send('buscar-usuarios', parametrosBusqueda);
}

// Función para mostrar los resultados
function mostrarResultados(usuarios) {
    usuariosEncontrados = usuarios; // Guardar referencia global

    const resultsContainer = document.querySelector('.results');

    if (usuarios.length === 0) {
        resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>No se encontraron usuarios con los criterios especificados.</p>
                </div>
            `;
        return;
    }

    // Generar HTML para cada usuario
    const resultadosHTML = usuarios.map((usuario, index) =>
        `<div class="result-row" data-matricula="${usuario.matricula}">
                <input type="checkbox" id="usuario_${usuario.matricula}" class="result-checkbox" 
                    onchange="toggleSeleccion(${usuario.matricula})">
                <span class="result-id">${String(index + 1).padStart(3, '0')} |</span>
                <span class="result-name">${usuario.nombre_completo}</span>
                <img src="../assets/qr-code.png" alt="QR Code" class="result-qr" />
            </div>`
    ).join('');

    resultsContainer.innerHTML = resultadosHTML;

    // Limpiar selecciones previas
    usuariosSeleccionados = [];
}

// Función para manejar la selección de usuarios
window.toggleSeleccion = function (matricula) {
    const checkbox = document.getElementById(`usuario_${matricula}`);
    // 2. Usar la variable local directamente (no window)
    const usuario = usuariosEncontrados.find(u => u.matricula == matricula);

    if (!usuario) return;

    if (checkbox.checked) {
        if (!usuariosSeleccionados.some(u => u.matricula === matricula)) {
            usuariosSeleccionados.push(usuario);
        }
    } else {
        usuariosSeleccionados = usuariosSeleccionados.filter(u => u.matricula !== matricula);
    }
    console.log('Usuarios seleccionados:', usuariosSeleccionados);
};

// Función para recuperar QR
function recuperarQR() {
    if (usuariosSeleccionados.length === 0) {
        mostrarMensaje('Por favor, selecciona al menos un usuario para recuperar su QR', 'warning');
        return;
    }

    mostrarMensaje(`Enviando QR a ${usuariosSeleccionados.length} usuario(s)...`, 'info');

    usuariosSeleccionados.forEach(usuario => {
        // Construir nombre completo
        const nombreCompleto = usuario.nombre_completo;

        ipcRenderer.send('recuperar-qr', {
            matricula: usuario.matricula,
            email: usuario.correo,
            nombre: nombreCompleto
        });
    });

    // Limpiar selección después de enviar
    usuariosSeleccionados = [];
    document.querySelectorAll('.result-checkbox:checked').forEach(checkbox => {
        checkbox.checked = false;
    });

}

// Función para limpiar resultados
function limpiarResultados() {
    const resultsContainer = document.querySelector('.results');
    resultsContainer.innerHTML = '';
    usuariosSeleccionados = [];
}

// Función para mostrar indicador de carga
function mostrarCargando(mostrar) {
    const buscarBtn = document.getElementById('buscarBtn');

    if (buscarBtn) {
        if (mostrar) {
            buscarBtn.disabled = true;
            buscarBtn.innerHTML = '⏳';
        } else {
            buscarBtn.disabled = false;
            buscarBtn.innerHTML = '🔍';
        }
    }
}

// Función para mostrar mensajes al usuario
function mostrarMensaje(mensaje, tipo = 'info') {
    // Crear elemento de mensaje si no existe
    let mensajeDiv = document.getElementById('mensaje-sistema');

    if (!mensajeDiv) {
        mensajeDiv = document.createElement('div');
        mensajeDiv.id = 'mensaje-sistema';
        mensajeDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 1000;
                max-width: 300px;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
        document.body.appendChild(mensajeDiv);
    }

    // Establecer color según el tipo
    const colores = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };

    mensajeDiv.style.backgroundColor = colores[tipo] || colores.info;
    mensajeDiv.textContent = mensaje;
    mensajeDiv.style.opacity = '1';

    // Ocultar después de 4 segundos
    setTimeout(() => {
        mensajeDiv.style.opacity = '0';
    }, 4000);
}