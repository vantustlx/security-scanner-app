# AccessSystem

Aplicación de escritorio (Electron + MySQL) para controlar el acceso a la facultad mediante código QR, con tres escáneres (peatonal, entrada vehicular y salida vehicular).

## Requisitos

- Node.js 20 o superior
- MySQL 8.0
- Conexión a internet (envío de correos y confirmación de registros)
- Escáneres QR configurados como puerto serie (aparecen como `COMx` en el Administrador de dispositivos)

## Instalación

```bash
git clone https://github.com/vantustlx/security-scanner-app.git
cd security-scanner-app
git switch <tu-rama>        # main, integration, bryan-dev, carlos-dev, juary-dev o tonoh-dev
npm install
```

## Configuración

Copia `.env.example` como `.env` y completa los valores. Las credenciales solo viven en `.env`, que no se sube a git; pide al administrador del proyecto las de Gmail y el buzón de confirmaciones.

| Variable | Descripción |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL |
| `ADMIN_USUARIO`, `ADMIN_PASSWORD` | Acceso al modo administrador |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Cuenta que envía los correos |
| `CONFIRMACION_URL`, `CONFIRMACION_API_KEY` | Buzón de confirmaciones (Cloudflare Worker) |
| `LECTOR_PEATONAL`, `LECTOR_ENTRADA_VEHICULAR`, `LECTOR_SALIDA_VEHICULAR` | Puerto COM de cada escáner (se llenan desde la app) |
| `CIERRE_HORA` | Hora del cierre diario (por defecto `20:00`) |
| `QR_SECRETO` | Firma de los QR de las credenciales. Si falta, la app lo genera al iniciar. **Respáldalo**: si cambia, todas las credenciales dejan de servir |
| `QR_ACEPTAR_SIN_FIRMA` | `si` acepta temporalmente los QR anteriores (solo la matrícula) mientras se reenvían |
| `ADMIN_INACTIVIDAD_MIN` | Minutos sin uso tras los que se cierra el modo administrador (por defecto 10) |
| `INICIAR_CON_WINDOWS` | `si` abre la app al iniciar sesión en Windows (solo en la PC de producción) |
| `RESPALDO_CARPETA`, `RESPALDO_DIAS`, `RESPALDO_MYSQLDUMP` | Respaldo diario de la BD (carpeta, días que se conservan, ruta de `mysqldump.exe`) |
| `BITACORA_CARPETA`, `BITACORA_DIAS` | Bitácora de la app, un archivo por día |

## Base de datos

Crear la base de datos `sistemaaccesofacultad` con sus tablas y los catálogos de carreras, áreas y turnos:

```bash
mysql -u root -p < db/schema.sql
```

Si ya tenías la base de datos creada, respáldala y aplica las migraciones que falten de `db/migraciones/`, en orden de fecha:

```bash
mysql -u root -p < db/migraciones/2026-10-04_eliminar_huella.sql
mysql -u root -p < db/migraciones/2026-10-05_registro_con_confirmacion.sql
mysql -u root -p < db/migraciones/2026-10-05_lectores_y_cierre_diario.sql
mysql -u root -p < db/migraciones/2026-10-05_visitantes_codigo_barras.sql
mysql -u root -p < db/migraciones/2026-10-05_areas_usuario.sql
```

## Lector de accesos

Al iniciar, la app abre dos ventanas: la principal (menú y modo administrador) y el **lector de accesos**, que sigue registrando entradas y salidas aunque el administrador use la principal. Si hay un segundo monitor, el lector se abre ahí. Cerrar el lector solo lo minimiza; la app se cierra con la ventana principal.

Los escáneres se leen desde el proceso principal, así que funcionan aunque la ventana del lector no tenga el foco o esté minimizada.

| Lector | Regla |
|---|---|
| 1 · Peatonal | Alterna entrada y salida |
| 2 · Entrada vehicular | Siempre registra entrada |
| 3 · Salida vehicular | Siempre cierra la entrada abierta, sin importar por dónde entró |

Las incoherencias no bloquean el paso: se muestran al vigilante con ⚠ y llegan a **Notificaciones** (entrar en vehículo con una entrada abierta, salir sin entrada, usar los lectores vehiculares sin vehículo registrado). Un código desconocido, un QR con firma inválida o una matrícula inexistente se rechazan y se registran en `accesos_fallidos`.

El QR de la credencial lleva la matrícula y una firma (`FCB<matrícula>K<firma>`, calculada con `QR_SECRETO`), para que nadie pueda generar el QR de otra persona escribiendo su matrícula. Las credenciales anteriores, que solo traen la matrícula, se rechazan salvo con `QR_ACEPTAR_SIN_FIRMA=si`; se reenvían desde **Modo administrador → Recuperar QR**. La cámara de la ventana del lector queda como respaldo y registra con el lector que se elija.

## Visitantes

Los visitantes se registran en un solo formulario (**Visitantes → Registro**) eligiendo el tipo: `Ocasional` (válido solo el día del registro) o `Frecuente` (6 meses). No aceptan Términos y Condiciones.

- **Con correo:** reciben un pase con código de barras Code 128 (`V-` + folio) en el cuerpo del correo y en PDF. Lo presentan en cualquiera de los tres lectores.
- **Sin correo:** el folio se muestra en pantalla y se teclea en **Visitantes → Acceder**.

En ambos casos se alterna entrada/salida en `registroacceso` sin importar el lector, y sin registrar el medio. Un visitante frecuente que se registra de nuevo con el mismo correo conserva su folio, se renueva su vigencia y se le reenvía el pase; uno ocasional recibe un folio nuevo en cada visita.

### Identificar los tres escáneres

Los tres escáneres son iguales; lo que los distingue es el puerto COM que Windows asigna a cada puerto USB.

1. En la ventana del lector pulsa **Configurar lectores**.
2. Escanea cualquier QR con el escáner peatonal, luego con el de entrada vehicular y luego con el de salida vehicular. La app detecta qué puerto leyó cada código.
3. Pulsa **Guardar**: la asignación se escribe en `.env` (`LECTOR_PEATONAL=COM5`, etc.).

Cada escáner conserva su puerto COM mientras siga conectado al mismo puerto USB de la PC. Si se cambian de puerto, repite la configuración. Conviene etiquetar cada escáner y su puerto USB.

## Cierre diario

A la hora de `CIERRE_HORA` (por defecto 20:00) la app:

1. Genera un PDF con las personas que no registraron su salida, en `Documentos\Sistema de Acceso FCBIyT\Cierres` (o `CIERRE_CARPETA`).
2. Marca esas entradas con `cierre_automatico`, para que al día siguiente su primera lectura sea una entrada.
3. Deja a todos los usuarios con estatus Inactivo y avisa en **Notificaciones**, con un botón para ver el PDF.

Si la app estaba apagada a esa hora, al iniciar cierra las entradas de días anteriores y genera el PDF correspondiente.

Después del cierre se respalda la BD con `mysqldump` en `Documentos\Sistema de Acceso FCBIyT\Respaldos` (o `RESPALDO_CARPETA`) y se conservan 30 días. Si el respaldo falla, llega un aviso a **Notificaciones**. Para restaurar uno: `mysql -u root -p sistemaaccesofacultad < respaldo_AAAA-MM-DD_HHMM.sql`.

## Registro de usuarios

1. El administrador captura los datos. Quedan en `registro_pendiente` y el usuario recibe por correo los Términos y Condiciones con un enlace.
2. El usuario acepta o rechaza desde su celular. La respuesta se guarda en el buzón de confirmaciones (`worker/`), que funciona aunque la PC de la facultad esté apagada.
3. La app consulta el buzón al iniciar y cada minuto. Si el usuario aceptó, se inserta en `usuario` y recibe su credencial con código QR. El resultado (confirmado, rechazado, vencido o error) aparece en **Notificaciones**.

Las solicitudes vencen a las 48 horas (`CONFIRMACION_HORAS_VIGENCIA`).

### Áreas

Una persona puede tener varias áreas en la facultad (por ejemplo, estudiante en la mañana y personal de limpieza en la noche). Cada área se captura como una fila con:

- **Área**: Estudiante, Docente, Administrativo, Dirección, Jardinería, Limpieza, Seguridad o Cafetería.
- **Carrera**: solo en Estudiante, Docente, Administrativo y Dirección.
- **Turnos**: uno o varios (Matutino, Vespertino, Nocturno, Tiempo completo).
- **Principal**: la que se muestra en el lector y en el PDF del cierre diario, por ejemplo `Docente (+1)`.

Se usa un solo QR por persona, sin importar cuántas áreas tenga. Los catálogos viven en las tablas `area`, `turno` y `carrera`; para agregar un área o un turno basta con insertarlo en la BD (`area.requiere_carrera` indica si pide carrera). En la búsqueda y el reporte de grupos, los filtros de área, carrera y turno son opcionales y se aplican a la misma área de la persona.

## Buzón de confirmaciones (Cloudflare Worker)

Se publica una sola vez desde la carpeta `worker/` con una cuenta gratuita de Cloudflare:

```bash
cd worker
npm install
npx wrangler login                                  # abre el navegador para iniciar sesión
npx wrangler kv namespace create CONFIRMACIONES     # copia el id en wrangler.toml
npx wrangler secret put API_KEY                     # la misma clave que CONFIRMACION_API_KEY
npx wrangler deploy                                 # muestra la URL para CONFIRMACION_URL
```

Para probar sin publicar, crea `worker/.dev.vars` con `API_KEY=<clave>`, ejecuta `npm run dev` en `worker/` y usa `CONFIRMACION_URL=http://127.0.0.1:8787`.

## Ejecutar

```bash
npm start
```

Si la aplicación se cierra al instante sin mostrar errores, reinstala Electron:

```bash
rm -rf node_modules/electron node_modules/.package-lock.json
npm install
```

`npm run dev` abre la app con las herramientas de desarrollo habilitadas. Con `npm start` están bloqueadas (también Ctrl+R y F5), igual que la navegación a páginas externas.

## Seguridad

- Las vistas del modo administrador solo se abren después de iniciar sesión. La sesión se cierra al volver al inicio o tras `ADMIN_INACTIVIDAD_MIN` minutos sin usar la ventana. Tras 5 contraseñas incorrectas seguidas, el inicio de sesión espera 30 segundos.
- Los datos personales se validan también en el proceso principal antes de guardarse.
- La bitácora (`Documentos\Sistema de Acceso FCBIyT\Bitacora`) guarda lo que la app escribe en consola, incluidos los errores, un archivo por día.

## Puesta en producción

1. **MySQL 8** instalado como servicio con inicio **Automático** (`services.msc` → `MySQL80`) y una contraseña fuerte para `root`.
2. **BD limpia:** `mysql -u root -p < db/schema.sql`. No copies la BD de desarrollo: tiene usuarios y accesos de prueba.
3. **Usuario de la app:** edita la contraseña en `db/usuario_app.sql`, ejecútalo con root y usa `DB_USER=acceso_app` en `.env`.
4. **`.env`:** completa todas las variables. Agrega `INICIAR_CON_WINDOWS=si` y apunta `RESPALDO_CARPETA` a una carpeta sincronizada (OneDrive o Google Drive). Guarda una copia del `.env` fuera de la PC: contiene `QR_SECRETO`.
5. **App:** `npm ci` y `npm start`. En la ventana del lector usa **Configurar lectores** para asignar los tres escáneres.
6. **Windows:** usa una cuenta estándar (sin permisos de administrador) en la PC de la caseta y desactiva la suspensión automática.
7. **Gmail:** usa una cuenta institucional con contraseña de aplicación. Gmail permite unos 500 correos al día.
