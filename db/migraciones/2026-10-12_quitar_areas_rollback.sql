-- ===========================================================
-- Rollback de 2026-10-12_quitar_areas.sql: vuelve a crear las áreas con sus id originales.
-- Uso: mysql -u root -p < db/migraciones/2026-10-12_quitar_areas_rollback.sql
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

INSERT IGNORE INTO area (id_area, nombre, requiere_carrera) VALUES
(4, 'Dirección', 1),
(5, 'Jardinería', 0),
(6, 'Limpieza', 0),
(7, 'Seguridad', 0),
(8, 'Cafetería', 0);
