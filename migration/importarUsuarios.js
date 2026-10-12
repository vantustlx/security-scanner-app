// migration/importarUsuarios.js
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
const config = require('../src/main/config');

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Uso: node migration/importarUsuarios.js <ruta-archivo.xlsx>');
        process.exit(1);
    }

    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`El archivo no existe: ${absolutePath}`);
        process.exit(1);
    }

    console.log(`Leyendo archivo Excel: ${absolutePath}`);
    const workbook = xlsx.readFile(absolutePath);
    const sheetNames = workbook.SheetNames;
    console.log('Pestañas encontradas:', sheetNames);

    const dbConfig = {
        host: config.db.host,
        user: config.db.usuario,
        password: config.db.password,
        database: config.db.nombre,
        port: config.db.port
    };

    const connection = await mysql.createConnection(dbConfig);
    console.log(`Conectado a la base de datos: ${dbConfig.database}`);

    try {
        await connection.beginTransaction();

        // 1. Asegurar catálogos "Desconocido"
        await connection.query("INSERT IGNORE INTO carrera (nombre_carrera) VALUES ('Desconocido')");
        await connection.query("INSERT IGNORE INTO turno (nombre) VALUES ('Desconocido')");

        // Obtener IDs de áreas y catálogos
        const [areasDB] = await connection.query("SELECT id_area, nombre FROM area");
        const areaMap = {};
        areasDB.forEach(a => areaMap[a.nombre.toLowerCase()] = a.id_area);
        // areaMap['estudiante'] = 1, 'docente' = 2, 'administrativo' = 3, etc.

        const [carrerasDB] = await connection.query("SELECT id_carrera, nombre_carrera FROM carrera");
        const carreraMap = {};
        carrerasDB.forEach(c => carreraMap[c.nombre_carrera.toLowerCase()] = c.id_carrera);

        const [turnosDB] = await connection.query("SELECT id_turno, nombre FROM turno");
        const turnoMap = {};
        turnosDB.forEach(t => turnoMap[t.nombre.toLowerCase()] = t.id_turno);

        // Obtener ID de carrera y turno 'Desconocido'
        const idCarreraDesconocido = carreraMap['desconocido'];
        const idTurnoDesconocido = turnoMap['desconocido'];

        // Helper para buscar hoja por nombre aproximado
        function encontrarHoja(nombresPosibles) {
            for (const name of sheetNames) {
                const lower = name.trim().toLowerCase();
                if (nombresPosibles.some(p => lower.includes(p))) {
                    return workbook.Sheets[name];
                }
            }
            return null;
        }

        let stats = { estudiantes: 0, docentes: 0, administrativos: 0, errores: 0 };

        // -------------------------------------------------------------
        // PROCESAR ESTUDIANTES
        // -------------------------------------------------------------
        const hojaEstudiantes = encontrarHoja(['estudiante']);
        if (hojaEstudiantes) {
            const filas = xlsx.utils.sheet_to_json(hojaEstudiantes, { defval: '' });
            console.log(`Procesando ${filas.length} estudiantes...`);
            
            for (const row of filas) {
                try {
                    const matricula = Number(row.MATRICULA || row.matricula);
                    if (!matricula || isNaN(matricula)) continue;

                    const nombre = String(row.NBPERSONA || row.nombre || '').trim();
                    const appaterno = String(row.APPATERNO || row.apellido_paterno || '').trim();
                    const apmaterno = String(row.APMATERNO || row.apellido_materno || '').trim();
                    const fcnacimiento = row.FCNACIMIENTO || row.fecha_nacimiento || null;
                    const telefono = String(row.TELEFONO || row.telefono || '').trim() || null;
                    let correo = String(row.CORREO || row.correo || '').trim();
                    if (!correo) {
                        correo = `${matricula}@garzas.uatx.mx`;
                    }
                    const turnoStr = String(row.TURNO || row.turno || 'Matutino').trim().toLowerCase();
                    const programaStr = String(row.PROGRAMA || row.programa || '').trim().toLowerCase();

                    const idArea = areaMap['estudiante'] || 1;
                    const idCarrera = carreraMap[programaStr] || idCarreraDesconocido;
                    const idTurno = turnoMap[turnoStr] || turnoMap['matutino'] || idTurnoDesconocido;

                    // Insertar o actualizar usuario
                    await connection.query(
                        `INSERT INTO usuario (matricula, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, fecha_registro, numero_telefono, correo, estatus, fecha_aceptacion_terminos)
                         VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, 'Activo', NOW())
                         ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), apellido_paterno=VALUES(apellido_paterno), apellido_materno=VALUES(apellido_materno), numero_telefono=VALUES(numero_telefono), correo=VALUES(correo)`,
                        [matricula, nombre, appaterno, apmaterno, fcnacimiento ? new Date(fcnacimiento) : null, telefono, correo]
                    );

                    // Insertar usuario_area
                    await connection.query("DELETE FROM usuario_area WHERE matricula = ?", [matricula]);
                    const [resUArea] = await connection.query(
                        `INSERT INTO usuario_area (matricula, id_area, id_carrera, principal) VALUES (?, ?, ?, 1)`,
                        [matricula, idArea, idCarrera]
                    );

                    await connection.query(
                        `INSERT IGNORE INTO usuario_area_turno (id_usuario_area, id_turno) VALUES (?, ?)`,
                        [resUArea.insertId, idTurno]
                    );

                    stats.estudiantes++;
                } catch (err) {
                    console.error('Error procesando estudiante:', row, err.message);
                    stats.errores++;
                }
            }
        } else {
            console.log('No se encontró la pestaña de Estudiantes.');
        }

        // -------------------------------------------------------------
        // PROCESAR DOCENTES Y ADMINISTRATIVOS (Auxiliar)
        // -------------------------------------------------------------
        async function procesarPersonal(hoja, tipoRol, areaIdDefault) {
            if (!hoja) {
                console.log(`No se encontró la pestaña para ${tipoRol}.`);
                return;
            }
            const filas = xlsx.utils.sheet_to_json(hoja, { defval: '' });
            console.log(`Procesando ${filas.length} ${tipoRol}...`);

            // Obtener el máximo ID de empleado actual si faltan IDs, o usar contador secuencial desde 1 (o max + 1)
            let [maxRes] = await connection.query("SELECT MAX(matricula) as maxMat FROM usuario WHERE matricula < 900000");
            let nextId = Math.max(900000, (maxRes[0].maxMat || 0) + 1);

            for (const row of filas) {
                try {
                    let nmempleado = Number(row.NMEMPLEADO || row.nmempleado || row.MATRICULA || row.matricula);
                    if (!nmempleado || isNaN(nmempleado)) {
                        nmempleado = nextId++;
                    }

                    const nombre = String(row.NBPERSONA || row.nombre || '').trim();
                    const appaterno = String(row.APPATERNO || row.apellido_paterno || '').trim();
                    const apmaterno = String(row.APMATERNO || row.apellido_materno || '').trim();
                    const fcnacimiento = row.FCNACIMIENTO || row.fecha_nacimiento || null;
                    const telefono = String(row.TELEFONO || row.telefono || '').trim() || null;
                    const correo = String(row.CORREO || row.correo || '').trim() || null;

                    const idArea = areaIdDefault;
                    const idCarrera = idCarreraDesconocido;
                    const idTurno = idTurnoDesconocido;

                    await connection.query(
                        `INSERT INTO usuario (matricula, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, fecha_registro, numero_telefono, correo, estatus, fecha_aceptacion_terminos)
                         VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, 'Activo', NOW())
                         ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), apellido_paterno=VALUES(apellido_paterno), apellido_materno=VALUES(apellido_materno), numero_telefono=VALUES(numero_telefono), correo=VALUES(correo)`,
                        [nmempleado, nombre, appaterno, apmaterno, fcnacimiento ? new Date(fcnacimiento) : null, telefono, correo]
                    );

                    await connection.query("DELETE FROM usuario_area WHERE matricula = ?", [nmempleado]);
                    const [resUArea] = await connection.query(
                        `INSERT INTO usuario_area (matricula, id_area, id_carrera, principal) VALUES (?, ?, ?, 1)`,
                        [nmempleado, idArea, idCarrera]
                    );

                    await connection.query(
                        `INSERT IGNORE INTO usuario_area_turno (id_usuario_area, id_turno) VALUES (?, ?)`,
                        [resUArea.insertId, idTurno]
                    );

                    if (tipoRol.toLowerCase() === 'docentes') stats.docentes++;
                    else stats.administrativos++;
                } catch (err) {
                    console.error(`Error procesando ${tipoRol}:`, row, err.message);
                    stats.errores++;
                }
            }
        }

        await procesarPersonal(encontrarHoja(['docente']), 'Docentes', areaMap['docente'] || 2);
        await procesarPersonal(encontrarHoja(['administrativo']), 'Administrativos', areaMap['administrativo'] || 3);

        await connection.commit();
        console.log('\n--- MIGRACIÓN COMPLETADA ---');
        console.log(`Estudiantes importados: ${stats.estudiantes}`);
        console.log(`Docentes importados: ${stats.docentes}`);
        console.log(`Administrativos importados: ${stats.administrativos}`);
        console.log(`Errores encontrados: ${stats.errores}`);

    } catch (err) {
        await connection.rollback();
        console.error('Error crítico en la migración:', err);
    } finally {
        await connection.end();
    }
}

main();
