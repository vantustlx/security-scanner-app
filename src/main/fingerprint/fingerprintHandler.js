/**
 * Manejadores IPC para captura, registro y verificación de huellas
 * Integración con SecuGen FDx SDK Pro v4.3.1
 */

const { ipcMain } = require('electron');
const SecuGenSDK = require('./secugenSDK');
const sharp = require('sharp');

let sdk = null;

/**
 * Configura los listeners IPC para huellas dactilares
 */
function setupFingerprintListeners(connection) {
    console.log('[Fingerprint Handler] Configurando listeners IPC...');

    // Inicializar SDK
    sdk = new SecuGenSDK();

    // 1) VERIFICAR DISPONIBILIDAD DEL ESCÁNER
    ipcMain.on('verificar-escaner', async (event) => {
        console.log('[Fingerprint] Verificando disponibilidad del escáner...');

        try {
            const available = SecuGenSDK.isAvailable();

            if (!available) {
                return event.reply('escaner-status', {
                    available: false,
                    connected: false,
                    error: 'SDK no disponible: DLL no encontrada'
                });
            }

            // Intentar inicializar
            await sdk.initialize();

            const info = sdk.getDeviceInfo();

            event.reply('escaner-status', {
                available: true,
                connected: true,
                info
            });

            console.log('[Fingerprint] ✓ Escáner disponible y conectado');

        } catch (error) {
            console.error('[Fingerprint] Error:', error.message);
            event.reply('escaner-status', {
                available: true,
                connected: false,
                error: error.message
            });
        }
    });

    // 2) CAPTURAR Y REGISTRAR HUELLA (para asociación)
    ipcMain.on('capturar-huella', async (event, data) => {
        console.log('[Fingerprint] Iniciando captura para matrícula:', data.matricula);

        try {
            // Verificar que el usuario existe
            const checkUser = 'SELECT matricula FROM usuario WHERE matricula = ?';
            connection.query(checkUser, [data.matricula], async (err, users) => {
                if (err) {
                    console.error('[Fingerprint] Error al verificar usuario:', err);
                    return event.reply('captura-error', { error: err.message });
                }

                if (users.length === 0) {
                    return event.reply('captura-error', {
                        error: 'Usuario no encontrado. Verifique la matrícula.'
                    });
                }

                // Verificar conexión del SDK
                if (!sdk || !sdk.deviceOpened) {
                    try {
                        await sdk.initialize();
                    } catch (initError) {
                        return event.reply('captura-error', {
                            error: 'No se pudo conectar al lector: ' + initError.message
                        });
                    }
                }

                try {
                    // Capturar imagen
                    event.reply('captura-progreso', {
                        estado: 'capturando',
                        mensaje: 'Coloque su dedo en el lector...'
                    });

                    const imageBuffer = await sdk.captureImage(15000); // 15 segundos timeout

                    // Verificar calidad
                    event.reply('captura-progreso', {
                        estado: 'verificando',
                        mensaje: 'Verificando calidad de la imagen...'
                    });

                    const quality = await sdk.getImageQuality(imageBuffer);

                    if (quality < 40) {
                        return event.reply('captura-error', {
                            error: `Calidad insuficiente (${quality}/100). Limpie el sensor y presione firmemente.`,
                            quality
                        });
                    }

                    // Crear template
                    event.reply('captura-progreso', {
                        estado: 'procesando',
                        mensaje: 'Extrayendo características biométricas...'
                    });

                    const template = await sdk.createTemplate(imageBuffer);

                    // Convertir imagen para preview
                    const imageBase64 = await sharp(imageBuffer, {
                        raw: { width: 300, height: 400, channels: 1 }
                    })
                        .png()
                        .toBuffer()
                        .then(buf => buf.toString('base64'));

                    // Guardar en BD
                    event.reply('captura-progreso', {
                        estado: 'guardando',
                        mensaje: 'Guardando huella en base de datos...'
                    });

                    const query = `
                        INSERT INTO huella (matricula, template, calidad, dedo, mano, fecha_registro)
                        VALUES (?, ?, ?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE
                            template = VALUES(template),
                            calidad = VALUES(calidad),
                            dedo = VALUES(dedo),
                            mano = VALUES(mano),
                            fecha_actualizacion = NOW()
                    `;

                    connection.query(
                        query,
                        [data.matricula, template, quality, data.dedo || 'Desconocido', data.mano || 'Desconocida'],
                        (err2, result) => {
                            if (err2) {
                                console.error('[Fingerprint] Error al guardar:', err2);
                                return event.reply('captura-error', { error: err2.message });
                            }

                            console.log('[Fingerprint] ✓ Huella registrada exitosamente');

                            event.reply('captura-exitosa', {
                                image: `data:image/png;base64,${imageBase64}`,
                                quality,
                                matricula: data.matricula,
                                dedo: data.dedo || 'Desconocido',
                                id_huella: result.insertId || result.affectedRows
                            });
                        }
                    );

                } catch (captureError) {
                    console.error('[Fingerprint] Error en captura:', captureError);
                    event.reply('captura-error', { error: captureError.message });
                }
            });

        } catch (error) {
            console.error('[Fingerprint] Error general:', error);
            event.reply('captura-error', { error: error.message });
        }
    });

    // 3) VERIFICAR HUELLA (para acceso)
    ipcMain.on('verificar-huella', async (event) => {
        console.log('[Fingerprint] Iniciando verificación de huella para acceso...');

        try {
            // Verificar conexión del SDK
            if (!sdk || !sdk.deviceOpened) {
                await sdk.initialize();
            }

            // Capturar huella
            event.reply('verificacion-progreso', {
                estado: 'capturando',
                mensaje: 'Coloque su dedo en el lector...'
            });

            const imageBuffer = await sdk.captureImage(15000);

            // Verificar calidad
            const quality = await sdk.getImageQuality(imageBuffer);

            if (quality < 30) {
                return event.reply('verificacion-error', {
                    error: `Calidad insuficiente (${quality}/100). Intente nuevamente.`
                });
            }

            // Crear template
            event.reply('verificacion-progreso', {
                estado: 'analizando',
                mensaje: 'Analizando huella...'
            });

            const capturedTemplate = await sdk.createTemplate(imageBuffer);

            // Buscar en BD
            event.reply('verificacion-progreso', {
                estado: 'comparando',
                mensaje: 'Buscando coincidencia...'
            });

            const query = 'SELECT matricula, template, calidad FROM huella';

            connection.query(query, async (err, huellas) => {
                if (err) {
                    console.error('[Fingerprint] Error al consultar huellas:', err);
                    return event.reply('verificacion-error', { error: err.message });
                }

                if (huellas.length === 0) {
                    return event.reply('verificacion-fallida', {
                        mensaje: 'No hay huellas registradas en el sistema'
                    });
                }

                console.log(`[Fingerprint] Comparando contra ${huellas.length} huellas...`);

                // Comparar con todas las huellas registradas
                let bestMatch = null;
                let bestScore = 0;

                for (const huella of huellas) {
                    try {
                        // Matching con nivel de seguridad medio (SL_NORMAL = 5)
                        const matched = await sdk.matchTemplates(
                            capturedTemplate,
                            huella.template,
                            5  // SecurityLevel.NORMAL
                        );

                        if (matched) {
                            // Obtener score para logging
                            const score = await sdk.getMatchingScore(
                                capturedTemplate,
                                huella.template
                            );

                            if (score > bestScore) {
                                bestScore = score;
                                bestMatch = huella;
                            }
                        }

                    } catch (matchError) {
                        console.warn('[Fingerprint] Error comparando con matrícula', huella.matricula, ':', matchError.message);
                        // Continuar con la siguiente huella
                    }
                }

                if (bestMatch) {
                    // Obtener datos del usuario
                    const userQuery = 'SELECT * FROM usuario WHERE matricula = ?';
                    connection.query(userQuery, [bestMatch.matricula], (err2, users) => {
                        if (err2 || users.length === 0) {
                            return event.reply('verificacion-error', {
                                error: 'Usuario no encontrado en la base de datos'
                            });
                        }

                        console.log(`[Fingerprint] ✓ Huella verificada: ${users[0].nombre} (score: ${bestScore})`);

                        // Registrar acceso (entrada/salida)
                        registrarAcceso(connection, bestMatch.matricula, (err3, tipo) => {
                            if (err3) {
                                console.error('[Fingerprint] Error al registrar acceso:', err3);
                            }

                            event.reply('verificacion-exitosa', {
                                usuario: users[0],
                                matricula: bestMatch.matricula,
                                score: bestScore,
                                tipo_acceso: tipo || 'ENTRADA'
                            });
                        });
                    });

                } else {
                    console.log('[Fingerprint] ✗ Huella no reconocida');

                    // Registrar intento fallido
                    const { registrarAccesoFallido } = require('../failedAccessLogger');
                    registrarAccesoFallido(
                        connection,
                        'DESCONOCIDO',
                        'HUELLA_NO_RECONOCIDA',
                        `Intento de acceso con huella no registrada (calidad: ${quality})`
                    ).catch(e => console.error('Error al registrar acceso fallido:', e));

                    event.reply('verificacion-fallida', {
                        mensaje: 'Huella no reconocida. Intente nuevamente o use otro método de acceso.'
                    });
                }
            });

        } catch (error) {
            console.error('[Fingerprint] Error en verificación:', error);
            event.reply('verificacion-error', { error: error.message });
        }
    });

    // 4) OBTENER HUELLAS DE UN USUARIO
    ipcMain.on('obtener-huellas-usuario', (event, matricula) => {
        const query = 'SELECT id_huella, matricula, calidad, dedo, mano, fecha_registro FROM huella WHERE matricula = ?';

        connection.query(query, [matricula], (err, results) => {
            if (err) {
                console.error('[Fingerprint] Error al obtener huellas:', err);
                return event.reply('huellas-usuario-error', { error: err.message });
            }

            event.reply('huellas-usuario', {
                huellas: results,
                count: results.length
            });
        });
    });

    // 5) ELIMINAR HUELLA
    ipcMain.on('eliminar-huella', (event, id_huella) => {
        const query = 'DELETE FROM huella WHERE id_huella = ?';

        connection.query(query, [id_huella], (err, result) => {
            if (err) {
                console.error('[Fingerprint] Error al eliminar huella:', err);
                return event.reply('eliminacion-huella-error', { error: err.message });
            }

            console.log('[Fingerprint] Huella eliminada:', id_huella);
            event.reply('eliminacion-huella-exitosa', {
                affected: result.affectedRows
            });
        });
    });

    console.log('[Fingerprint Handler] ✓ Listeners IPC configurados');
}

/**
 * Registra entrada o salida en la tabla registroacceso
 */
function registrarAcceso(connection, matricula, callback) {
    const query = 'SELECT * FROM registroacceso WHERE matricula = ? ORDER BY fecha_entrada DESC LIMIT 1';

    connection.query(query, [matricula], (err, registros) => {
        if (err) {
            return callback(err, null);
        }

        // Si no hay registros previos o el último tiene salida registrada
        if (registros.length === 0 || registros[0].fecha_salida !== null) {
            // Crear nuevo registro de ENTRADA
            const insertQuery = 'INSERT INTO registroacceso (matricula, fecha_entrada) VALUES (?, NOW())';
            const updateStatus = 'UPDATE usuario SET estatus = "Activo" WHERE matricula = ?';

            connection.query(insertQuery, [matricula], (err2) => {
                if (err2) return callback(err2, null);

                connection.query(updateStatus, [matricula], (err3) => {
                    if (err3) return callback(err3, null);
                    console.log(`[Fingerprint] Nueva ENTRADA registrada para ${matricula}`);
                    return callback(null, 'ENTRADA');
                });
            });
        }
        // Si el último registro solo tiene entrada (sin salida)
        else {
            // Actualizar con SALIDA
            const updateQuery = 'UPDATE registroacceso SET fecha_salida = NOW() WHERE id_registro = ?';
            const updateStatus = 'UPDATE usuario SET estatus = "Inactivo" WHERE matricula = ?';

            connection.query(updateQuery, [registros[0].id_registro], (err2) => {
                if (err2) return callback(err2, null);

                connection.query(updateStatus, [matricula], (err3) => {
                    if (err3) return callback(err3, null);
                    console.log(`[Fingerprint] SALIDA registrada para ${matricula}`);
                    return callback(null, 'SALIDA');
                });
            });
        }
    });
}

/**
 * Limpia recursos al cerrar la aplicación
 */
function cleanup() {
    if (sdk) {
        sdk.terminate();
        console.log('[Fingerprint Handler] Recursos liberados');
    }
}

module.exports = {
    setupFingerprintListeners,
    cleanup
};
