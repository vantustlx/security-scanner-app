const { ipcRenderer } = require('electron');

// Filtros de área, carrera y turno (se llenan con los catálogos de la BD)
let filtros = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Botón de regresar
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'buscarusuariosactivos');
    });
    
    // Botón de buscar
    document.querySelector('.btn-buscar').addEventListener('click', buscarGrupoUsuarios);
    // Enter avanza entre los filtros; en el último, busca
    UI.enterAvanza(document.querySelector('.formulario-filtros'), { alFinal: buscarGrupoUsuarios });
    
    // Escuchar resultados de búsqueda
    ipcRenderer.on('resultados-grupo-usuarios', (event, resultados) => {
        mostrarResultados(resultados);
    });
    
    // Escuchar errores
    ipcRenderer.on('busqueda-grupo-error', (event, error) => {
        mostrarMensaje(`Error en la búsqueda: ${error}`, 'error');
        limpiarResultados();
    });

    try {
        const catalogos = await ipcRenderer.invoke('obtener-catalogos');
        filtros = AreasUsuario.llenarFiltros({
            area: document.getElementById('area'),
            carrera: document.getElementById('carrera'),
            turno: document.getElementById('turno')
        }, catalogos);
    } catch (error) {
        mostrarMensaje(`No se pudieron cargar las áreas: ${error.message}`, 'error');
    }
});

function buscarGrupoUsuarios() {
    if (!filtros) {
        mostrarMensaje('No se pudieron cargar las áreas', 'error');
        return;
    }
    // Enviar parámetros de búsqueda ('' = todos)
    ipcRenderer.send('buscar-grupo-usuarios', filtros.valores());
}

function mostrarResultados(usuarios) {
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '';
    
    if (usuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center;">No se encontraron usuarios con los criterios especificados</td>
            </tr>
        `;
        return;
    }
    
    usuarios.forEach(usuario => {
        const fechaRegistro = new Date(usuario.fecha_registro);
        const fechaFormateada = fechaRegistro.toLocaleDateString('es-MX');
        const horaFormateada = fechaRegistro.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${UI.escapar(usuario.nombre)}</td>
            <td>${UI.escapar(usuario.apellido_paterno)}</td>
            <td>${UI.escapar(usuario.apellido_materno)}</td>
            <td>${UI.escapar(usuario.matricula)}</td>
            <td>${UI.escapar(usuario.numero_telefono)}</td>
            <td>${UI.escapar(usuario.estatus)}</td>
            <td>${fechaFormateada}</td>
            <td>${horaFormateada}</td>
        `;
        tbody.appendChild(row);
    });
}

function limpiarResultados() {
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '';
}

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