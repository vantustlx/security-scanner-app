const { ipcRenderer } = require('electron');

// Tipo de notificación -> [etiqueta, estilo]
const TIPOS = {
    REGISTRO_CONFIRMADO: ['Registro confirmado', 'success'],
    REGISTRO_RECHAZADO: ['Registro rechazado', 'warning'],
    REGISTRO_EXPIRADO: ['Solicitud vencida', 'warning'],
    REGISTRO_ERROR: ['Error en el registro', 'error'],
    ACCESO_MATRICULA_NO_ENCONTRADA: ['Matrícula no encontrada', 'error'],
    ACCESO_QR_INVALIDO: ['QR inválido', 'error'],
    ACCESO_USUARIO_SIN_SALIDA_HORARIO: ['Registro incompleto', 'warning']
};

function crearDetalle(etiqueta, valor) {
    const detalle = document.createElement('div');
    detalle.className = 'history-detail';
    const strong = document.createElement('strong');
    strong.textContent = etiqueta;
    const span = document.createElement('span');
    span.textContent = valor;
    detalle.append(strong, span);
    return detalle;
}

function crearItem(notificacion, indice) {
    const [etiqueta, estilo] = TIPOS[notificacion.tipo] || ['Acceso fallido', 'error'];
    const fecha = new Date(notificacion.fecha_hora);

    const item = document.createElement('div');
    item.className = `history-item ${estilo}${notificacion.leido ? '' : ' unread'}`;

    const titulo = document.createElement('div');
    titulo.className = 'history-title';
    titulo.textContent = `${indice}. ${notificacion.titulo}`;

    const mensaje = document.createElement('p');
    mensaje.textContent = notificacion.mensaje || `Matrícula / número de trabajador: ${notificacion.matricula}`;

    const detalles = document.createElement('div');
    detalles.className = 'history-details';
    detalles.append(
        crearDetalle('Hora', fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })),
        crearDetalle('Fecha', fecha.toLocaleDateString('es-MX')),
        crearDetalle('Tipo', etiqueta)
    );

    item.append(titulo, mensaje, detalles);
    return item;
}

async function cargarNotificaciones() {
    const lista = document.getElementById('lista-notificaciones');
    try {
        const { notificaciones, sinLeer } = await ipcRenderer.invoke('obtener-notificaciones');
        lista.innerHTML = '';
        if (!notificaciones.length) {
            lista.innerHTML = '<p class="history-empty">No hay notificaciones.</p>';
        }
        notificaciones.forEach((notificacion, i) => lista.appendChild(crearItem(notificacion, i + 1)));
        document.getElementById('btn-marcar-leidas').classList.toggle('disabled', sinLeer === 0);
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

// Se recarga sola cuando llega una confirmación de registro mientras está abierta
ipcRenderer.on('notificaciones-actualizadas', cargarNotificaciones);

document.addEventListener('DOMContentLoaded', cargarNotificaciones);
