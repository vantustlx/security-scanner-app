-- ===========================================================
-- Rollback de 2026-10-05_lectores_y_cierre_diario.sql
-- Se pierden: medio de entrada/salida, marcas de cierre automático,
-- la bitácora de cierres y las notificaciones de accesos inconsistentes
-- y de cierre diario.
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

DROP PROCEDURE IF EXISTS quitar_columna_si_existe;
DELIMITER ;;
CREATE PROCEDURE quitar_columna_si_existe(IN tabla VARCHAR(64), IN columna VARCHAR(64))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = tabla AND column_name = columna) THEN
    SET @sql = CONCAT('ALTER TABLE ', tabla, ' DROP COLUMN ', columna);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;;
DELIMITER ;

DROP TABLE IF EXISTS cierre_diario;

DELETE FROM notificacion WHERE tipo IN ('ACCESO_INCONSISTENTE', 'CIERRE_DIARIO');
CALL quitar_columna_si_existe('notificacion', 'archivo');
ALTER TABLE notificacion MODIFY COLUMN tipo
  ENUM('REGISTRO_CONFIRMADO','REGISTRO_RECHAZADO','REGISTRO_EXPIRADO','REGISTRO_ERROR') NOT NULL;

CALL quitar_columna_si_existe('registroacceso', 'cierre_automatico');
CALL quitar_columna_si_existe('registroacceso', 'medio_salida');
CALL quitar_columna_si_existe('registroacceso', 'medio_entrada');

DROP PROCEDURE quitar_columna_si_existe;
