// tests/global-teardown.js
const { cleanTestDatabase } = require('./setup/db-test-setup');

/**
 * Limpieza global que se ejecuta UNA VEZ después de todas las pruebas
 */
module.exports = async function globalTeardown() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║        INICIANDO LIMPIEZA GLOBAL DE PRUEBAS          ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  try {
    // Limpiar datos de prueba de la base de datos
    await cleanTestDatabase();
    
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║        LIMPIEZA GLOBAL COMPLETADA EXITOSAMENTE       ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n╔══════════════════════════════════════════════════════╗');
    console.error('║           ERROR EN LIMPIEZA GLOBAL                   ║');
    console.error('╚══════════════════════════════════════════════════════╝\n');
    console.error('Error:', error);
    // No lanzar el error para que las pruebas puedan completarse
  }
};