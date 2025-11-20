# Pruebas Funcionales - Sistema de Acceso a Facultad

Este directorio contiene todas las pruebas funcionales automatizadas del sistema, organizadas por casos de uso.

## 📋 Casos de Uso Cubiertos

### ✅ CU-01: Registro de Usuario
**Archivo:** `e2e/registro-usuario-spec.js`

Pruebas incluidas:
- Validación de campos obligatorios (nombre, apellidos, correo, matrícula, teléfono)
- Registro exitoso con datos válidos
- Detección de usuarios duplicados
- Validación de formato de correo electrónico
- Validación de edad (5-100 años)
- Validación de matrícula (8 dígitos)
- Validación de teléfono (10-15 dígitos)
- Limpieza de formulario después de error
- Navegación entre pantallas

**Total de casos de prueba:** 18

---

### ✅ CU-03: Actualización de Datos Personales
**Archivo:** `e2e/actualizacion-datos.spec.js`

Pruebas incluidas:
- Búsqueda de usuarios por nombre completo
- Validación de campos de búsqueda
- Apertura de modal de edición
- Actualización de correo electrónico
- Actualización de teléfono
- Actualización simultánea de múltiples campos
- Cancelación de edición
- Validación de formatos al actualizar

**Total de casos de prueba:** 13

---

### ✅ CU-04: Autenticación con QR
**Archivo:** `e2e/autenticacion-qr.spec.js`

Pruebas incluidas:
- Autenticación con QR válido
- Registro de acceso en base de datos
- Rechazo de QR con matrícula inexistente
- Rechazo de QR con formato inválido
- Rechazo de usuarios inactivos
- Inicialización de cámara QR
- Procesamiento de múltiples escaneos
- Comunicación con backend (IPC)

**Total de casos de prueba:** 15

---

### ✅ CU-18: Asociación de Huella Biométrica
**Archivo:** `e2e/asociacion-huella.spec.js`

Pruebas incluidas:
- Interfaz de selección de dedo
- Rotación entre dedos (Pulgar, Índice, Medio, Anular, Meñique)
- **Mock del lector biométrico** (simulación sin hardware)
  - Lectura exitosa de huella
  - Simulación de error de calidad
  - Simulación de error de conexión
  - Simulación de timeout
- Reintentos después de error
- Cancelación del proceso
- Flujo completo de asociación

**Total de casos de prueba:** 25

---

### ✅ CU-10/CU-12: Generación de Reportes
**Archivo:** `e2e/generacion-reportes.spec.js`

Pruebas incluidas:
- Búsqueda de usuario para reporte
- Validación de campos obligatorios
- Selección de rango de fechas
- **Generación de PDF** con datos del usuario
- Inclusión de registros de acceso
- Manejo de errores en generación
- Verificación de archivos generados
- **Generación de XLSX** (preparado para implementación)
- Reporte de grupo de usuarios
- Medición de rendimiento

**Total de casos de prueba:** 23

---

## 🏗️ Estructura de Archivos

```
src/tests/
├── README.md                        # Este archivo
├── e2e/                            # Pruebas End-to-End
│   ├── registro-usuario-spec.js    # CU-01
│   ├── actualizacion-datos.spec.js # CU-03
│   ├── autenticacion-qr.spec.js    # CU-04
│   ├── asociacion-huella.spec.js   # CU-18
│   └── generacion-reportes.spec.js # CU-10/CU-12
├── fixtures/
│   └── electron-test.js            # Configuración de Electron para tests
├── setup/
│   ├── db-test-setup.js            # Configuración de BD de pruebas
│   └── test-data.js                # Datos de prueba y helpers
├── global-setup.js                 # Setup global (ejecuta antes de todo)
└── global-teardown.js              # Teardown global (ejecuta después de todo)
```

## 🚀 Cómo Ejecutar las Pruebas

### Prerequisitos

1. MySQL debe estar corriendo en `localhost:3306`
2. Credenciales de MySQL:
   - Usuario: `root`
   - Password: `root`
3. Node.js y npm instalados

### Instalación

```bash
# Instalar dependencias
npm install

# Instalar navegadores de Playwright
npm run postinstall
```

### Comandos Disponibles

#### Ejecutar todas las pruebas
```bash
npm test
```

#### Ejecutar con interfaz gráfica (UI Mode)
```bash
npm run test:ui
```

#### Ejecutar en modo visible (headed)
```bash
npm run test:headed
```

#### Ejecutar en modo debug
```bash
npm run test:debug
```

#### Ejecutar prueba específica
```bash
# Solo registro de usuario
npm run test:registro

# Solo registro en modo visible
npm run test:registro:headed

# Solo registro en modo debug
npm run test:registro:debug
```

#### Ejecutar pruebas individuales por archivo
```bash
# Actualización de datos
npx cross-env NODE_ENV=test playwright test actualizacion-datos.spec.js

# Autenticación QR
npx cross-env NODE_ENV=test playwright test autenticacion-qr.spec.js

# Asociación de huella
npx cross-env NODE_ENV=test playwright test asociacion-huella.spec.js

# Generación de reportes
npx cross-env NODE_ENV=test playwright test generacion-reportes.spec.js
```

#### Ver reporte de resultados
```bash
npm run test:report
```

### Comandos de Base de Datos

```bash
# Configurar BD de pruebas manualmente
npm run db:setup

# Limpiar datos de prueba
npm run db:clean

# Eliminar BD de pruebas completamente
npm run db:drop
```

## 📊 Reportes

Después de ejecutar las pruebas, los reportes se generan en:

- **HTML Report:** `test-results/html-report/index.html`
- **JSON Report:** `test-results/results.json`
- **Screenshots:** `test-results/` (solo en fallos)
- **Videos:** `test-results/` (solo en fallos)

## 🗄️ Base de Datos de Pruebas

Las pruebas utilizan una base de datos separada: `sistemaaccesofacultad_test`

### Datos de Prueba Precargados

La BD de pruebas incluye 3 usuarios:

1. **Usuario Prueba Existente**
   - Matrícula: 12345678
   - Correo: usuario.existente@test.com
   - Rol: Estudiante
   - Estatus: Activo

2. **María González López**
   - Matrícula: 87654321
   - Correo: maria.gonzalez@test.com
   - Rol: Estudiante
   - Estatus: Activo

3. **Carlos Ramírez Torres**
   - Matrícula: 11223344
   - Correo: carlos.ramirez@test.com
   - Rol: Docente
   - Estatus: Activo

### Ciclo de Vida de la BD

1. **Global Setup:** Crea la BD y tablas, inserta usuarios base
2. **Pruebas:** Agregan/modifican datos temporales
3. **Global Teardown:** Limpia datos temporales, mantiene usuarios base

## 🎯 Buenas Prácticas

### Al Escribir Pruebas

1. **Usar datos únicos:** Los helpers en `test-data.js` generan matrículas y correos únicos
2. **Esperar carga completa:** Siempre usar `waitForLoadState` y `waitForTimeout` apropiados
3. **Limpiar después:** Las pruebas deben ser independientes y no afectarse entre sí
4. **Console logs útiles:** Cada prueba tiene logs descriptivos para seguimiento

### Ejemplo de Uso de Datos de Prueba

```javascript
const { getUsuarioValido, generarMatriculaUnica } = require('../setup/test-data');

// Generar usuario con datos únicos
const usuario = getUsuarioValido();

// Generar matrícula única
const matricula = generarMatriculaUnica();
```

## 🐛 Debugging

### Si las pruebas fallan:

1. **Verificar MySQL:** Asegúrate de que MySQL esté corriendo
2. **Verificar credenciales:** Usuario `root`, password `root`
3. **Modo headed:** Ejecutar con `--headed` para ver qué pasa
4. **Modo debug:** Ejecutar con `--debug` para pausar en cada paso
5. **Screenshots:** Revisa `test-results/` para capturas de pantalla de fallos

### Logs Útiles

Los logs de las pruebas muestran:
- ℹ️  Información de setup
- 📝 Caso de prueba ejecutándose
- ✅ Prueba exitosa
- ⚠️  Advertencia o funcionalidad pendiente
- ❌ Error (capturado en screenshots)

## 📝 Cobertura de Pruebas

| Caso de Uso | Casos de Prueba | Estado |
|------------|-----------------|--------|
| CU-01: Registro de Usuario | 18 | ✅ Completo |
| CU-03: Actualización de Datos | 13 | ✅ Completo |
| CU-04: Autenticación QR | 15 | ✅ Completo |
| CU-18: Asociación de Huella | 25 | ✅ Completo (con mocks) |
| CU-10/CU-12: Reportes | 23 | ✅ Completo (PDF) |
| **TOTAL** | **94** | **100%** |

## 🔧 Configuración

### playwright.config.js

La configuración principal está en `src/playwright.config.js`:

- **Workers:** 1 (importante para Electron)
- **Timeout:** 30 segundos por prueba
- **Retries:** 0 en desarrollo, 2 en CI
- **Screenshots:** Solo en fallos
- **Videos:** Solo en fallos

### Variables de Entorno

- `NODE_ENV=test`: Activa el modo de pruebas
- Se establece automáticamente al ejecutar `npm test`

## 🎓 Próximos Pasos

### Mejoras Sugeridas

1. **CU-01:** Agregar verificación del envío de correo con QR
2. **CU-03:** Agregar validaciones del lado del cliente
3. **CU-04:** Verificar registro en tabla de accesos
4. **CU-18:** Integrar con lector biométrico real (cuando esté disponible)
5. **CU-10/CU-12:** Implementar generación de XLSX y validar contenido de PDFs

### Tests de Integración Adicionales

- Flujo completo: Registro → Asociación de Huella → Autenticación
- Flujo de administrador: Búsqueda → Actualización → Generación de Reporte
- Tests de rendimiento con múltiples usuarios
- Tests de concurrencia

## 📞 Soporte

Si tienes problemas ejecutando las pruebas:

1. Revisa este README
2. Verifica los logs en consola
3. Revisa los screenshots en `test-results/`
4. Ejecuta en modo debug para ver paso a paso

---

**Última actualización:** Noviembre 2025
**Versión de Playwright:** 1.56.1
**Versión de Electron:** 35.1.2
