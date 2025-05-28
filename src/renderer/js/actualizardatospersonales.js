    // Navegación de los botones
    const { ipcRenderer } = require('electron');
    
    // Botón de volver
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'administradoropciones');
    });
