document.addEventListener('DOMContentLoaded', function () {
    const layout = document.querySelector('.layout');
    const vh = window.innerHeight;
    layout.style.minHeight = vh + 'px';

    const { ipcRenderer } = require('electron');

    // Cancelar
    document.getElementById('btn-volver-qr-sccs').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'registrarusuario');
    });

    // Mostrar modal con PDF
    document.getElementById('btn-ver-terminos').addEventListener('click', () => {
        document.getElementById('pdf-modal').classList.remove('hidden');
    });

    // Ocultar modal al cerrar
    document.getElementById('close-pdf-modal').addEventListener('click', () => {
        document.getElementById('pdf-modal').classList.add('hidden');
    });

    // Aceptar
    document.getElementById('btn-acept-qr-sccs').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'registroexitoso');
    });
});
