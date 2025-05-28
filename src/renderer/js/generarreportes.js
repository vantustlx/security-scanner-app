const ipcRenderer = require('electron').ipcRenderer;

document.getElementById('btn-volver').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'administradoropciones');
});