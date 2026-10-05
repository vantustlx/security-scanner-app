const { ipcRenderer } = require('electron');

document.getElementById('btn-volver').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'index');
});

document.getElementById('view-all').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'notificaciones');
});

document.getElementById('lista').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'notificaciones');
}); 

document.getElementById('login-card-recuperar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'recuperarqr');
});

document.getElementById('login-card-actualizar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'actualizardatospersonales');
});

document.getElementById('login-card-buscar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'buscarusuariosactivos');
});

document.getElementById('login-card-generar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'generarreportes');
});

// "Hace 5 minutos", "Hace 2 horas"... para el menú de la campana
function tiempoRelativo(fecha) {
    const minutos = Math.round((Date.now() - new Date(fecha)) / 60000);
    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} minuto${minutos === 1 ? '' : 's'}`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `Hace ${horas} hora${horas === 1 ? '' : 's'}`;
    return new Date(fecha).toLocaleDateString('es-MX');
}

document.addEventListener('DOMContentLoaded', function () {
    const notificationsIcon = document.querySelector('.notification-icon');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const notificationList = document.querySelector('.notification-list');
    const notificationCount = document.querySelector('.notification-count');

    // Muestra las 5 notificaciones más recientes y el número de no leídas
    async function renderNotifications() {
        try {
            const { notificaciones, sinLeer } = await ipcRenderer.invoke('obtener-notificaciones', { limite: 5 });
            notificationList.innerHTML = '';

            notificaciones.forEach(notif => {
                const notificationItem = document.createElement('div');
                notificationItem.className = `notification-item ${notif.leido ? '' : 'unread'}`;
                const contenido = document.createElement('div');
                contenido.className = 'notification-content';
                const mensaje = document.createElement('p');
                mensaje.className = 'notification-message';
                mensaje.textContent = `${notif.titulo}: ${notif.matricula || ''}`;
                const tiempo = document.createElement('span');
                tiempo.className = 'notification-time';
                tiempo.textContent = tiempoRelativo(notif.fecha_hora);
                contenido.append(mensaje, tiempo);
                notificationItem.appendChild(contenido);
                notificationList.appendChild(notificationItem);
            });

            notificationCount.textContent = sinLeer;
            notificationCount.style.display = sinLeer > 0 ? 'flex' : 'none';
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
        }
    }

    // Llega una confirmación de registro mientras el administrador está en esta pantalla
    ipcRenderer.on('notificaciones-actualizadas', renderNotifications);

    // Mostrar/ocultar notificaciones
    notificationsIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        notificationsDropdown.classList.toggle('active');
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', function () {
        notificationsDropdown.classList.remove('active');
    });

    // Prevenir cierre al hacer clic dentro
    notificationsDropdown.addEventListener('click', function (e) {
        e.stopPropagation();
    });

    // Inicializar
    renderNotifications();
});