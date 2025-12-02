// tests/e2e/registro-usuario.spec.js
const { test, expect } = require('../fixtures/electron-test');
const {
  getUsuarioValido,
  getUsuarioDuplicado,
  usuariosPrueba
} = require('../setup/test-data');
const { TestLogger } = require('../helpers/test-logger');

/**
 * CU-01: Registro de Usuario
 *
 * Pruebas funcionales para verificar:
 * - Registro exitoso con datos válidos
 * - Validación de matrícula duplicada
 * - Validaciones de campos (nombre, fecha, correo, matrícula, teléfono)
 * - Funcionalidad de botones
 */

const SUITE_NAME = 'CU-01: Registro de Usuario';

test.describe(SUITE_NAME, () => {

  test.beforeEach(async ({ page }) => {
    const logger = new TestLogger('Registro de Usuario');
    logger.setup('Preparando prueba de registro de usuario');

    // Asegurar que estamos en la página de registro
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#nombre', { timeout: 10000 });
    logger.navigate('registrarusuario.html - Carga completada');
  });

  test.afterEach(async ({ page }, testInfo) => {
    const logger = new TestLogger('Registro de Usuario');

    // Actualizar estadísticas globales
    TestLogger.updateSuiteStats(SUITE_NAME, testInfo.status);

    logger.teardown(`Prueba completada - Estado: ${testInfo.status}`);
  });

  test.afterAll(() => {
    TestLogger.suiteSummary(SUITE_NAME);
  });

  test.describe('Casos de éxito', () => {

    test('CP001: Debe registrar un usuario con todos los datos válidos', async ({ page }) => {
      const logger = new TestLogger('CP001');
      logger.testStart('CP001', 'Registro exitoso con todos los datos válidos');

      try {
        const usuario = getUsuarioValido();

        logger.action('Llenando formulario de registro');
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

        logger.step(`Datos ingresados - Matrícula: ${usuario.matricula}, Nombre: ${usuario.nombre}`);

        logger.action('Enviando formulario de registro');
        await page.click('#boton-verde');
        await page.waitForTimeout(3000);

        logger.verify('Verificando que no aparezca modal de error');
        const modal = page.locator('#modal-usuario-existente');
        const isModalActive = await modal.evaluate(el => el.classList.contains('active'));
        expect(isModalActive).toBe(false);
        logger.step('Modal de error no apareció');

        logger.pass('CP001', 'Usuario registrado exitosamente');
      } catch (error) {
        logger.fail('CP001', error.message);
        throw error;
      }
    });

    test('CP002: Debe registrar usuario con turno Vespertino', async ({ page }) => {
      const logger = new TestLogger('CP002');
      logger.testStart('CP002', 'Registro con turno Vespertino');

      try {
        const usuario = getUsuarioValido();

        logger.action('Llenando formulario con turno Vespertino');
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
        logger.step('Formulario llenado con turno Vespertino');

        logger.action('Registrando usuario');
        await page.click('#boton-verde');
        await page.waitForTimeout(3000);

        logger.verify('Verificando registro exitoso');
        const modal = page.locator('#modal-usuario-existente');
        const isModalActive = await modal.evaluate(el => el.classList.contains('active'));
        expect(isModalActive).toBe(false);

        logger.pass('CP002', 'Registro con turno Vespertino exitoso');
      } catch (error) {
        logger.fail('CP002', error.message);
        throw error;
      }
    });

    test('CP003: Debe registrar usuario con rol Docente', async ({ page }) => {
      const logger = new TestLogger('CP003');
      logger.testStart('CP003', 'Registro con rol Docente');

      try {
        const usuario = getUsuarioValido();

        logger.action('Llenando formulario con rol Docente');
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
        logger.step('Formulario llenado con rol Docente');

        logger.action('Registrando usuario');
        await page.click('#boton-verde');
        await page.waitForTimeout(3000);

        logger.verify('Verificando registro exitoso');
        const modal = page.locator('#modal-usuario-existente');
        const isModalActive = await modal.evaluate(el => el.classList.contains('active'));
        expect(isModalActive).toBe(false);

        logger.pass('CP003', 'Registro con rol Docente exitoso');
      } catch (error) {
        logger.fail('CP003', error.message);
        throw error;
      }
    });
  });

  test.describe('Casos de error - Matrícula duplicada', () => {

    test('CP004: Debe mostrar modal de error con matrícula duplicada', async ({ page }) => {
      const logger = new TestLogger('CP004');
      logger.testStart('CP004', 'Validación de matrícula duplicada');

      try {
        const usuario = getUsuarioDuplicado();

        logger.action('Llenando formulario con matrícula duplicada');
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

        logger.step(`Matrícula duplicada ingresada: ${usuario.matricula}`);

        logger.action('Intentando registrar usuario duplicado');
        await page.click('#boton-verde');
        await page.waitForTimeout(2000);

        logger.verify('Verificando que aparezca modal de error');
        const modal = page.locator('#modal-usuario-existente');
        await expect(modal).toHaveClass(/active/);
        logger.step('Modal de error apareció');

        logger.verify('Verificando mensaje de error');
        const mensaje = page.locator('#modal-usuario-existente p');
        await expect(mensaje).toHaveText('Usuario ya registrado intente cambiar los datos');
        logger.step('Mensaje de error correcto');

        logger.pass('CP004', 'Modal de error mostrado correctamente');
      } catch (error) {
        logger.fail('CP004', error.message);
        throw error;
      }
    });

    test('CP005: Debe limpiar formulario al cerrar modal de error', async ({ page }) => {
      const logger = new TestLogger('CP005');
      logger.testStart('CP005', 'Limpieza de formulario después de error');

      try {
        const usuario = getUsuarioDuplicado();

        logger.action('Llenando formulario con matrícula duplicada');
        await page.fill('#nombre', usuario.nombre);
        await page.fill('#apellidoP', usuario.apellidoP);
        await page.fill('#apellidoM', usuario.apellidoM);
        await page.fill('#fechaNacimiento', usuario.fechaNacimiento);
        await page.fill('#correo', usuario.correo);
        await page.fill('#matricula', usuario.matricula);
        await page.fill('#telefono', usuario.telefono);
        logger.step('Formulario llenado');

        logger.action('Intentando registrar y cerrando modal');
        await page.click('#boton-verde');
        await page.waitForTimeout(2000);
        await page.click('#btn-aceptar');
        await page.waitForTimeout(500);

        logger.verify('Verificando limpieza de campos');
        const nombreValue = await page.inputValue('#nombre');
        const apellidoPValue = await page.inputValue('#apellidoP');
        const correoValue = await page.inputValue('#correo');

        expect(nombreValue).toBe('');
        expect(apellidoPValue).toBe('');
        expect(correoValue).toBe('');
        logger.step('Todos los campos fueron limpiados');

        logger.pass('CP005', 'Formulario limpiado correctamente');
      } catch (error) {
        logger.fail('CP005', error.message);
        throw error;
      }
    });
  });

  test.describe('Validaciones de campos - Nombre', () => {

    test('CP006: Debe rechazar nombre con números', async ({ page }) => {
      const logger = new TestLogger('CP006');
      logger.testStart('CP006', 'Validación de nombre con números');

      try {
        logger.action('Llenando formulario con nombre inválido');
        const usuario = usuariosPrueba.nombreConNumeros;
        await llenarFormulario(page, usuario);
        logger.step(`Nombre con números ingresado: ${usuario.nombre}`);

        logger.action('Intentando registrar con nombre inválido');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorNombre = page.locator('#nombre + .error');
        await expect(errorNombre).toBeVisible();
        await expect(errorNombre).toContainText('nombre válido');
        logger.step('Error de validación mostrado correctamente');

        logger.pass('CP006', 'Validación de nombre funcionando');
      } catch (error) {
        logger.fail('CP006', error.message);
        throw error;
      }
    });

    test('CP007: Debe aceptar nombre con acentos', async ({ page }) => {
      const logger = new TestLogger('CP007');
      logger.testStart('CP007', 'Validación de nombre con acentos');

      try {
        const usuario = getUsuarioValido();
        usuario.nombre = 'José María';

        logger.action('Llenando formulario con nombre con acentos');
        await llenarFormulario(page, usuario);
        logger.step(`Nombre ingresado: ${usuario.nombre}`);

        logger.action('Registrando usuario');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando que no haya error de validación');
        const errorNombre = page.locator('#nombre + .error');
        const errorCount = await errorNombre.count();
        expect(errorCount).toBe(0);

        logger.pass('CP007', 'Nombres con acentos aceptados');
      } catch (error) {
        logger.fail('CP007', error.message);
        throw error;
      }
    });

    test('CP008: Debe aceptar nombre con ñ', async ({ page }) => {
      const logger = new TestLogger('CP008');
      logger.testStart('CP008', 'Validación de nombre con ñ');

      try {
        const usuario = getUsuarioValido();
        usuario.nombre = 'Nuño';

        logger.action('Llenando formulario con nombre con ñ');
        await llenarFormulario(page, usuario);
        logger.step(`Nombre ingresado: ${usuario.nombre}`);

        logger.action('Registrando usuario');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando que no haya error de validación');
        const errorNombre = page.locator('#nombre + .error');
        const errorCount = await errorNombre.count();
        expect(errorCount).toBe(0);

        logger.pass('CP008', 'Nombres con ñ aceptados');
      } catch (error) {
        logger.fail('CP008', error.message);
        throw error;
      }
    });
  });

  test.describe('Validaciones de campos - Fecha de nacimiento', () => {

    test('CP009: Debe rechazar edad menor a 5 años', async ({ page }) => {
      const logger = new TestLogger('CP009');
      logger.testStart('CP009', 'Validación edad mínima');

      try {
        logger.action('Llenando formulario con edad inválida (menor a 5 años)');
        const usuario = usuariosPrueba.edadMenor5;
        await llenarFormulario(page, usuario);
        logger.step('Formulario llenado con edad menor a 5 años');

        logger.action('Intentando registrar');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorFecha = page.locator('#fechaNacimiento + .error');
        await expect(errorFecha).toBeVisible();
        await expect(errorFecha).toContainText('entre 5 y 100 años');
        logger.step('Error de validación mostrado');

        logger.pass('CP009', 'Validación de edad mínima funcionando');
      } catch (error) {
        logger.fail('CP009', error.message);
        throw error;
      }
    });

    test('CP010: Debe rechazar edad mayor a 100 años', async ({ page }) => {
      const logger = new TestLogger('CP010');
      logger.testStart('CP010', 'Validación edad máxima');

      try {
        logger.action('Llenando formulario con edad inválida (mayor a 100 años)');
        const usuario = usuariosPrueba.edadMayor100;
        await llenarFormulario(page, usuario);
        logger.step('Formulario llenado con edad mayor a 100 años');

        logger.action('Intentando registrar');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorFecha = page.locator('#fechaNacimiento + .error');
        await expect(errorFecha).toBeVisible();
        await expect(errorFecha).toContainText('entre 5 y 100 años');
        logger.step('Error de validación mostrado');

        logger.pass('CP010', 'Validación de edad máxima funcionando');
      } catch (error) {
        logger.fail('CP010', error.message);
        throw error;
      }
    });
  });

  test.describe('Validaciones de campos - Correo electrónico', () => {

    test('CP011: Debe rechazar correo sin @', async ({ page }) => {
      const logger = new TestLogger('CP011');
      logger.testStart('CP011', 'Validación correo sin @');

      try {
        logger.action('Llenando formulario con correo inválido');
        const usuario = usuariosPrueba.correoInvalido;
        await llenarFormulario(page, usuario);
        logger.step(`Correo inválido ingresado: ${usuario.correo}`);

        logger.action('Intentando registrar');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorCorreo = page.locator('#correo + .error');
        await expect(errorCorreo).toBeVisible();
        await expect(errorCorreo).toContainText('correo válido');
        logger.step('Error de validación mostrado');

        logger.pass('CP011', 'Validación de correo funcionando');
      } catch (error) {
        logger.fail('CP011', error.message);
        throw error;
      }
    });

    test('CP012: Debe rechazar correo sin dominio', async ({ page }) => {
      const logger = new TestLogger('CP012');
      logger.testStart('CP012', 'Validación correo sin dominio');

      try {
        const usuario = getUsuarioValido();
        usuario.correo = 'usuario@';

        logger.action('Llenando formulario con correo sin dominio');
        await llenarFormulario(page, usuario);
        logger.step(`Correo ingresado: ${usuario.correo}`);

        logger.action('Intentando registrar');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorCorreo = page.locator('#correo + .error');
        await expect(errorCorreo).toBeVisible();

        logger.pass('CP012', 'Correo sin dominio rechazado');
      } catch (error) {
        logger.fail('CP012', error.message);
        throw error;
      }
    });
  });

  test.describe('Validaciones de campos - Matrícula', () => {

    test('CP013: Debe rechazar matrícula con menos de 8 dígitos', async ({ page }) => {
      const logger = new TestLogger('CP013');
      logger.testStart('CP013', 'Validación matrícula corta');

      try {
        logger.action('Llenando formulario con matrícula corta');
        const usuario = usuariosPrueba.matriculaCorta;
        await llenarFormulario(page, usuario);
        logger.step(`Matrícula ingresada: ${usuario.matricula} (${usuario.matricula.length} dígitos)`);

        logger.action('Intentando registrar');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorMatricula = page.locator('#matricula + .error');
        await expect(errorMatricula).toBeVisible();
        await expect(errorMatricula).toContainText('8 dígitos');
        logger.step('Error de validación mostrado');

        logger.pass('CP013', 'Matrícula corta rechazada');
      } catch (error) {
        logger.fail('CP013', error.message);
        throw error;
      }
    });

    test('CP014: Debe rechazar matrícula con más de 8 dígitos', async ({ page }) => {
      const logger = new TestLogger('CP014');
      logger.testStart('CP014', 'Validación matrícula larga');

      try {
        logger.action('Llenando formulario con matrícula larga');
        const usuario = usuariosPrueba.matriculaLarga;
        await llenarFormulario(page, usuario);
        logger.step(`Matrícula ingresada: ${usuario.matricula} (${usuario.matricula.length} dígitos)`);

        logger.action('Intentando registrar');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorMatricula = page.locator('#matricula + .error');
        await expect(errorMatricula).toBeVisible();
        await expect(errorMatricula).toContainText('8 dígitos');
        logger.step('Error de validación mostrado');

        logger.pass('CP014', 'Matrícula larga rechazada');
      } catch (error) {
        logger.fail('CP014', error.message);
        throw error;
      }
    });

    test('CP015: Debe rechazar matrícula con letras', async ({ page }) => {
      const logger = new TestLogger('CP015');
      logger.testStart('CP015', 'Validación matrícula con letras');

      try {
        logger.action('Llenando formulario con matrícula con letras');
        const usuario = usuariosPrueba.matriculaConLetras;
        await llenarFormulario(page, usuario);
        logger.step(`Matrícula ingresada: ${usuario.matricula}`);

        logger.action('Intentando registrar');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorMatricula = page.locator('#matricula + .error');
        await expect(errorMatricula).toBeVisible();
        logger.step('Error de validación mostrado');

        logger.pass('CP015', 'Matrícula con letras rechazada');
      } catch (error) {
        logger.fail('CP015', error.message);
        throw error;
      }
    });
  });

  test.describe('Validaciones de campos - Teléfono', () => {

    test('CP016: Debe rechazar teléfono con menos de 10 dígitos', async ({ page }) => {
      const logger = new TestLogger('CP016');
      logger.testStart('CP016', 'Validación teléfono corto');

      try {
        logger.action('Llenando formulario con teléfono corto');
        const usuario = usuariosPrueba.telefonoCorto;
        await llenarFormulario(page, usuario);
        logger.step(`Teléfono ingresado: ${usuario.telefono} (${usuario.telefono.length} dígitos)`);

        logger.action('Intentando registrar');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorTelefono = page.locator('#telefono + .error');
        await expect(errorTelefono).toBeVisible();
        await expect(errorTelefono).toContainText('entre 10 y 15 dígitos');
        logger.step('Error de validación mostrado');

        logger.pass('CP016', 'Teléfono corto rechazado');
      } catch (error) {
        logger.fail('CP016', error.message);
        throw error;
      }
    });

    test('CP017: Debe rechazar teléfono con letras', async ({ page }) => {
      const logger = new TestLogger('CP017');
      logger.testStart('CP017', 'Validación teléfono con letras');

      try {
        logger.action('Llenando formulario con teléfono con letras');
        const usuario = usuariosPrueba.telefonoConLetras;
        await llenarFormulario(page, usuario);
        logger.step(`Teléfono ingresado: ${usuario.telefono}`);

        logger.action('Intentando registrar');
        await page.click('#boton-verde');
        await page.waitForTimeout(500);

        logger.verify('Verificando mensaje de error de validación');
        const errorTelefono = page.locator('#telefono + .error');
        await expect(errorTelefono).toBeVisible();
        logger.step('Error de validación mostrado');

        logger.pass('CP017', 'Teléfono con letras rechazado');
      } catch (error) {
        logger.fail('CP017', error.message);
        throw error;
      }
    });
  });

  test.describe('Funcionalidad de botones', () => {

    test('CP018: Debe navegar de regreso con botón rojo', async ({ page }) => {
      const logger = new TestLogger('CP018');
      logger.testStart('CP018', 'Navegación con botón regresar');

      try {
        logger.action('Haciendo clic en botón regresar');
        await page.click('#boton-rojo');
        await page.waitForTimeout(1500);
        logger.step('Evento de navegación disparado');

        logger.pass('CP018', 'Navegación ejecutada correctamente');
      } catch (error) {
        logger.fail('CP018', error.message);
        throw error;
      }
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
