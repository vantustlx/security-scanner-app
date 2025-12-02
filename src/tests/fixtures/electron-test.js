// tests/fixtures/electron-test.js
const { test: base, _electron: electron } = require('@playwright/test');
const path = require('path');

/**
 * Fixture personalizado para pruebas de Electron con base de datos de pruebas
 */
exports.test = base.extend({
  /**
   * Inicia la aplicación Electron en modo test
   */
  electronApp: async ({}, use) => {
    console.log('[FIXTURE] Iniciando aplicación Electron para pruebas...');

    let electronApp;
    try {
      // Iniciar Electron con variables de entorno de prueba
      electronApp = await electron.launch({
        args: [path.join(__dirname, '../../main/main.js')],
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
        timeout: 30000,
      });

      console.log('[FIXTURE] Aplicación Electron iniciada');

      // Esperar a que la ventana principal esté lista
      const window = await electronApp.firstWindow();
      await window.waitForLoadState('domcontentloaded');
      console.log('[FIXTURE] Ventana principal cargada');

      // Exponer la aplicación a las pruebas
      await use(electronApp);

    } catch (error) {
      console.error('[FIXTURE] Error al iniciar Electron:', error);
      throw error;
    } finally {
      // Limpieza: cerrar la aplicación después de las pruebas
      if (electronApp) {
        try {
          console.log('[FIXTURE] Cerrando aplicación Electron...');
          await electronApp.close();
          console.log('[FIXTURE] Aplicación cerrada\n');
        } catch (closeError) {
          console.error('[FIXTURE] Error al cerrar aplicación:', closeError);
        }
      }
    }
  },

  /**
   * Proporciona acceso directo a la ventana principal
   */
  page: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    await use(window);
  },

  /**
   * Proporciona acceso al contexto de Electron para pruebas IPC
   */
  context: async ({ electronApp }, use) => {
    await use(electronApp.context());
  }
});

exports.expect = base.expect;