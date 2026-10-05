-- ===========================================================
-- Rollback de 2026-10-05_visitantes_codigo_barras.sql
-- Quita la vigencia y el índice único. Las columnas codigo_acceso (10) y
-- correo (100) se dejan con el tamaño ampliado: los folios de 8 caracteres
-- ya emitidos no caben en el tamaño anterior.
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

SET @existe := (SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'visitante' AND column_name = 'vigente_hasta');
SET @sql := IF(@existe = 1, 'ALTER TABLE visitante DROP COLUMN vigente_hasta', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.statistics
                WHERE table_schema = DATABASE() AND table_name = 'visitante' AND index_name = 'uq_visitante_codigo');
SET @sql := IF(@existe = 1, 'ALTER TABLE visitante DROP INDEX uq_visitante_codigo', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
