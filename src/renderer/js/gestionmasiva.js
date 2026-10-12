// src/renderer/js/gestionmasiva.js
const { ipcRenderer } = require('electron');

let filtros = null;
let usuariosActuales = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'administradoropciones');
    });

    document.getElementById('btn-buscar').addEventListener('click', realizarBusqueda);
    UI.enterAvanza(document.querySelector('.formulario-filtros'), { alFinal: realizarBusqueda });

    const selectAllCheckbox = document.getElementById('select-all');
    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.usuario-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        actualizarContadorSeleccionados();
    });

    document.getElementById('btn-enviar-masivo').addEventListener('click', ejecutarEnvioMasivo);
    document.getElementById('btn-descargar-locales').addEventListener('click', descargarPDFsLocales);

    // Escuchar progreso en tiempo real
    ipcRenderer.on('progreso-envio-masivo', (event, data) => {
        actualizarProgresoUI(data);
    });

    try {
        const catalogos = await ipcRenderer.invoke('obtener-catalogos');
        filtros = AreasUsuario.llenarFiltros({
            area: document.getElementById('area'),
            carrera: document.getElementById('carrera'),
            turno: document.getElementById('turno')
        }, catalogos);
    } catch (err) {
        mostrarMensaje(`Error al cargar catálogos: ${err.message}`, 'error');
    }
});

async function realizarBusqueda() {
    if (!filtros) return;
    const valoresFiltros = filtros.valores();
    const busquedaTexto = document.getElementById('busqueda').value.trim();

    try {
        mostrarMensaje('Buscando usuarios...', 'info');
        usuariosActuales = await ipcRenderer.invoke('buscar-usuarios-gestion', {
            ...valoresFiltros,
            busqueda: busquedaTexto
        });
        renderizarTablaUsuarios(usuariosActuales);
        document.getElementById('select-all').checked = false;
        actualizarContadorSeleccionados();
        mostrarMensaje(`Se encontraron ${usuariosActuales.length} usuarios`, 'success');
    } catch (err) {
        mostrarMensaje(`Error en la búsqueda: ${err.message}`, 'error');
    }
}

function renderizarTablaUsuarios(usuarios) {
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '';

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No se encontraron usuarios con los criterios especificados</td></tr>`;
        return;
    }

    usuarios.forEach(u => {
        const tr = document.createElement('tr');
        const nombreCompleto = [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' ');
        const tieneCorreo = u.correo && u.correo.includes('@');

        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="usuario-checkbox" value="${u.matricula}" onchange="actualizarContadorSeleccionados()">
            </td>
            <td>${UI.escapar(u.matricula)}</td>
            <td>${UI.escapar(nombreCompleto)}</td>
            <td style="${tieneCorreo ? '' : 'color: red; font-style: italic;'}">${UI.escapar(u.correo || 'Falta correo')}</td>
            <td>${UI.escapar(u.numero_telefono || '—')}</td>
            <td>${UI.escapar(u.estatus)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function actualizarContadorSeleccionados() {
    const checkboxes = document.querySelectorAll('.usuario-checkbox:checked');
    const count = checkboxes.length;
    document.getElementById('selected-count').textContent = `${count} seleccionados`;
    const btnEnviar = document.getElementById('btn-enviar-masivo');
    const btnLocales = document.getElementById('btn-descargar-locales');
    btnEnviar.disabled = count === 0;
    btnLocales.disabled = count === 0;
}

window.actualizarContadorSeleccionados = actualizarContadorSeleccionados;

async function ejecutarEnvioMasivo() {
    const checkboxes = document.querySelectorAll('.usuario-checkbox:checked');
    const matriculas = Array.from(checkboxes).map(cb => Number(cb.value));

    if (matriculas.length === 0) return;

    if (!confirm(`¿Estás seguro de generar y enviar QRs por correo a ${matriculas.length} usuarios seleccionados?`)) {
        return;
    }

    const progressContainer = document.getElementById('progress-container');
    const progressStatus = document.getElementById('progress-status');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressDetail = document.getElementById('progress-detail');

    progressContainer.style.display = 'block';
    progressStatus.textContent = `Iniciando envío... (0 / ${matriculas.length})`;
    progressBarFill.style.width = '0%';
    progressDetail.textContent = '';

    document.getElementById('btn-enviar-masivo').disabled = true;
    document.getElementById('btn-descargar-locales').disabled = true;
    document.getElementById('btn-buscar').disabled = true;

    try {
        const resultado = await ipcRenderer.invoke('ejecutar-envio-masivo', { matriculas, delayMs: 1500 });

        progressStatus.textContent = `¡Proceso finalizado! Éxitos: ${resultado.exitos}, Fallidos: ${resultado.fallidos}`;
        progressBarFill.style.width = '100%';
        progressBarFill.style.backgroundColor = resultado.fallidos > 0 ? '#ff9800' : '#4CAF50';
        progressDetail.textContent = `Revisa la consola para más detalles sobre fallos (si los hubo).`;

        mostrarMensaje(`Envío masivo completado. Éxitos: ${resultado.exitos}, Fallidos: ${resultado.fallidos}`, resultado.fallidos > 0 ? 'warning' : 'success');
    } catch (err) {
        mostrarMensaje(`Error en el envío masivo: ${err.message}`, 'error');
        progressStatus.textContent = `Error crítico en el proceso`;
    } finally {
        document.getElementById('btn-buscar').disabled = false;
        actualizarContadorSeleccionados();
    }
}

async function descargarPDFsLocales() {
    const checkboxes = document.querySelectorAll('.usuario-checkbox:checked');
    const matriculas = Array.from(checkboxes).map(cb => Number(cb.value));

    if (matriculas.length === 0) return;

    try {
        mostrarMensaje('Selecciona la carpeta de destino...', 'info');
        const resultado = await ipcRenderer.invoke('generar-credenciales-locales', { matriculas });

        if (resultado.cancelado) {
            mostrarMensaje('Operación cancelada', 'info');
            return;
        }

        if (resultado.success) {
            mostrarMensaje(`PDFs generados con éxito: ${resultado.generados} guardados en ${resultado.ruta}`, 'success');
            alert(`¡Se generaron ${resultado.generados} credenciales en PDF exitosamente!\nCarpeta: ${resultado.ruta}`);
        } else {
            mostrarMensaje(`Error: ${resultado.error}`, 'error');
        }
    } catch (err) {
        mostrarMensaje(`Error al generar PDFs locales: ${err.message}`, 'error');
    }
}

function actualizarProgresoUI(data) {
    const progressStatus = document.getElementById('progress-status');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressDetail = document.getElementById('progress-detail');

    const porcentaje = Math.round((data.actual / data.total) * 100);
    progressStatus.textContent = `Procesando (${data.actual} / ${data.total}) - ${porcentaje}%`;
    progressBarFill.style.width = `${porcentaje}%`;

    if (data.estatus === 'exito') {
        progressDetail.textContent = `Enviado con éxito a: ${data.nombre} (${data.matricula})`;
        progressDetail.style.color = '#2e7d32';
    } else {
        progressDetail.textContent = `Error en ${data.matricula}: ${data.error}`;
        progressDetail.style.color = '#c62828';
    }
}

function mostrarMensaje(mensaje, tipo = 'info') {
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

    const colores = { success: '#4CAF50', error: '#f44336', warning: '#ff9800', info: '#2196F3' };
    mensajeDiv.style.backgroundColor = colores[tipo] || colores.info;
    mensajeDiv.textContent = mensaje;
    mensajeDiv.style.opacity = '1';
    setTimeout(() => { mensajeDiv.style.opacity = '0'; }, 4000);
}
