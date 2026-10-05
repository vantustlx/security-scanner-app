const { ipcRenderer } = require('electron');

// Selector de áreas (se crea al cargar los catálogos de la BD)
let selectorAreas = null;

// Botón rojo: regresar
document.getElementById('boton-rojo').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'index'); // Asumiendo que el archivo se llama index.html
});

// Función para limpiar todos los campos del formulario
function limpiarFormulario() {
    document.getElementById('nombre').value = '';
    document.getElementById('apellidoP').value = '';
    document.getElementById('apellidoM').value = '';
    document.getElementById('fechaNacimiento').value = '';
    document.getElementById('correo').value = '';
    document.getElementById('matricula').value = '';
    document.getElementById('telefono').value = '';
    if (selectorAreas) selectorAreas.establecer([]);

    // Eliminar mensajes de error si existen
    const errores = document.querySelectorAll('.error');
    errores.forEach(error => error.remove());
}

// Mensajes del modal según el resultado del registro
const MENSAJES_MODAL = {
    'usuario-ya-existe': ['Registro ya existente', 'Usuario ya registrado intente cambiar los datos'],
    'solicitud-pendiente': ['Solicitud pendiente', 'Esta matrícula ya tiene una solicitud de registro esperando la confirmación del usuario por correo'],
    'invalido': ['Revise las áreas', 'Los datos de las áreas no son válidos'],
    'error': ['No se pudo enviar el registro', 'Verifique la conexión a internet e intente de nuevo']
};

function mostrarModal(estado, detalle) {
    const [titulo, mensaje] = MENSAJES_MODAL[estado] || MENSAJES_MODAL.error;
    const modal = document.getElementById('modal-usuario-existente');
    modal.querySelector('h2').textContent = titulo;
    modal.querySelector('p').textContent = detalle ? `${mensaje} (${detalle})` : mensaje;
    modal.dataset.limpiar = estado === 'usuario-ya-existe';
    UI.abrirModal(modal, { alEscape: cerrarModalRegistro });
}

function cerrarModalRegistro() {
    const modal = document.getElementById('modal-usuario-existente');
    UI.cerrarModal(modal);
    // Limpiar el formulario solo si la matrícula ya estaba registrada
    if (modal.dataset.limpiar === 'true') limpiarFormulario();
}

// Botón verde: validar y enviar
document.getElementById('boton-verde').addEventListener('click', async function () {
    const boton = this;
    const form = document.querySelector('.formulario');
    const campos = form.querySelectorAll('.campo');
    let valido = true;

    // Limpiar mensajes previos
    campos.forEach(campo => {
        const error = campo.querySelector('.error');
        if (error) error.remove();
    });

    // Validaciones
    const nombre = document.getElementById('nombre');
    const apellidoP = document.getElementById('apellidoP');
    const apellidoM = document.getElementById('apellidoM');
    const fechaNacimiento = document.getElementById('fechaNacimiento');
    const correo = document.getElementById('correo');
    const matricula = document.getElementById('matricula');
    const telefono = document.getElementById('telefono');

    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/;
    const soloNumeros = /^\d+$/;
    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function mostrarError(input, mensaje) {
        const campo = input.parentElement;
        const error = document.createElement('span');
        error.className = 'error';
        error.style.color = '#f77474';
        error.style.fontSize = '12px';
        error.textContent = mensaje;
        campo.appendChild(error);
        valido = false; // Corregido: ahora se establece como false cuando hay un error
    }

    // Nombre y apellidos
    if (!soloLetras.test(nombre.value)) {
        mostrarError(nombre, 'Ingrese un nombre válido (solo letras, 2-50 caracteres)');
    }
    if (!soloLetras.test(apellidoP.value)) {
        mostrarError(apellidoP, 'Ingrese un apellido válido');
    }
    if (!soloLetras.test(apellidoM.value)) {
        mostrarError(apellidoM, 'Ingrese un apellido válido');
    }

    // Fecha de nacimiento (5 a 100 años)
    const hoy = new Date();
    const fecha = new Date(fechaNacimiento.value);
    const edad = hoy.getFullYear() - fecha.getFullYear();
    if (edad < 5 || edad > 100 || isNaN(edad)) {
        mostrarError(fechaNacimiento, 'Debe tener entre 5 y 100 años');
    }

    // Correo electrónico
    if (!correoValido.test(correo.value)) {
        mostrarError(correo, 'Ingrese un correo válido');
    }

    // Matrícula: 8 dígitos
if (!/^(\d{4}|\d{8})$/.test(matricula.value)) {
    mostrarError(matricula, 'La matrícula debe tener 4 u 8 dígitos numéricos');
    }
    // Teléfono: solo números, 10 a 15 dígitos
    if (!soloNumeros.test(telefono.value) || telefono.value.length < 10 || telefono.value.length > 15) {
        mostrarError(telefono, 'El teléfono debe contener entre 10 y 15 dígitos numéricos');
    }

    // Áreas: cada una con su carrera (si la requiere) y al menos un turno
    if (!selectorAreas) {
        mostrarModal('error', 'No se pudieron cargar las áreas');
        return;
    }
    const erroresAreas = selectorAreas.validar();
    if (erroresAreas.length) {
        const error = document.createElement('span');
        error.className = 'error';
        error.style.color = '#f77474';
        error.style.fontSize = '12px';
        error.textContent = erroresAreas.join('. ');
        document.getElementById('areas').appendChild(error);
        valido = false;
    }

    if (!valido) return;

    // El usuario se guarda hasta que acepte los Términos y Condiciones desde su correo
    const datosUsuario = {
        matricula: parseInt(matricula.value),
        nombre: nombre.value.trim(),
        apellido_paterno: apellidoP.value.trim(),
        apellido_materno: apellidoM.value.trim(),
        fecha_nacimiento: fechaNacimiento.value,
        numero_telefono: telefono.value,
        correo: correo.value.trim(),
        areas: selectorAreas.obtener()
    };

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Enviando...';
    try {
        const resultado = await ipcRenderer.invoke('registrar-usuario', datosUsuario);
        if (resultado.estado === 'enviado') {
            ipcRenderer.send('navigate', 'registroexitoso');
            return;
        }
        mostrarModal(resultado.estado, resultado.mensaje);
    } catch (error) {
        mostrarModal('error', error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
});

// Configuración del modal cuando se carga el documento
document.addEventListener('DOMContentLoaded', async function () {
    const modal = document.getElementById('modal-usuario-existente');
    const btnAceptar = document.getElementById('btn-aceptar');

    // Evento para cerrar el modal con el botón Aceptar
    if (btnAceptar) {
        btnAceptar.addEventListener('click', cerrarModalRegistro);
    }

    // También puedes cerrar el modal al hacer clic fuera de él
    modal.addEventListener('click', function (e) {
        if (e.target === modal) cerrarModalRegistro();
    });

    // Enter avanza al siguiente campo; en el último envía el registro
    UI.enterAvanza(document.querySelector('.formulario'), {
        alFinal: () => document.getElementById('boton-verde').click()
    });

    try {
        const catalogos = await ipcRenderer.invoke('obtener-catalogos');
        selectorAreas = AreasUsuario.crear(document.getElementById('areas'), catalogos);
    } catch (error) {
        console.error('No se pudieron cargar las áreas:', error);
        UI.notificar('No se pudieron cargar las áreas. Verifique la conexión con la base de datos.', 'error');
    }

    // Para pruebas: Si quieres mostrar el modal automáticamente al cargar la página
    // Descomenta la siguiente línea:
    // setTimeout(() => modal.classList.add('active'), 1000);
});