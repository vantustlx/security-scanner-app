// pdfCierreDiario.js — reporte de auditoría con las personas que no registraron su salida
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { COLORES, obtenerLogos } = require('./identidad');

const MARGEN = 40;
const ANCHO = 612; // carta
const ALTO = 792;
const COLUMNAS = [
  { titulo: '#', ancho: 24, valor: (f, i) => String(i + 1) },
  { titulo: 'Matrícula', ancho: 64, valor: (f) => (f.matricula != null ? String(f.matricula) : '—') },
  { titulo: 'Nombre', ancho: 150, valor: (f) => [f.nombre, f.apellido_paterno, f.apellido_materno].filter(Boolean).join(' ') },
  { titulo: 'Área', ancho: 74, valor: (f) => f.rol || '—' },
  { titulo: 'Entrada', ancho: 86, valor: (f) => new Date(f.fecha_entrada).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) },
  { titulo: 'Medio', ancho: 60, valor: (f) => (f.medio_entrada === 'VEHICULAR' ? 'Vehículo' : f.medio_entrada === 'PEATONAL' ? 'A pie' : '—') },
  { titulo: 'Teléfono', ancho: 74, valor: (f) => f.telefono || '—' }
];

function encabezado(doc, { fechaCierre, tipo }) {
  const logos = obtenerLogos();
  doc.image(logos.uatx, MARGEN, 24, { fit: [50, 50] });
  doc.image(logos.fcbiyt, ANCHO - MARGEN - 140, 24, { fit: [140, 50], align: 'right', valign: 'center' });

  doc.rect(0, 84, ANCHO, 30).fill(COLORES.guinda);
  doc.rect(0, 114, ANCHO, 3).fill(COLORES.dorado);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#FFFFFF')
    .text('USUARIOS SIN REGISTRO DE SALIDA', 0, 93, { width: ANCHO, align: 'center', characterSpacing: 1.5 });

  const fecha = fechaCierre.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
  const subtitulo = tipo === 'PROGRAMADO'
    ? `Cierre del día · ${fecha}`
    : `Cierre de días anteriores (la aplicación estaba apagada a la hora del cierre) · ${fecha}`;
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORES.texto)
    .text(subtitulo, MARGEN, 126, { width: ANCHO - MARGEN * 2, align: 'center' });
  return 146;
}

function filaTabla(doc, y, valores, { negrita = false, fondo = null } = {}) {
  const alto = 20;
  if (fondo) doc.rect(MARGEN, y, ANCHO - MARGEN * 2, alto).fill(fondo);
  let x = MARGEN;
  doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(negrita ? '#FFFFFF' : COLORES.texto);
  COLUMNAS.forEach((col, i) => {
    doc.text(valores[i], x + 4, y + 6, { width: col.ancho - 8, height: alto - 6, ellipsis: true, lineBreak: false });
    x += col.ancho;
  });
  return y + alto;
}

/**
 * Genera el PDF y resuelve cuando termina de escribirse.
 * pendientes: filas de registroacceso abiertas (con datos del usuario o visitante).
 */
function generarPdfCierre({ archivo, pendientes, fechaCierre, tipo }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 0,
      bufferPages: true,
      info: { Title: `Usuarios sin registro de salida - ${fechaCierre.toLocaleDateString('es-MX')}`, Author: 'Sistema de Acceso FCBIyT' }
    });
    const salida = fs.createWriteStream(archivo);
    salida.on('finish', resolve);
    salida.on('error', reject);
    doc.pipe(salida);

    let y = encabezado(doc, { fechaCierre, tipo });
    const resumen = pendientes.length
      ? `${pendientes.length} ${pendientes.length === 1 ? 'persona no registró' : 'personas no registraron'} su salida. Sus entradas se cerraron automáticamente y todos los usuarios quedaron con estatus Inactivo.`
      : 'Todas las personas registraron su salida. Todos los usuarios quedaron con estatus Inactivo.';
    doc.font('Helvetica').fontSize(10).fillColor(COLORES.texto)
      .text(resumen, MARGEN, y + 6, { width: ANCHO - MARGEN * 2 });
    y = doc.y + 14;

    if (pendientes.length) {
      const titulos = COLUMNAS.map((c) => c.titulo);
      y = filaTabla(doc, y, titulos, { negrita: true, fondo: COLORES.guinda });
      pendientes.forEach((fila, i) => {
        if (y > ALTO - 70) {
          doc.addPage();
          y = filaTabla(doc, MARGEN, titulos, { negrita: true, fondo: COLORES.guinda });
        }
        y = filaTabla(doc, y, COLUMNAS.map((c) => c.valor(fila, i)), { fondo: i % 2 ? '#F7F1E6' : null });
      });
    }

    // Pie con número de página en todas las hojas
    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i++) {
      doc.switchToPage(rango.start + i);
      doc.rect(0, ALTO - 34, ANCHO, 2).fill(COLORES.dorado);
      doc.font('Helvetica').fontSize(8).fillColor(COLORES.gris)
        .text(`Universidad Autónoma de Tlaxcala · FCBIyT · Sistema de Acceso — Generado automáticamente · Página ${i + 1} de ${rango.count}`,
          MARGEN, ALTO - 26, { width: ANCHO - MARGEN * 2, align: 'center', lineBreak: false });
    }
    doc.end();
  });
}

module.exports = { generarPdfCierre };
