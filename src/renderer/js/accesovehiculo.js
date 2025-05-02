const { ipcRenderer } = require('electron');


document.getElementById('vehicle-access').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'accesovehiculo'); // carga accesovehiculo.html
});