-- ===========================================================
-- Esquema de la base de datos sistemaaccesofacultad (MySQL 8.0)
-- Crea la BD, sus tablas y los catálogos (carreras, áreas y turnos). No incluye datos
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
CREATE TABLE IF NOT EXISTS `area` (
  `id_area` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `requiere_carrera` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'El área se asigna junto con una carrera',
  PRIMARY KEY (`id_area`),
  UNIQUE KEY `uq_area_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Áreas o papeles de las personas en la facultad';
CREATE TABLE IF NOT EXISTS `turno` (
  `id_turno` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) NOT NULL,
  PRIMARY KEY (`id_turno`),
  UNIQUE KEY `uq_turno_nombre` (`nombre`)
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
  `estatus` enum('Activo','Inactivo') DEFAULT NULL,
  `fecha_aceptacion_terminos` datetime DEFAULT NULL,
  PRIMARY KEY (`matricula`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `usuario_area` (
  `id_usuario_area` int NOT NULL AUTO_INCREMENT,
  `matricula` int NOT NULL,
  `id_area` int NOT NULL,
  `id_carrera` int DEFAULT NULL COMMENT 'Solo en áreas con requiere_carrera',
  `principal` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Área que se muestra en el lector y en los reportes',
  PRIMARY KEY (`id_usuario_area`),
  KEY `idx_usuario_area_matricula` (`matricula`),
  KEY `idx_usuario_area_area` (`id_area`),
  KEY `idx_usuario_area_carrera` (`id_carrera`),
  CONSTRAINT `fk_usuario_area_area` FOREIGN KEY (`id_area`) REFERENCES `area` (`id_area`),
  CONSTRAINT `fk_usuario_area_carrera` FOREIGN KEY (`id_carrera`) REFERENCES `carrera` (`id_carrera`),
  CONSTRAINT `fk_usuario_area_usuario` FOREIGN KEY (`matricula`) REFERENCES `usuario` (`matricula`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `usuario_area_turno` (
  `id_usuario_area` int NOT NULL,
  `id_turno` int NOT NULL,
  PRIMARY KEY (`id_usuario_area`,`id_turno`),
  KEY `idx_usuario_area_turno_turno` (`id_turno`),
  CONSTRAINT `fk_uat_turno` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`),
  CONSTRAINT `fk_uat_usuario_area` FOREIGN KEY (`id_usuario_area`) REFERENCES `usuario_area` (`id_usuario_area`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `visitante` (
  `id_visitante` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) DEFAULT NULL,
  `apellido_paterno` varchar(50) DEFAULT NULL,
  `apellido_materno` varchar(50) DEFAULT NULL,
  `fecha_registro` date DEFAULT NULL,
  `numero_telefono` varchar(15) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `codigo_acceso` varchar(10) DEFAULT NULL COMMENT 'Folio; el código de barras contiene "V-" + folio',
  `motivo` varchar(255) DEFAULT NULL,
  `tipo` enum('Ocasional','Frecuente') DEFAULT NULL,
  `vigente_hasta` datetime DEFAULT NULL COMMENT 'Fin de la vigencia del folio y del pase',
  PRIMARY KEY (`id_visitante`),
  UNIQUE KEY `uq_visitante_codigo` (`codigo_acceso`)
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
  `medio_entrada` enum('PEATONAL','VEHICULAR') DEFAULT NULL COMMENT 'Lector por el que entró',
  `medio_salida` enum('PEATONAL','VEHICULAR') DEFAULT NULL COMMENT 'Lector por el que salió',
  `cierre_automatico` datetime DEFAULT NULL COMMENT 'Momento en que el sistema cerró una entrada sin salida',
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
CREATE TABLE IF NOT EXISTS `registro_pendiente` (
  `token` char(32) NOT NULL COMMENT 'Token aleatorio del enlace de confirmación',
  `matricula` int NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido_paterno` varchar(50) NOT NULL,
  `apellido_materno` varchar(50) NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `numero_telefono` varchar(15) DEFAULT NULL,
  `correo` varchar(100) NOT NULL,
  `areas` json DEFAULT NULL COMMENT '[{id_area, id_carrera, turnos: [id_turno], principal}]',
  `fecha_solicitud` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expira_en` datetime NOT NULL,
  PRIMARY KEY (`token`),
  UNIQUE KEY `uq_pendiente_matricula` (`matricula`),
  KEY `idx_pendiente_expira` (`expira_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Registros que esperan la aceptación de Términos y Condiciones';
CREATE TABLE IF NOT EXISTS `notificacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo` enum('REGISTRO_CONFIRMADO','REGISTRO_RECHAZADO','REGISTRO_EXPIRADO','REGISTRO_ERROR','ACCESO_INCONSISTENTE','CIERRE_DIARIO') NOT NULL,
  `matricula` int DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `mensaje` text,
  `archivo` varchar(255) DEFAULT NULL COMMENT 'Ruta del PDF asociado',
  `fecha_hora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `leido` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_notificacion_fecha` (`fecha_hora`),
  KEY `idx_notificacion_leido` (`leido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Notificaciones del flujo de registro para el administrador';
CREATE TABLE IF NOT EXISTS `cierre_diario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha_operacion` date NOT NULL,
  `tipo` enum('PROGRAMADO','RECUPERACION') NOT NULL COMMENT 'RECUPERACION: días en que la app estaba apagada a la hora del cierre',
  `ejecutado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `registros_cerrados` int NOT NULL DEFAULT '0',
  `archivo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cierre_fecha_tipo` (`fecha_operacion`,`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Ejecuciones del cierre diario de accesos';

-- Catálogo de carreras
INSERT  IGNORE INTO `carrera` VALUES (1,'Ingenieria en Computacion'),
(2,'Ingenieria Quimica'),
(3,'Ingenieria Mecanica'),
(4,'Ingenieria en sistemas electronicos'),
(5,'Quimica Industrial'),
(6,'Matematicas aplicadas');

-- Áreas de la facultad (requiere_carrera = 1: la persona elige carrera en esa área)
INSERT  IGNORE INTO `area` VALUES (1,'Estudiante',1),
(2,'Docente',1),
(3,'Administrativo',1),
(4,'Dirección',1),
(5,'Jardinería',0),
(6,'Limpieza',0),
(7,'Seguridad',0),
(8,'Cafetería',0);

-- Turnos (una combinación de área puede tener varios)
INSERT  IGNORE INTO `turno` VALUES (1,'Matutino'),
(2,'Vespertino'),
(3,'Nocturno'),
(4,'Tiempo completo');

SET FOREIGN_KEY_CHECKS = 1;
