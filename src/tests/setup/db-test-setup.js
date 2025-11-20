// tests/setup/db-test-setup.js
const mysql = require('mysql2/promise');

// Configuración de conexión
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  port: 3306
};

const TEST_DB_NAME = 'sistemaaccesofacultad_test';

/**
 * Crea y configura la base de datos de pruebas
 */
async function setupTestDatabase() {
  let connection;
  
  try {
    // Conectar sin especificar base de datos
    connection = await mysql.createConnection(DB_CONFIG);
    
    console.log('🔧 Configurando base de datos de pruebas...');
    
    // Eliminar BD de pruebas si existe
    await connection.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    console.log(`   ✓ Base de datos anterior eliminada`);
    
    // Crear nueva BD de pruebas
    await connection.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    console.log(`   ✓ Base de datos "${TEST_DB_NAME}" creada`);
    
    // Usar la BD de pruebas
    await connection.query(`USE ${TEST_DB_NAME}`);
    
    // Crear tabla de carreras
    await connection.query(`
      CREATE TABLE IF NOT EXISTS carrera (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        codigo VARCHAR(20) UNIQUE NOT NULL
      )
    `);
    console.log('   ✓ Tabla "carrera" creada');
    
    // Insertar carreras
    const carreras = [
      [1, 'Ingeniería en Computación', 'IC'],
      [2, 'Ingeniería Química', 'IQ'],
      [3, 'Ingeniería Mecánica', 'IM'],
      [4, 'Ingeniería en Sistemas Electrónicos', 'ISE'],
      [5, 'Química Industrial', 'QI'],
      [6, 'Matemáticas Aplicadas', 'MA']
    ];
    
    for (const [id, nombre, codigo] of carreras) {
      await connection.query(
        'INSERT INTO carrera (id, nombre, codigo) VALUES (?, ?, ?)',
        [id, nombre, codigo]
      );
    }
    console.log('   ✓ Carreras insertadas');
    
    // Crear tabla de usuarios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        matricula INT UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido_paterno VARCHAR(100) NOT NULL,
        apellido_materno VARCHAR(100) NOT NULL,
        fecha_nacimiento DATE NOT NULL,
        fecha_registro DATE NOT NULL,
        numero_telefono VARCHAR(15) NOT NULL,
        correo VARCHAR(100) UNIQUE NOT NULL,
        turno VARCHAR(20) NOT NULL,
        rol_facultad VARCHAR(50) NOT NULL,
        estatus VARCHAR(20) NOT NULL DEFAULT 'Inactivo',
        id_carrera INT NOT NULL,
        FOREIGN KEY (id_carrera) REFERENCES carrera(id),
        INDEX idx_matricula (matricula),
        INDEX idx_correo (correo),
        INDEX idx_estatus (estatus)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('   ✓ Tabla "usuario" creada');
    
    // Crear tabla de vehículos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vehiculo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        matricula INT NOT NULL,
        placa VARCHAR(20) NOT NULL,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (matricula) REFERENCES usuario(matricula),
        INDEX idx_placa (placa)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('   ✓ Tabla "vehiculo" creada');
    
    // Crear tabla de visitantes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS visitante (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido_paterno VARCHAR(100) NOT NULL,
        apellido_materno VARCHAR(100) NOT NULL,
        fecha_registro DATETIME NOT NULL,
        numero_telefono VARCHAR(15) NOT NULL,
        correo VARCHAR(100) NOT NULL,
        codigo_acceso VARCHAR(20) UNIQUE NOT NULL,
        motivo TEXT,
        tipo VARCHAR(20) NOT NULL,
        matricula INT NULL,
        INDEX idx_codigo (codigo_acceso),
        INDEX idx_tipo (tipo),
        INDEX idx_fecha (fecha_registro)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('   ✓ Tabla "visitante" creada');

    // Crear tabla de accesos (para registro de autenticaciones QR)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS accesos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        matricula INT NOT NULL,
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tipo_acceso VARCHAR(20) NOT NULL DEFAULT 'QR',
        exitoso BOOLEAN NOT NULL DEFAULT true,
        FOREIGN KEY (matricula) REFERENCES usuario(matricula),
        INDEX idx_matricula_acceso (matricula),
        INDEX idx_fecha_acceso (fecha_hora)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('   ✓ Tabla "accesos" creada');
    
    // Insertar usuarios de prueba
    await insertTestUsers(connection);
    
    console.log('✅ Base de datos de pruebas configurada exitosamente\n');
    
  } catch (error) {
    console.error('❌ Error al configurar base de datos de pruebas:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Inserta usuarios de prueba en la base de datos
 */
async function insertTestUsers(connection) {
  const testUsers = [
    {
      matricula: 12345678,
      nombre: 'Usuario',
      apellido_paterno: 'Prueba',
      apellido_materno: 'Existente',
      fecha_nacimiento: '1995-01-01',
      fecha_registro: '2024-01-01',
      numero_telefono: '2221234567',
      correo: 'usuario.existente@test.com',
      turno: 'Matutino',
      rol_facultad: 'Estudiante',
      estatus: 'Activo',
      id_carrera: 1
    },
    {
      matricula: 87654321,
      nombre: 'María',
      apellido_paterno: 'González',
      apellido_materno: 'López',
      fecha_nacimiento: '1998-05-15',
      fecha_registro: '2024-02-01',
      numero_telefono: '2229876543',
      correo: 'maria.gonzalez@test.com',
      turno: 'Vespertino',
      rol_facultad: 'Estudiante',
      estatus: 'Activo',
      id_carrera: 2
    },
    {
      matricula: 11223344,
      nombre: 'Carlos',
      apellido_paterno: 'Ramírez',
      apellido_materno: 'Torres',
      fecha_nacimiento: '1990-08-20',
      fecha_registro: '2024-01-15',
      numero_telefono: '2225556677',
      correo: 'carlos.ramirez@test.com',
      turno: 'Matutino',
      rol_facultad: 'Docente',
      estatus: 'Activo',
      id_carrera: 3
    }
  ];
  
  for (const user of testUsers) {
    await connection.query(
      `INSERT INTO usuario 
       (matricula, nombre, apellido_paterno, apellido_materno, fecha_nacimiento,
        fecha_registro, numero_telefono, correo, turno, rol_facultad, estatus, id_carrera)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.matricula, user.nombre, user.apellido_paterno, user.apellido_materno,
        user.fecha_nacimiento, user.fecha_registro, user.numero_telefono, user.correo,
        user.turno, user.rol_facultad, user.estatus, user.id_carrera
      ]
    );
  }
  
  console.log('   ✓ Usuarios de prueba insertados');
}

/**
 * Limpia la base de datos de pruebas eliminando datos insertados durante las pruebas
 */
async function cleanTestDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      ...DB_CONFIG,
      database: TEST_DB_NAME
    });
    
    console.log('🧹 Limpiando base de datos de pruebas...');
    
    // Eliminar registros que no son de prueba base (mantener los 3 usuarios base)
    const baseMatriculas = [12345678, 87654321, 11223344];
    const placeholders = baseMatriculas.map(() => '?').join(',');
    
    await connection.query(
      `DELETE FROM vehiculo WHERE matricula NOT IN (${placeholders})`,
      baseMatriculas
    );
    
    await connection.query(
      `DELETE FROM usuario WHERE matricula NOT IN (${placeholders})`,
      baseMatriculas
    );
    
    await connection.query('DELETE FROM visitante');
    
    console.log('✅ Base de datos limpiada\n');
    
  } catch (error) {
    console.error('❌ Error al limpiar base de datos:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Elimina completamente la base de datos de pruebas
 */
async function dropTestDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    console.log('🗑️  Eliminando base de datos de pruebas...');
    await connection.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    console.log('✅ Base de datos de pruebas eliminada\n');
    
  } catch (error) {
    console.error('❌ Error al eliminar base de datos:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

module.exports = {
  setupTestDatabase,
  cleanTestDatabase,
  dropTestDatabase,
  TEST_DB_NAME
};