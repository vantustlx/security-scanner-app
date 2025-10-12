const { ipcRenderer } = require('electron');

// Variables globales
let usuariosEncontrados = [];

document.addEventListener('DOMContentLoaded', function() {
    // Configurar event listeners
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'generarreportes');
    });

    document.getElementById('btn-buscar').addEventListener('click', buscarGrupoUsuarios);
    document.getElementById('btn-generar-pdf').addEventListener('click', generarPDF);

    // Configurar listeners de IPC
    ipcRenderer.on('resultados-grupo-usuarios', (event, resultados) => {
        mostrarResultados(resultados);
        ocultarCarga();
    });

    ipcRenderer.on('busqueda-grupo-error', (event, error) => {
        mostrarError(`Error en la búsqueda: ${error}`);
        ocultarCarga();
    });

    // Configurar fecha mínima/máxima para los date inputs
    configurarFechas();
});

function configurarFechas() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').max = hoy;
    document.getElementById('fechaFin').max = hoy;
}

function buscarGrupoUsuarios() {
    const rol = document.getElementById('rol').value;
    const carrera = document.getElementById('carrera').value;
    const turno = document.getElementById('turno').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    // Validaciones básicas
    if (!rol || !carrera || !turno) {
        mostrarError('Por favor, complete todos los campos obligatorios (Rol, Carrera, Turno)');
        return;
    }

    if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        if (inicio > fin) {
            mostrarError('La fecha de inicio no puede ser mayor a la fecha fin');
            return;
        }
    }

    // Mostrar carga
    mostrarCarga();
    ocultarError();
    ocultarResultados();

    // Preparar parámetros de búsqueda
    const parametrosBusqueda = { rol, carrera, turno };
    
    // Agregar fechas si están presentes
    if (fechaInicio) parametrosBusqueda.fechaInicio = fechaInicio;
    if (fechaFin) parametrosBusqueda.fechaFin = fechaFin;

    console.log('Enviando parámetros de búsqueda:', parametrosBusqueda);
    
    // Enviar solicitud de búsqueda
    ipcRenderer.send('buscar-grupo-usuarios', parametrosBusqueda);
}

function mostrarResultados(usuarios) {
    usuariosEncontrados = usuarios;
    const resultadosContainer = document.getElementById('resultados-container');
    const tituloResultados = document.getElementById('resultados-titulo');
    const cuerpoTabla = document.getElementById('cuerpo-tabla');

    // Actualizar título
    tituloResultados.textContent = `Resultados de la búsqueda: ${usuarios.length} usuario(s) encontrado(s)`;

    // Limpiar tabla
    cuerpoTabla.innerHTML = '';

    if (usuarios.length === 0) {
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
                    No se encontraron usuarios con los criterios especificados
                </td>
            </tr>
        `;
    } else {
        // Llenar tabla con resultados
        usuarios.forEach(usuario => {
            const fechaRegistro = new Date(usuario.fecha_registro);
            const fechaFormateada = fechaRegistro.toLocaleDateString('es-MX');
            const horaFormateada = fechaRegistro.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${usuario.nombre || 'N/A'}</td>
                <td>${usuario.apellido_paterno || 'N/A'}</td>
                <td>${usuario.apellido_materno || 'N/A'}</td>
                <td>${usuario.matricula || 'N/A'}</td>
                <td>${usuario.numero_telefono || 'N/A'}</td>
                <td>
                    <span class="estatus ${(usuario.estatus || '').toLowerCase()}">
                        ${usuario.estatus || 'N/A'}
                    </span>
                </td>
                <td>${fechaFormateada}<br><small>${horaFormateada}</small></td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    }

    // Mostrar contenedor de resultados
    resultadosContainer.style.display = 'block';
}

function generarPDF() {
    if (usuariosEncontrados.length === 0) {
        mostrarError('No hay datos para generar el reporte PDF');
        return;
    }

    // Obtener parámetros de búsqueda actuales
    const parametrosBusqueda = {
        rol: document.getElementById('rol').value,
        carrera: document.getElementById('carrera').value,
        turno: document.getElementById('turno').value,
        fechaInicio: document.getElementById('fechaInicio').value,
        fechaFin: document.getElementById('fechaFin').value
    };

    // Enviar solicitud para generar PDF
    ipcRenderer.send('generar-pdf-grupo-usuarios', {
        usuarios: usuariosEncontrados,
        parametros: parametrosBusqueda
    });
}

function mostrarCarga() {
    document.getElementById('mensaje-carga').style.display = 'block';
}

function ocultarCarga() {
    document.getElementById('mensaje-carga').style.display = 'none';
}

function mostrarError(mensaje) {
    const errorDiv = document.getElementById('mensaje-error');
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        ocultarError();
    }, 5000);
}

function ocultarError() {
    document.getElementById('mensaje-error').style.display = 'none';
}

function ocultarResultados() {
    document.getElementById('resultados-container').style.display = 'none';
}

// Función para formatear nombres de carrera (opcional)
function obtenerNombreCarrera(idCarrera) {
    const carreras = {
        '1': 'Ingeniería en computación',
        '2': 'Ingeniería Química',
        '3': 'Ingeniería Mecánica',
        '4': 'Ingeniería en Sistemas Electrónicos',
        '5': 'Química Industrial',
        '6': 'Matemáticas Aplicadas'
    };
    return carreras[idCarrera] || idCarrera;
}