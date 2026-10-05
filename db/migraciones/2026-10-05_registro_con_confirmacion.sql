-- ===========================================================
-- Migración: registro con confirmación por correo
-- Base de datos: sistemaaccesofacultad (MySQL 8.0)
-- Rollback: 2026-10-05_registro_con_confirmacion_rollback.sql
--
-- El usuario ya no se inserta al llenar el formulario: queda en
-- registro_pendiente hasta que acepta (o rechaza) los Términos y
-- Condiciones desde el correo. El resultado se avisa al administrador
-- en la tabla notificacion.
-- ===========================================================

SET NAMES utf8mb4;
USE sistemaaccesofacultad;

-- 1) Solicitudes de registro esperando la respuesta del usuario
CREATE TABLE IF NOT EXISTS registro_pendiente (
  token CHAR(32) NOT NULL COMMENT 'Token aleatorio del enlace de confirmación',
  matricula INT NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  apellido_paterno VARCHAR(50) NOT NULL,
  apellido_materno VARCHAR(50) NOT NULL,
  fecha_nacimiento DATE DEFAULT NULL,
  numero_telefono VARCHAR(15) DEFAULT NULL,
  correo VARCHAR(100) NOT NULL,
  turno ENUM('Matutino','Vespertino') DEFAULT NULL,
  rol_facultad ENUM('Estudiante','Docente','Administrativo') DEFAULT NULL,
  id_carrera INT DEFAULT NULL,
  fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en DATETIME NOT NULL,
  PRIMARY KEY (token),
  UNIQUE KEY uq_pendiente_matricula (matricula),
  KEY idx_pendiente_expira (expira_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Registros que esperan la aceptación de Términos y Condiciones';

-- 2) Avisos para el administrador
CREATE TABLE IF NOT EXISTS notificacion (
  id INT NOT NULL AUTO_INCREMENT,
  tipo ENUM('REGISTRO_CONFIRMADO','REGISTRO_RECHAZADO','REGISTRO_EXPIRADO','REGISTRO_ERROR') NOT NULL,
  matricula INT DEFAULT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leido TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_notificacion_fecha (fecha_hora),
  KEY idx_notificacion_leido (leido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Notificaciones del flujo de registro para el administrador';

-- 3) Evidencia de cuándo aceptó cada usuario los Términos y Condiciones
--    (MySQL 8 no soporta ADD COLUMN IF NOT EXISTS)
SET @existe := (SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'usuario'
                  AND column_name = 'fecha_aceptacion_terminos');
SET @sql := IF(@existe = 0,
  'ALTER TABLE usuario ADD COLUMN fecha_aceptacion_terminos DATETIME DEFAULT NULL AFTER id_carrera',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
