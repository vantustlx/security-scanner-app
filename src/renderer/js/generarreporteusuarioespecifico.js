const ipcRenderer = require('electron').ipcRenderer;

document.getElementById('btn-regresar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'generarreportes');
});

document.getElementById('usuarioespecifico').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'generarreporte');
});
