-- ===========================================================
-- Usuario de MySQL para la aplicación (producción).
-- La app no necesita crear ni modificar tablas: solo leer y escribir datos, y respaldar la BD.
-- Las migraciones se siguen aplicando con root.
--
-- Uso:
--   1. Cambia CAMBIA_ESTA_CONTRASEÑA por una contraseña larga y aleatoria.
--   2. mysql -u root -p < db/usuario_app.sql
--   3. En .env: DB_USER=acceso_app y DB_PASSWORD=<la contraseña>
-- ===========================================================

CREATE USER IF NOT EXISTS 'acceso_app'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CONTRASEÑA';

-- Datos (SELECT/INSERT/UPDATE/DELETE) y lo que necesita mysqldump para el respaldo diario
GRANT SELECT, INSERT, UPDATE, DELETE, LOCK TABLES, SHOW VIEW, TRIGGER
    ON sistemaaccesofacultad.* TO 'acceso_app'@'localhost';

FLUSH PRIVILEGES;
