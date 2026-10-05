// database.js
const { ipcMain } = require('electron');
const mysql = require('mysql2');
const path = require('path');
const config = require('./config');

// Configuración de la conexión (credenciales en .env)
const dbConfig = {
  host: config.db.host,
  user: config.db.usuario,
  password: config.db.password,
  database: config.db.nombre,
  port: config.db.port
};
if (!dbConfig.user || dbConfig.password === undefined) {
  console.error('[DB] Falta configurar DB_USER y DB_PASSWORD en .env');
}

// Log para confirmar qué BD se está usando
console.log(`[DB] Conectando a base de datos: ${dbConfig.database}`);

// Crear conexión
const connection = mysql.createConnection(dbConfig);

// Pool con promesas para los módulos que usan async/await y transacciones (registro, notificaciones)
const pool = mysql.createPool({ ...dbConfig, connectionLimit: 4 }).promise();

function setupDBListeners() {
    // Verificar la conexión
    connection.connect((err) => {
        if (err) {
            console.error('Error al conectar a la base de datos:', err);
            return;
        }
        console.log('Conexión exitosa a la base de datos MySQL');
    });

    // 1) El alta de usuarios está en registro.js (requiere confirmación por correo)

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

    // 5) y 6) El registro de entradas/salidas y la búsqueda por matrícula están en acceso.js

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
                fecha_nacimiento,
                id_carrera,
                correo,
                turno,
                rol_facultad,
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

module.exports = { setupDBListeners, pool };

// BD con fechas
ipcMain.on('buscar-grupo-usuarios-con-fechas', (event, filtros) => {
    const { rol, carrera, turno, fechaInicio, fechaFin } = filtros;
    console.log('📘 Buscando grupo de usuarios con filtros:', filtros);

    let query = `
        SELECT 
            u.nombre,
            u.apellido_paterno,
            u.apellido_materno,
            u.matricula,
            u.numero_telefono,
            r.fecha_entrada,
            r.fecha_salida
        FROM usuario u
        INNER JOIN registroacceso r ON u.matricula = r.matricula
        WHERE 
            u.rol_facultad = ?
            AND u.id_carrera = ?
            AND u.turno = ?
    `;
    

    const params = [rol, carrera, turno];

    // Filtro de fechas si aplica
    if (fechaInicio && fechaFin) {
        query += `
            AND (
                (r.fecha_entrada BETWEEN ? AND ?)
                OR (r.fecha_salida BETWEEN ? AND ?)
            )
        `;
        params.push(fechaInicio, fechaFin, fechaInicio, fechaFin);
    }

    query += `
        ORDER BY u.apellido_paterno, u.apellido_materno, r.fecha_entrada;
    `;

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Error al buscar grupo de usuarios:', err);
            event.reply('busqueda-grupo-error', err.message);
        } else {
            console.log(`Búsqueda completada: ${results.length} registros encontrados`);
            event.reply('resultados-grupo-usuarios', results);
        }
    });
});


// Buscar registros de un usuario específico con rango de fechas
ipcMain.on('buscar-usuario-especifico-reporte', (event, filtros) => {
    const { nombre, apellidoPaterno, apellidoMaterno, fechaInicio, fechaFin } = filtros;
    console.log('🔍 Buscando registros de usuario específico:', filtros);

    let query = `
        SELECT 
            u.matricula,
            u.nombre,
            u.apellido_paterno,
            u.apellido_materno,
            u.numero_telefono,
            u.correo,
            u.rol_facultad,
            u.id_carrera,
            u.turno,
            r.fecha_entrada,
            r.fecha_salida
        FROM usuario u
        INNER JOIN registroacceso r ON u.matricula = r.matricula
        WHERE 
            u.nombre = ? 
            AND u.apellido_paterno = ? 
            AND u.apellido_materno = ?
    `;

    const params = [nombre, apellidoPaterno, apellidoMaterno];

    // Filtro de fechas
    if (fechaInicio && fechaFin) {
        query += ` 
            AND DATE(r.fecha_entrada) BETWEEN ? AND ?
        `;
        params.push(fechaInicio, fechaFin);
    }

    query += ` ORDER BY r.fecha_entrada ASC;`;

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Error al buscar usuario específico:', err);
            event.reply('busqueda-usuario-especifico-error', err.message);
        } else {
            console.log(`${results.length} registros encontrados para el usuario`);
            event.reply('resultados-usuario-especifico', results);
        }
    });
});
