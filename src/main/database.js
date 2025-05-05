
/*document.getElementById('boton-verde').addEventListener('click', () => {
        const nombre = document.getElementById('nombre').value;
        ipcRenderer.send('registrar-usuario', { nombre });
    });*/

//Sección para manejar la lógica de la base de datos
const { ipcMain } = require('electron');
const mysql = require('mysql2');
const path = require('path');

// Crea la conexión a tu base de datos
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'CarlosDani19/#',
    database: 'sistemaaccesofacultad',
    port: 3306
});

function setupDBListeners() {
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




    // Obtener todos los usuarios
    ipcMain.on('obtener-usuarios', (event) => {
        connection.query('SELECT * FROM usuarios', (err, results) => {
            if (err) {
                console.error('Error al obtener usuarios:', err);
                event.reply('consulta-error', err.message);
            } else {
                event.reply('lista-usuarios', results); // Devuelve los datos al renderer
            }
        });
    });

    // Eliminar usuario por ID
    ipcMain.on('eliminar-usuario', (event, id) => {
        connection.query('DELETE FROM usuarios WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error('Error al eliminar usuario:', err);
                event.reply('eliminacion-error', err.message);
            } else {
                event.reply('usuario-eliminado', results.affectedRows);
            }
        });
    });

    // Actualizar nombre de un usuario
    ipcMain.on('actualizar-usuario', (event, data) => {
        connection.query('UPDATE usuarios SET nombre = ? WHERE id = ?', [data.nombre, data.id], (err, results) => {
            if (err) {
                console.error('Error al actualizar usuario:', err);
                event.reply('actualizacion-error', err.message);
            } else {
                event.reply('usuario-actualizado', results.changedRows);
            }
        });
    });
}

module.exports = { setupDBListeners };
