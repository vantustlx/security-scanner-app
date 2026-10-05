// database.js
const { ipcMain } = require('electron');
const mysql = require('mysql2');
const path = require('path');
const config = require('./config');
const { obtenerCatalogos, validarAreas, guardarAreas, adjuntarAreas, filtroPorAreas } = require('./areas');

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

    // 4) ACTUALIZAR USUARIO (datos personales y sus áreas, en una transacción)
    ipcMain.on('actualizar-usuario', async (event, data) => {
        console.log('Recibida solicitud para actualizar usuario:', data.matricula);
        let conexion;
        try {
            const { errores, areas } = validarAreas(data.areas, await obtenerCatalogos(pool));
            if (errores.length) {
                event.reply('actualizacion-error', { success: false, error: errores.join('. ') });
                return;
            }
            conexion = await pool.getConnection();
            await conexion.beginTransaction();
            const [resultado] = await conexion.query(
                `UPDATE usuario
                    SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, fecha_nacimiento = ?,
                        numero_telefono = ?, correo = ?, estatus = ?
                  WHERE matricula = ?`,
                [data.nombre, data.apellido_paterno, data.apellido_materno, data.fecha_nacimiento,
                    data.numero_telefono, data.correo, data.estatus, data.matricula]
            );
            if (resultado.affectedRows === 0) {
                await conexion.rollback();
                console.log('No se encontró el usuario para actualizar');
                event.reply('actualizacion-no-encontrada', { success: false, matricula: data.matricula, message: 'Usuario no encontrado' });
                return;
            }
            await guardarAreas(conexion, data.matricula, areas);
            await conexion.commit();
            console.log('Usuario actualizado con éxito');
            event.reply('actualizacion-exitosa', { success: true, matricula: data.matricula, affectedRows: resultado.affectedRows });
        } catch (err) {
            if (conexion) await conexion.rollback().catch(() => {});
            console.error('Error al actualizar usuario:', err);
            event.reply('actualizacion-error', { success: false, error: err.message });
        } finally {
            if (conexion) conexion.release();
        }
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

    // 8) a 10) El registro de visitantes está en visitantes.js y su acceso en acceso.js

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
                correo,
                estatus,
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
        pool.query(query, parametrosQuery)
            .then(([results]) => adjuntarAreas(results, pool))
            .then((usuarios) => {
                console.log(`Búsqueda completada. Encontrados: ${usuarios.length} usuarios`);
                event.reply('usuarios-encontrados', { usuarios, total: usuarios.length });
            })
            .catch((err) => {
                console.error('Error al buscar usuarios:', err);
                event.reply('busqueda-error', err.message);
            });
    });

    // 12) BUSCAR GRUPO DE USUARIOS por área, carrera y turno (cada filtro es opcional)
    ipcMain.on('buscar-grupo-usuarios', (event, filtros) => {
        console.log('Buscando grupo de usuarios con filtros:', filtros);
        const filtro = filtroPorAreas(filtros);
        const query = `
            SELECT
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.matricula,
                u.numero_telefono,
                u.estatus,
                u.fecha_registro
            FROM usuario u
            WHERE
                u.estatus = 'Activo'
                AND ${filtro.sql}
            ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre
        `;
        connection.query(query, filtro.params, (err, results) => {
            if (err) {
                console.error('Error al buscar grupo de usuarios:', err);
                event.reply('busqueda-grupo-error', err.message);
            } else {
                console.log(`Búsqueda de grupo completada. Encontrados: ${results.length} usuarios`);
                event.reply('resultados-grupo-usuarios', results);
            }
        });
    });

    // 13) BUSCAR USUARIO ESPECÍFICO (name match), con su último acceso de hoy
    ipcMain.on('buscar-usuario-especifico', (event, filtros) => {
        const { nombre, apellidoP, apellidoM } = filtros;
        console.log('Buscando usuario específico con filtros:', filtros);
        const query = `
            SELECT
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.matricula,
                u.numero_telefono,
                u.estatus,
                u.fecha_registro,
                ra.fecha_entrada AS entrada_hoy,
                ra.fecha_salida AS salida_hoy,
                ra.cierre_automatico AS cierre_hoy,
                (SELECT COUNT(*) FROM registroacceso r
                  WHERE r.matricula = u.matricula AND r.fecha_entrada >= CURDATE()) AS accesos_hoy
            FROM usuario u
            LEFT JOIN registroacceso ra ON ra.id_registro = (
                SELECT r.id_registro FROM registroacceso r
                 WHERE r.matricula = u.matricula AND r.fecha_entrada >= CURDATE()
                 ORDER BY r.fecha_entrada DESC LIMIT 1)
            WHERE
                u.estatus = 'Activo'
                AND u.nombre LIKE CONCAT('%', ?, '%')
                AND u.apellido_paterno LIKE CONCAT('%', ?, '%')
                AND u.apellido_materno LIKE CONCAT('%', ?, '%')
            ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre
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

    // 14) ENTRADAS Y SALIDAS DE HOY de un usuario (detalle de la búsqueda de usuario activo)
    ipcMain.handle('accesos-de-hoy', async (event, matricula) => {
        const [filas] = await pool.query(
            `SELECT fecha_entrada, medio_entrada, fecha_salida, medio_salida, cierre_automatico
               FROM registroacceso
              WHERE matricula = ? AND fecha_entrada >= CURDATE()
              ORDER BY fecha_entrada`,
            [matricula]
        );
        return filas;
    });
}

module.exports = { setupDBListeners, pool };

// BD con fechas
ipcMain.on('buscar-grupo-usuarios-con-fechas', (event, filtros) => {
    const { fechaInicio, fechaFin } = filtros;
    const filtro = filtroPorAreas(filtros);
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
        WHERE ${filtro.sql}
    `;

    const params = [...filtro.params];

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

    pool.query(query, params)
        .then(([results]) => adjuntarAreas(results, pool))
        .then((results) => {
            console.log(`${results.length} registros encontrados para el usuario`);
            event.reply('resultados-usuario-especifico', results);
        })
        .catch((err) => {
            console.error('Error al buscar usuario específico:', err);
            event.reply('busqueda-usuario-especifico-error', err.message);
        });
});
