# AccessSystem

Aplicación de escritorio (Electron + MySQL) para controlar el acceso a la facultad mediante código QR y placas de vehículo.

## Requisitos

- Node.js 20 o superior
- MySQL 8.0 en `localhost:3306` con el usuario `root` / contraseña `root` (configurado en `src/main/database.js`)
- Conexión a internet (envío de correos y confirmación de registros)

## Instalación

```bash
git clone https://github.com/vantustlx/security-scanner-app.git
cd security-scanner-app
git switch <tu-rama>        # main, integration, bryan-dev, carlos-dev, juary-dev o tonoh-dev
npm install
```

## Configuración

Copia `.env.example` como `.env` y completa los valores. Pide al administrador del proyecto la contraseña de aplicación de Gmail y la clave del buzón de confirmaciones; el `.env` no se sube a git.

| Variable | Descripción |
|---|---|
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Cuenta que envía los correos |
| `CONFIRMACION_URL` | URL del buzón de confirmaciones (Cloudflare Worker) |
| `CONFIRMACION_API_KEY` | Clave compartida con el buzón |
| `CORREO_VISTA_PREVIA_DIR` | Opcional: guarda los correos como archivos en esa carpeta en lugar de enviarlos |

## Base de datos

Crear la base de datos `sistemaaccesofacultad` con sus tablas y el catálogo de carreras:

```bash
mysql -u root -p < db/schema.sql
```

Si ya tenías la base de datos creada, respáldala y aplica las migraciones que falten de `db/migraciones/`, en orden de fecha:

```bash
mysql -u root -p < db/migraciones/2026-10-04_eliminar_huella.sql
mysql -u root -p < db/migraciones/2026-10-05_registro_con_confirmacion.sql
```

## Registro de usuarios

1. El administrador captura los datos. Quedan en `registro_pendiente` y el usuario recibe por correo los Términos y Condiciones con un enlace.
2. El usuario acepta o rechaza desde su celular. La respuesta se guarda en el buzón de confirmaciones (`worker/`), que funciona aunque la PC de la facultad esté apagada.
3. La app consulta el buzón al iniciar y cada minuto. Si el usuario aceptó, se inserta en `usuario` y recibe su credencial con código QR. El resultado (confirmado, rechazado, vencido o error) aparece en **Notificaciones**.

Las solicitudes vencen a las 48 horas (`CONFIRMACION_HORAS_VIGENCIA`).

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
