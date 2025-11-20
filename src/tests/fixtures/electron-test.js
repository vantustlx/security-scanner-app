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
    console.log('🚀 Iniciando aplicación Electron para pruebas...');
    
    // Iniciar Electron con variables de entorno de prueba
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../main/main.js')], // Ruta corregida: sin src/ duplicado
      env: {
        ...process.env,
        NODE_ENV: 'test', // Asegurar que use BD de pruebas
      },
      // Opciones útiles para debugging
      // timeout: 30000,
      // executablePath: '/ruta/a/electron', // Si necesitas versión específica
    });

    console.log('✅ Aplicación Electron iniciada');

    // Esperar a que la ventana principal esté lista
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    console.log('✅ Ventana principal cargada');

    // Exponer la aplicación a las pruebas
    await use(electronApp);

    // Limpieza: cerrar la aplicación después de las pruebas
    console.log('🔄 Cerrando aplicación Electron...');
    await electronApp.close();
    console.log('✅ Aplicación cerrada\n');
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