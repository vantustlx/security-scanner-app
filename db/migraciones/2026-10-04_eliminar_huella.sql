-- ===========================================================
-- Migración: eliminar el soporte de huella dactilar
-- Base de datos: sistemaaccesofacultad (MySQL 8.0)
-- Rollback: 2026-10-04_eliminar_huella_rollback.sql
--
-- Las sentencias DDL de MySQL hacen commit implícito: esta migración no es
-- transaccional. Respaldar la BD completa antes de ejecutarla.
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

-- Datos que se pierden con esta migración
SELECT
    (SELECT COUNT(*) FROM huella) AS huella,
    (SELECT COUNT(*) FROM huella_auditoria) AS huella_auditoria,
    (SELECT COUNT(*) FROM huella_backup_20251204) AS huella_backup_20251204,
    (SELECT COUNT(*) FROM accesos_fallidos WHERE tipo_error = 'HUELLA_NO_RECONOCIDA') AS accesos_fallidos_huella;

-- 1) Intentos fallidos registrados por el lector de huella
DELETE FROM accesos_fallidos WHERE tipo_error = 'HUELLA_NO_RECONOCIDA';

-- 2) Triggers de huella (escriben en huella_auditoria)
DROP TRIGGER IF EXISTS trigger_huella_insert;
DROP TRIGGER IF EXISTS trigger_huella_update;
DROP TRIGGER IF EXISTS trigger_huella_delete;

-- 3) Procedimientos almacenados que consultan huella
DROP PROCEDURE IF EXISTS sp_estadisticas_huellas;
DROP PROCEDURE IF EXISTS sp_limpiar_huellas_baja_calidad;

-- 4) Vista que depende de huella
DROP VIEW IF EXISTS vista_usuarios_huellas;

-- 5) Tablas. Al eliminar huella se eliminan también su clave foránea
--    huella_ibfk_1 -> usuario(matricula) y sus índices
--    (idx_matricula, idx_fecha_registro, idx_dedo). Ninguna otra tabla
--    referencia a huella, huella_auditoria ni huella_backup_20251204.
DROP TABLE IF EXISTS huella;
DROP TABLE IF EXISTS huella_auditoria;
DROP TABLE IF EXISTS huella_backup_20251204;

-- Verificación: debe devolver 0 en todas las columnas
SELECT
    (SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name LIKE '%huella%') AS tablas_y_vistas,
    (SELECT COUNT(*) FROM information_schema.routines
        WHERE routine_schema = DATABASE() AND routine_definition LIKE '%huella%') AS rutinas,
    (SELECT COUNT(*) FROM information_schema.triggers
        WHERE trigger_schema = DATABASE() AND trigger_name LIKE '%huella%') AS triggers,
    (SELECT COUNT(*) FROM accesos_fallidos WHERE tipo_error = 'HUELLA_NO_RECONOCIDA') AS accesos_fallidos_huella;
