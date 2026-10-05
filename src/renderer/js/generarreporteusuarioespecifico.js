const { ipcRenderer } = require('electron');

// Persona elegida en la lista de coincidencias; el reporte se genera por su matrícula
let usuarioSeleccionado = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'generarreportes');
    });

    document.getElementById('btn-buscar').addEventListener('click', buscarUsuarios);
    document.getElementById('btn-generar').addEventListener('click', generarReporte);

    // Basta un campo para buscar: Enter busca desde cualquiera de ellos
    document.getElementById('filtros').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('input')) {
            e.preventDefault();
            buscarUsuarios();
        }
    });
    UI.enterAvanza(document.getElementById('fechas'), { alFinal: generarReporte });
    configurarFechas();
});

function configurarFechas() {
    const hoy = new Date().toLocaleDateString('en-CA');
    document.getElementById('fechaInicio').max = hoy;
    document.getElementById('fechaFin').max = hoy;
}

const valor = (nombre) => document.querySelector(`#filtros input[name="${nombre}"]`).value.trim();

async function buscarUsuarios() {
    const filtros = {
        nombre: valor('nombre'),
        apellidoPaterno: valor('apellidoPaterno'),
        apellidoMaterno: valor('apellidoMaterno'),
        matricula: valor('matricula')
    };
    if (!Object.values(filtros).some(Boolean)) {
        UI.notificar('Escribe al menos un nombre, apellido o matrícula.', 'warning');
        return;
    }
    if (filtros.matricula && !/^\d+$/.test(filtros.matricula)) {
        UI.notificar('La matrícula solo lleva números.', 'warning');
        return;
    }

    const boton = document.getElementById('btn-buscar');
    boton.disabled = true;
    try {
        mostrarCandidatos(await ipcRenderer.invoke('buscar-usuarios-reporte', filtros));
    } catch (error) {
        UI.notificar(`Error en la búsqueda: ${error.message}`, 'error');
    } finally {
        boton.disabled = false;
    }
}

function areaPrincipal(areas = []) {
    const principal = areas.find((a) => a.principal) || areas[0];
    if (!principal) return '—';
    return areas.length > 1 ? `${principal.area} (+${areas.length - 1})` : principal.area;
}

function mostrarCandidatos(usuarios) {
    const cuerpo = document.getElementById('candidatos');
    cuerpo.innerHTML = '';
    seleccionar(null);
    document.getElementById('resultados').hidden = false;
    document.getElementById('resultados-titulo').textContent = usuarios.length
        ? `${usuarios.length === 100 ? 'Más de 99' : usuarios.length} coincidencia(s). Da clic en la persona para generar su reporte.`
        : 'No se encontraron usuarios con esos datos.';

    usuarios.forEach((usuario) => {
        const fila = document.createElement('tr');
        fila.tabIndex = 0;
        [
            [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' '),
            usuario.matricula,
            areaPrincipal(usuario.areas),
            usuario.correo || '—',
            usuario.placas || '—',
            usuario.estatus
        ].forEach((texto) => {
            const celda = document.createElement('td');
            celda.textContent = texto ?? '';
            fila.appendChild(celda);
        });
        const elegir = () => seleccionar(usuario, fila);
        fila.addEventListener('click', elegir);
        fila.addEventListener('keydown', (e) => { if (e.key === 'Enter') elegir(); });
        cuerpo.appendChild(fila);
    });

    // Con una sola coincidencia se elige sola; el reporte se genera hasta dar clic en el botón
    if (usuarios.length === 1) seleccionar(usuarios[0], cuerpo.firstElementChild);
}

function seleccionar(usuario, fila) {
    usuarioSeleccionado = usuario;
    document.querySelectorAll('#candidatos tr.seleccionada').forEach((f) => f.classList.remove('seleccionada'));
    const panel = document.getElementById('panel-reporte');
    panel.hidden = !usuario;
    if (!usuario) return;
    fila.classList.add('seleccionada');
    document.getElementById('seleccionado').textContent =
        `${[usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' ')} (matrícula ${usuario.matricula})`;
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// Evita generar dos PDF por doble clic mientras se procesa el anterior
function procesando(activo) {
    document.getElementById('btn-generar').disabled = activo;
}

async function generarReporte() {
    if (!usuarioSeleccionado) {
        UI.notificar('Primero elige a la persona en la lista.', 'warning');
        return;
    }
    const rangoFechas = {
        fechaInicio: document.getElementById('fechaInicio').value,
        fechaFin: document.getElementById('fechaFin').value
    };
    if (rangoFechas.fechaInicio && rangoFechas.fechaFin && rangoFechas.fechaInicio > rangoFechas.fechaFin) {
        UI.notificar('La fecha de inicio no puede ser posterior a la fecha fin.', 'warning');
        return;
    }

    procesando(true);
    try {
        const { usuario, registros } = await ipcRenderer.invoke('datos-reporte-usuario', {
            matricula: usuarioSeleccionado.matricula,
            ...rangoFechas
        });
        // Sin accesos también se genera: el PDF sirve como constancia
        ipcRenderer.send('generar-pdf-usuario-especifico', { usuario, registros, rangoFechas });
    } catch (error) {
        procesando(false);
        UI.notificar(`Error al obtener los accesos: ${error.message}`, 'error');
    }
}

ipcRenderer.on('pdf-generado-exito', (event, mensaje) => {
    procesando(false);
    UI.notificar(`✅ ${mensaje}`, 'success');
});

ipcRenderer.on('pdf-generado-error', (event, error) => {
    procesando(false);
    UI.notificar(`❌ ${error}`, 'error');
});
