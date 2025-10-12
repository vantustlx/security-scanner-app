// __mocks__/electron.js
const ipcMain = {
  on: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
  // Agrega otros métodos que uses de ipcMain
};

const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadFile: jest.fn(),
  webContents: {
    send: jest.fn(),
    on: jest.fn()
  },
  // Agrega otros métodos que uses de BrowserWindow
}));

module.exports = {
  ipcMain,
  BrowserWindow,
  app: {
    on: jest.fn(),
    whenReady: jest.fn().mockResolvedValue(),
    // Agrega otros métodos que uses de app
  },
  // Mock de otras APIs de Electron que uses
};