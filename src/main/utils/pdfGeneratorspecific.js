const { dialog } = require('electron');
const { resumenAreas } = require('../areas');
const R = require('./pdfReporte');

// Un día con esta cantidad de accesos o más se resalta en la tabla
const MAXIMO_POR_DIA = 5;

/**
 * Genera el reporte de accesos de un usuario (todo su historial o el período elegido)
 * @param {Object} usuario - Datos del usuario (con areas y placas)
 * @param {Array} registros - Sus registros de entrada/salida; puede estar vacío
 * @param {Object} rangoFechas - { fechaInicio, fechaFin }, ambas opcionales
 * @param {BrowserWindow} mainWindow - Ventana principal para dialog
 */
async function generateUserReportPDF(usuario, registros, rangoFechas, mainWindow) {
    if (!usuario) {
        throw new Error('No se proporcionaron datos de usuario válidos');
    }
    registros = registros || [];
    const nombreCompleto = [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' ');
    console.log('Generando PDF para usuario:', usuario.matricula, `(${registros.length} registros)`);

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar reporte PDF',
        defaultPath: `Reporte_${usuario.nombre}_${usuario.apellido_paterno}_${new Date().toISOString().split('T')[0]}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!filePath) {
        throw new Error('Guardado cancelado por el usuario');
    }

    // Accesos por día: los días que llegan al máximo se resaltan
    const conteo = {};
    registros.forEach((r) => {
        const dia = R.claveDia(r.fecha_entrada);
        conteo[dia] = (conteo[dia] || 0) + 1;
    });
    const diasExcedidos = Object.values(conteo).filter((n) => n >= MAXIMO_POR_DIA).length;
    const tiempoDentro = registros
        .filter((r) => r.fecha_salida)
        .reduce((total, r) => total + (new Date(r.fecha_salida) - new Date(r.fecha_entrada)), 0);

    const generado = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    const { doc, terminado } = R.crearDocumento(filePath, `Reporte de accesos - ${nombreCompleto}`);

    let y = R.encabezado(doc, 'REPORTE DE ACCESOS POR USUARIO', `Generado el ${generado}`);
    y = R.titulo(doc, y, 'Información del usuario');
    y = R.ficha(doc, y, [
        { etiqueta: 'Nombre', valor: nombreCompleto },
        { etiqueta: 'Matrícula', valor: usuario.matricula },
        { etiqueta: 'Correo', valor: usuario.correo || '—' },
        { etiqueta: 'Teléfono', valor: usuario.numero_telefono || '—' },
        { etiqueta: 'Placas del vehículo', valor: usuario.placas || 'Sin vehículo registrado' },
        { etiqueta: 'Estatus actual', valor: usuario.estatus || '—' },
        { etiqueta: 'Áreas en la facultad', valor: resumenAreas(usuario.areas) || '—', completo: true },
        {
            etiqueta: 'Período del reporte',
            valor: R.periodo(rangoFechas, usuario.fecha_registro
                ? `Todo el historial (registrado desde el ${R.fecha(usuario.fecha_registro)})`
                : 'Todo el historial'),
            completo: true
        }
    ]);

    y = R.resumen(doc, y, [
        { valor: registros.length, etiqueta: 'Accesos' },
        { valor: Object.keys(conteo).length, etiqueta: 'Días con asistencia' },
        { valor: R.duracion(tiempoDentro), etiqueta: 'Tiempo total dentro' },
        { valor: diasExcedidos, etiqueta: `Días con ${MAXIMO_POR_DIA}+ accesos`, alerta: diasExcedidos > 0 }
    ]);
    if (diasExcedidos) {
        y = R.nota(doc, y, `Resaltados: accesos de los días en que el usuario registró ${MAXIMO_POR_DIA} entradas o más.`);
    }

    y = R.titulo(doc, y, 'Registro de entradas y salidas');
    const conPlacas = Boolean(usuario.placas);
    const columnas = [
        { titulo: '#', ancho: 28, alinear: 'center' },
        { titulo: 'Fecha', ancho: 68 },
        { titulo: 'Entrada' },
        { titulo: 'Salida' },
        { titulo: 'Duración', ancho: 72 },
        ...(conPlacas ? [{ titulo: 'Placas', ancho: 110 }] : [])
    ];
    const filas = registros.map((r, i) => ({
        resaltada: conteo[R.claveDia(r.fecha_entrada)] >= MAXIMO_POR_DIA,
        valores: [
            i + 1,
            R.fecha(r.fecha_entrada),
            R.textoEntrada(r),
            R.textoSalida(r),
            r.fecha_salida ? R.duracion(new Date(r.fecha_salida) - new Date(r.fecha_entrada)) : '—',
            ...(conPlacas ? [usuario.placas] : [])
        ]
    }));
    R.tabla(doc, y, columnas, filas, {
        vacio: rangoFechas && (rangoFechas.fechaInicio || rangoFechas.fechaFin)
            ? 'Sin accesos en el período seleccionado'
            : 'El usuario no tiene accesos registrados'
    });

    R.pies(doc, generado);
    doc.end();
    await terminado;
    console.log('PDF generado exitosamente en:', filePath);
    return filePath;
}

module.exports = { generateUserReportPDF };
