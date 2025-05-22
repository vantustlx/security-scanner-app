const { ipcRenderer } = require('electron');

document.getElementById('btn-volver').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'index');
});

document.getElementById('login-card-recuperar').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'recuperarqr');
});