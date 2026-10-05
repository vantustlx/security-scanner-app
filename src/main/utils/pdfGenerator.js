const { dialog } = require('electron');
const R = require('./pdfReporte');

/**
 * Genera el reporte de accesos de un grupo de usuarios
 * @param {Array} usuarios - Registros de entrada/salida (uno por acceso, con datos del usuario y sus placas)
 * @param {Object} searchParams - Filtros usados; "nombres" trae las etiquetas de área, carrera y turno
 * @param {BrowserWindow} mainWindow - Ventana principal para dialog
 */
async function generateGroupReportPDF(usuarios, searchParams, mainWindow) {
    if (!usuarios || !Array.isArray(usuarios)) {
        throw new Error('No se proporcionaron datos de usuarios válidos');
    }

    console.log('Generando PDF para:', usuarios.length, 'registros');
    searchParams = searchParams || {};

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar reporte PDF',
        defaultPath: `reporte_acceso_${new Date().toISOString().split('T')[0]}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!filePath) {
        throw new Error('Guardado cancelado por el usuario');
    }

    // La pantalla envía los nombres de los filtros elegidos (los catálogos viven en la BD)
    const nombres = searchParams.nombres || {};
    const personas = new Set(usuarios.map((u) => u.matricula));
    const conVehiculo = new Set(usuarios.filter((u) => u.placas).map((u) => u.matricula));
    const dias = new Set(usuarios.map((u) => R.claveDia(u.fecha_entrada)));

    const generado = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    const { doc, terminado } = R.crearDocumento(filePath, 'Reporte de acceso de grupo de usuarios');

    let y = R.encabezado(doc, 'REPORTE DE ACCESOS POR GRUPO', `Generado el ${generado}`);
    y = R.titulo(doc, y, 'Filtros aplicados');
    y = R.ficha(doc, y, [
        { etiqueta: 'Área', valor: nombres.area || 'Todas las áreas' },
        { etiqueta: 'Carrera', valor: nombres.carrera || 'Todas las carreras' },
        { etiqueta: 'Turno', valor: nombres.turno || 'Todos los turnos' },
        { etiqueta: 'Período', valor: R.periodo(searchParams) }
    ]);

    y = R.resumen(doc, y, [
        { valor: personas.size, etiqueta: 'Personas' },
        { valor: usuarios.length, etiqueta: 'Accesos' },
        { valor: dias.size, etiqueta: 'Días con registros' },
        { valor: conVehiculo.size, etiqueta: 'Personas con vehículo' }
    ]);

    y = R.titulo(doc, y, 'Registro de entradas y salidas');
    const conPlacas = conVehiculo.size > 0;
    const columnas = [
        { titulo: '#', ancho: 26, alinear: 'center' },
        { titulo: 'Nombre completo' },
        { titulo: 'Matrícula', ancho: 58 },
        { titulo: 'Entrada', ancho: 88 },
        { titulo: 'Salida', ancho: 104 },
        ...(conPlacas ? [{ titulo: 'Placas', ancho: 112 }] : [])
    ];
    const filas = usuarios.map((u, i) => ({
        valores: [
            i + 1,
            [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' '),
            u.matricula,
            R.textoEntrada(u, { conFecha: true, lector: false }),
            R.textoSalida(u, { lector: false }),
            ...(conPlacas ? [u.placas || '—'] : [])
        ]
    }));
    R.tabla(doc, y, columnas, filas, { vacio: 'Sin accesos con estos filtros' });

    R.pies(doc, generado);
    doc.end();
    await terminado;
    console.log('PDF generado exitosamente en:', filePath);
    return filePath;
}

module.exports = { generateGroupReportPDF };
