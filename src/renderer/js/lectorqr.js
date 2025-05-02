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
    document.getElementById('btn-volver-qr').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'acceder');
    });

    document.getElementById('img-qr').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'qrsuccess');
    });
});