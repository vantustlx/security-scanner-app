import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateGroupReportPDF = (usuarios, searchParams) => {
    const doc = new jsPDF();
    
    // Configuración inicial
    doc.setFont('helvetica');
    
    // Título del reporte
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('REPORTE DE GRUPOS DE USUARIOS', 105, 20, { align: 'center' });
    
    // Información de la facultad
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Sistema de Acceso - Facultad', 105, 28, { align: 'center' });
    
    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32);
    
    // Información de los parámetros de búsqueda
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    
    let yPosition = 42;
    
    // Fecha de generación
    const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`Fecha de generación: ${fechaGeneracion}`, 14, yPosition);
    yPosition += 8;
    
    // Parámetros de búsqueda utilizados
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    doc.text('PARÁMETROS DE BÚSQUEDA:', 14, yPosition);
    yPosition += 6;
    
    if (searchParams.rol) {
        doc.text(`• Rol: ${searchParams.rol}`, 20, yPosition);
        yPosition += 5;
    }
    if (searchParams.carrera) {
        doc.text(`• Carrera: ${searchParams.carrera}`, 20, yPosition);
        yPosition += 5;
    }
    if (searchParams.turno) {
        doc.text(`• Turno: ${searchParams.turno}`, 20, yPosition);
        yPosition += 5;
    }
    if (searchParams.fechaInicio && searchParams.fechaFin) {
        doc.text(`• Período: ${searchParams.fechaInicio} a ${searchParams.fechaFin}`, 20, yPosition);
        yPosition += 5;
    }
    
    yPosition += 10;
    
    // Estadísticas rápidas
    doc.setFontSize(10);
    doc.setTextColor(41, 128, 185);
    doc.text(`Total de usuarios en el grupo: ${usuarios.length}`, 14, yPosition);
    yPosition += 15;
    
    // Preparar datos para la tabla
    const tableData = usuarios.map((usuario, index) => {
        const fechaRegistro = new Date(usuario.fecha_registro);
        const fechaFormateada = fechaRegistro.toLocaleDateString('es-MX');
        
        return [
            (index + 1).toString(),
            `${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno}`,
            usuario.matricula || 'N/A',
            usuario.numero_telefono || 'N/A',
            usuario.estatus || 'N/A',
            fechaFormateada
        ];
    });
    
    // Generar tabla
    doc.autoTable({
        startY: yPosition,
        head: [
            ['#', 'Nombre Completo', 'Matrícula', 'Teléfono', 'Estatus', 'Fecha Registro']
        ],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { top: yPosition },
        tableWidth: 'wrap'
    });
    
    // Pie de página con información adicional
    const finalY = doc.lastAutoTable.finalY + 15;
    
    // Resumen final
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    doc.text(`Reporte generado por el Sistema de Acceso Facultad`, 105, finalY, { align: 'center' });
    
    // Número de páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' });
    }
    
    // Guardar el PDF
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `reporte_grupo_${fecha}_${hora}.pdf`;
    
    doc.save(fileName);
};

// Función adicional para reportes más detallados
export const generateDetailedGroupReportPDF = (usuarios, searchParams, estadisticas) => {
    const doc = new jsPDF();
    
    // Configuración similar pero con más detalles...
    // Puedes expandir esta función según necesites
    
    doc.save(`reporte_detallado_${new Date().toISOString().split('T')[0]}.pdf`);
};