// gestionMasiva.js — Búsqueda filtrada y procesamiento masivo de credenciales QR y correos
const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { enviarCredencial, generarGafetePDF } = require('./sendemails');
const { filtroPorAreas } = require('./areas');

let pool;

/**
 * Busca usuarios según filtros avanzados (área, carrera, turno, término de búsqueda)
 */
async function buscarUsuariosParaGestionMasiva(filtros = {}) {
    const { area, carrera, turno, busqueda } = filtros;
    const filtro = filtroPorAreas({ area, carrera, turno });

    let sql = `
        SELECT DISTINCT
            u.matricula,
            u.nombre,
            u.apellido_paterno,
            u.apellido_materno,
            u.correo,
            u.numero_telefono,
            u.estatus
        FROM usuario u
        WHERE u.estatus = 'Activo'
          AND ${filtro.sql}
    `;

    const params = [...filtro.params];

    if (busqueda && busqueda.trim() !== '') {
        const termino = `%${busqueda.trim()}%`;
        sql += ` AND (u.matricula LIKE ? OR u.nombre LIKE ? OR u.apellido_paterno LIKE ? OR u.apellido_materno LIKE ?)`;
        params.push(termino, termino, termino, termino);
    }

    sql += ` ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre`;

    const [rows] = await pool.query(sql, params);
    return rows;
}

/**
 * Procesa el envío masivo de credenciales a una lista de matrículas
 */
async function procesarEnvioMasivo(event, { matriculas, delayMs = 1500 }) {
    if (!Array.isArray(matriculas) || matriculas.length === 0) {
        return { success: false, error: 'No se seleccionaron usuarios para procesar' };
    }

    let exitos = 0;
    let fallidos = 0;
    const detalles = [];

    console.log(`[GESTION MASIVA] Iniciando envío masivo para ${matriculas.length} usuarios...`);

    for (let i = 0; i < matriculas.length; i++) {
        const matricula = matriculas[i];
        try {
            const [rows] = await pool.query(
                `SELECT matricula, nombre, apellido_paterno, apellido_materno, correo FROM usuario WHERE matricula = ?`,
                [matricula]
            );

            if (rows.length === 0) {
                fallidos++;
                detalles.push({ matricula, error: 'Usuario no encontrado' });
                continue;
            }

            const usuario = rows[0];
            if (!usuario.correo || !usuario.correo.includes('@')) {
                fallidos++;
                detalles.push({ matricula, nombre: `${usuario.nombre} ${usuario.apellido_paterno}`, error: 'Correo electrónico no válido o faltante' });
                continue;
            }

            const nombreCompleto = [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' ');

            await enviarCredencial({
                correo: usuario.correo,
                nombre: nombreCompleto,
                matricula: usuario.matricula
            });

            exitos++;
            detalles.push({ matricula, nombre: nombreCompleto, estatus: 'enviado' });

            if (event && event.reply) {
                event.reply('progreso-envio-masivo', {
                    actual: i + 1,
                    total: matriculas.length,
                    matricula,
                    nombre: nombreCompleto,
                    estatus: 'exito'
                });
            }

            if (i < matriculas.length - 1 && delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

        } catch (err) {
            fallidos++;
            detalles.push({ matricula, error: err.message });
            console.error(`[GESTION MASIVA] Error enviando a matrícula ${matricula}:`, err.message);

            if (event && event.reply) {
                event.reply('progreso-envio-masivo', {
                    actual: i + 1,
                    total: matriculas.length,
                    matricula,
                    estatus: 'error',
                    error: err.message
                });
            }
        }
    }

    console.log(`[GESTION MASIVA] Finalizado. Éxitos: ${exitos}, Fallidos: ${fallidos}`);
    return { success: true, exitos, fallidos, detalles };
}

/**
 * Genera PDFs de credenciales localmente en una carpeta seleccionada (útil para usuarios sin correo)
 */
async function generarCredencialesLocales(event, { matriculas }) {
    if (!Array.isArray(matriculas) || matriculas.length === 0) {
        return { success: false, error: 'No se seleccionaron usuarios' };
    }

    const ventana = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(ventana, {
        title: 'Seleccionar carpeta para guardar credenciales PDF',
        properties: ['openDirectory', 'createDirectory']
    });

    if (canceled || filePaths.length === 0) {
        return { success: false, cancelado: true };
    }

    const destinoDir = filePaths[0];
    let generados = 0;
    let errores = 0;

    for (const matricula of matriculas) {
        try {
            const [rows] = await pool.query(
                `SELECT matricula, nombre, apellido_paterno, apellido_materno FROM usuario WHERE matricula = ?`,
                [matricula]
            );
            if (rows.length === 0) continue;

            const usuario = rows[0];
            const nombreCompleto = [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' ');
            
            const tmpPdfPath = await generarGafetePDF(nombreCompleto, usuario.matricula);
            const nombreArchivo = `Credencial_${usuario.matricula}_${(usuario.apellido_paterno || '').replace(/\s+/g, '_')}.pdf`;
            const destinoPath = path.join(destinoDir, nombreArchivo);

            fs.copyFileSync(tmpPdfPath, destinoPath);
            fs.unlink(tmpPdfPath, () => {});

            generados++;
        } catch (err) {
            errores++;
            console.error(`Error generando PDF local para matrícula ${matricula}:`, err.message);
        }
    }

    return { success: true, generados, errores, ruta: destinoDir };
}

function setupGestionMasiva(poolDB) {
    pool = poolDB;

    ipcMain.handle('buscar-usuarios-gestion', async (_, filtros) => {
        try {
            return await buscarUsuariosParaGestionMasiva(filtros);
        } catch (err) {
            console.error('Error en buscar-usuarios-gestion:', err);
            throw err;
        }
    });

    ipcMain.handle('ejecutar-envio-masivo', async (event, datos) => {
        try {
            return await procesarEnvioMasivo(event, datos);
        } catch (err) {
            console.error('Error en ejecutar-envio-masivo:', err);
            throw err;
        }
    });

    ipcMain.handle('generar-credenciales-locales', async (event, datos) => {
        try {
            return await generarCredencialesLocales(event, datos);
        } catch (err) {
            console.error('Error en generar-credenciales-locales:', err);
            throw err;
        }
    });
}

module.exports = {
    setupGestionMasiva,
    buscarUsuariosParaGestionMasiva,
    procesarEnvioMasivo,
    generarCredencialesLocales
};
