const { ipcRenderer } = require('electron');

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

    // Eliminar mensajes de error si existen
    const errores = document.querySelectorAll('.error');
    errores.forEach(error => error.remove());
}

// Botón verde: validar y enviar
document.getElementById('boton-verde').addEventListener('click', function () {
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
    if (!/^\d{8}$/.test(matricula.value)) {
        mostrarError(matricula, 'La matrícula debe tener exactamente 8 dígitos numéricos');
    }

    // Teléfono: solo números, 10 a 15 dígitos
    if (!soloNumeros.test(telefono.value) || telefono.value.length < 10 || telefono.value.length > 15) {
        mostrarError(telefono, 'El teléfono debe contener entre 10 y 15 dígitos numéricos');
    }

    if (valido) {
        const usuarioYaExiste = correo.value.includes('test') || matricula.value === '12345678';

        if (usuarioYaExiste) {
            const modal = document.getElementById('modal-usuario-existente');
            modal.classList.add('active');
        } else {
            console.log('Llegue hasta aqui')
            const nombreVal = nombre.value;
            const emailVal = correo.value;

            // 🔥 Envío inmediato
            ipcRenderer.send('enviar-correo', { nombre: nombreVal, email: emailVal });

            ipcRenderer.send('navigate', 'esperandoConfirmacion');

            alert("Formulario válido. Puedes continuar con el registro.");
        }
    }
});

// Configuración del modal cuando se carga el documento
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('modal-usuario-existente');
    const btnAceptar = document.getElementById('btn-aceptar');

    // Evento para cerrar el modal con el botón Aceptar
    if (btnAceptar) {
        btnAceptar.addEventListener('click', function () {
            modal.classList.remove('active');
            // Limpiar el formulario después de cerrar el modal
            limpiarFormulario();
        });
    }

    // También puedes cerrar el modal al hacer clic fuera de él
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.remove('active');
            // Limpiar el formulario después de cerrar el modal
            limpiarFormulario();
        }
    });

    // Para pruebas: Si quieres mostrar el modal automáticamente al cargar la página
    // Descomenta la siguiente línea:
    // setTimeout(() => modal.classList.add('active'), 1000);
});