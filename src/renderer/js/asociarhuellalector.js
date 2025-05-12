document.addEventListener('DOMContentLoaded', function () {
  const dedoElement = document.getElementById('dedo-actual');
    const dedos = ['Índice', 'Anular', 'Pulgar', 'Meñique', 'Corazón'];
    let indiceActual = 0;

    // Agregar el evento click al h1
    document.getElementById('dedos').addEventListener('click', function() {
        // Incrementar el índice y volver a 0 si supera la longitud del array
        indiceActual = (indiceActual + 1) % dedos.length;
        dedoElement.textContent = dedos[indiceActual];
    });

  const { ipcRenderer } = require('electron');

  document.getElementById('btn-cancelar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'accederhuella');
  });
  document.getElementById('huella-scan').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'asociacionexitosa');
  });
});

