const { ipcRenderer } = require('electron');


document.getElementById('boton-rojo').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'accederhuella');
});
