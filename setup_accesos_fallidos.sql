-- Script SQL para crear la tabla accesos_fallidos en la base de datos de producción
-- Este script implementa CU-08: Notificar accesos fallidos

USE sistemaaccesofacultad;

-- Crear tabla accesos_fallidos si no existe
CREATE TABLE IF NOT EXISTS accesos_fallidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricula_intentada VARCHAR(50) COMMENT 'Matrícula o código QR que intentó acceder',
    tipo_error VARCHAR(100) COMMENT 'Tipo de error: MATRICULA_NO_ENCONTRADA, QR_INVALIDO, ERROR_BD, etc.',
    descripcion TEXT COMMENT 'Descripción detallada del error',
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora del intento fallido',
    leido BOOLEAN DEFAULT FALSE COMMENT 'Indica si la notificación ha sido leída por el administrador',
    INDEX idx_fecha_hora (fecha_hora),
    INDEX idx_leido (leido),
    INDEX idx_tipo_error (tipo_error)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Registro de intentos de acceso fallidos para notificaciones (CU-08)';

-- Mostrar estructura de la tabla creada
DESCRIBE accesos_fallidos;

-- Consulta de ejemplo para ver los accesos fallidos más recientes
SELECT
    id,
    matricula_intentada,
    tipo_error,
    descripcion,
    fecha_hora,
    leido
FROM accesos_fallidos
ORDER BY fecha_hora DESC
LIMIT 10;
