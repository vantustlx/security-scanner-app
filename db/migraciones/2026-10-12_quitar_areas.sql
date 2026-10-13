-- ===========================================================
-- Quita las áreas Dirección, Jardinería, Limpieza, Seguridad y Cafetería.
-- Quedan Estudiante, Docente y Administrativo.
--
-- Se detiene sin borrar nada si algún usuario sigue asignado a esas áreas o si una
-- solicitud de registro pendiente las usa: reasígnalos primero (Actualizar datos). En ese caso
-- queda creado el procedimiento verificar_areas_a_quitar; se borra al volver a ejecutar el script.
--
-- Uso:      mysql -u root -p < db/migraciones/2026-10-12_quitar_areas.sql
-- Rollback: mysql -u root -p < db/migraciones/2026-10-12_quitar_areas_rollback.sql
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

DROP PROCEDURE IF EXISTS verificar_areas_a_quitar;
DELIMITER //
CREATE PROCEDURE verificar_areas_a_quitar()
BEGIN
  DECLARE ids JSON;
  SELECT JSON_ARRAYAGG(id_area) INTO ids
    FROM area WHERE nombre IN ('Dirección', 'Jardinería', 'Limpieza', 'Seguridad', 'Cafetería');

  IF EXISTS (SELECT 1 FROM usuario_area ua
               JOIN area a ON a.id_area = ua.id_area
              WHERE a.nombre IN ('Dirección', 'Jardinería', 'Limpieza', 'Seguridad', 'Cafetería')) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Hay usuarios en las areas a quitar; reasignalos antes de aplicar la migracion';
  END IF;

  IF ids IS NOT NULL AND EXISTS (SELECT 1 FROM registro_pendiente
                                  WHERE JSON_OVERLAPS(JSON_EXTRACT(areas, '$[*].id_area'), ids)) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Hay solicitudes de registro pendientes con las areas a quitar';
  END IF;
END//
DELIMITER ;

CALL verificar_areas_a_quitar();
DROP PROCEDURE verificar_areas_a_quitar;

DELETE FROM area WHERE nombre IN ('Dirección', 'Jardinería', 'Limpieza', 'Seguridad', 'Cafetería');
