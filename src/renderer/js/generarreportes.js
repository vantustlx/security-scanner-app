const ipcRenderer = require('electron').ipcRenderer;

document.getElementById('btn-volver').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'administradoropciones');
});

document.getElementById('grupodeusuarios').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'generarreportedegrupodeusuarios');
});

document.getElementById('usuarioespecifico').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'generarreporteusuarioespecifico');
});