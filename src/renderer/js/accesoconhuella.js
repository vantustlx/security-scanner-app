document.addEventListener('DOMContentLoaded', function () {
    const { ipcRenderer } = require('electron');
  
    document.getElementById('btn-cancelar').addEventListener('click', () => {
      ipcRenderer.send('navigate', 'accederhuella');
    });
    document.getElementById('acesso-huella').addEventListener('click', () => {
      ipcRenderer.send('navigate', 'accesohuellaconfirm');
    });
  });
  