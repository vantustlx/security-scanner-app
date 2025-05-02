const { ipcRenderer } = require('electron');


document.getElementById('asociar-placas').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'asociarplacasvehiculo'); // carga acceder.html
});
