document.addEventListener('DOMContentLoaded', function () {
    const { ipcRenderer } = require('electron');
  
    document.getElementById('btn-aceptar').addEventListener('click', () => {
      ipcRenderer.send('navigate', 'index');
    });
  });
  