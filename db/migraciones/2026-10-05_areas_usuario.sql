-- ===========================================================
-- Migración: áreas, carreras y turnos múltiples por usuario
-- Base de datos: sistemaaccesofacultad (MySQL 8.0)
-- Rollback: 2026-10-05_areas_usuario_rollback.sql
--
-- usuario.rol_facultad, usuario.id_carrera y usuario.turno se reemplazan por
-- combinaciones en usuario_area (área + carrera si aplica, una marcada como
-- principal) con sus turnos en usuario_area_turno. Una persona tiene un solo
-- registro en usuario (un solo QR) aunque cumpla varios papeles.
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

-- 1) Catálogos
CREATE TABLE IF NOT EXISTS area (
  id_area INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  requiere_carrera TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'El área se asigna junto con una carrera',
  PRIMARY KEY (id_area),
  UNIQUE KEY uq_area_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Áreas o papeles de las personas en la facultad';

INSERT IGNORE INTO area (nombre, requiere_carrera) VALUES
  ('Estudiante', 1), ('Docente', 1), ('Administrativo', 1), ('Dirección', 1),
  ('Jardinería', 0), ('Limpieza', 0), ('Seguridad', 0), ('Cafetería', 0);

CREATE TABLE IF NOT EXISTS turno (
  id_turno INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(30) NOT NULL,
  PRIMARY KEY (id_turno),
  UNIQUE KEY uq_turno_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO turno (nombre) VALUES ('Matutino'), ('Vespertino'), ('Nocturno'), ('Tiempo completo');

-- 2) Combinaciones de cada usuario y sus turnos (casillas)
CREATE TABLE IF NOT EXISTS usuario_area (
  id_usuario_area INT NOT NULL AUTO_INCREMENT,
  matricula INT NOT NULL,
  id_area INT NOT NULL,
  id_carrera INT DEFAULT NULL COMMENT 'Solo en áreas con requiere_carrera',
  principal TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Área que se muestra en el lector y en los reportes',
  PRIMARY KEY (id_usuario_area),
  KEY idx_usuario_area_matricula (matricula),
  KEY idx_usuario_area_area (id_area),
  KEY idx_usuario_area_carrera (id_carrera),
  CONSTRAINT fk_usuario_area_usuario FOREIGN KEY (matricula) REFERENCES usuario (matricula) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_usuario_area_area FOREIGN KEY (id_area) REFERENCES area (id_area),
  CONSTRAINT fk_usuario_area_carrera FOREIGN KEY (id_carrera) REFERENCES carrera (id_carrera)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS usuario_area_turno (
  id_usuario_area INT NOT NULL,
  id_turno INT NOT NULL,
  PRIMARY KEY (id_usuario_area, id_turno),
  KEY idx_usuario_area_turno_turno (id_turno),
  CONSTRAINT fk_uat_usuario_area FOREIGN KEY (id_usuario_area) REFERENCES usuario_area (id_usuario_area) ON DELETE CASCADE,
  CONSTRAINT fk_uat_turno FOREIGN KEY (id_turno) REFERENCES turno (id_turno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3) Datos existentes y eliminación de las columnas viejas (solo si aún existen)
DROP PROCEDURE IF EXISTS migrar_areas_usuario;
DELIMITER ;;
CREATE PROCEDURE migrar_areas_usuario()
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'usuario' AND column_name = 'rol_facultad') THEN

    -- Cada usuario conserva su rol, carrera y turno como su combinación principal
    INSERT INTO usuario_area (matricula, id_area, id_carrera, principal)
      SELECT u.matricula, a.id_area, IF(a.requiere_carrera = 1, u.id_carrera, NULL), 1
        FROM usuario u
        JOIN area a ON a.nombre = u.rol_facultad
       WHERE NOT EXISTS (SELECT 1 FROM usuario_area ua WHERE ua.matricula = u.matricula);

    INSERT IGNORE INTO usuario_area_turno (id_usuario_area, id_turno)
      SELECT ua.id_usuario_area, t.id_turno
        FROM usuario_area ua
        JOIN usuario u ON u.matricula = ua.matricula
        JOIN turno t ON t.nombre = u.turno;

    ALTER TABLE usuario DROP FOREIGN KEY fk_usuario_carrera;
    ALTER TABLE usuario DROP INDEX fk_usuario_carrera,
                        DROP COLUMN rol_facultad, DROP COLUMN id_carrera, DROP COLUMN turno;
  END IF;

  -- Los registros pendientes guardan sus combinaciones como JSON hasta que se confirman
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = 'registro_pendiente' AND column_name = 'areas') THEN
    ALTER TABLE registro_pendiente ADD COLUMN areas JSON DEFAULT NULL
      COMMENT '[{id_area, id_carrera, turnos: [id_turno], principal}]' AFTER correo;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'registro_pendiente' AND column_name = 'rol_facultad') THEN
    UPDATE registro_pendiente p
       JOIN area a ON a.nombre = p.rol_facultad
       LEFT JOIN turno t ON t.nombre = p.turno
       SET p.areas = JSON_ARRAY(JSON_OBJECT(
             'id_area', a.id_area,
             'id_carrera', IF(a.requiere_carrera = 1, p.id_carrera, NULL),
             'turnos', IF(t.id_turno IS NULL, JSON_ARRAY(), JSON_ARRAY(t.id_turno)),
             'principal', TRUE))
     WHERE p.areas IS NULL;
    ALTER TABLE registro_pendiente DROP COLUMN turno, DROP COLUMN rol_facultad, DROP COLUMN id_carrera;
  END IF;
END;;
DELIMITER ;

CALL migrar_areas_usuario();
DROP PROCEDURE migrar_areas_usuario;
