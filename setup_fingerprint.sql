-- ===========================================================
-- Script de configuración para sistema de huellas dactilares
-- Base de datos: sistemaaccesofacultad
-- ===========================================================

USE sistemaaccesofacultad;

-- Verificar que la tabla usuario existe
SELECT 'Verificando tabla usuario...' AS Status;
DESCRIBE usuario;

-- Verificar que la tabla huella existe
SELECT 'Verificando tabla huella...' AS Status;
DESCRIBE huella;

-- Si la tabla huella NO existe, créala con este comando:
-- (Descomenta si es necesario)
/*
CREATE TABLE IF NOT EXISTS huella (
    id_huella INT AUTO_INCREMENT PRIMARY KEY,
    matricula INT NOT NULL,
    radio FLOAT DEFAULT NULL,
    perimetro_max FLOAT DEFAULT NULL,
    perimetro_min FLOAT DEFAULT NULL,
    area FLOAT DEFAULT NULL,
    promedio FLOAT DEFAULT NULL,
    elipse FLOAT DEFAULT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (matricula) REFERENCES usuario(matricula) ON DELETE CASCADE,
    INDEX idx_matricula (matricula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/

-- Agregar campo fecha_registro si no existe
SELECT 'Agregando campo fecha_registro...' AS Status;
ALTER TABLE huella
ADD COLUMN IF NOT EXISTS fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Crear índice para mejorar el rendimiento
SELECT 'Creando índices...' AS Status;
CREATE INDEX IF NOT EXISTS idx_matricula ON huella(matricula);

-- Mostrar estructura final
SELECT 'Estructura final de tabla huella:' AS Status;
DESCRIBE huella;

-- Mostrar estadísticas
SELECT
    COUNT(*) AS total_usuarios,
    (SELECT COUNT(*) FROM huella) AS total_huellas_registradas,
    (SELECT COUNT(DISTINCT matricula) FROM huella) AS usuarios_con_huella
FROM usuario;

-- Configuración recomendada para optimización
SET GLOBAL max_allowed_packet = 67108864; -- 64MB para imágenes grandes si fuera necesario

SELECT '✓ Configuración completada exitosamente!' AS Status;
