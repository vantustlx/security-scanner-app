const { ipcRenderer } = require('electron');
let registrosEncontrados = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'generarreportes');
    });

    document.getElementById('btn-generar').addEventListener('click', buscarUsuario);
    configurarFechas();
});

function configurarFechas() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').max = hoy;
    document.getElementById('fechaFin').max = hoy;
}

function buscarUsuario() {
    const nombre = document.querySelector('input[name="nombre"]').value.trim();
    const apellidoPaterno = document.querySelector('input[name="apellidoPaterno"]').value.trim();
    const apellidoMaterno = document.querySelector('input[name="apellidoMaterno"]').value.trim();
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    if (!nombre || !apellidoPaterno || !apellidoMaterno) {
        alert('Completa el nombre completo del usuario.');
        return;
    }

    if (!fechaInicio || !fechaFin) {
        alert('Selecciona un rango de fechas.');
        return;
    }

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
        alert('No se encontraron registros para ese usuario.');
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
    alert(`❌ Error en búsqueda: ${error}`);
});

ipcRenderer.on('pdf-generado-exito', (event, mensaje) => {
    alert(`✅ ${mensaje}`);
});

ipcRenderer.on('pdf-generado-error', (event, error) => {
    alert(`❌ ${error}`);
});
