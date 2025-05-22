    // Navegación de los botones
    const { ipcRenderer } = require('electron');
    
    // Botón de volver
    document.getElementById('btn-regresar').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'administradoropciones');
    });

    document.getElementById('btn-recuperarqr').addEventListener('click', function() {
      // Lógica para regresar
      console.log('Regresando...');
    });

    document.getElementById('recuperarBtn').addEventListener('click', function() {
      // Lógica para recuperar QR
      console.log('Recuperando QR...');
    });