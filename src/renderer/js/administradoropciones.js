const { ipcRenderer } = require('electron');

document.getElementById('btn-volver').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'index');
});

document.getElementById('view-all').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'notificaciones');
});

document.getElementById('login-card-recuperar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'recuperarqr');
});

document.getElementById('login-card-actualizar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'actualizardatospersonales');
});

document.addEventListener('DOMContentLoaded', function () {
    // Datos de ejemplo basados en tu imagen
    const failedAccessNotifications = [
        { id: '20233782', time: 'Hace 5 minutos', isNew: true },
        { id: '4032', time: 'Hace 15 minutos', isNew: true },
        { id: '38291', time: 'Hace 1 hora', isNew: true },
        { id: '3058', time: 'Hace 2 horas', isNew: true }
    ];

    const notificationsIcon = document.querySelector('.notification-icon');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const notificationList = document.querySelector('.notification-list');
    const notificationCount = document.querySelector('.notification-count');

    // Generar notificaciones
    function renderNotifications() {
        notificationList.innerHTML = '';
        let unreadCount = 0;

        failedAccessNotifications.forEach(notif => {
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item ${notif.isNew ? 'unread' : ''}`;
            notificationItem.innerHTML = `
                <div class="notification-content">
                    <p class="notification-message">Acceso fallido id: ${notif.id}</p>
                    <span class="notification-time">${notif.time}</span>
                </div>
            `;

            notificationItem.addEventListener('click', () => {
                // Aquí puedes agregar lógica para redirigir
                console.log(`Redirigiendo a detalles de acceso fallido: ${notif.id}`);
                notif.isNew = false;
                updateNotificationCount();
            });

            notificationList.appendChild(notificationItem);
            if (notif.isNew) unreadCount++;
        });

        notificationCount.textContent = unreadCount;
        notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

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