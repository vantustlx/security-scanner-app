const { ipcRenderer } = require('electron');


document.getElementById('asociar-huella').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'asociarhuella'); // carga acceder.html
});

document.getElementById('btn-volver-accs').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'acceder'); // carga acceder.html
});
