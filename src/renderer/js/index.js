const { ipcRenderer } = require('electron');


document.getElementById('login-card-acceder').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'acceder'); // carga acceder.html
});

document.getElementById('login-card-visitantes').addEventListener('click', () => {
  ipcRenderer.send('navigate', 'registroguest'); // carga registroguest
});

document.getElementById('login-card-registro').addEventListener('click', () => {
    ipcRenderer.send('navigate', 'registrarusuario'); // carga registrarusuario.html
  });
