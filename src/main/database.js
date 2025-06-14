// Sección para manejar la lógica de la base de datos
const { ipcMain } = require('electron');
const mysql = require('mysql2');
const path = require('path');

// Crea la conexión a tu base de dato
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'CarlosDani19/#',
    database: 'sistemaaccesofacultad',
    port: 3306
});

function setupDBListeners() {
    // Verificar la conexión
    connection.connect((err) => {
        if (err) {
            console.error('Error al conectar a la base de datos:', err);
            return;
        }
        console.log('Conexión exitosa a la base de datos MySQL');
    });

    //insertar usuario
    ipcMain.on('registrar-usuario-completo', (event, data) => {
        const checkQuery = 'SELECT * FROM usuario WHERE matricula = ?';

        connection.query(checkQuery, [data.matricula], (err, results) => {
            if (err) {
                console.error('Error al verificar existencia:', err);
                event.reply('registro-error', err.message);
                return;
            }

            if (results.length > 0) {
                console.warn('Matrícula ya registrada:', data.matricula);
                event.reply('usuario-ya-existe');
                return;
            }

            const insertQuery = `
                INSERT INTO usuario (
                    matricula, nombre, apellido_paterno, apellido_materno,
                    fecha_nacimiento, fecha_registro, numero_telefono, correo,
                    turno, rol_facultad, estatus, id_carrera
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const valores = [
                data.matricula, data.nombre, data.apellido_paterno, data.apellido_materno,
                data.fecha_nacimiento, data.fecha_registro, data.numero_telefono, data.correo,
                data.turno, data.rol_facultad, data.estatus, data.id_carrera
            ];

            connection.query(insertQuery, valores, (err, results) => {
                if (err) {
                    console.error('Error al insertar:', err);
                    event.reply('registro-error', err.message);
                } else {
                    console.log('Usuario registrado con ID:', results.insertId);
                    event.reply('registro-exitoso', results.insertId);
                }
            });
        });
    });

    // Obtener todos los usuarios (CORREGIDO: cambiado "usuarios" a "usuario" para consistencia)
    ipcMain.on('obtener-usuarios', (event) => {
        connection.query('SELECT * FROM usuario', (err, results) => {
            if (err) {
                console.error('Error al obtener usuarios:', err);
                event.reply('consulta-error', err.message);
            } else {
                event.reply('lista-usuarios', results); // Devuelve los datos al renderer
            }
        });
    });

    // Eliminar usuario por ID (CORREGIDO: cambiado "usuarios" a "usuario" para consistencia)
    ipcMain.on('eliminar-usuario', (event, id) => {
        connection.query('DELETE FROM usuario WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error('Error al eliminar usuario:', err);
                event.reply('eliminacion-error', err.message);
            } else {
                event.reply('usuario-eliminado', results.affectedRows);
            }
        });
    });

    // Actualizar nombre de un usuario (CORREGIDO: cambiado "usuarios" a "usuario" para consistencia)
    ipcMain.on('actualizar-usuario', (event, data) => {
        connection.query('UPDATE usuario SET nombre = ? WHERE id = ?', [data.nombre, data.id], (err, results) => {
            if (err) {
                console.error('Error al actualizar usuario:', err);
                event.reply('actualizacion-error', err.message);
            } else {
                event.reply('usuario-actualizado', results.changedRows);
            }
        });
    });

    // Verificar matrícula escaneada desde QR
    ipcMain.on('verificar-matricula', (event, matricula) => {
        const query = 'SELECT * FROM usuario WHERE matricula = ?';

        console.log('Verificando matrícula:', matricula);
        
        connection.query(query, [matricula], (err, results) => {
            if (err) {
                console.error('Error al consultar matrícula:', err);
                event.reply('resultado-verificacion', false);
                return;
            }

            if (results.length > 0) {
                console.log('Matrícula válida:', matricula);
                event.reply('resultado-verificacion', true);
            } else {
                console.warn('Matrícula no encontrada:', matricula);
                event.reply('resultado-verificacion', false);
            }
        });
    });


     // NUEVA FUNCIÓN: Buscar usuarios por nombre y apellidos
    ipcMain.on('buscar-usuarios', (event, parametros) => {
        const { nombre, apellido_paterno, apellido_materno } = parametros;
        
        console.log('Buscando usuarios con parámetros:', parametros);
        
        const query = `
            SELECT 
                matricula,
                nombre,
                apellido_paterno,
                apellido_materno,
                correo,
                CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno, ' ', matricula) as nombre_completo
            FROM usuario 
            WHERE 
                (nombre LIKE CONCAT('%', ?, '%') OR ? = '') 
                AND (apellido_paterno LIKE CONCAT('%', ?, '%') OR ? = '') 
                AND (apellido_materno LIKE CONCAT('%', ?, '%') OR ? = '') 
            ORDER BY apellido_paterno, apellido_materno, nombre
        `;
        
        const parametrosQuery = [
            nombre, nombre,
            apellido_paterno, apellido_paterno,
            apellido_materno, apellido_materno
        ];
        
        connection.query(query, parametrosQuery, (err, results) => {
            if (err) {
                console.error('Error al buscar usuarios:', err);
                event.reply('busqueda-error', err.message);
            } else {
                console.log(`Búsqueda completada. Encontrados: ${results.length} usuarios`);
                event.reply('usuarios-encontrados', {
                    usuarios: results,
                    total: results.length
                });
            }
        });
    });
}

module.exports = { setupDBListeners };
