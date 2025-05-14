document.addEventListener('DOMContentLoaded', function () {
    // Asegurar que el layout tenga altura completa
    const layout = document.querySelector('.layout');
    const vh = window.innerHeight;
    layout.style.minHeight = vh + 'px';

    // Navegación de los botones
    const { ipcRenderer } = require('electron');

    const { ipcRenderer } = require('electron');

    ipcRenderer.on('matricula-a-waitconfirm', (event, matricula) => {
        console.log('Matrícula recibida:', matricula);
        // usarla en el DOM, etc.
    });

    // Botón de volver
    document.getElementById('btn-volver-qr-sccs').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'index');
    });
});