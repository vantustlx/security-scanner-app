const { ipcRenderer } = require('electron');


document.getElementById('asociar-placas').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'asociarplacasvehiculo'); // carga acceder.html
});

document.getElementById('vehicle-access').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'vehiculoqrlector'); // carga acceder.html
});

document.getElementById('btn-volver-accs').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'acceder'); // carga acceder.html
});
