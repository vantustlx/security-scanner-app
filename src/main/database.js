// database.js  (o como se llame tu módulo de base de datos)
const { ipcMain } = require('electron');
const mysql = require('mysql2');

let ultimoUsuarioVerificado = null; // <--- Variable para almacenar el usuario que pasó la verificación

// Crea la conexión a tu base de datos
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

  // 1) INSERTAR USUARIO  (sin cambios respecto a tu versión actual)
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

  // 2) OBTENER TODOS LOS USUARIOS  (sin cambios)
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

  // 3) ELIMINAR USUARIO  (sin cambios)
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

  // 4) ACTUALIZAR USUARIO  (sin cambios)
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

  // 5) VERIFICAR MATRÍCULA (modificado para guardar en ultimoUsuarioVerificado)
  ipcMain.on('verificar-matricula', (event, matricula) => {
    const query = 'SELECT * FROM usuario WHERE matricula = ?';
    console.log('Verificando matrícula:', matricula);

    connection.query(query, [matricula], (err, results) => {
      if (err) {
        console.error('Error al consultar matrícula:', err);
        // Respondo con objeto para que el renderer sepa que no fue exitoso
        event.reply('resultado-verificacion', { success: false });
        return;
      }

      if (results.length > 0) {
        // Si existe la matrícula, guardo TODO el registro en la variable
        ultimoUsuarioVerificado = results[0];

        console.log('Matrícula válida:', matricula, '→', 
          ultimoUsuarioVerificado.nombre, 
          ultimoUsuarioVerificado.apellido_paterno, 
          ultimoUsuarioVerificado.apellido_materno);

        event.reply('resultado-verificacion', { success: true });
      } else {
        console.warn('Matrícula no encontrada:', matricula);
        event.reply('resultado-verificacion', { success: false });
      }
    });
  });

  // 6) NUEVO CANAL: devolver el último usuario verificado
  ipcMain.on('obtener-ultimo-usuario', (event) => {
    if (ultimoUsuarioVerificado) {
      // Envío solo los campos que necesito mostrar en qrsuccess
      event.reply('enviar-ultimo-usuario', {
        nombre: ultimoUsuarioVerificado.nombre,
        apellido_paterno: ultimoUsuarioVerificado.apellido_paterno,
        apellido_materno: ultimoUsuarioVerificado.apellido_materno,
        matricula: ultimoUsuarioVerificado.matricula
      });
    } else {
      // Si por alguna razón no hay ninguno, envío null
      event.reply('enviar-ultimo-usuario', null);
    }
  });
  
// 7) ASOCIAR PLACA → INSERTAR EN vehiculo
ipcMain.on('asociar-placa', (event, { matricula, placa }) => {
  const insertQuery = `
    INSERT INTO vehiculo (matricula, placa)
    VALUES (?, ?)
  `;
  connection.query(insertQuery, [matricula, placa], (err, results) => {
    if (err) {
      console.error('Error al insertar en vehiculo:', err);
      event.reply('asociacion-error', err.message);
      return;
    }
    // Si se insertó al menos una fila, consideramos éxito
    const success = results.affectedRows > 0;
    event.reply('asociacion-exitosa', { success });
  });
});


// 8) REGISTRAR VISITANTE FRECUENTE
ipcMain.on('registrar-visitante-frecuente', (event, data) => {
  // 8.1) Primero verifico existencia por correo (o tu criterio)
  const checkSql = 'SELECT codigo_acceso FROM visitante WHERE correo = ? AND tipo = "Frecuente"';
  connection.query(checkSql, [data.correo], (err, rows) => {
    if (err) {
      console.error('Error al verificar visitante:', err);
      return event.reply('registro-visitante-error', err.message);
    }
    if (rows.length > 0) {
      // Ya existe: devuelvo el folio permanente existente
      return event.reply('registro-visitante-existente', { folio: rows[0].codigo_acceso });
    }

    // 8.2) Si no existe, genero un folio (puedes usar la librería que prefieras)
    const codigo = Math.random()
  .toString(36)
  .substr(2, 6)       // ← ahora 6 caracteres
  .toUpperCase();
    const ahora = new Date(); // fecha_registro

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

    connection.query(insertSql, params, (err2, result) => {
      if (err2) {
        console.error('Error al insertar visitante frecuente:', err2);
        return event.reply('registro-visitante-error', err2.message);
      }
      event.reply('registro-visitante-exitoso', { folio: codigo });
    });
  });
});
// 9) REGISTRAR 
ipcMain.on('registrar-visitante-temporal', (event, data) => {
  // 9.1) Primero verifico existencia por correo (o tu criterio)
  const checkSql = 'SELECT codigo_acceso FROM visitante WHERE correo = ? AND tipo = "Ocasional"';
  connection.query(checkSql, [data.correo], (err, rows) => {
    if (err) {
      console.error('Error al verificar visitante:', err);
      return event.reply('registro-visitante-error', err.message);
    }
    if (rows.length > 0) {
      // Ya existe: devuelvo el folio permanente existente
      return event.reply('registro-visitante-existente', { folio: rows[0].codigo_acceso });
    }

    // 9.2) Si no existe, genero un folio (puedes usar la librería que prefieras)
    const codigo = Math.random()
  .toString(36)
  .substr(2, 6)       // ← ahora 6 caracteres
  .toUpperCase();
    const ahora = new Date(); // fecha_registro

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

    connection.query(insertSql, params, (err2, result) => {
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
        // caducó
        return event.reply('acceso-invalid', null);
      }
    }

    // Éxito: devuelvo datos que necesites mostrar
    event.reply('acceso-valid', {
      nombre: v.nombre,
      apellidoP: v.apellido_paterno,
      apellidoM: v.apellido_materno,
      tipo: v.tipo,
      matricula: v.matricula || ''  // si es frecuente podrías guardar matrícula
    });
  });
});


}  




module.exports = { setupDBListeners };
