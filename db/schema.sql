-- ===========================================================
-- Esquema de la base de datos sistemaaccesofacultad (MySQL 8.0)
-- Crea la BD, sus tablas y el catálogo de carreras. No incluye datos
-- de usuarios, visitantes ni registros de acceso.
-- Uso: mysql -u root -p < db/schema.sql
-- ===========================================================

SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS sistemaaccesofacultad
    DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE sistemaaccesofacultad;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `carrera` (
  `id_carrera` int NOT NULL AUTO_INCREMENT,
  `nombre_carrera` varchar(100) NOT NULL,
  PRIMARY KEY (`id_carrera`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `usuario` (
  `matricula` int NOT NULL,
  `nombre` varchar(50) DEFAULT NULL,
  `apellido_paterno` varchar(50) DEFAULT NULL,
  `apellido_materno` varchar(50) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `fecha_registro` date DEFAULT NULL,
  `numero_telefono` varchar(15) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `turno` enum('Matutino','Vespertino') DEFAULT NULL,
  `rol_facultad` enum('Estudiante','Docente','Administrativo') DEFAULT NULL,
  `estatus` enum('Activo','Inactivo') DEFAULT NULL,
  `id_carrera` int DEFAULT NULL,
  PRIMARY KEY (`matricula`),
  KEY `fk_usuario_carrera` (`id_carrera`),
  CONSTRAINT `fk_usuario_carrera` FOREIGN KEY (`id_carrera`) REFERENCES `carrera` (`id_carrera`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `visitante` (
  `id_visitante` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) DEFAULT NULL,
  `apellido_paterno` varchar(50) DEFAULT NULL,
  `apellido_materno` varchar(50) DEFAULT NULL,
  `fecha_registro` date DEFAULT NULL,
  `numero_telefono` varchar(15) DEFAULT NULL,
  `correo` varchar(50) DEFAULT NULL,
  `codigo_acceso` varchar(6) DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `tipo` enum('Ocasional','Frecuente') DEFAULT NULL,
  PRIMARY KEY (`id_visitante`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `vehiculo` (
  `matricula` int DEFAULT NULL,
  `placa` varchar(15) NOT NULL,
  PRIMARY KEY (`placa`),
  KEY `matricula` (`matricula`),
  CONSTRAINT `vehiculo_ibfk_1` FOREIGN KEY (`matricula`) REFERENCES `usuario` (`matricula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `registroacceso` (
  `id_registro` int NOT NULL AUTO_INCREMENT,
  `matricula` int DEFAULT NULL,
  `id_visitante` int DEFAULT NULL,
  `fecha_entrada` datetime DEFAULT NULL,
  `fecha_salida` datetime DEFAULT NULL,
  PRIMARY KEY (`id_registro`),
  KEY `matricula` (`matricula`),
  KEY `id_visitante` (`id_visitante`),
  CONSTRAINT `registroacceso_ibfk_1` FOREIGN KEY (`matricula`) REFERENCES `usuario` (`matricula`),
  CONSTRAINT `registroacceso_ibfk_2` FOREIGN KEY (`id_visitante`) REFERENCES `visitante` (`id_visitante`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `accesos_fallidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `matricula_intentada` varchar(50) DEFAULT NULL COMMENT 'Matrícula o código QR que intentó acceder',
  `tipo_error` varchar(100) DEFAULT NULL COMMENT 'Tipo de error: MATRICULA_NO_ENCONTRADA, QR_INVALIDO, ERROR_BD, etc.',
  `descripcion` text COMMENT 'Descripción detallada del error',
  `fecha_hora` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora del intento fallido',
  `leido` tinyint(1) DEFAULT '0' COMMENT 'Indica si la notificación ha sido leída por el administrador',
  PRIMARY KEY (`id`),
  KEY `idx_fecha_hora` (`fecha_hora`),
  KEY `idx_leido` (`leido`),
  KEY `idx_tipo_error` (`tipo_error`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Registro de intentos de acceso fallidos para notificaciones (CU-08)';

-- Catálogo de carreras
INSERT  IGNORE INTO `carrera` VALUES (1,'Ingenieria en Computacion'),
(2,'Ingenieria Quimica'),
(3,'Ingenieria Mecanica'),
(4,'Ingenieria en sistemas electronicos'),
(5,'Quimica Industrial'),
(6,'Matematicas aplicadas');

SET FOREIGN_KEY_CHECKS = 1;
