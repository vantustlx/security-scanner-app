const { ipcRenderer } = require('electron');


document.getElementById('registro-visitantes').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'registrovisitantes');
});

document.getElementById('guest-access').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'accesovisitantes');
});

document.getElementById('btn-volver-accs').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'index');
});