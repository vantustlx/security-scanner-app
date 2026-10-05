-- ===========================================================
-- Migración: tres lectores (peatonal / entrada y salida vehicular)
-- y cierre diario de accesos
-- Base de datos: sistemaaccesofacultad (MySQL 8.0)
-- Rollback: 2026-10-05_lectores_y_cierre_diario_rollback.sql
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

-- MySQL 8 no soporta ADD COLUMN IF NOT EXISTS: se agrega solo si falta
DROP PROCEDURE IF EXISTS agregar_columna_si_falta;
DELIMITER ;;
CREATE PROCEDURE agregar_columna_si_falta(IN tabla VARCHAR(64), IN columna VARCHAR(64), IN definicion TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = tabla AND column_name = columna) THEN
    SET @sql = CONCAT('ALTER TABLE ', tabla, ' ADD COLUMN ', columna, ' ', definicion);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;;
DELIMITER ;

-- 1) Por dónde entró y salió cada persona, y registros cerrados por el sistema
CALL agregar_columna_si_falta('registroacceso', 'medio_entrada',
  "ENUM('PEATONAL','VEHICULAR') DEFAULT NULL COMMENT 'Lector por el que entró' AFTER fecha_salida");
CALL agregar_columna_si_falta('registroacceso', 'medio_salida',
  "ENUM('PEATONAL','VEHICULAR') DEFAULT NULL COMMENT 'Lector por el que salió' AFTER medio_entrada");
CALL agregar_columna_si_falta('registroacceso', 'cierre_automatico',
  "DATETIME DEFAULT NULL COMMENT 'Momento en que el sistema cerró una entrada sin salida' AFTER medio_salida");

-- 2) Notificaciones de accesos inconsistentes y del cierre diario (con PDF adjunto)
ALTER TABLE notificacion MODIFY COLUMN tipo
  ENUM('REGISTRO_CONFIRMADO','REGISTRO_RECHAZADO','REGISTRO_EXPIRADO','REGISTRO_ERROR',
       'ACCESO_INCONSISTENTE','CIERRE_DIARIO') NOT NULL;
CALL agregar_columna_si_falta('notificacion', 'archivo',
  "VARCHAR(255) DEFAULT NULL COMMENT 'Ruta del PDF asociado' AFTER mensaje");

DROP PROCEDURE agregar_columna_si_falta;

-- 3) Bitácora del cierre diario (evita ejecutarlo dos veces el mismo día)
CREATE TABLE IF NOT EXISTS cierre_diario (
  id INT NOT NULL AUTO_INCREMENT,
  fecha_operacion DATE NOT NULL,
  tipo ENUM('PROGRAMADO','RECUPERACION') NOT NULL COMMENT 'RECUPERACION: días en que la app estaba apagada a la hora del cierre',
  ejecutado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  registros_cerrados INT NOT NULL DEFAULT 0,
  archivo VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_cierre_fecha_tipo (fecha_operacion, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Ejecuciones del cierre diario de accesos';
