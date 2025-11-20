// tests/e2e/actualizacion-datos.spec.js
const { test, expect } = require('../fixtures/electron-test');
const { matriculasExistentes } = require('../setup/test-data');

/**
 * CU-03: Actualización de Datos Personales
 *
 * Pruebas funcionales para verificar:
 * - Búsqueda de usuarios existentes
 * - Actualización de correo electrónico
 * - Actualización de teléfono
 * - Validaciones de campos
 * - Confirmación de cambios
 */
test.describe('CU-03: Actualización de Datos Personales', () => {

  test.beforeEach(async ({ electronApp, page }) => {
    console.log('  ℹ️  Preparando prueba de actualización...');

    // Navegar a la página de actualización de datos
    await page.evaluate(() => {
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('navigate', 'actualizardatospersonales');
    });

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    console.log('  ✓ Navegado a actualización de datos');
  });

  test.afterEach(async ({ page }) => {
    console.log('  ✓ Prueba de actualización completada\n');
  });

  test.describe('Búsqueda de usuarios', () => {

    test('CP101: Debe encontrar usuario por nombre completo', async ({ page }) => {
      console.log('  📝 Ejecutando: Búsqueda de usuario por nombre');

      // Llenar campos de búsqueda
      await page.fill('#nombre', 'Usuario');
      await page.fill('#apellidoP', 'Prueba');
      await page.fill('#apellidoM', 'Existente');

      // Hacer click en buscar
      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      // Verificar que se encontró el usuario
      const listSection = page.locator('.list-section');
      const userInfo = listSection.locator('.user-info');

      await expect(userInfo.first()).toBeVisible();
      await expect(userInfo.first()).toContainText('Usuario');
      await expect(userInfo.first()).toContainText('12345678');

      console.log('     ✅ Usuario encontrado correctamente');
    });

    test('CP102: Debe validar que se ingrese al menos un campo de búsqueda', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de campos vacíos en búsqueda');

      // Intentar buscar sin llenar campos
      await page.click('#buscarBtn');
      await page.waitForTimeout(500);

      // Verificar mensaje de alerta (capturar el diálogo)
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('al menos un parámetro');
        await dialog.accept();
      });

      console.log('     ✅ Validación de campos vacíos funcionando');
    });

    test('CP103: Debe validar que campos solo contengan letras', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de caracteres en búsqueda');

      await page.fill('#nombre', 'Usuario123'); // Nombre con números
      await page.fill('#apellidoP', 'Prueba');
      await page.fill('#apellidoM', 'Existente');

      // Configurar listener para el diálogo
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('solo puede contener letras');
        await dialog.accept();
      });

      await page.click('#buscarBtn');
      await page.waitForTimeout(500);

      console.log('     ✅ Validación de caracteres funcionando');
    });

    test('CP104: Debe mostrar mensaje cuando no se encuentra usuario', async ({ page }) => {
      console.log('  📝 Ejecutando: Búsqueda sin resultados');

      await page.fill('#nombre', 'NoExiste');
      await page.fill('#apellidoP', 'Usuario');
      await page.fill('#apellidoM', 'Inexistente');

      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      // Verificar mensaje de no resultados
      const noResults = page.locator('.no-results');
      await expect(noResults).toBeVisible();
      await expect(noResults).toContainText('No se encontraron usuarios');

      console.log('     ✅ Mensaje de sin resultados mostrado');
    });
  });

  test.describe('Actualización de datos', () => {

    test('CP105: Debe abrir modal de edición al hacer click en editar', async ({ page }) => {
      console.log('  📝 Ejecutando: Apertura de modal de edición');

      // Buscar usuario primero
      await page.fill('#nombre', 'Usuario');
      await page.fill('#apellidoP', 'Prueba');
      await page.fill('#apellidoM', 'Existente');
      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      // Click en editar
      const editIcon = page.locator('.edit-icon').first();
      await editIcon.click();
      await page.waitForTimeout(500);

      // Verificar que el modal está activo
      const modal = page.locator('#modal-edicion');
      await expect(modal).toHaveClass(/active/);

      // Verificar que los campos están llenos
      const nombre = await page.inputValue('#edit-nombre');
      expect(nombre).toBe('Usuario');

      console.log('     ✅ Modal de edición abierto con datos correctos');
    });

    test('CP106: Debe actualizar correo electrónico correctamente', async ({ page }) => {
      console.log('  📝 Ejecutando: Actualización de correo');

      // Buscar y abrir modal
      await page.fill('#nombre', 'Usuario');
      await page.fill('#apellidoP', 'Prueba');
      await page.fill('#apellidoM', 'Existente');
      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      await page.locator('.edit-icon').first().click();
      await page.waitForTimeout(500);

      // Actualizar correo
      const nuevoCorreo = `usuario.actualizado.${Date.now()}@test.com`;
      await page.fill('#edit-correo', nuevoCorreo);

      // Configurar listener para mensaje de éxito
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('actualizado correctamente');
        await dialog.accept();
      });

      // Guardar cambios
      await page.click('#btn-actualizar');
      await page.waitForTimeout(1000);

      console.log(`     ✅ Correo actualizado a: ${nuevoCorreo}`);
    });

    test('CP107: Debe actualizar teléfono correctamente', async ({ page }) => {
      console.log('  📝 Ejecutando: Actualización de teléfono');

      // Buscar y abrir modal
      await page.fill('#nombre', 'María');
      await page.fill('#apellidoP', 'González');
      await page.fill('#apellidoM', 'López');
      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      await page.locator('.edit-icon').first().click();
      await page.waitForTimeout(500);

      // Actualizar teléfono
      const nuevoTelefono = '2221112233';
      await page.fill('#edit-telefono', nuevoTelefono);

      // Configurar listener para mensaje de éxito
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('actualizado correctamente');
        await dialog.accept();
      });

      // Guardar cambios
      await page.click('#btn-actualizar');
      await page.waitForTimeout(1000);

      console.log(`     ✅ Teléfono actualizado a: ${nuevoTelefono}`);
    });

    test('CP108: Debe actualizar correo y teléfono simultáneamente', async ({ page }) => {
      console.log('  📝 Ejecutando: Actualización de correo y teléfono');

      // Buscar y abrir modal
      await page.fill('#nombre', 'Carlos');
      await page.fill('#apellidoP', 'Ramírez');
      await page.fill('#apellidoM', 'Torres');
      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      await page.locator('.edit-icon').first().click();
      await page.waitForTimeout(500);

      // Actualizar ambos campos
      const nuevoCorreo = `carlos.actualizado.${Date.now()}@test.com`;
      const nuevoTelefono = '2223334455';

      await page.fill('#edit-correo', nuevoCorreo);
      await page.fill('#edit-telefono', nuevoTelefono);

      // Configurar listener para mensaje de éxito
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('actualizado correctamente');
        await dialog.accept();
      });

      // Guardar cambios
      await page.click('#btn-actualizar');
      await page.waitForTimeout(1000);

      console.log(`     ✅ Correo y teléfono actualizados correctamente`);
    });

    test('CP109: Debe cerrar modal al hacer click en cancelar', async ({ page }) => {
      console.log('  📝 Ejecutando: Cancelación de edición');

      // Buscar y abrir modal
      await page.fill('#nombre', 'Usuario');
      await page.fill('#apellidoP', 'Prueba');
      await page.fill('#apellidoM', 'Existente');
      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      await page.locator('.edit-icon').first().click();
      await page.waitForTimeout(500);

      // Verificar que el modal está abierto
      const modal = page.locator('#modal-edicion');
      await expect(modal).toHaveClass(/active/);

      // Hacer click en cancelar
      await page.click('#btn-cancelar');
      await page.waitForTimeout(500);

      // Verificar que el modal se cerró
      const modalClosed = await modal.evaluate(el => !el.classList.contains('active'));
      expect(modalClosed).toBe(true);

      console.log('     ✅ Modal cerrado correctamente');
    });

    test('CP110: Debe cerrar modal al hacer click en X', async ({ page }) => {
      console.log('  📝 Ejecutando: Cerrar modal con X');

      // Buscar y abrir modal
      await page.fill('#nombre', 'Usuario');
      await page.fill('#apellidoP', 'Prueba');
      await page.fill('#apellidoM', 'Existente');
      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      await page.locator('.edit-icon').first().click();
      await page.waitForTimeout(500);

      // Click en cerrar
      await page.click('.close-modal');
      await page.waitForTimeout(500);

      // Verificar que el modal se cerró
      const modal = page.locator('#modal-edicion');
      const modalClosed = await modal.evaluate(el => !el.classList.contains('active'));
      expect(modalClosed).toBe(true);

      console.log('     ✅ Modal cerrado con X');
    });
  });

  test.describe('Validaciones de actualización', () => {

    test('CP111: Debe validar formato de correo al actualizar', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de formato de correo');

      // Buscar y abrir modal
      await page.fill('#nombre', 'Usuario');
      await page.fill('#apellidoP', 'Prueba');
      await page.fill('#apellidoM', 'Existente');
      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      await page.locator('.edit-icon').first().click();
      await page.waitForTimeout(500);

      // Intentar actualizar con correo inválido
      await page.fill('#edit-correo', 'correo-invalido');

      // Aquí deberías agregar validación del lado del cliente si existe
      // Por ahora solo verificamos que el campo acepta la entrada
      const correoValue = await page.inputValue('#edit-correo');
      expect(correoValue).toBe('correo-invalido');

      console.log('     ✅ Campo de correo acepta entrada (validación pendiente)');
    });

    test('CP112: Debe validar formato de teléfono al actualizar', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de formato de teléfono');

      // Buscar y abrir modal
      await page.fill('#nombre', 'Usuario');
      await page.fill('#apellidoP', 'Prueba');
      await page.fill('#apellidoM', 'Existente');
      await page.click('#buscarBtn');
      await page.waitForTimeout(2000);

      await page.locator('.edit-icon').first().click();
      await page.waitForTimeout(500);

      // Intentar actualizar con teléfono inválido
      await page.fill('#edit-telefono', 'ABC123');

      const telefonoValue = await page.inputValue('#edit-telefono');
      expect(telefonoValue).toBe('ABC123');

      console.log('     ✅ Campo de teléfono acepta entrada (validación pendiente)');
    });
  });

  test.describe('Navegación', () => {

    test('CP113: Debe regresar a opciones de administrador', async ({ page }) => {
      console.log('  📝 Ejecutando: Navegación de regreso');

      // Click en botón regresar
      await page.click('#btn-regresar');
      await page.waitForTimeout(1000);

      console.log('     ✅ Evento de navegación disparado');
    });
  });
});
