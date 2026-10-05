-- ===========================================================
-- Rollback de 2026-10-04_eliminar_huella.sql
-- Base de datos: sistemaaccesofacultad (MySQL 8.0)
--
-- Recrea la estructura tal como estaba el 2026-10-04: tablas, clave
-- foránea, índices, triggers, vista y procedimientos. Al momento de la
-- migración las tres tablas estaban vacías y no había filas
-- HUELLA_NO_RECONOCIDA en accesos_fallidos, así que no hay datos que
-- restaurar.
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

-- 1) Tablas (huella_auditoria primero: los triggers de huella escriben en ella)
CREATE TABLE IF NOT EXISTS huella_auditoria (
  id_auditoria int NOT NULL AUTO_INCREMENT,
  id_huella int NOT NULL COMMENT 'ID de la huella modificada',
  matricula int NOT NULL COMMENT 'Matrícula del usuario',
  accion enum('REGISTRO','ACTUALIZACION','ELIMINACION','VERIFICACION_EXITOSA','VERIFICACION_FALLIDA') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tipo de acción realizada',
  calidad_anterior int DEFAULT NULL COMMENT 'Calidad previa (solo para actualizaciones)',
  calidad_nueva int DEFAULT NULL COMMENT 'Nueva calidad',
  dedo varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Dedo afectado',
  usuario_sistema varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Usuario que realizó la acción',
  ip_origen varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP desde donde se realizó',
  timestamp_accion datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Momento de la acción',
  PRIMARY KEY (id_auditoria),
  KEY idx_matricula_audit (matricula),
  KEY idx_accion (accion),
  KEY idx_timestamp (timestamp_accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Auditoría de operaciones sobre huellas dactilares';

CREATE TABLE IF NOT EXISTS huella (
  id_huella int NOT NULL AUTO_INCREMENT COMMENT 'ID único de la huella',
  matricula int NOT NULL COMMENT 'Matrícula del usuario',
  template blob NOT NULL COMMENT 'Template biométrico SecuGen (400 bytes encriptado)',
  calidad int DEFAULT '0' COMMENT 'Calidad de la captura (0-100)',
  dedo enum('Pulgar','Índice','Medio','Anular','Meñique','Desconocido') COLLATE utf8mb4_unicode_ci DEFAULT 'Desconocido' COMMENT 'Dedo registrado',
  mano enum('Derecha','Izquierda','Desconocida') COLLATE utf8mb4_unicode_ci DEFAULT 'Desconocida' COMMENT 'Mano registrada',
  fecha_registro datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de registro inicial',
  fecha_actualizacion datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
  dispositivo varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'SecuGen U20' COMMENT 'Modelo del lector',
  sdk_version varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'FDx Pro 4.3.1' COMMENT 'Versión del SDK',
  PRIMARY KEY (id_huella),
  KEY idx_matricula (matricula),
  KEY idx_fecha_registro (fecha_registro),
  KEY idx_dedo (dedo),
  CONSTRAINT huella_ibfk_1 FOREIGN KEY (matricula) REFERENCES usuario (matricula) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de huellas dactilares con templates SecuGen FDx SDK Pro';

CREATE TABLE IF NOT EXISTS huella_backup_20251204 (
  id_huella int NOT NULL DEFAULT '0' COMMENT 'ID único de la huella',
  matricula int NOT NULL COMMENT 'Matrícula del usuario',
  template blob NOT NULL COMMENT 'Template biométrico SecuGen (400 bytes encriptado)',
  calidad int DEFAULT '0' COMMENT 'Calidad de la captura (0-100)',
  dedo enum('Pulgar','Índice','Medio','Anular','Meñique','Desconocido') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Desconocido' COMMENT 'Dedo registrado',
  mano enum('Derecha','Izquierda','Desconocida') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Desconocida' COMMENT 'Mano registrada',
  fecha_registro datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de registro inicial',
  fecha_actualizacion datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
  dispositivo varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'SecuGen U20' COMMENT 'Modelo del lector',
  sdk_version varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'FDx Pro 4.3.1' COMMENT 'Versión del SDK'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2) Triggers de auditoría
DROP TRIGGER IF EXISTS trigger_huella_insert;
DROP TRIGGER IF EXISTS trigger_huella_update;
DROP TRIGGER IF EXISTS trigger_huella_delete;

DELIMITER ;;
CREATE TRIGGER trigger_huella_insert AFTER INSERT ON huella FOR EACH ROW BEGIN
    INSERT INTO huella_auditoria (
        id_huella, matricula, accion, calidad_nueva, dedo
    ) VALUES (
        NEW.id_huella,
        NEW.matricula,
        'REGISTRO',
        NEW.calidad,
        NEW.dedo
    );
END;;

CREATE TRIGGER trigger_huella_update AFTER UPDATE ON huella FOR EACH ROW BEGIN
    INSERT INTO huella_auditoria (
        id_huella, matricula, accion,
        calidad_anterior, calidad_nueva, dedo
    ) VALUES (
        NEW.id_huella,
        NEW.matricula,
        'ACTUALIZACION',
        OLD.calidad,
        NEW.calidad,
        NEW.dedo
    );
END;;

CREATE TRIGGER trigger_huella_delete BEFORE DELETE ON huella FOR EACH ROW BEGIN
    INSERT INTO huella_auditoria (
        id_huella, matricula, accion, calidad_anterior, dedo
    ) VALUES (
        OLD.id_huella,
        OLD.matricula,
        'ELIMINACION',
        OLD.calidad,
        OLD.dedo
    );
END;;
DELIMITER ;

-- 3) Vista
CREATE OR REPLACE VIEW vista_usuarios_huellas AS
SELECT
    u.matricula,
    u.nombre,
    u.apellido_paterno,
    u.apellido_materno,
    u.rol_facultad,
    u.estatus,
    CASE WHEN h.id_huella IS NOT NULL THEN 'Sí' ELSE 'No' END AS tiene_huella,
    h.calidad AS calidad_huella,
    h.dedo AS dedo_registrado,
    h.fecha_registro AS fecha_registro_huella,
    CASE
        WHEN h.calidad >= 80 THEN 'Alta'
        WHEN h.calidad >= 50 THEN 'Media'
        WHEN h.calidad < 50 THEN 'Baja'
        ELSE 'Sin registro'
    END AS clasificacion_calidad
FROM usuario u
LEFT JOIN huella h ON u.matricula = h.matricula;

-- 4) Procedimientos almacenados
DROP PROCEDURE IF EXISTS sp_estadisticas_huellas;
DROP PROCEDURE IF EXISTS sp_limpiar_huellas_baja_calidad;

DELIMITER ;;
CREATE PROCEDURE sp_estadisticas_huellas()
BEGIN
    SELECT
        COUNT(DISTINCT matricula) AS total_usuarios_con_huella,
        COUNT(*) AS total_huellas_registradas,
        AVG(calidad) AS calidad_promedio,
        MIN(calidad) AS calidad_minima,
        MAX(calidad) AS calidad_maxima,
        COUNT(CASE WHEN calidad >= 80 THEN 1 END) AS huellas_alta_calidad,
        COUNT(CASE WHEN calidad >= 50 AND calidad < 80 THEN 1 END) AS huellas_media_calidad,
        COUNT(CASE WHEN calidad < 50 THEN 1 END) AS huellas_baja_calidad,
        dedo AS dedo_mas_usado,
        COUNT(*) AS cantidad_por_dedo
    FROM huella
    GROUP BY dedo
    WITH ROLLUP;
END;;

CREATE PROCEDURE sp_limpiar_huellas_baja_calidad(IN umbral_calidad INT)
BEGIN
    DECLARE total_eliminadas INT;

    SELECT COUNT(*) INTO total_eliminadas
    FROM huella
    WHERE calidad < umbral_calidad;

    DELETE FROM huella
    WHERE calidad < umbral_calidad;

    SELECT CONCAT('? Se eliminaron ', total_eliminadas, ' huellas con calidad inferior a ', umbral_calidad) AS resultado;
END;;
DELIMITER ;
