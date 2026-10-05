-- ===========================================================
-- Migración: registro unificado de visitantes con pase de código de barras
-- Base de datos: sistemaaccesofacultad (MySQL 8.0)
-- Rollback: 2026-10-05_visitantes_codigo_barras_rollback.sql
--
-- El folio (codigo_acceso) es la credencial del visitante: se teclea en
-- "Acceder" o se lee del código de barras del pase ("V-" + folio).
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

-- 1) Folios de 8 caracteres (los existentes de 6 siguen siendo válidos) y únicos;
--    correos del mismo tamaño que en usuario
ALTER TABLE visitante
  MODIFY COLUMN codigo_acceso VARCHAR(10) DEFAULT NULL COMMENT 'Folio; el código de barras contiene "V-" + folio',
  MODIFY COLUMN correo VARCHAR(100) DEFAULT NULL;

SET @existe := (SELECT COUNT(*) FROM information_schema.statistics
                WHERE table_schema = DATABASE() AND table_name = 'visitante' AND index_name = 'uq_visitante_codigo');
SET @sql := IF(@existe = 0, 'ALTER TABLE visitante ADD UNIQUE KEY uq_visitante_codigo (codigo_acceso)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Vigencia del pase: Ocasional hasta el fin del día de registro, Frecuente 6 meses
SET @existe := (SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'visitante' AND column_name = 'vigente_hasta');
SET @sql := IF(@existe = 0,
  'ALTER TABLE visitante ADD COLUMN vigente_hasta DATETIME DEFAULT NULL COMMENT ''Fin de la vigencia del folio y del pase'' AFTER tipo',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE visitante
   SET vigente_hasta = IF(tipo = 'Frecuente',
                          NOW() + INTERVAL 6 MONTH,
                          TIMESTAMP(fecha_registro, '23:59:59'))
 WHERE vigente_hasta IS NULL;
