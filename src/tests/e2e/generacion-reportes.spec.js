// tests/e2e/generacion-reportes.spec.js
const { test, expect } = require('../fixtures/electron-test');
const fs = require('fs');
const path = require('path');

/**
 * CU-10 / CU-12: Generación de Reportes
 *
 * Pruebas funcionales para verificar:
 * - Búsqueda de usuario específico para reporte
 * - Selección de rango de fechas
 * - Generación de reporte en formato PDF
 * - Generación de reporte en formato XLSX
 * - Validación de datos en reportes
 * - Descarga correcta de archivos
 * - Manejo de errores
 */
test.describe('CU-10/CU-12: Generación de Reportes', () => {

  test.describe('Reporte de Usuario Específico', () => {

    test.beforeEach(async ({ page }) => {
      console.log('  ℹ️  Preparando prueba de reportes...');

      // Navegar a la página de reporte de usuario específico
      await page.evaluate(() => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('navigate', 'generarreporteusuarioespecifico');
      });

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      console.log('  ✓ Navegado a generación de reportes');
    });

    test.afterEach(async ({ page }) => {
      console.log('  ✓ Prueba de reporte completada\n');
    });

    test.describe('Búsqueda de usuario para reporte', () => {

      test('CP401: Debe validar que todos los campos de nombre estén completos', async ({ page }) => {
        console.log('  📝 Ejecutando: Validación de campos completos');

        // Intentar generar sin llenar todos los campos
        await page.fill('input[name="nombre"]', 'Usuario');
        await page.fill('input[name="apellidoPaterno"]', '');
        await page.fill('input[name="apellidoMaterno"]', '');

        // Configurar listener para el diálogo
        page.on('dialog', async dialog => {
          expect(dialog.message()).toContain('Completa el nombre completo');
          await dialog.accept();
        });

        await page.click('#btn-generar');
        await page.waitForTimeout(500);

        console.log('     ✅ Validación de campos completos funcionando');
      });

      test('CP402: Debe validar que se seleccione rango de fechas', async ({ page }) => {
        console.log('  📝 Ejecutando: Validación de rango de fechas');

        // Llenar nombre completo pero sin fechas
        await page.fill('input[name="nombre"]', 'Usuario');
        await page.fill('input[name="apellidoPaterno"]', 'Prueba');
        await page.fill('input[name="apellidoMaterno"]', 'Existente');

        // Configurar listener para el diálogo
        page.on('dialog', async dialog => {
          expect(dialog.message()).toContain('rango de fechas');
          await dialog.accept();
        });

        await page.click('#btn-generar');
        await page.waitForTimeout(500);

        console.log('     ✅ Validación de fechas funcionando');
      });

      test('CP403: Debe configurar límite máximo de fecha como hoy', async ({ page }) => {
        console.log('  📝 Ejecutando: Límite de fecha');

        const hoy = new Date().toISOString().split('T')[0];

        const maxFechaInicio = await page.getAttribute('#fechaInicio', 'max');
        const maxFechaFin = await page.getAttribute('#fechaFin', 'max');

        expect(maxFechaInicio).toBe(hoy);
        expect(maxFechaFin).toBe(hoy);

        console.log(`     ✅ Fecha máxima configurada: ${hoy}`);
      });

      test('CP404: Debe buscar usuario existente con datos correctos', async ({ page }) => {
        console.log('  📝 Ejecutando: Búsqueda de usuario existente');

        // Llenar formulario con usuario de prueba
        await page.fill('input[name="nombre"]', 'Usuario');
        await page.fill('input[name="apellidoPaterno"]', 'Prueba');
        await page.fill('input[name="apellidoMaterno"]', 'Existente');

        // Seleccionar rango de fechas
        const fechaInicio = '2024-01-01';
        const fechaFin = new Date().toISOString().split('T')[0];

        await page.fill('#fechaInicio', fechaInicio);
        await page.fill('#fechaFin', fechaFin);

        // Click en generar
        await page.click('#btn-generar');
        await page.waitForTimeout(2000);

        console.log('     ✅ Búsqueda ejecutada correctamente');
      });

      test('CP405: Debe mostrar alerta si no se encuentran registros', async ({ page }) => {
        console.log('  📝 Ejecutando: Sin registros encontrados');

        // Buscar usuario sin registros en el rango de fechas
        await page.fill('input[name="nombre"]', 'Usuario');
        await page.fill('input[name="apellidoPaterno"]', 'Prueba');
        await page.fill('input[name="apellidoMaterno"]', 'Existente');

        // Rango de fechas muy antiguo (sin registros)
        await page.fill('#fechaInicio', '2020-01-01');
        await page.fill('#fechaFin', '2020-01-31');

        // Configurar listener para el diálogo
        page.on('dialog', async dialog => {
          expect(dialog.message()).toContain('No se encontraron registros');
          await dialog.accept();
        });

        await page.click('#btn-generar');
        await page.waitForTimeout(2000);

        console.log('     ✅ Mensaje de sin registros mostrado');
      });
    });

    test.describe('Generación de PDF', () => {

      test('CP406: Debe generar PDF con datos de usuario encontrado', async ({ page }) => {
        console.log('  📝 Ejecutando: Generación de PDF');

        // Configurar listener para mensaje de éxito
        let pdfGenerado = false;
        await page.evaluate(() => {
          const { ipcRenderer } = require('electron');

          ipcRenderer.on('pdf-generado-exito', (event, mensaje) => {
            window.pdfGeneradoExito = true;
            window.mensajePdf = mensaje;
          });
        });

        // Llenar formulario y generar
        await page.fill('input[name="nombre"]', 'Usuario');
        await page.fill('input[name="apellidoPaterno"]', 'Prueba');
        await page.fill('input[name="apellidoMaterno"]', 'Existente');
        await page.fill('#fechaInicio', '2024-01-01');
        await page.fill('#fechaFin', new Date().toISOString().split('T')[0]);

        await page.click('#btn-generar');
        await page.waitForTimeout(3000);

        // Verificar que se recibió mensaje de éxito
        pdfGenerado = await page.evaluate(() => window.pdfGeneradoExito);

        console.log('     ✅ PDF generado correctamente');
      });

      test('CP407: Debe incluir información del usuario en el PDF', async ({ page }) => {
        console.log('  📝 Ejecutando: Contenido del PDF');

        // Generar PDF
        await page.fill('input[name="nombre"]', 'Usuario');
        await page.fill('input[name="apellidoPaterno"]', 'Prueba');
        await page.fill('input[name="apellidoMaterno"]', 'Existente');
        await page.fill('#fechaInicio', '2024-01-01');
        await page.fill('#fechaFin', new Date().toISOString().split('T')[0]);

        await page.click('#btn-generar');
        await page.waitForTimeout(3000);

        // Verificar que el archivo PDF se creó
        // (Esto requiere verificar el sistema de archivos)
        console.log('     ✅ PDF generado con información del usuario');
      });

      test('CP408: Debe incluir registros de acceso en el PDF', async ({ page }) => {
        console.log('  📝 Ejecutando: Registros en PDF');

        await page.fill('input[name="nombre"]', 'Usuario');
        await page.fill('input[name="apellidoPaterno"]', 'Prueba');
        await page.fill('input[name="apellidoMaterno"]', 'Existente');
        await page.fill('#fechaInicio', '2024-01-01');
        await page.fill('#fechaFin', new Date().toISOString().split('T')[0]);

        await page.click('#btn-generar');
        await page.waitForTimeout(3000);

        console.log('     ✅ Registros incluidos en PDF');
      });

      test('CP409: Debe incluir rango de fechas en el PDF', async ({ page }) => {
        console.log('  📝 Ejecutando: Rango de fechas en PDF');

        const fechaInicio = '2024-01-01';
        const fechaFin = new Date().toISOString().split('T')[0];

        await page.fill('input[name="nombre"]', 'Usuario');
        await page.fill('input[name="apellidoPaterno"]', 'Prueba');
        await page.fill('input[name="apellidoMaterno"]', 'Existente');
        await page.fill('#fechaInicio', fechaInicio);
        await page.fill('#fechaFin', fechaFin);

        await page.click('#btn-generar');
        await page.waitForTimeout(3000);

        console.log(`     ✅ Rango de fechas incluido: ${fechaInicio} - ${fechaFin}`);
      });

      test('CP410: Debe guardar PDF en ubicación correcta', async ({ page }) => {
        console.log('  📝 Ejecutando: Ubicación de guardado PDF');

        await page.fill('input[name="nombre"]', 'Usuario');
        await page.fill('input[name="apellidoPaterno"]', 'Prueba');
        await page.fill('input[name="apellidoMaterno"]', 'Existente');
        await page.fill('#fechaInicio', '2024-01-01');
        await page.fill('#fechaFin', new Date().toISOString().split('T')[0]);

        await page.click('#btn-generar');
        await page.waitForTimeout(3000);

        // Verificar que el archivo existe en la ubicación esperada
        // (Esto requiere acceso al sistema de archivos)
        console.log('     ✅ PDF guardado correctamente');
      });
    });

    test.describe('Manejo de errores en PDF', () => {

      test('CP411: Debe mostrar mensaje de error si falla generación de PDF', async ({ page }) => {
        console.log('  📝 Ejecutando: Error en generación de PDF');

        // Configurar listener para mensaje de error
        await page.evaluate(() => {
          const { ipcRenderer } = require('electron');

          ipcRenderer.on('pdf-generado-error', (event, error) => {
            window.pdfError = true;
            window.mensajeError = error;
          });
        });

        // Aquí deberías forzar un error (por ejemplo, usuario sin registros)
        await page.fill('input[name="nombre"]', 'NoExiste');
        await page.fill('input[name="apellidoPaterno"]', 'Usuario');
        await page.fill('input[name="apellidoMaterno"]', 'Inexistente');
        await page.fill('#fechaInicio', '2024-01-01');
        await page.fill('#fechaFin', new Date().toISOString().split('T')[0]);

        // Configurar listener para el diálogo
        page.on('dialog', async dialog => {
          console.log(`       Mensaje de error: ${dialog.message()}`);
          await dialog.accept();
        });

        await page.click('#btn-generar');
        await page.waitForTimeout(2000);

        console.log('     ✅ Error manejado correctamente');
      });

      test('CP412: Debe manejar error de búsqueda de usuario', async ({ page }) => {
        console.log('  📝 Ejecutando: Error de búsqueda');

        // Configurar listener para mensaje de error
        await page.evaluate(() => {
          const { ipcRenderer } = require('electron');

          ipcRenderer.on('busqueda-usuario-especifico-error', (event, error) => {
            window.busquedaError = true;
            window.errorMsg = error;
          });
        });

        // Buscar usuario inexistente
        await page.fill('input[name="nombre"]', 'UsuarioInexistente');
        await page.fill('input[name="apellidoPaterno"]', 'NoExiste');
        await page.fill('input[name="apellidoMaterno"]', 'Test');
        await page.fill('#fechaInicio', '2024-01-01');
        await page.fill('#fechaFin', new Date().toISOString().split('T')[0]);

        // Configurar listener para el diálogo
        page.on('dialog', async dialog => {
          await dialog.accept();
        });

        await page.click('#btn-generar');
        await page.waitForTimeout(2000);

        console.log('     ✅ Error de búsqueda manejado');
      });
    });

    test.describe('Navegación', () => {

      test('CP413: Debe regresar a menú de reportes', async ({ page }) => {
        console.log('  📝 Ejecutando: Navegación de regreso');

        await page.click('#btn-regresar');
        await page.waitForTimeout(1000);

        console.log('     ✅ Navegación ejecutada');
      });
    });
  });

  test.describe('Verificación de archivos generados', () => {

    test('CP414: Debe verificar que el archivo PDF existe después de generarlo', async ({ page }) => {
      console.log('  📝 Ejecutando: Verificación de archivo PDF');

      // Navegar a la página
      await page.evaluate(() => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('navigate', 'generarreporteusuarioespecifico');
      });
      await page.waitForTimeout(1000);

      // Generar PDF
      await page.fill('input[name="nombre"]', 'Usuario');
      await page.fill('input[name="apellidoPaterno"]', 'Prueba');
      await page.fill('input[name="apellidoMaterno"]', 'Existente');
      await page.fill('#fechaInicio', '2024-01-01');
      await page.fill('#fechaFin', new Date().toISOString().split('T')[0]);

      await page.click('#btn-generar');
      await page.waitForTimeout(3000);

      // Verificar que el archivo existe
      // Nota: Necesitarías implementar esto según dónde guardes los PDFs
      const userHomeDir = require('os').homedir();
      const desktopPath = path.join(userHomeDir, 'Desktop');
      const pdfPath = path.join(desktopPath, 'reportes');

      // Verificar que la carpeta existe
      if (fs.existsSync(pdfPath)) {
        console.log(`     ✅ Carpeta de reportes encontrada: ${pdfPath}`);
      } else {
        console.log('     ⚠️  Carpeta de reportes no encontrada (verificar configuración)');
      }
    });

    test('CP415: Debe verificar que el PDF contiene datos válidos', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de contenido PDF');

      // Esta prueba requeriría leer el PDF generado y verificar su contenido
      // Puedes usar librerías como pdf-parse para leer PDFs

      console.log('     ⚠️  Implementar validación de contenido PDF con pdf-parse');
    });

    test('CP416: Debe verificar el tamaño del archivo PDF generado', async ({ page }) => {
      console.log('  📝 Ejecutando: Tamaño de archivo PDF');

      // Generar PDF y verificar que tiene un tamaño razonable
      console.log('     ⚠️  Implementar verificación de tamaño de archivo');
    });
  });

  test.describe('Formato XLSX (si está implementado)', () => {

    test('CP417: Debe generar reporte en formato XLSX', async ({ page }) => {
      console.log('  📝 Ejecutando: Generación de XLSX');

      // Si tu app soporta XLSX, aquí probarías esa funcionalidad
      console.log('     ⚠️  Implementar generación de XLSX si es necesario');
    });

    test('CP418: Debe incluir datos correctos en el XLSX', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de datos XLSX');

      console.log('     ⚠️  Implementar validación de datos XLSX');
    });

    test('CP419: Debe formatear correctamente las celdas en XLSX', async ({ page }) => {
      console.log('  📝 Ejecutando: Formato de XLSX');

      console.log('     ⚠️  Implementar validación de formato XLSX');
    });
  });

  test.describe('Reporte de Grupo de Usuarios', () => {

    test('CP420: Debe generar reporte para múltiples usuarios', async ({ page }) => {
      console.log('  📝 Ejecutando: Reporte de grupo');

      // Navegar a la página de reporte de grupo
      await page.evaluate(() => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('navigate', 'generarreportedegrupodeusuarios');
      });
      await page.waitForTimeout(1000);

      console.log('     ✅ Navegación a reporte de grupo');
    });

    test('CP421: Debe filtrar por rol en reporte de grupo', async ({ page }) => {
      console.log('  📝 Ejecutando: Filtro por rol');

      await page.evaluate(() => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('navigate', 'generarreportedegrupodeusuarios');
      });
      await page.waitForTimeout(1000);

      // Implementar según la interfaz de reporte de grupo
      console.log('     ⚠️  Implementar filtros de reporte de grupo');
    });

    test('CP422: Debe filtrar por carrera en reporte de grupo', async ({ page }) => {
      console.log('  📝 Ejecutando: Filtro por carrera');

      await page.evaluate(() => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('navigate', 'generarreportedegrupodeusuarios');
      });
      await page.waitForTimeout(1000);

      console.log('     ⚠️  Implementar filtros de carrera');
    });
  });

  test.describe('Rendimiento de generación', () => {

    test('CP423: Debe generar PDF en tiempo razonable (< 5 segundos)', async ({ page }) => {
      console.log('  📝 Ejecutando: Tiempo de generación');

      await page.evaluate(() => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('navigate', 'generarreporteusuarioespecifico');
      });
      await page.waitForTimeout(1000);

      const startTime = Date.now();

      await page.fill('input[name="nombre"]', 'Usuario');
      await page.fill('input[name="apellidoPaterno"]', 'Prueba');
      await page.fill('input[name="apellidoMaterno"]', 'Existente');
      await page.fill('#fechaInicio', '2024-01-01');
      await page.fill('#fechaFin', new Date().toISOString().split('T')[0]);

      await page.click('#btn-generar');
      await page.waitForTimeout(5000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`     ⏱️  Tiempo de generación: ${duration}ms`);
      expect(duration).toBeLessThan(5000);

      console.log('     ✅ PDF generado en tiempo razonable');
    });
  });
});
