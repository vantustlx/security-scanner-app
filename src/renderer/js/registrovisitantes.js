const { ipcRenderer } = require('electron');


document.getElementById('visitante-frecuente').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'registrovisitantefrecuente');
});

document.getElementById('visitante-temporal').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'registrovisitantetemporal');
});

document.getElementById('btn-volver-accs').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'registroguest');
});