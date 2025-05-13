const { ipcRenderer } = require('electron');

document.getElementById('btn-volver').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'index');
});