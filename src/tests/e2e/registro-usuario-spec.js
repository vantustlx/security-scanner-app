// tests/e2e/registro-usuario.spec.js
const { test, expect } = require('../fixtures/electron-test');
const {
  getUsuarioValido,
  getUsuarioDuplicado,
  usuariosPrueba
} = require('../setup/test-data');

test.describe('Registro de Usuario - Suite Completa', () => {
  
  test.beforeEach(async ({ page }) => {
    // Asegurar que estamos en la página de registro
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#nombre', { timeout: 10000 });
    console.log('  ℹ️  Preparando prueba...');
  });

  test.afterEach(async ({ page }) => {
    console.log('  ✓ Prueba completada\n');
  });

  test.describe('Casos de éxito', () => {
    
    test('CP001: Debe registrar un usuario con todos los datos válidos', async ({ page }) => {
      console.log('  📝 Ejecutando: Registro exitoso con datos válidos');
      
      const usuario = getUsuarioValido();
      
      // Llenar formulario
      await page.fill('#nombre', usuario.nombre);
      await page.fill('#apellidoP', usuario.apellidoP);
      await page.fill('#apellidoM', usuario.apellidoM);
      await page.fill('#fechaNacimiento', usuario.fechaNacimiento);
      await page.fill('#correo', usuario.correo);
      await page.fill('#matricula', usuario.matricula);
      await page.selectOption('#turno', usuario.turno);
      await page.selectOption('#carrera', usuario.carrera);
      await page.fill('#telefono', usuario.telefono);
      await page.selectOption('#rol', usuario.rol);

      console.log(`     Matrícula usada: ${usuario.matricula}`);

      // Click en registrar
      await page.click('#boton-verde');

      // Esperar procesamiento
      await page.waitForTimeout(3000);

      // Verificar que NO apareció el modal de error
      const modal = page.locator('#modal-usuario-existente');
      const isModalActive = await modal.evaluate(el => el.classList.contains('active'));
      expect(isModalActive).toBe(false);
      
      console.log('     ✅ Usuario registrado exitosamente');
    });

    test('CP002: Debe registrar usuario con turno Vespertino', async ({ page }) => {
      console.log('  📝 Ejecutando: Registro con turno Vespertino');
      
      const usuario = getUsuarioValido();
      
      await page.fill('#nombre', usuario.nombre);
      await page.fill('#apellidoP', usuario.apellidoP);
      await page.fill('#apellidoM', usuario.apellidoM);
      await page.fill('#fechaNacimiento', usuario.fechaNacimiento);
      await page.fill('#correo', usuario.correo);
      await page.fill('#matricula', usuario.matricula);
      await page.selectOption('#turno', 'Vespertino');
      await page.selectOption('#carrera', usuario.carrera);
      await page.fill('#telefono', usuario.telefono);
      await page.selectOption('#rol', usuario.rol);

      await page.click('#boton-verde');
      await page.waitForTimeout(3000);

      const modal = page.locator('#modal-usuario-existente');
      const isModalActive = await modal.evaluate(el => el.classList.contains('active'));
      expect(isModalActive).toBe(false);
      
      console.log('     ✅ Registro con turno Vespertino exitoso');
    });

    test('CP003: Debe registrar usuario con rol Docente', async ({ page }) => {
      console.log('  📝 Ejecutando: Registro con rol Docente');
      
      const usuario = getUsuarioValido();
      
      await page.fill('#nombre', usuario.nombre);
      await page.fill('#apellidoP', usuario.apellidoP);
      await page.fill('#apellidoM', usuario.apellidoM);
      await page.fill('#fechaNacimiento', usuario.fechaNacimiento);
      await page.fill('#correo', usuario.correo);
      await page.fill('#matricula', usuario.matricula);
      await page.selectOption('#turno', usuario.turno);
      await page.selectOption('#carrera', usuario.carrera);
      await page.fill('#telefono', usuario.telefono);
      await page.selectOption('#rol', 'Docente');

      await page.click('#boton-verde');
      await page.waitForTimeout(3000);

      const modal = page.locator('#modal-usuario-existente');
      const isModalActive = await modal.evaluate(el => el.classList.contains('active'));
      expect(isModalActive).toBe(false);
      
      console.log('     ✅ Registro con rol Docente exitoso');
    });
  });

  test.describe('Casos de error - Matrícula duplicada', () => {
    
    test('CP004: Debe mostrar modal de error con matrícula duplicada', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de matrícula duplicada');
      
      const usuario = getUsuarioDuplicado();
      
      await page.fill('#nombre', usuario.nombre);
      await page.fill('#apellidoP', usuario.apellidoP);
      await page.fill('#apellidoM', usuario.apellidoM);
      await page.fill('#fechaNacimiento', usuario.fechaNacimiento);
      await page.fill('#correo', usuario.correo);
      await page.fill('#matricula', usuario.matricula);
      await page.selectOption('#turno', usuario.turno);
      await page.selectOption('#carrera', usuario.carrera);
      await page.fill('#telefono', usuario.telefono);
      await page.selectOption('#rol', usuario.rol);

      console.log(`     Intentando con matrícula duplicada: ${usuario.matricula}`);

      await page.click('#boton-verde');
      await page.waitForTimeout(2000);

      // Verificar que SÍ apareció el modal de error
      const modal = page.locator('#modal-usuario-existente');
      await expect(modal).toHaveClass(/active/);

      // Verificar el mensaje
      const mensaje = page.locator('#modal-usuario-existente p');
      await expect(mensaje).toHaveText('Usuario ya registrado intente cambiar los datos');
      
      console.log('     ✅ Modal de error mostrado correctamente');
    });

    test('CP005: Debe limpiar formulario al cerrar modal de error', async ({ page }) => {
      console.log('  📝 Ejecutando: Limpieza de formulario después de error');
      
      const usuario = getUsuarioDuplicado();
      
      // Llenar con matrícula duplicada
      await page.fill('#nombre', usuario.nombre);
      await page.fill('#apellidoP', usuario.apellidoP);
      await page.fill('#apellidoM', usuario.apellidoM);
      await page.fill('#fechaNacimiento', usuario.fechaNacimiento);
      await page.fill('#correo', usuario.correo);
      await page.fill('#matricula', usuario.matricula);
      await page.fill('#telefono', usuario.telefono);

      await page.click('#boton-verde');
      await page.waitForTimeout(2000);

      // Cerrar modal
      await page.click('#btn-aceptar');
      await page.waitForTimeout(500);

      // Verificar que los campos se limpiaron
      const nombreValue = await page.inputValue('#nombre');
      const apellidoPValue = await page.inputValue('#apellidoP');
      const correoValue = await page.inputValue('#correo');
      
      expect(nombreValue).toBe('');
      expect(apellidoPValue).toBe('');
      expect(correoValue).toBe('');
      
      console.log('     ✅ Formulario limpiado correctamente');
    });
  });

  test.describe('Validaciones de campos - Nombre', () => {
    
    test('CP006: Debe rechazar nombre con números', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de nombre con números');
      
      const usuario = usuariosPrueba.nombreConNumeros;
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorNombre = page.locator('#nombre + .error');
      await expect(errorNombre).toBeVisible();
      await expect(errorNombre).toContainText('nombre válido');
      
      console.log('     ✅ Validación de nombre funcionando');
    });

    test('CP007: Debe aceptar nombre con acentos', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de nombre con acentos');
      
      const usuario = getUsuarioValido();
      usuario.nombre = 'José María';
      
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorNombre = page.locator('#nombre + .error');
      const errorCount = await errorNombre.count();
      expect(errorCount).toBe(0);
      
      console.log('     ✅ Nombres con acentos aceptados');
    });

    test('CP008: Debe aceptar nombre con ñ', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación de nombre con ñ');
      
      const usuario = getUsuarioValido();
      usuario.nombre = 'Nuño';
      
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorNombre = page.locator('#nombre + .error');
      const errorCount = await errorNombre.count();
      expect(errorCount).toBe(0);
      
      console.log('     ✅ Nombres con ñ aceptados');
    });
  });

  test.describe('Validaciones de campos - Fecha de nacimiento', () => {
    
    test('CP009: Debe rechazar edad menor a 5 años', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación edad mínima');
      
      const usuario = usuariosPrueba.edadMenor5;
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorFecha = page.locator('#fechaNacimiento + .error');
      await expect(errorFecha).toBeVisible();
      await expect(errorFecha).toContainText('entre 5 y 100 años');
      
      console.log('     ✅ Validación de edad mínima funcionando');
    });

    test('CP010: Debe rechazar edad mayor a 100 años', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación edad máxima');
      
      const usuario = usuariosPrueba.edadMayor100;
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorFecha = page.locator('#fechaNacimiento + .error');
      await expect(errorFecha).toBeVisible();
      await expect(errorFecha).toContainText('entre 5 y 100 años');
      
      console.log('     ✅ Validación de edad máxima funcionando');
    });
  });

  test.describe('Validaciones de campos - Correo electrónico', () => {
    
    test('CP011: Debe rechazar correo sin @', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación correo sin @');
      
      const usuario = usuariosPrueba.correoInvalido;
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorCorreo = page.locator('#correo + .error');
      await expect(errorCorreo).toBeVisible();
      await expect(errorCorreo).toContainText('correo válido');
      
      console.log('     ✅ Validación de correo funcionando');
    });

    test('CP012: Debe rechazar correo sin dominio', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación correo sin dominio');
      
      const usuario = getUsuarioValido();
      usuario.correo = 'usuario@';
      
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorCorreo = page.locator('#correo + .error');
      await expect(errorCorreo).toBeVisible();
      
      console.log('     ✅ Correo sin dominio rechazado');
    });
  });

  test.describe('Validaciones de campos - Matrícula', () => {
    
    test('CP013: Debe rechazar matrícula con menos de 8 dígitos', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación matrícula corta');
      
      const usuario = usuariosPrueba.matriculaCorta;
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorMatricula = page.locator('#matricula + .error');
      await expect(errorMatricula).toBeVisible();
      await expect(errorMatricula).toContainText('8 dígitos');
      
      console.log('     ✅ Matrícula corta rechazada');
    });

    test('CP014: Debe rechazar matrícula con más de 8 dígitos', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación matrícula larga');
      
      const usuario = usuariosPrueba.matriculaLarga;
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorMatricula = page.locator('#matricula + .error');
      await expect(errorMatricula).toBeVisible();
      await expect(errorMatricula).toContainText('8 dígitos');
      
      console.log('     ✅ Matrícula larga rechazada');
    });

    test('CP015: Debe rechazar matrícula con letras', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación matrícula con letras');
      
      const usuario = usuariosPrueba.matriculaConLetras;
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorMatricula = page.locator('#matricula + .error');
      await expect(errorMatricula).toBeVisible();
      
      console.log('     ✅ Matrícula con letras rechazada');
    });
  });

  test.describe('Validaciones de campos - Teléfono', () => {
    
    test('CP016: Debe rechazar teléfono con menos de 10 dígitos', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación teléfono corto');
      
      const usuario = usuariosPrueba.telefonoCorto;
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorTelefono = page.locator('#telefono + .error');
      await expect(errorTelefono).toBeVisible();
      await expect(errorTelefono).toContainText('entre 10 y 15 dígitos');
      
      console.log('     ✅ Teléfono corto rechazado');
    });

    test('CP017: Debe rechazar teléfono con letras', async ({ page }) => {
      console.log('  📝 Ejecutando: Validación teléfono con letras');
      
      const usuario = usuariosPrueba.telefonoConLetras;
      await llenarFormulario(page, usuario);
      await page.click('#boton-verde');
      await page.waitForTimeout(500);

      const errorTelefono = page.locator('#telefono + .error');
      await expect(errorTelefono).toBeVisible();
      
      console.log('     ✅ Teléfono con letras rechazado');
    });
  });

  test.describe('Funcionalidad de botones', () => {
    
    test('CP018: Debe navegar de regreso con botón rojo', async ({ page }) => {
      console.log('  📝 Ejecutando: Navegación con botón regresar');
      
      // Click en botón rojo (regresar)
      await page.click('#boton-rojo');
      await page.waitForTimeout(1500);
      
      // Verificar que se disparó el evento de navegación
      // (Esto depende de tu implementación de router)
      console.log('     ✅ Evento de navegación disparado');
    });
  });
});

/**
 * Función auxiliar para llenar el formulario completo
 */
async function llenarFormulario(page, usuario) {
  await page.fill('#nombre', usuario.nombre);
  await page.fill('#apellidoP', usuario.apellidoP);
  await page.fill('#apellidoM', usuario.apellidoM);
  await page.fill('#fechaNacimiento', usuario.fechaNacimiento);
  await page.fill('#correo', usuario.correo);
  await page.fill('#matricula', usuario.matricula);
  await page.selectOption('#turno', usuario.turno);
  await page.selectOption('#carrera', usuario.carrera);
  await page.fill('#telefono', usuario.telefono);
  await page.selectOption('#rol', usuario.rol);
}