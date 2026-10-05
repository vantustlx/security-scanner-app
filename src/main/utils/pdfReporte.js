// pdfReporte.js — piezas comunes de los reportes de acceso en PDF (grupo y usuario específico):
// encabezado institucional, ficha de datos, resumen en números, tabla con saltos de página y pie.
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { COLORES, obtenerLogos } = require('./identidad');

const ANCHO = 612; // carta
const ALTO = 792;
const MARGEN = 40;
const CONTENIDO = ANCHO - MARGEN * 2;
const LIMITE = ALTO - 56; // debajo queda el pie
const FONDO_SUAVE = '#FBF7F0';
const RENGLON_ALTERNO = '#F7F1E6';
const RESALTADO = '#F6DADA';
const BORDE = '#E4D6CF';

// ---------------------------------------------------------------------------
// Formatos
// ---------------------------------------------------------------------------

const fecha = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
const hora = (d) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const fechaHora = (d) => `${fecha(d)} ${hora(d)}`;
const claveDia = (d) => new Date(d).toLocaleDateString('en-CA'); // AAAA-MM-DD en hora local
const MEDIOS = { PEATONAL: 'peatonal', VEHICULAR: 'vehicular' };

// '2026-10-05' (valor de un input date) → '05/10/2026', sin pasar por Date para no correr el día por zona horaria
const fechaDeInput = (texto) => String(texto).split('-').reverse().join('/');

function periodo({ fechaInicio, fechaFin } = {}, sinFechas = 'Todo el historial') {
  if (fechaInicio && fechaFin) return `${fechaDeInput(fechaInicio)} al ${fechaDeInput(fechaFin)}`;
  if (fechaInicio) return `Desde el ${fechaDeInput(fechaInicio)}`;
  if (fechaFin) return `Hasta el ${fechaDeInput(fechaFin)}`;
  return sinFechas;
}

function duracion(ms) {
  const minutos = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(minutos / 60);
  if (!h) return `${minutos} min`;
  return minutos % 60 ? `${h} h ${minutos % 60} min` : `${h} h`;
}

const conMedio = (texto, medio) => (MEDIOS[medio] ? `${texto} · ${MEDIOS[medio]}` : texto);

// lector: agrega por cuál lector pasó (peatonal o vehicular), si se conoce
function textoEntrada(registro, { conFecha = false, lector = true } = {}) {
  const t = conFecha ? fechaHora(registro.fecha_entrada) : hora(registro.fecha_entrada);
  return lector ? conMedio(t, registro.medio_entrada) : t;
}

// La salida lleva fecha solo si fue otro día que la entrada
function textoSalida(registro, { lector = true } = {}) {
  if (registro.fecha_salida) {
    const otroDia = claveDia(registro.fecha_salida) !== claveDia(registro.fecha_entrada);
    const t = otroDia ? fechaHora(registro.fecha_salida) : hora(registro.fecha_salida);
    return lector ? conMedio(t, registro.medio_salida) : t;
  }
  if (registro.cierre_automatico) return 'Sin salida (cerrada)';
  return claveDia(registro.fecha_entrada) === claveDia(new Date()) ? 'Dentro' : 'Sin salida registrada';
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

function crearDocumento(archivo, titulo) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 0,
    bufferPages: true,
    info: { Title: titulo, Author: 'Sistema de Acceso FCBIyT' }
  });
  const salida = fs.createWriteStream(archivo);
  const terminado = new Promise((resolve, reject) => {
    salida.on('finish', resolve);
    salida.on('error', reject);
  });
  doc.pipe(salida);
  return { doc, terminado };
}

// Escudo UATx y logo FCBIyT, banda guinda con el título y línea dorada
function encabezado(doc, titulo, subtitulo) {
  const logos = obtenerLogos();
  doc.image(logos.uatx, MARGEN, 22, { fit: [54, 54] });
  doc.image(logos.fcbiyt, ANCHO - MARGEN - 150, 22, { fit: [150, 54], align: 'right', valign: 'center' });

  doc.rect(0, 86, ANCHO, 32).fill(COLORES.guinda);
  doc.rect(0, 118, ANCHO, 3).fill(COLORES.dorado);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF')
    .text(titulo, 0, 96, { width: ANCHO, align: 'center', characterSpacing: 1.5, lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor(COLORES.gris)
    .text(subtitulo, MARGEN, 130, { width: CONTENIDO, align: 'center' });
  return 152;
}

function titulo(doc, y, texto) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORES.guinda)
    .text(texto.toUpperCase(), MARGEN, y, { characterSpacing: 0.8, lineBreak: false });
  doc.rect(MARGEN, y + 15, CONTENIDO, 1).fill(COLORES.dorado);
  return y + 24;
}

/**
 * Recuadro con pares etiqueta/valor en dos columnas.
 * campos: [{ etiqueta, valor, completo }] — completo ocupa todo el ancho (p. ej. las áreas).
 */
function ficha(doc, y, campos) {
  const relleno = 12;
  const separacion = 20;
  const anchoColumna = (CONTENIDO - relleno * 2 - separacion) / 2;
  const alturaCampo = (c, ancho) => {
    doc.font('Helvetica').fontSize(9.5);
    return 11 + doc.heightOfString(String(c.valor), { width: ancho });
  };

  // Acomoda los campos en renglones de una o dos columnas
  const renglones = [];
  for (const campo of campos) {
    const ultimo = renglones[renglones.length - 1];
    if (!campo.completo && ultimo && ultimo.length === 1 && !ultimo[0].completo) ultimo.push(campo);
    else renglones.push([campo]);
  }
  const alturas = renglones.map((r) => Math.max(...r.map((c) => alturaCampo(c, c.completo ? CONTENIDO - relleno * 2 : anchoColumna))));
  const alto = alturas.reduce((a, b) => a + b + 8, relleno * 2 - 8);

  doc.rect(MARGEN, y, CONTENIDO, alto).fill(FONDO_SUAVE);
  doc.rect(MARGEN, y, 3, alto).fill(COLORES.guinda);

  let yCampo = y + relleno;
  renglones.forEach((renglon, i) => {
    renglon.forEach((c, j) => {
      const x = MARGEN + relleno + j * (anchoColumna + separacion);
      const ancho = c.completo ? CONTENIDO - relleno * 2 : anchoColumna;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORES.gris)
        .text(c.etiqueta.toUpperCase(), x, yCampo, { width: ancho, characterSpacing: 0.6, lineBreak: false });
      doc.font('Helvetica').fontSize(9.5).fillColor(COLORES.texto)
        .text(String(c.valor), x, yCampo + 11, { width: ancho });
    });
    yCampo += alturas[i] + 8;
  });
  return y + alto + 14;
}

// Tarjetas con números clave: [{ valor, etiqueta }]
function resumen(doc, y, tarjetas) {
  const separacion = 10;
  const ancho = (CONTENIDO - separacion * (tarjetas.length - 1)) / tarjetas.length;
  const alto = 48;
  tarjetas.forEach((t, i) => {
    const x = MARGEN + i * (ancho + separacion);
    doc.roundedRect(x, y, ancho, alto, 4).lineWidth(1).strokeColor(BORDE).stroke();
    doc.rect(x, y + 6, 3, alto - 12).fill(t.alerta ? COLORES.guinda : COLORES.dorado);
    doc.font('Helvetica-Bold').fontSize(16).fillColor(t.alerta ? COLORES.guinda : COLORES.texto)
      .text(String(t.valor), x + 12, y + 9, { width: ancho - 18, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(COLORES.gris)
      .text(t.etiqueta, x + 12, y + 30, { width: ancho - 18, lineBreak: false, ellipsis: true });
  });
  return y + alto + 12;
}

// Aviso con una muestra del color de resaltado de la tabla
function nota(doc, y, texto) {
  doc.rect(MARGEN, y + 1, 10, 10).fill(RESALTADO);
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORES.texto)
    .text(texto, MARGEN + 16, y + 1, { width: CONTENIDO - 16 });
  return doc.y + 10;
}

/**
 * Tabla con encabezado guinda que se repite en cada página.
 * columnas: [{ titulo, ancho, alinear }] — las que no traen ancho se reparten el espacio restante.
 * filas: [{ valores: [...], resaltada }]
 */
function tabla(doc, y, columnas, filas, { vacio = 'Sin registros' } = {}) {
  const fijo = columnas.reduce((suma, c) => suma + (c.ancho || 0), 0);
  const flexibles = columnas.filter((c) => !c.ancho).length;
  const anchos = columnas.map((c) => c.ancho || (CONTENIDO - fijo) / flexibles);
  const altoEncabezado = 22;
  const alto = 19;

  const celdas = (yFila, valores, altoFila) => {
    let x = MARGEN;
    valores.forEach((valor, i) => {
      doc.text(String(valor ?? '—'), x + 5, yFila + (altoFila - 9) / 2, {
        width: anchos[i] - 10, height: 11, align: columnas[i].alinear || 'left', lineBreak: false, ellipsis: true
      });
      x += anchos[i];
    });
  };
  const dibujarEncabezado = (yEnc) => {
    doc.rect(MARGEN, yEnc, CONTENIDO, altoEncabezado).fill(COLORES.guinda);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
    celdas(yEnc, columnas.map((c) => c.titulo), altoEncabezado);
    return yEnc + altoEncabezado;
  };

  y = dibujarEncabezado(y);
  if (!filas.length) {
    doc.rect(MARGEN, y, CONTENIDO, alto * 1.6).fill(FONDO_SUAVE);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORES.gris)
      .text(vacio, MARGEN, y + 10, { width: CONTENIDO, align: 'center', lineBreak: false });
    return y + alto * 1.6 + 10;
  }

  filas.forEach((fila, i) => {
    if (y + alto > LIMITE) {
      doc.addPage();
      y = dibujarEncabezado(MARGEN);
    }
    const fondo = fila.resaltada ? RESALTADO : (i % 2 ? RENGLON_ALTERNO : null);
    if (fondo) doc.rect(MARGEN, y, CONTENIDO, alto).fill(fondo);
    doc.moveTo(MARGEN, y + alto).lineTo(MARGEN + CONTENIDO, y + alto).lineWidth(0.5).strokeColor(BORDE).stroke();
    doc.font(fila.resaltada ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
      .fillColor(fila.resaltada ? COLORES.guinda : COLORES.texto);
    celdas(y, fila.valores, alto);
    y += alto;
  });
  return y + 10;
}

// Pie con línea dorada y número de página en todas las hojas
function pies(doc, generado) {
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    doc.rect(0, ALTO - 36, ANCHO, 2).fill(COLORES.dorado);
    doc.font('Helvetica').fontSize(8).fillColor(COLORES.gris)
      .text(`Universidad Autónoma de Tlaxcala · FCBIyT · Sistema de Acceso — Generado el ${generado} · Página ${i + 1} de ${rango.count}`,
        MARGEN, ALTO - 27, { width: CONTENIDO, align: 'center', lineBreak: false });
  }
}

module.exports = {
  crearDocumento, encabezado, titulo, ficha, resumen, nota, tabla, pies,
  fecha, hora, fechaHora, claveDia, duracion, periodo, textoEntrada, textoSalida
};
