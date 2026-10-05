-- ===========================================================
-- Rollback de 2026-10-05_registro_con_confirmacion.sql
-- Se pierden las solicitudes pendientes, las notificaciones y las fechas
-- de aceptación de Términos y Condiciones.
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

DROP TABLE IF EXISTS registro_pendiente;
DROP TABLE IF EXISTS notificacion;

SET @existe := (SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'usuario'
                  AND column_name = 'fecha_aceptacion_terminos');
SET @sql := IF(@existe = 1,
  'ALTER TABLE usuario DROP COLUMN fecha_aceptacion_terminos',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
