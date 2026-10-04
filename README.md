# AccessSystem

Aplicación de escritorio (Electron + MySQL) para controlar el acceso a la facultad mediante código QR y placas de vehículo.

## Requisitos

- Node.js 20 o superior
- MySQL 8.0 en `localhost:3306` con el usuario `root` / contraseña `root` (configurado en `src/main/database.js`)
- Puerto `3000` libre (servidor local de confirmación de correos)

## Instalación

```bash
git clone https://github.com/vantustlx/security-scanner-app.git
cd security-scanner-app
git switch <tu-rama>        # main, integration, bryan-dev, carlos-dev, juary-dev o tonoh-dev
npm install
```

## Base de datos

Crear la base de datos `sistemaaccesofacultad` con sus tablas y el catálogo de carreras:

```bash
mysql -u root -p < db/schema.sql
```

Si ya tenías la base de datos creada desde antes del 2026-10-04, respáldala y aplica la migración que elimina las tablas de huella dactilar:

```bash
mysql -u root -p < db/migraciones/2026-10-04_eliminar_huella.sql
```

## Ejecutar

```bash
npm start
```

Si la aplicación se cierra al instante sin mostrar errores, reinstala Electron:

```bash
rm -rf node_modules/electron node_modules/.package-lock.json
npm install
```
