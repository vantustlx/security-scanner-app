document.addEventListener('DOMContentLoaded', function () {
    const { ipcRenderer } = require('electron');
  
    document.getElementById('btn-cancelar').addEventListener('click', () => {
      ipcRenderer.send('navigate', 'accederhuella');
    });
  });
  