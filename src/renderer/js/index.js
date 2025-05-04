const { ipcRenderer } = require('electron');


document.getElementById('login-card-acceder').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'acceder'); // carga acceder.html
});

document.getElementById('login-card-registro').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'registrarusuario'); // carga registrarusuario.html
  });


  
document.getElementById('login-card-registro').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'registrarusuario'); // carga registrarusuario.html
});