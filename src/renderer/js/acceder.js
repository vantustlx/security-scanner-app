document.addEventListener('DOMContentLoaded', function() {
    // Asegurar que el layout tenga altura completa
    const layout = document.querySelector('.layout');
    const vh = window.innerHeight;
    layout.style.minHeight = vh + 'px';

    // Asegurar que la onda inferior sea visible
    const bottomWave = document.querySelector('.backgroundwhite-bottom');
    bottomWave.style.display = 'block';

    // Navegación de los botones
    const { ipcRenderer } = require('electron');
    
    // Botón de volver
    document.getElementById('btn-volver-accs').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'index');
    });

    // Eventos para las tarjetas de acceso
    // El lector tiene su propia ventana siempre abierta: solo se trae al frente
    document.getElementById('qr-access').addEventListener('click', () => {
        ipcRenderer.send('mostrar-lector');
    });

    // Los accesos en vehículo los registran los lectores 2 y 3; aquí solo se asocian las placas.
    // Es una vista del administrador: el inicio pide su contraseña y después la abre.
    document.getElementById('vehicle-access').addEventListener('click', () => {
        try {
            sessionStorage.setItem('destinoAdmin', 'asociarplacasvehiculo');
        } catch (e) {
            // Sin sessionStorage, el inicio de sesión lleva al menú del administrador
        }
        ipcRenderer.send('navigate', 'index');
    });
});