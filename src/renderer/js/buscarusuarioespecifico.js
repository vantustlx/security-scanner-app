const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', function() {
    // Botón de regresar
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'buscarusuariosactivos');
    });
    
    // Botón de buscar
    document.querySelector('.btn-buscar').addEventListener('click', buscarUsuarioEspecifico);
    
    // Enter avanza entre los campos; en el último, busca
    UI.enterAvanza(document.querySelector('.formulario-filtros'), { alFinal: buscarUsuarioEspecifico });
    
    
    
    // Modal de entradas y salidas de hoy: se cierra con ×, Escape o clic fuera
    const modalAccesos = document.getElementById('modal-accesos');
    document.getElementById('accesos-cerrar').addEventListener('click', () => UI.cerrarModal(modalAccesos));
    modalAccesos.addEventListener('click', (e) => {
        if (e.target === modalAccesos) UI.cerrarModal(modalAccesos);
    });

    // Escuchar errores
    ipcRenderer.on('busqueda-especifica-error', (event, error) => {
        mostrarMensaje(`Error en la búsqueda: ${error}`, 'error');
        limpiarResultados();
    });
});

function buscarUsuarioEspecifico() {
    const nombre = document.querySelector('.form-field:nth-child(1) input').value.trim();
    const apellidoP = document.querySelector('.form-field:nth-child(2) input').value.trim();
    const apellidoM = document.querySelector('.form-field:nth-child(3) input').value.trim();
    
    // Validar que al menos un campo tenga contenido
    if (!nombre && !apellidoP && !apellidoM) {
        mostrarMensaje('Por favor, ingresa al menos un parámetro de búsqueda', 'warning');
        return;
    }
    
    // Enviar parámetros de búsqueda
    ipcRenderer.send('buscar-usuario-especifico', { nombre, apellidoP, apellidoM });
}

// Escuchar resultados de búsqueda
    ipcRenderer.on('resultados-usuario-especifico', (event, resultados) => {
        mostrarResultados(resultados);
    });

function mostrarResultados(usuarios) {
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '';
    
    if (!Array.isArray(usuarios) || usuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center;">No se encontraron usuarios con los criterios especificados</td>
            </tr>
        `;
        return;
    }
    
    usuarios.forEach(usuario => {
        const row = document.createElement('tr');
        row.title = 'Ver entradas y salidas de hoy';
        row.tabIndex = 0;
        [
            usuario.nombre,
            usuario.apellido_paterno,
            usuario.apellido_materno,
            usuario.matricula,
            usuario.numero_telefono,
            usuario.estatus,
            new Date(usuario.fecha_registro).toLocaleDateString('es-MX')
        ].forEach((valor) => {
            const celda = document.createElement('td');
            celda.textContent = valor ?? '';
            row.appendChild(celda);
        });

        // Último acceso de hoy; el resto se ve al dar clic
        const entrada = document.createElement('td');
        entrada.textContent = usuario.entrada_hoy ? formatoHora(usuario.entrada_hoy) : '—';
        if (usuario.accesos_hoy > 1) {
            const mas = document.createElement('span');
            mas.className = 'accesos-mas';
            mas.textContent = `+${usuario.accesos_hoy - 1} más`;
            entrada.appendChild(mas);
        }
        const salida = document.createElement('td');
        salida.textContent = usuario.entrada_hoy ? textoSalida(usuario.salida_hoy, usuario.cierre_hoy) : '—';
        row.append(entrada, salida);

        const abrir = () => mostrarAccesosDeHoy(usuario);
        row.addEventListener('click', abrir);
        row.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrir(); });
        tbody.appendChild(row);
    });
}

function formatoHora(fecha) {
    return new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// Sin salida: sigue dentro, o el sistema cerró la entrada al no registrarse la salida
function textoSalida(salida, cierreAutomatico) {
    if (salida) return formatoHora(salida);
    return cierreAutomatico ? 'Sin salida (cerrada)' : 'Dentro';
}

const MEDIOS = { PEATONAL: 'peatonal', VEHICULAR: 'vehicular' };

async function mostrarAccesosDeHoy(usuario) {
    const modal = document.getElementById('modal-accesos');
    const cuerpo = document.getElementById('accesos-cuerpo');
    document.getElementById('accesos-usuario').textContent =
        `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno} · Matrícula ${usuario.matricula} · ` +
        new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    cuerpo.innerHTML = '<tr><td colspan="3" class="accesos-vacio">Cargando…</td></tr>';
    UI.abrirModal(modal);

    let accesos;
    try {
        accesos = await ipcRenderer.invoke('accesos-de-hoy', usuario.matricula);
    } catch (err) {
        cuerpo.innerHTML = '<tr><td colspan="3" class="accesos-vacio">No se pudieron cargar los accesos</td></tr>';
        return;
    }
    cuerpo.innerHTML = '';
    if (!accesos.length) {
        cuerpo.innerHTML = '<tr><td colspan="3" class="accesos-vacio">Sin entradas ni salidas hoy</td></tr>';
        return;
    }
    accesos.forEach((acceso, i) => {
        const fila = document.createElement('tr');
        const conMedio = (texto, medio) => (medio ? `${texto} (${MEDIOS[medio] || medio})` : texto);
        [
            String(i + 1),
            conMedio(formatoHora(acceso.fecha_entrada), acceso.medio_entrada),
            acceso.fecha_salida
                ? conMedio(formatoHora(acceso.fecha_salida), acceso.medio_salida)
                : textoSalida(null, acceso.cierre_automatico)
        ].forEach((valor) => {
            const celda = document.createElement('td');
            celda.textContent = valor;
            fila.appendChild(celda);
        });
        cuerpo.appendChild(fila);
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