const { ipcRenderer } = require('electron');


document.getElementById('registro-visitantes').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'registrovisitantes');
});

document.getElementById('btn-volver-accs').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'index');
});
