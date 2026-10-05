-- ===========================================================
-- Rollback de 2026-10-05_areas_usuario.sql
-- Restaura rol_facultad, id_carrera y turno a partir de la combinación
-- principal de cada usuario. Se PIERDEN las combinaciones adicionales, las
-- áreas que no existían antes (Dirección, Jardinería, Limpieza, Seguridad,
-- Cafetería: quedan con rol NULL) y los turnos Nocturno y Tiempo completo.
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

DROP PROCEDURE IF EXISTS revertir_areas_usuario;
DELIMITER ;;
CREATE PROCEDURE revertir_areas_usuario()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = 'usuario' AND column_name = 'rol_facultad') THEN
    ALTER TABLE usuario
      ADD COLUMN turno ENUM('Matutino','Vespertino') DEFAULT NULL AFTER correo,
      ADD COLUMN rol_facultad ENUM('Estudiante','Docente','Administrativo') DEFAULT NULL AFTER turno,
      ADD COLUMN id_carrera INT DEFAULT NULL AFTER estatus,
      ADD KEY fk_usuario_carrera (id_carrera),
      ADD CONSTRAINT fk_usuario_carrera FOREIGN KEY (id_carrera) REFERENCES carrera (id_carrera);

    UPDATE usuario u
      JOIN usuario_area ua ON ua.matricula = u.matricula AND ua.principal = 1
      JOIN area a ON a.id_area = ua.id_area
       SET u.rol_facultad = IF(a.nombre IN ('Estudiante','Docente','Administrativo'), a.nombre, NULL),
           u.id_carrera = ua.id_carrera,
           u.turno = (SELECT t.nombre FROM usuario_area_turno uat JOIN turno t ON t.id_turno = uat.id_turno
                       WHERE uat.id_usuario_area = ua.id_usuario_area AND t.nombre IN ('Matutino','Vespertino')
                       ORDER BY t.id_turno LIMIT 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = 'registro_pendiente' AND column_name = 'rol_facultad') THEN
    ALTER TABLE registro_pendiente
      ADD COLUMN turno ENUM('Matutino','Vespertino') DEFAULT NULL AFTER correo,
      ADD COLUMN rol_facultad ENUM('Estudiante','Docente','Administrativo') DEFAULT NULL AFTER turno,
      ADD COLUMN id_carrera INT DEFAULT NULL AFTER rol_facultad;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'registro_pendiente' AND column_name = 'areas') THEN
    ALTER TABLE registro_pendiente DROP COLUMN areas;
  END IF;
END;;
DELIMITER ;

CALL revertir_areas_usuario();
DROP PROCEDURE revertir_areas_usuario;

DROP TABLE IF EXISTS usuario_area_turno;
DROP TABLE IF EXISTS usuario_area;
DROP TABLE IF EXISTS turno;
DROP TABLE IF EXISTS area;
