// tests/global-setup.js
const { setupTestDatabase } = require('./setup/db-test-setup');

/**
 * Configuración global que se ejecuta UNA VEZ antes de todas las pruebas
 */
module.exports = async function globalSetup() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     INICIANDO CONFIGURACIÓN GLOBAL DE PRUEBAS        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  try {
    // Configurar base de datos de pruebas
    await setupTestDatabase();
    
    // Establecer variable de entorno para modo test
    process.env.NODE_ENV = 'test';
    console.log('🔧 Variable NODE_ENV establecida a "test"\n');
    
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║     CONFIGURACIÓN GLOBAL COMPLETADA EXITOSAMENTE     ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n╔══════════════════════════════════════════════════════╗');
    console.error('║        ERROR EN CONFIGURACIÓN GLOBAL                 ║');
    console.error('╚══════════════════════════════════════════════════════╝\n');
    console.error('Error:', error);
    throw error;
  }
};