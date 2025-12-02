// tests/helpers/test-logger.js

/**
 * Almacenamiento global de estadísticas por suite
 */
const suiteStats = new Map();

/**
 * Helper para logging estructurado en pruebas
 */
class TestLogger {
  constructor(testName) {
    this.testName = testName;
    this.startTime = Date.now();
  }

  /**
   * Inicializa las estadísticas de una suite
   */
  static initSuite(suiteName) {
    if (!suiteStats.has(suiteName)) {
      suiteStats.set(suiteName, { passed: 0, failed: 0, total: 0 });
    }
    return suiteStats.get(suiteName);
  }

  /**
   * Actualiza las estadísticas de una suite
   */
  static updateSuiteStats(suiteName, status) {
    const stats = TestLogger.initSuite(suiteName);
    stats.total++;
    if (status === 'passed') {
      stats.passed++;
    } else if (status === 'failed') {
      stats.failed++;
    }
  }

  /**
   * Obtiene las estadísticas de una suite
   */
  static getSuiteStats(suiteName) {
    return TestLogger.initSuite(suiteName);
  }

  /**
   * Log de inicio de caso de prueba
   */
  testStart(caseId, description) {
    console.log('\n' + '='.repeat(80));
    console.log(`[TEST START] ${caseId}: ${description}`);
    console.log('='.repeat(80));
  }

  /**
   * Log de paso exitoso
   */
  step(message) {
    console.log(`  [STEP] ${message}`);
  }

  /**
   * Log de acción ejecutada
   */
  action(message) {
    console.log(`  [ACTION] ${message}`);
  }

  /**
   * Log de verificación
   */
  verify(message) {
    console.log(`  [VERIFY] ${message}`);
  }

  /**
   * Log de resultado exitoso
   */
  pass(caseId, message = '') {
    const duration = Date.now() - this.startTime;
    console.log(`  [PASS] ${caseId} ${message ? '- ' + message : ''}`);
    console.log(`  [DURATION] ${duration}ms`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Log de resultado fallido
   */
  fail(caseId, error) {
    const duration = Date.now() - this.startTime;
    console.log(`  [FAIL] ${caseId} - ${error}`);
    console.log(`  [DURATION] ${duration}ms`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Log de preparación de prueba
   */
  setup(message) {
    console.log(`[SETUP] ${message}`);
  }

  /**
   * Log de limpieza de prueba
   */
  teardown(message) {
    console.log(`[TEARDOWN] ${message}`);
  }

  /**
   * Log de navegación
   */
  navigate(destination) {
    console.log(`  [NAVIGATE] Navegando a: ${destination}`);
  }

  /**
   * Log de resumen de suite de pruebas
   */
  static suiteSummary(suiteName) {
    const stats = TestLogger.getSuiteStats(suiteName);
    const { passed, failed, total } = stats;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';

    console.log('\n' + '#'.repeat(80));
    console.log(`[SUITE SUMMARY] ${suiteName}`);
    console.log(`  Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`  Success Rate: ${successRate}%`);
    console.log('#'.repeat(80) + '\n');
  }

  /**
   * Resetea las estadísticas de una suite (útil para testing)
   */
  static resetSuiteStats(suiteName) {
    suiteStats.delete(suiteName);
  }
}

module.exports = { TestLogger };
