const { ipcRenderer } = require('electron');

// Variables globales
let usuariosEncontrados = [];
let filtros = null; // Área, carrera y turno (se llenan con los catálogos de la BD)

document.addEventListener('DOMContentLoaded', async function() {
    // Configurar event listeners
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'generarreportes');
    });

    document.getElementById('btn-buscar').addEventListener('click', buscarGrupoUsuarios);
    document.getElementById('btn-generar-pdf').addEventListener('click', generarPDF);
    // Enter avanza entre los filtros; en el último busca
    UI.enterAvanza(document.querySelector('.formulario-filtros'), {
        alFinal: () => document.getElementById('btn-buscar').click()
    });

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

    try {
        const catalogos = await ipcRenderer.invoke('obtener-catalogos');
        filtros = AreasUsuario.llenarFiltros({
            area: document.getElementById('area'),
            carrera: document.getElementById('carrera'),
            turno: document.getElementById('turno')
        }, catalogos);
    } catch (error) {
        mostrarError(`No se pudieron cargar las áreas: ${error.message}`);
    }
});

function configurarFechas() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').max = hoy;
    document.getElementById('fechaFin').max = hoy;
}

function buscarGrupoUsuarios() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    // Los filtros de área, carrera y turno son opcionales ('' = todos)
    if (!filtros) {
        mostrarError('No se pudieron cargar las áreas');
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
    const parametrosBusqueda = filtros.valores();
    
    // Agregar fechas si están presentes
    if (fechaInicio) parametrosBusqueda.fechaInicio = fechaInicio;
    if (fechaFin) parametrosBusqueda.fechaFin = fechaFin;

    console.log('Enviando parámetros de búsqueda:', parametrosBusqueda);
    
    // Enviar solicitud de búsqueda
    ipcRenderer.send('buscar-grupo-usuarios-con-fechas', parametrosBusqueda);
}

function mostrarResultados(usuarios) {
    usuariosEncontrados = usuarios;
    const resultadosContainer = document.getElementById('resultados-container');
    const tituloResultados = document.getElementById('resultados-titulo');
    const cuerpoTabla = document.getElementById('cuerpo-tabla');

    // Actualizar título
    tituloResultados.textContent = `Resultados: ${usuarios.length} registro(s) encontrado(s)`;

    // Limpiar tabla
    cuerpoTabla.innerHTML = '';

    if (usuarios.length === 0) {
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px; color:#666;">
                    No se encontraron registros con los criterios especificados
                </td>
            </tr>
        `;
        resultadosContainer.style.display = 'block';
        return;
    }

    usuarios.forEach(usuario => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${UI.escapar(usuario.nombre || 'N/A')}</td>
            <td>${UI.escapar(usuario.apellido_paterno || 'N/A')}</td>
            <td>${UI.escapar(usuario.apellido_materno || 'N/A')}</td>
            <td>${UI.escapar(usuario.matricula || 'N/A')}</td>
            <td>${UI.escapar(usuario.numero_telefono || 'N/A')}</td>
            <td>${usuario.fecha_entrada 
                ? new Date(usuario.fecha_entrada).toLocaleString('es-MX', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) 
                : 'N/A'}</td>
            <td>${usuario.fecha_salida 
                ? new Date(usuario.fecha_salida).toLocaleString('es-MX', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) 
                : 'N/A'}</td>
        `;
        cuerpoTabla.appendChild(fila);
    });

    resultadosContainer.style.display = 'block';
}

function generarPDF() {
    if (usuariosEncontrados.length === 0) {
        mostrarError('No hay datos para generar el reporte PDF');
        return;
    }

    // Obtener los parámetros de búsqueda actuales (con sus nombres para el encabezado del PDF)
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    const parametros = { ...filtros.valores(), nombres: filtros.nombres() };
    if (fechaInicio) parametros.fechaInicio = fechaInicio;
    if (fechaFin) parametros.fechaFin = fechaFin;

    console.log('Enviando datos para PDF:', {
        usuariosCount: usuariosEncontrados.length,
        parametros: parametros
    });

    // Enviar solicitud para generar PDF
    ipcRenderer.send('generar-pdf-grupo-usuarios', {
        usuarios: usuariosEncontrados,
        parametros: parametros
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


// Agregar listeners para respuestas del PDF
ipcRenderer.on('pdf-generado-exito', (event, mensaje) => {
    UI.notificar(`✅ ${mensaje}`, 'success');
});

ipcRenderer.on('pdf-generado-error', (event, error) => {
    mostrarError(`Error al generar PDF: ${error}`);
});