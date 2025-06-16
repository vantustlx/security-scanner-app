// database.js
const { ipcMain } = require('electron');
const mysql = require('mysql2');
const path = require('path');

let ultimoUsuarioVerificado = null; // Para almacenar el usuario verificado

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
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

    // 1) INSERTAR USUARIO
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
            connection.query(insertQuery, valores, (err2, results2) => {
                if (err2) {
                    console.error('Error al insertar:', err2);
                    event.reply('registro-error', err2.message);
                } else {
                    console.log('Usuario registrado con ID:', results2.insertId);
                    event.reply('registro-exitoso', results2.insertId);
                }
            });
        });
    });

    // 2) OBTENER TODOS LOS USUARIOS
    ipcMain.on('obtener-usuarios', (event) => {
        connection.query('SELECT * FROM usuario', (err, results) => {
            if (err) {
                console.error('Error al obtener usuarios:', err);
                event.reply('consulta-error', err.message);
            } else {
                event.reply('lista-usuarios', results);
            }
        });
    });

    // 3) ELIMINAR USUARIO
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

    // 4) ACTUALIZAR USUARIO (completo)
    ipcMain.on('actualizar-usuario', (event, data) => {
        console.log('Recibida solicitud para actualizar usuario:', data);
        const updateQuery = `
            UPDATE usuario
            SET
                nombre = ?,
                apellido_paterno = ?,
                apellido_materno = ?,
                fecha_nacimiento = ?,
                numero_telefono = ?,
                correo = ?,
                turno = ?,
                rol_facultad = ?,
                estatus = ?,
                id_carrera = ?
            WHERE matricula = ?
        `;
        const valores = [
            data.nombre,
            data.apellido_paterno,
            data.apellido_materno,
            data.fecha_nacimiento,
            data.numero_telefono,
            data.correo,
            data.turno,
            data.rol_facultad,
            data.estatus,
            data.id_carrera,
            data.matricula
        ];
        connection.query(updateQuery, valores, (err, results) => {
            if (err) {
                console.error('Error al actualizar usuario:', err);
                event.reply('actualizacion-error', { success: false, error: err.message });
            } else if (results.affectedRows > 0) {
                console.log('Usuario actualizado con éxito');
                event.reply('actualizacion-exitosa', { success: true, matricula: data.matricula, affectedRows: results.affectedRows });
            } else {
                console.log('No se encontró el usuario para actualizar');
                event.reply('actualizacion-no-encontrada', { success: false, matricula: data.matricula, message: 'Usuario no encontrado' });
            }
        });
    });

    // 5) VERIFICAR MATRÍCULA (y guardar en ultimoUsuarioVerificado)
    ipcMain.on('verificar-matricula', (event, matricula) => {
        const query = 'SELECT * FROM usuario WHERE matricula = ?';
        console.log('Verificando matrícula:', matricula);
        connection.query(query, [matricula], (err, results) => {
            if (err) {
                console.error('Error al consultar matrícula:', err);
                return event.reply('resultado-verificacion', { success: false });
            }
            if (results.length > 0) {
                ultimoUsuarioVerificado = results[0];
                console.log('Matrícula válida:', matricula);
                event.reply('resultado-verificacion', { success: true });
            } else {
                console.warn('Matrícula no encontrada:', matricula);
                event.reply('resultado-verificacion', { success: false });
            }
        });
    });

    // 6) OBTENER ÚLTIMO USUARIO VERIFICADO
    ipcMain.on('obtener-ultimo-usuario', (event) => {
        if (ultimoUsuarioVerificado) {
            event.reply('enviar-ultimo-usuario', {
                nombre: ultimoUsuarioVerificado.nombre,
                apellido_paterno: ultimoUsuarioVerificado.apellido_paterno,
                apellido_materno: ultimoUsuarioVerificado.apellido_materno,
                matricula: ultimoUsuarioVerificado.matricula
            });
        } else {
            event.reply('enviar-ultimo-usuario', null);
        }
    });

    // 7) ASOCIAR PLACA → INSERTAR EN vehiculo
    ipcMain.on('asociar-placa', (event, { matricula, placa }) => {
        const insertQuery = 'INSERT INTO vehiculo (matricula, placa) VALUES (?, ?)';
        connection.query(insertQuery, [matricula, placa], (err, results) => {
            if (err) {
                console.error('Error al insertar en vehiculo:', err);
                return event.reply('asociacion-error', err.message);
            }
            event.reply('asociacion-exitosa', { success: results.affectedRows > 0 });
        });
    });

    // 8) REGISTRAR VISITANTE FRECUENTE
    ipcMain.on('registrar-visitante-frecuente', (event, data) => {
        const checkSql = 'SELECT codigo_acceso FROM visitante WHERE correo = ? AND tipo = "Frecuente"';
        connection.query(checkSql, [data.correo], (err, rows) => {
            if (err) {
                console.error('Error al verificar visitante:', err);
                return event.reply('registro-visitante-error', err.message);
            }
            if (rows.length > 0) {
                return event.reply('registro-visitante-existente', { folio: rows[0].codigo_acceso });
            }
            const codigo = Math.random().toString(36).substr(2, 6).toUpperCase();
            const ahora = new Date();
            const insertSql = `
                INSERT INTO visitante
                    (nombre, apellido_paterno, apellido_materno, fecha_registro,
                     numero_telefono, correo, codigo_acceso, motivo, tipo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Frecuente')
            `;
            const params = [
                data.nombre,
                data.apellidoP,
                data.apellidoM,
                ahora,
                data.telefono,
                data.correo,
                codigo,
                data.motivo
            ];
            connection.query(insertSql, params, (err2) => {
                if (err2) {
                    console.error('Error al insertar visitante frecuente:', err2);
                    return event.reply('registro-visitante-error', err2.message);
                }
                event.reply('registro-visitante-exitoso', { folio: codigo });
            });
        });
    });

    // 9) REGISTRAR VISITANTE TEMPORAL
    ipcMain.on('registrar-visitante-temporal', (event, data) => {
        const checkSql = 'SELECT codigo_acceso FROM visitante WHERE correo = ? AND tipo = "Ocasional"';
        connection.query(checkSql, [data.correo], (err, rows) => {
            if (err) {
                console.error('Error al verificar visitante:', err);
                return event.reply('registro-visitante-error', err.message);
            }
            if (rows.length > 0) {
                return event.reply('registro-visitante-existente', { folio: rows[0].codigo_acceso });
            }
            const codigo = Math.random().toString(36).substr(2, 6).toUpperCase();
            const ahora = new Date();
            const insertSql = `
                INSERT INTO visitante
                    (nombre, apellido_paterno, apellido_materno, fecha_registro,
                     numero_telefono, correo, codigo_acceso, motivo, tipo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Ocasional')
            `;
            const params = [
                data.nombre,
                data.apellidoP,
                data.apellidoM,
                ahora,
                data.telefono,
                data.correo,
                codigo,
                data.motivo
            ];
            connection.query(insertSql, params, (err2) => {
                if (err2) {
                    console.error('Error al insertar visitante ocasional:', err2);
                    return event.reply('registro-visitante-error', err2.message);
                }
                event.reply('registro-visitante-exitoso', { folio: codigo });
            });
        });
    });

    // 10) VERIFICAR CÓDIGO DE ACCESO
    ipcMain.on('verificar-codigo-acceso', (event, codigo) => {
        const sql = 'SELECT * FROM visitante WHERE codigo_acceso = ?';
        connection.query(sql, [codigo], (err, rows) => {
            if (err) {
                console.error('Error al verificar acceso:', err);
                return event.reply('acceso-error', err.message);
            }
            if (rows.length === 0) {
                return event.reply('acceso-invalid', null);
            }
            const v = rows[0];
            if (v.tipo === 'Ocasional') {
                const hoy = new Date();
                const reg = new Date(v.fecha_registro);
                if (reg.toDateString() !== hoy.toDateString()) {
                    return event.reply('acceso-invalid', null);
                }
            }
            event.reply('acceso-valid', {
                nombre: v.nombre,
                apellidoP: v.apellido_paterno,
                apellidoM: v.apellido_materno,
                tipo: v.tipo,
                matricula: v.matricula || ''
            });
        });
    });

    // Funcionalidades adicionales para administrador:
    // 11) BUSCAR USUARIOS por nombre/apellidos
    ipcMain.on('buscar-usuarios', (event, parametros) => {
        const { nombre, apellido_paterno, apellido_materno } = parametros;
        console.log('Buscando usuarios con parámetros:', parametros);
        const query = `
            SELECT
                matricula,
                nombre,
                apellido_paterno,
                apellido_materno,
                numero_telefono,
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
                event.reply('usuarios-encontrados', { usuarios: results, total: results.length });
            }
        });
    });

    // 12) BUSCAR GRUPO DE USUARIOS por rol, carrera y turno
    ipcMain.on('buscar-grupo-usuarios', (event, filtros) => {
        const { rol, carrera, turno } = filtros;
        console.log('Buscando grupo de usuarios con filtros:', filtros);
        const query = `
            SELECT
                nombre,
                apellido_paterno,
                apellido_materno,
                matricula,
                numero_telefono,
                estatus,
                fecha_registro
            FROM usuario
            WHERE
                estatus = 'Activo'
                AND rol_facultad = ?
                AND id_carrera = ?
                AND turno = ?
            ORDER BY apellido_paterno, apellido_materno, nombre
        `;
        connection.query(query, [rol, carrera, turno], (err, results) => {
            if (err) {
                console.error('Error al buscar grupo de usuarios:', err);
                event.reply('busqueda-grupo-error', err.message);
            } else {
                console.log(`Búsqueda de grupo completada. Encontrados: ${results.length} usuarios`);
                event.reply('resultados-grupo-usuarios', results);
            }
        });
    });

    // 13) BUSCAR USUARIO ESPECÍFICO (name match)
    ipcMain.on('buscar-usuario-especifico', (event, filtros) => {
        const { nombre, apellidoP, apellidoM } = filtros;
        console.log('Buscando usuario específico con filtros:', filtros);
        const query = `
            SELECT
                nombre,
                apellido_paterno,
                apellido_materno,
                matricula,
                numero_telefono,
                estatus,
                fecha_registro
            FROM usuario
            WHERE
                estatus = 'Activo'
                AND nombre LIKE CONCAT('%', ?, '%')
                AND apellido_paterno LIKE CONCAT('%', ?, '%')
                AND apellido_materno LIKE CONCAT('%', ?, '%')
            ORDER BY apellido_paterno, apellido_materno, nombre
            LIMIT 1
        `;
        connection.query(query, [nombre, apellidoP, apellidoM], (err, results) => {
            if (err) {
                console.error('Error al buscar usuario específico:', err);
                event.reply('busqueda-especifica-error', err.message);
            } else if (results.length > 0) {
                console.log('Usuario específico encontrado');
                event.reply('resultados-usuario-especifico', results);
            } else {
                console.log('No se encontró usuario específico');
                event.reply('resultados-usuario-especifico', []);
            }
        });
    });
}

module.exports = { setupDBListeners };
