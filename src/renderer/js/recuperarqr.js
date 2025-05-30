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

    document.addEventListener('DOMContentLoaded', function() {
    const resultRows = document.querySelectorAll('.result-row');
    let selectedRow = null;
    
    resultRows.forEach(row => {
        const originalBgColor = row.style.backgroundColor || '#c1c1c1';
        
        row.addEventListener('mouseenter', function() {
            if (this !== selectedRow) {
                this.style.backgroundColor = '#D9D9D9';
            }
        });
        
        row.addEventListener('mouseleave', function() {
            if (this !== selectedRow) {
                this.style.backgroundColor = originalBgColor;
            }
        });
        
        row.addEventListener('click', function() {
            // Restaurar el color de la fila previamente seleccionada
            if (selectedRow) {
                selectedRow.style.backgroundColor = originalBgColor;
            }
            
            // Marcar nueva fila seleccionada
            selectedRow = this;
            this.style.backgroundColor = '#999999'; // Color aún más oscuro para selección
        });
    });
});