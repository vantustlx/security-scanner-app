// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './src/tests/e2e', // Solo buscar en carpeta e2e
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // IMPORTANTE: Solo 1 worker para Electron
  
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // Setup y teardown globales
  globalSetup: require.resolve('./src/tests/global-setup.js'),
  globalTeardown: require.resolve('./src/tests/global-teardown.js'),
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Agregar más tiempo para operaciones de BD
    actionTimeout: 10000,
  },

  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  // Configuración específica para Electron
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.js',
      testIgnore: ['**/__tests__/**', '**/*.test.js'], // Ignorar pruebas de Jest
    },
  ],
});