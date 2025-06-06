const { ipcRenderer } = require('electron');

document.getElementById('btn-volver').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'administradoropciones');
});

document.addEventListener('DOMContentLoaded', function() {
    // Botón de marcar como leído
    const markAllReadButton = document.querySelector('.delete-button');
    const notifications = document.querySelectorAll('.history-item');

     markAllReadButton.addEventListener('click', function() {
        notifications.forEach(item => {
            item.style.backgroundColor = '#f6f8fa'; // Cambia este valor al color que prefieras
        });
        markAllReadButton.disabled = true;
     });
});

/*async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications');
        const notifications = await response.json();

        const notificationList = document.querySelector('.notification-list');
        notificationList.innerHTML = '';

        notifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notification-item ${notif.unread ? 'unread' : ''}`;
            item.dataset.id = notif.id;
            item.dataset.type = notif.type;

            // Configura el icono según el tipo
            const iconClass = notif.type === 'warning' ? 'warning' : 'error';
            const icon = notif.type === 'warning' ? 'exclamation-circle' : 'times-circle';

            item.innerHTML = `
                <div class="notification-icon ${iconClass}"><i class="fas fa-${icon}"></i></div>
                <div class="notification-content">
                    <p class="notification-title">${notif.title}</p>
                    <p class="notification-detail">${notif.details} • ${notif.time} • ${notif.date}</p>
                </div>
            `;

            notificationList.appendChild(item);
        });

        // Actualizar contador
        const unreadCount = notifications.filter(n => n.unread).length;
        document.querySelector('.notification-count').textContent = unreadCount;

    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}*/