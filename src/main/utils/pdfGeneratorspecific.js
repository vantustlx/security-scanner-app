const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { dialog } = require('electron');

/**
 * Genera un PDF para un usuario específico con sus registros
 * @param {Object} usuario - Datos del usuario
 * @param {Array} registros - Registros de entrada/salida del usuario
 * @param {Object} rangoFechas - Rango de fechas del reporte
 * @param {BrowserWindow} mainWindow - Ventana principal para dialog
 */
async function generateUserReportPDF(usuario, registros, rangoFechas, mainWindow) {
    if (!usuario) {
        throw new Error('No se proporcionaron datos de usuario válidos');
    }

    if (!registros || registros.length === 0) {
        throw new Error('No hay registros para este usuario');
    }

    console.log('Generando PDF para usuario:', usuario.nombre, usuario.apellido_paterno);

    // Pedir al usuario dónde guardar
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar reporte PDF',
        defaultPath: `Reporte_${usuario.nombre}_${usuario.apellido_paterno}_${new Date().toISOString().split('T')[0]}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!filePath) {
        throw new Error('Guardado cancelado por el usuario');
    }

    const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
            Title: `Reporte de Usuario - ${usuario.nombre}`,
            Author: 'Sistema de Acceso Facultad'
        }
    });

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // ENCABEZADO - Diseño mejorado
    doc.rect(0, 0, 612, 120)
        .fill('#1a365d');

    doc.fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('REPORTE DE USUARIO', 50, 20);

    doc.fontSize(10)
        .fillColor('#cbd5e0')
        .text('Sistema de Control de Acceso - Facultad', 50, 50);

    doc.fontSize(9)
        .fillColor('#a0aec0')
        .text(`Generado: ${new Date().toLocaleString('es-MX')}`, 50, 67);

    doc.y = 140;

    // DATOS DEL USUARIO - Mejorado
    doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#1a365d')
        .text('INFORMACIÓN DEL USUARIO', 50, doc.y);

    doc.moveDown(0.3);
    doc.rect(50, doc.y - 5, 512, 0.5)
        .fill('#cbd5e0');

    doc.moveDown(0.5);
    doc.font('Helvetica')
        .fontSize(9)
        .fillColor('#2d3748');

    const nombreCompleto = `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno}`.trim();
    doc.text(`Nombre: ${nombreCompleto}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.text(`Matrícula: ${usuario.matricula || 'N/A'}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.text(`Turno: ${usuario.turno || 'N/A'}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.text(`Carrera: ${obtenerNombreCarrera(usuario.id_carrera) || 'N/A'}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.text(`Teléfono: ${usuario.numero_telefono || 'N/A'}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.text(`Correo: ${usuario.correo || 'N/A'}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.text(`Período: ${rangoFechas.fechaInicio} a ${rangoFechas.fechaFin}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.moveDown(1);
    doc.text(`Total de registros: ${registros.length}`, 50, doc.y, {
        link: null
    });

    doc.moveDown(1.2);

    // TABLA DE REGISTROS
    const headers = ['No.', 'Fecha Entrada', 'Fecha Salida', 'Duración'];
    const columnWidths = [40, 150, 150, 120];
    const columnPositions = [50, 95, 250, 405];

    const tableStartY = doc.y;
    const headerHeight = 22;
    const rowHeight = 18;

    // Encabezado de tabla
    doc.rect(50, tableStartY, 512, headerHeight)
        .fill('#2c3e50');

    doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#ffffff');

    headers.forEach((header, i) => {
        doc.text(header, columnPositions[i] + 3, tableStartY + 7, {
            width: columnWidths[i] - 6,
            align: i === 0 ? 'center' : 'left'
        });
    });

    // Filas de datos
    doc.font('Helvetica')
        .fontSize(8.5)
        .fillColor('#1a202c');

    let rowY = tableStartY + headerHeight;

    registros.forEach((registro, index) => {
        // Alternar colores de fondo
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f7fafc';

        doc.rect(50, rowY - 1, 512, rowHeight)
            .fill(bgColor);

        // Línea divisoria
        doc.moveTo(50, rowY + rowHeight - 1)
            .lineTo(562, rowY + rowHeight - 1)
            .strokeColor('#e2e8f0')
            .lineWidth(0.5)
            .stroke();

        doc.fillColor('#1a202c');

        // 1. Número
        doc.text((index + 1).toString(), columnPositions[0], rowY + 3, {
            width: columnWidths[0],
            align: 'center'
        });

        // 2. Fecha entrada
        const entrada = registro.fecha_entrada
            ? new Date(registro.fecha_entrada).toLocaleString('es-MX', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
              })
            : 'N/A';

        doc.text(entrada, columnPositions[1] + 3, rowY + 3, {
            width: columnWidths[1] - 6,
            align: 'left'
        });

        // 3. Fecha salida
        const salida = registro.fecha_salida
            ? new Date(registro.fecha_salida).toLocaleString('es-MX', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
              })
            : 'N/A';

        doc.text(salida, columnPositions[2] + 3, rowY + 3, {
            width: columnWidths[2] - 6,
            align: 'left'
        });

        // 4. Duración
        let duracion = 'N/A';
        if (registro.fecha_entrada && registro.fecha_salida) {
            const entrada_ms = new Date(registro.fecha_entrada).getTime();
            const salida_ms = new Date(registro.fecha_salida).getTime();
            const diferencia_ms = salida_ms - entrada_ms;
            const horas = Math.floor(diferencia_ms / (1000 * 60 * 60));
            const minutos = Math.floor((diferencia_ms % (1000 * 60 * 60)) / (1000 * 60));
            duracion = `${horas}h ${minutos}m`;
        }

        doc.text(duracion, columnPositions[3] + 3, rowY + 3, {
            width: columnWidths[3] - 6,
            align: 'left'
        });

        rowY += rowHeight;

        // Salto de página automático
        if (rowY > 700 && index < registros.length - 1) {
            doc.addPage();
            rowY = 50;

            // Redibujar encabezado en nueva página
            doc.rect(50, rowY, 512, headerHeight)
                .fill('#2c3e50');

            doc.font('Helvetica-Bold')
                .fontSize(9)
                .fillColor('#ffffff');

            headers.forEach((header, i) => {
                doc.text(header, columnPositions[i] + 3, rowY + 7, {
                    width: columnWidths[i] - 6,
                    align: i === 0 ? 'center' : 'left'
                });
            });

            rowY += headerHeight;
            doc.font('Helvetica')
                .fontSize(8.5)
                .fillColor('#1a202c');
        }
    });

    // PIE DE PÁGINA
    const pageHeight = doc.page.height;
    doc.rect(0, pageHeight - 40, 612, 40)
        .fill('#f7fafc');

    doc.fontSize(8)
        .fillColor('#718096')
        .text(
            'SECURITY SCANNER APP | Reporte confidencial de acceso',
            50,
            pageHeight - 30,
            { width: 512, align: 'center' }
        );

    doc.end();

    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
            console.log('PDF generado exitosamente en:', filePath);
            resolve(filePath);
        });
        writeStream.on('error', (error) => {
            console.error('Error al escribir PDF:', error);
            reject(error);
        });
    });
}

function obtenerNombreCarrera(idCarrera) {
    const carreras = {
        '1': 'Ingeniería en computación',
        '2': 'Ingeniería Química',
        '3': 'Ingeniería Mecánica',
        '4': 'Ingeniería en Sistemas Electrónicos',
        '5': 'Química Industrial',
        '6': 'Matemáticas Aplicadas'
    };
    return carreras[idCarrera] || idCarrera;
}

module.exports = { generateUserReportPDF };