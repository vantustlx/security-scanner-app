const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    verificarMatricula: (codigo) => ipcRenderer.send('verificar-matricula', codigo)
});
