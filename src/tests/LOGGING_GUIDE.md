# Guía de Sistema de Logging para Pruebas

## Introducción

Se ha implementado un sistema de logging estructurado y claro para todas las pruebas funcionales del proyecto. Este sistema proporciona visibilidad completa del estado de cada caso de prueba.

## Estructura de Logs

### Formato de Salida

Cada prueba genera logs con el siguiente formato:

```
================================================================================
[TEST START] CP101: Búsqueda de usuario por nombre completo
================================================================================
  [ACTION] Llenando campos de búsqueda
  [STEP] Campos llenados: Usuario Prueba Existente
  [ACTION] Ejecutando búsqueda
  [VERIFY] Verificando resultados de búsqueda
  [STEP] Usuario encontrado en la lista
  [VERIFY] Datos del usuario correctos (Nombre: Usuario, Matrícula: 12345678)
  [PASS] CP101 - Usuario encontrado correctamente
  [DURATION] 2345ms
================================================================================
```

### Tipos de Logs

1. **[TEST START]** - Inicio de un caso de prueba
2. **[SETUP]** - Preparación de la prueba (beforeEach)
3. **[NAVIGATE]** - Navegación a una página
4. **[ACTION]** - Acción ejecutada en la prueba
5. **[STEP]** - Paso completado exitosamente
6. **[VERIFY]** - Verificación de condiciones
7. **[PASS]** - Prueba exitosa con mensaje de resultado
8. **[FAIL]** - Prueba fallida con detalles del error
9. **[DURATION]** - Tiempo de ejecución en milisegundos
10. **[TEARDOWN]** - Limpieza después de la prueba (afterEach)

### Resumen de Suite

Al finalizar cada suite de pruebas, se muestra un resumen:

```
################################################################################
[SUITE SUMMARY] CU-03: Actualización de Datos Personales
  Total: 13 | Passed: 11 | Failed: 2
  Success Rate: 84.62%
################################################################################
```

## Archivos Actualizados

### Archivos de Prueba

Los siguientes archivos han sido actualizados con el nuevo sistema de logging:

1. **actualizacion-datos.spec.js**
   - CU-03: Actualización de Datos Personales
   - 13 casos de prueba

2. **asociacion-huella.spec.js**
   - CU-18: Asociación de Huella Biométrica
   - Casos de prueba de selección de dedo y simulación

3. **autenticacion-qr.spec.js**
   - CU-04: Autenticación con QR
   - Casos de autenticación exitosa y fallida

4. **generacion-reportes.spec.js**
   - CU-10/CU-12: Generación de Reportes
   - Casos de búsqueda, validación y generación de PDF

### Helper de Logging

**Ubicación:** `src/tests/helpers/test-logger.js`

Esta clase proporciona métodos para logging estructurado:

```javascript
const logger = new TestLogger('CP101');

// Inicio de prueba
logger.testStart('CP101', 'Descripción de la prueba');

// Logs de ejecución
logger.action('Ejecutando acción');
logger.step('Paso completado');
logger.verify('Verificando condición');

// Resultado
logger.pass('CP101', 'Mensaje de éxito');
// o
logger.fail('CP101', 'Mensaje de error');
```

## Uso en Pruebas

### Ejemplo de Implementación

```javascript
test('CP101: Debe encontrar usuario', async ({ page }) => {
  const logger = new TestLogger('CP101');
  logger.testStart('CP101', 'Búsqueda de usuario por nombre');

  try {
    logger.action('Llenando campos de búsqueda');
    await page.fill('#nombre', 'Usuario');
    logger.step('Campos llenados correctamente');

    logger.action('Ejecutando búsqueda');
    await page.click('#buscarBtn');

    logger.verify('Verificando resultados');
    const userInfo = page.locator('.user-info');
    await expect(userInfo.first()).toBeVisible();
    logger.step('Usuario encontrado');

    logger.pass('CP101', 'Usuario encontrado correctamente');
  } catch (error) {
    logger.fail('CP101', error.message);
    throw error;
  }
});
```

### Hooks de Suite

Cada suite incluye hooks para estadísticas:

```javascript
let testStats = { passed: 0, failed: 0, total: 0 };

test.afterEach(async ({ page }, testInfo) => {
  const logger = new TestLogger('Suite Name');
  testStats.total++;

  if (testInfo.status === 'passed') {
    testStats.passed++;
  } else {
    testStats.failed++;
  }

  logger.teardown(`Prueba completada - Estado: ${testInfo.status}`);
});

test.afterAll(() => {
  TestLogger.suiteSummary('Suite Name', testStats.passed, testStats.failed, testStats.total);
});
```

## Beneficios

1. **Trazabilidad Completa**: Cada paso de la prueba está documentado
2. **Identificación Rápida de Fallos**: Los logs muestran exactamente dónde falló la prueba
3. **Métricas de Rendimiento**: Duración de cada prueba
4. **Resumen Ejecutivo**: Estadísticas por suite de pruebas
5. **Formato Consistente**: Todos los logs siguen el mismo formato
6. **Sin Emojis**: Logs compatibles con cualquier terminal

## Ejecución

Para ver los logs mejorados, ejecuta las pruebas:

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar en modo headed (con UI visible)
npm run test:headed

# Ejecutar con debug
npm run test:debug
```

## Ejemplo de Salida Completa

```
[FIXTURE] Iniciando aplicación Electron para pruebas...
[FIXTURE] Aplicación Electron iniciada
[FIXTURE] Ventana principal cargada
[SETUP] Preparando prueba de actualización de datos personales
[NAVIGATE] actualizardatospersonales.html - Carga completada

================================================================================
[TEST START] CP101: Búsqueda de usuario por nombre completo
================================================================================
  [ACTION] Llenando campos de búsqueda
  [STEP] Campos llenados: Usuario Prueba Existente
  [ACTION] Ejecutando búsqueda
  [VERIFY] Verificando resultados de búsqueda
  [STEP] Usuario encontrado en la lista
  [VERIFY] Datos del usuario correctos (Nombre: Usuario, Matrícula: 12345678)
  [PASS] CP101 - Usuario encontrado correctamente
  [DURATION] 2345ms
================================================================================

[TEARDOWN] Prueba completada - Estado: passed
[FIXTURE] Cerrando aplicación Electron...
[FIXTURE] Aplicación cerrada

################################################################################
[SUITE SUMMARY] CU-03: Actualización de Datos Personales
  Total: 13 | Passed: 13 | Failed: 0
  Success Rate: 100.00%
################################################################################
```
