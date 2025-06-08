document.addEventListener('DOMContentLoaded', function () {
    // Asegurar que el layout tenga altura completa
    const layout = document.querySelector('.layout');
    const vh = window.innerHeight;
    layout.style.minHeight = vh + 'px';

    const { ipcRenderer } = require('electron');

    // Botón de volver
    document.getElementById('btn-volver-qr-sccs').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'index');
    });
});