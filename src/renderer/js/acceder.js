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
    document.getElementById('qr-access').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'qrlector');
    });

    document.getElementById('fingerprint-access').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'accederhuella');
    });

    document.getElementById('vehicle-access').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'opcionvehiculo');
    });
});