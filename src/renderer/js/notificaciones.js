const { ipcRenderer } = require('electron');

// Tipo de notificación -> [etiqueta, estilo]
const TIPOS = {
    REGISTRO_CONFIRMADO: ['Registro confirmado', 'success'],
    REGISTRO_RECHAZADO: ['Registro rechazado', 'warning'],
    REGISTRO_EXPIRADO: ['Solicitud vencida', 'warning'],
    REGISTRO_ERROR: ['Error en el registro', 'error'],
    ACCESO_INCONSISTENTE: ['Acceso inconsistente', 'warning'],
    CIERRE_DIARIO: ['Cierre del día', 'info'],
    ACCESO_MATRICULA_NO_ENCONTRADA: ['Matrícula no encontrada', 'error'],
    ACCESO_QR_INVALIDO: ['QR inválido', 'error'],
    ACCESO_QR_FALSIFICADO: ['QR con firma no válida', 'error'],
    ACCESO_QR_SIN_FIRMA: ['Credencial anterior (reenviar QR)', 'warning'],
    ACCESO_USUARIO_SIN_SALIDA_HORARIO: ['Registro incompleto', 'warning'],
    ACCESO_VISITANTE_NO_VALIDO: ['Folio de visitante no válido', 'error'],
    ACCESO_VISITANTE_VENCIDO: ['Pase de visitante vencido', 'warning']
};

const ICONOS = { success: 'fa-circle-check', warning: 'fa-triangle-exclamation', error: 'fa-circle-xmark', info: 'fa-circle-info' };

function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
}

function icono(clase) {
    return crear('i', `fas ${clase}`);
}

function crearItem(notificacion) {
    const [etiqueta, estilo] = TIPOS[notificacion.tipo] || ['Acceso fallido', 'error'];
    const fecha = new Date(notificacion.fecha_hora);

    const item = crear('div', `history-item ${estilo}${notificacion.leido ? '' : ' unread'}`);
    const circulo = crear('div', 'history-icono');
    circulo.appendChild(icono(ICONOS[estilo] || 'fa-bell'));

    const cuerpo = crear('div', 'history-cuerpo');
    const titulo = crear('h3', 'history-titulo', notificacion.titulo);
    if (!notificacion.leido) titulo.appendChild(crear('span', 'history-nuevo', 'Nuevo'));
    const mensaje = crear('p', 'history-mensaje',
        notificacion.mensaje || `Matrícula / número de trabajador: ${notificacion.matricula}`);

    const hora = crear('span');
    hora.append(icono('fa-clock'), fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
    const dia = crear('span');
    dia.append(icono('fa-calendar'), fecha.toLocaleDateString('es-MX'));
    const meta = crear('div', 'history-meta');
    meta.append(hora, dia, crear('span', 'history-tipo', etiqueta));
    cuerpo.append(titulo, mensaje, meta);

    // El cierre diario adjunta un PDF con quienes no registraron su salida
    if (notificacion.tieneArchivo) {
        const boton = crear('button', 'history-pdf', 'Ver PDF');
        boton.addEventListener('click', async () => {
            const resultado = await ipcRenderer.invoke('abrir-archivo-notificacion', notificacion.id);
            if (!resultado.ok) UI.notificar(`No se pudo abrir el PDF: ${resultado.error}`, 'error');
        });
        cuerpo.appendChild(boton);
    }

    const eliminar = crear('button', 'history-eliminar');
    eliminar.type = 'button';
    eliminar.title = 'Eliminar notificación';
    eliminar.setAttribute('aria-label', 'Eliminar notificación');
    eliminar.appendChild(icono('fa-xmark'));
    eliminar.addEventListener('click', async () => {
        eliminar.disabled = true;
        try {
            const resultado = await ipcRenderer.invoke('eliminar-notificacion', notificacion.id);
            if (!resultado.ok) throw new Error(resultado.error);
            // La lista se recarga con 'notificaciones-actualizadas'
        } catch (error) {
            eliminar.disabled = false;
            UI.notificar(`No se pudo eliminar: ${error.message}`, 'error');
        }
    });

    item.append(circulo, cuerpo, eliminar);
    return item;
}

let total = 0;

async function cargarNotificaciones() {
    const lista = document.getElementById('lista-notificaciones');
    try {
        const { notificaciones, sinLeer } = await ipcRenderer.invoke('obtener-notificaciones');
        total = notificaciones.length;
        lista.innerHTML = '';
        if (!notificaciones.length) {
            lista.innerHTML = '<p class="history-empty">No hay notificaciones.</p>';
        }
        notificaciones.forEach((notificacion) => lista.appendChild(crearItem(notificacion)));
        document.getElementById('btn-marcar-leidas').disabled = sinLeer === 0;
        document.getElementById('btn-limpiar').disabled = total === 0;
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
        lista.innerHTML = '<p class="history-empty">No se pudieron cargar las notificaciones.</p>';
    }
}

document.getElementById('btn-volver').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'administradoropciones');
});

document.getElementById('btn-marcar-leidas').addEventListener('click', async () => {
    await ipcRenderer.invoke('marcar-notificaciones-leidas');
    cargarNotificaciones();
});

// "Limpiar todo" pide confirmación: el borrado es definitivo
const modalLimpiar = document.getElementById('modal-limpiar');
document.getElementById('btn-limpiar').addEventListener('click', () => {
    document.getElementById('limpiar-texto').textContent =
        `Se eliminarán definitivamente las notificaciones mostradas, incluidos los intentos de acceso fallidos. ` +
        'Los PDF del cierre diario se conservan en su carpeta.';
    UI.abrirModal(modalLimpiar, { enfocar: document.getElementById('limpiar-cancelar') });
});
document.getElementById('limpiar-cancelar').addEventListener('click', () => UI.cerrarModal(modalLimpiar));
document.getElementById('limpiar-confirmar').addEventListener('click', async () => {
    const boton = document.getElementById('limpiar-confirmar');
    boton.disabled = true;
    try {
        await ipcRenderer.invoke('limpiar-notificaciones');
        UI.cerrarModal(modalLimpiar);
        UI.notificar('Se eliminaron todas las notificaciones', 'success');
    } catch (error) {
        UI.notificar(`No se pudieron eliminar: ${error.message}`, 'error');
    } finally {
        boton.disabled = false;
    }
});

// Se recarga sola cuando llega una confirmación de registro mientras está abierta
ipcRenderer.on('notificaciones-actualizadas', cargarNotificaciones);

document.addEventListener('DOMContentLoaded', cargarNotificaciones);
