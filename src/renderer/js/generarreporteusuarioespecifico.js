const { ipcRenderer } = require('electron');
let registrosEncontrados = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'generarreportes');
    });

    document.getElementById('btn-generar').addEventListener('click', buscarUsuario);
    // Enter avanza entre los campos; en el último genera el reporte
    UI.enterAvanza(document.querySelector('.formulario-filtros'), {
        alFinal: () => document.getElementById('btn-generar').click()
    });
    configurarFechas();
});

function configurarFechas() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').max = hoy;
    document.getElementById('fechaFin').max = hoy;
}

// Evita generar dos PDF por doble clic mientras se procesa el anterior
function procesando(activo) {
    document.getElementById('btn-generar').disabled = activo;
}

function buscarUsuario() {
    const nombre = document.querySelector('input[name="nombre"]').value.trim();
    const apellidoPaterno = document.querySelector('input[name="apellidoPaterno"]').value.trim();
    const apellidoMaterno = document.querySelector('input[name="apellidoMaterno"]').value.trim();
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    if (!nombre || !apellidoPaterno || !apellidoMaterno) {
        UI.notificar('Completa el nombre completo del usuario.', 'warning');
        return;
    }

    if (!fechaInicio || !fechaFin) {
        UI.notificar('Selecciona un rango de fechas.', 'warning');
        return;
    }

    procesando(true);
    ipcRenderer.send('buscar-usuario-especifico-reporte', {
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        fechaInicio,
        fechaFin,
    });
}

// 📥 Resultados de búsqueda
ipcRenderer.on('resultados-usuario-especifico', (event, resultados) => {
    if (resultados.length === 0) {
        procesando(false);
        UI.notificar('No se encontraron registros para ese usuario.', 'warning');
        return;
    }

    registrosEncontrados = resultados;

    const usuario = resultados[0];
    const rangoFechas = {
        fechaInicio: document.getElementById('fechaInicio').value,
        fechaFin: document.getElementById('fechaFin').value,
    };

    ipcRenderer.send('generar-pdf-usuario-especifico', {
        usuario,
        registros: resultados,
        rangoFechas,
    });
});

// 📤 Errores
ipcRenderer.on('busqueda-usuario-especifico-error', (event, error) => {
    procesando(false);
    UI.notificar(`❌ Error en búsqueda: ${error}`, 'error');
});

ipcRenderer.on('pdf-generado-exito', (event, mensaje) => {
    procesando(false);
    UI.notificar(`✅ ${mensaje}`, 'success');
});

ipcRenderer.on('pdf-generado-error', (event, error) => {
    procesando(false);
    UI.notificar(`❌ ${error}`, 'error');
});
