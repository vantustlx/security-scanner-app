const fs = require('fs');
const PDFDocument = require('pdfkit');
const { dialog } = require('electron');

/**
 * Genera un PDF mejorado con los registros de entrada/salida de usuarios
 * @param {Array} usuarios - Lista de usuarios con sus registros
 * @param {Object} searchParams - Parámetros de búsqueda
 * @param {BrowserWindow} mainWindow - Ventana principal para dialog
 */
async function generateGroupReportPDF(usuarios, searchParams, mainWindow) {
    if (!usuarios || !Array.isArray(usuarios)) {
        throw new Error('No se proporcionaron datos de usuarios válidos');
    }

    console.log('Generando PDF para:', usuarios.length, 'usuarios');
    searchParams = searchParams || {};

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar reporte PDF',
        defaultPath: `reporte_acceso_${new Date().toISOString().split('T')[0]}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!filePath) {
        throw new Error('Guardado cancelado por el usuario');
    }

    const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4',
        info: {
            Title: 'Reporte de Acceso de Usuarios',
            Author: 'Sistema de Acceso Facultad'
        }
    });
    
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // ENCABEZADO - Mejor diseñado
    doc.rect(0, 0, 612, 100)
       .fill('#1a365d'); // Azul oscuro profesional

    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('REPORTE DE ACCESO', 50, 25);
    
    doc.fontSize(10)
       .fillColor('#cbd5e0')
       .text('Sistema de Control - Facultad', 50, 55);
    
    doc.fontSize(9)
       .fillColor('#a0aec0')
       .text(`Generado: ${new Date().toLocaleString('es-MX')}`, 50, 72);

    doc.y = 120;

    // FILTROS APLICADOS - Mejor estructura
    const hasSearchParams = searchParams.rol || searchParams.carrera || searchParams.turno || 
                           (searchParams.fechaInicio && searchParams.fechaFin);
    
    if (hasSearchParams) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#1a365d')
           .text('FILTROS APLICADOS', 50, doc.y);
        
        doc.moveDown(0.3);
        
        doc.rect(50, doc.y - 5, 512, 0.5)
           .fill('#cbd5e0');
        
        doc.moveDown(0.5);
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor('#2d3748');

        const filters = [];
        if (searchParams.rol) filters.push(`Rol: ${searchParams.rol}`);
        if (searchParams.carrera) filters.push(`Carrera: ${obtenerNombreCarrera(searchParams.carrera)}`);
        if (searchParams.turno) filters.push(`Turno: ${searchParams.turno}`);
        if (searchParams.fechaInicio && searchParams.fechaFin) filters.push(`Período: ${searchParams.fechaInicio} a ${searchParams.fechaFin}`);
        
        doc.text(filters.join(' • '), 50, doc.y, { width: 512 });
        doc.moveDown(1);
    }

    // INFORMACIÓN RESUMIDA
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#2d3748')
       .text(`Total de registros: ${usuarios.length}`);
    
    doc.moveDown(0.8);

    // TABLA - Mejor diseño y contraste
    const headers = ['No.', 'Nombre Completo', 'Entrada', 'Salida'];
    const columnWidths = [35, 240, 120, 120];
    const columnPositions = [50, 90, 335, 460];
    
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

    // Filas de datos - Mejorado contraste y espaciado
    doc.font('Helvetica')
       .fontSize(8.5)
       .fillColor('#1a202c');

    let rowY = tableStartY + headerHeight;

    usuarios.forEach((usuario, index) => {
        // Alternar colores de fondo para mejor legibilidad
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f7fafc';
        
        doc.rect(50, rowY - 1, 512, rowHeight)
           .fill(bgColor);

        // Línea divisoria sutil entre filas
        doc.moveTo(50, rowY + rowHeight - 1)
           .lineTo(562, rowY + rowHeight - 1)
           .strokeColor('#e2e8f0')
           .lineWidth(0.5)
           .stroke();

        doc.fillColor('#1a202c');

        // 1. Número (centrado)
        doc.text((index + 1).toString(), columnPositions[0], rowY + 3, {
            width: columnWidths[0],
            align: 'center'
        });

        // 2. Nombre completo
        const nombre = usuario.nombre || '';
        const apellidoPaterno = usuario.apellido_paterno || '';
        const apellidoMaterno = usuario.apellido_materno || '';
        const nombreCompleto = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim();
        
        doc.text(nombreCompleto || 'N/A', columnPositions[1] + 3, rowY + 3, {
            width: columnWidths[1] - 6,
            align: 'left'
        });

        // 3. Entrada
        const entrada = usuario.fecha_entrada ? 
            new Date(usuario.fecha_entrada).toLocaleString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'N/A';
        
        doc.text(entrada, columnPositions[2] + 3, rowY + 3, {
            width: columnWidths[2] - 6,
            align: 'left'
        });

        // 4. Salida
        const salida = usuario.fecha_salida ? 
            new Date(usuario.fecha_salida).toLocaleString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'N/A';
        
        doc.text(salida, columnPositions[3] + 3, rowY + 3, {
            width: columnWidths[3] - 6,
            align: 'left'
        });

        rowY += rowHeight;

        // Salto de página automático
        if (rowY > 720 && index < usuarios.length - 1) {
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

    // PIE DE PÁGINA - Mejorado
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

module.exports = { generateGroupReportPDF };