
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
    // Insertar usuario
    ipcMain.on('registrar-usuario', (event, data) => {
        const query = 'INSERT INTO usuarios (nombre) VALUES (?)';
        connection.query(query, [data.nombre], (err, results) => {
            if (err) {
                console.error('Error al insertar en MySQL:', err);
                event.reply('registro-error', err.message);
            } else {
                console.log('Usuario registrado con ID:', results.insertId);
                event.reply('registro-exitoso', results.insertId);
            }
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
