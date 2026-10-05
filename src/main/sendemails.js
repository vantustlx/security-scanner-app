const nodemailer = require('nodemailer');
const path = require('path');
const { ipcMain, BrowserWindow } = require('electron');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const os = require('os');
const config = require('./config');
const plantillas = require('./plantillasCorreo');
const { COLORES, ASSETS_DIR, obtenerLogos: obtenerLogosGafete } = require('./utils/identidad');

let mainWindow;
let listenersConfigured = false; // Bandera para evitar registro múltiple
let transporter = null;

const TERMINOS_PDF = path.join(ASSETS_DIR, 'TérminosyCondiciones.pdf');

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Genera el gafete de acceso (QR grande centrado) y devuelve la ruta del PDF
async function generarGafetePDF(nombre, matricula) {
  const W = 300;
  const H = 510;
  const margen = 22;
  const anchoTexto = W - margen * 2;

  const qrPNG = await QRCode.toBuffer(matricula.toString(), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 1000,
    color: { dark: COLORES.guindaOscuro, light: '#FFFFFF' }
  });
  const logos = obtenerLogosGafete();

  const pdfPath = path.join(os.tmpdir(), `${matricula}_qr.pdf`);
  const doc = new PDFDocument({
    size: [W, H],
    margin: 0,
    info: { Title: `Credencial de acceso - ${matricula}`, Author: 'FCBIyT - UATx' }
  });
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Encabezado con los logos institucionales
  doc.image(logos.uatx, margen, 16, { fit: [62, 62] });
  doc.image(logos.fcbiyt, W - margen - 170, 16, { fit: [170, 62], align: 'right', valign: 'center' });

  doc.rect(0, 90, W, 32).fill(COLORES.guinda);
  doc.rect(0, 122, W, 3).fill(COLORES.dorado);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF')
    .text('CREDENCIAL DE ACCESO', 0, 100, { width: W, align: 'center', characterSpacing: 2 });

  // Nombre: se reduce la fuente hasta que quepa en una línea (mínimo 11 pt)
  let tamNombre = 18;
  doc.font('Helvetica-Bold');
  while (tamNombre > 11 && doc.fontSize(tamNombre).widthOfString(nombre) > anchoTexto) {
    tamNombre -= 0.5;
  }
  doc.fontSize(tamNombre).fillColor(COLORES.guinda)
    .text(nombre, margen, 140, { width: anchoTexto, align: 'center' });

  doc.font('Helvetica').fontSize(8).fillColor(COLORES.gris)
    .text('MATRÍCULA', margen, 178, { width: anchoTexto, align: 'center', characterSpacing: 1.5 });
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORES.texto)
    .text(matricula.toString(), margen, 189, { width: anchoTexto, align: 'center', characterSpacing: 1 });

  // QR enmarcado en dorado, con acentos cuadrados como en el logo de la FCBIyT
  const tamQR = 200;
  const relleno = 9;
  const marco = tamQR + relleno * 2;
  const marcoX = (W - marco) / 2;
  const marcoY = 214;
  doc.rect(marcoX - 8, marcoY - 8, 14, 14).fill(COLORES.guinda);
  doc.rect(marcoX - 14, marcoY + 10, 7, 7).fill(COLORES.dorado);
  doc.rect(marcoX + marco - 6, marcoY + marco - 6, 14, 14).fill(COLORES.guinda);
  doc.rect(marcoX + marco + 7, marcoY + marco - 17, 7, 7).fill(COLORES.gris);
  doc.roundedRect(marcoX, marcoY, marco, marco, 10).fillAndStroke('#FFFFFF', COLORES.dorado);
  doc.image(qrPNG, marcoX + relleno, marcoY + relleno, { width: tamQR });

  doc.font('Helvetica').fontSize(8.5).fillColor(COLORES.gris)
    .text('Presenta este código en el lector de la entrada', margen, marcoY + marco + 11, { width: anchoTexto, align: 'center' });

  // Pie institucional
  doc.rect(0, H - 47, W, 3).fill(COLORES.dorado);
  doc.rect(0, H - 44, W, 44).fill(COLORES.guinda);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
    .text('UNIVERSIDAD AUTÓNOMA DE TLAXCALA', 0, H - 34, { width: W, align: 'center', characterSpacing: 1 });
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORES.rosaClaro)
    .text('Facultad de Ciencias Básicas, Ingeniería y Tecnología', 0, H - 20, { width: W, align: 'center' });

  doc.end();
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
  return pdfPath;
}

function obtenerTransporter() {
  if (!transporter) {
    if (!config.correo.usuario || !config.correo.password) {
      throw new Error('Falta configurar GMAIL_USER y GMAIL_APP_PASSWORD en .env');
    }
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.correo.usuario, pass: config.correo.password }
    });
  }
  return transporter;
}

// Modo de pruebas: guarda el correo como HTML (con los logos visibles) y sus adjuntos
function guardarVistaPrevia(mensaje) {
  const dir = config.correo.vistaPreviaDir;
  fs.mkdirSync(dir, { recursive: true });
  const base = `${Date.now()}_${mensaje.subject.replace(/[^\w]+/g, '_').slice(0, 40)}`;
  let html = mensaje.html;
  for (const adjunto of mensaje.attachments) {
    if (adjunto.cid) {
      html = html.split(`cid:${adjunto.cid}`).join(`data:image/png;base64,${adjunto.content.toString('base64')}`);
    } else {
      fs.copyFileSync(adjunto.path, path.join(dir, `${base}__${adjunto.filename}`));
    }
  }
  fs.writeFileSync(path.join(dir, `${base}.html`), html);
  fs.writeFileSync(path.join(dir, `${base}.json`), JSON.stringify({
    para: mensaje.to, asunto: mensaje.subject, adjuntos: mensaje.attachments.filter((a) => !a.cid).map((a) => a.filename)
  }, null, 2));
  console.log(`[CORREO] Vista previa guardada (no enviado): ${base}.html`);
}

async function enviarCorreo({ para, plantilla, adjuntos = [] }) {
  const logos = obtenerLogosGafete();
  const mensaje = {
    from: `"Sistema de Acceso FCBIyT" <${config.correo.usuario}>`,
    to: para,
    subject: plantilla.asunto,
    html: plantilla.html,
    text: plantilla.texto,
    attachments: [
      { filename: 'logo-uatx.png', content: logos.uatx, cid: plantillas.CID_LOGO_UATX },
      { filename: 'logo-fcbiyt.png', content: logos.fcbiyt, cid: plantillas.CID_LOGO_FCBIYT },
      ...adjuntos
    ]
  };
  if (config.correo.vistaPreviaDir) return guardarVistaPrevia(mensaje);
  await obtenerTransporter().sendMail(mensaje);
}

// Primer correo del registro: Términos y Condiciones + enlace para aceptarlos o rechazarlos
async function enviarCorreoTerminos({ correo, nombre, enlace, expiraEn }) {
  await enviarCorreo({
    para: correo,
    plantilla: plantillas.correoTerminos({ nombre, enlace, expiraEn }),
    adjuntos: [{ filename: 'Terminos_y_Condiciones_Sistema_de_Acceso.pdf', path: TERMINOS_PDF }]
  });
}

async function enviarConGafete({ correo, nombre, matricula, plantilla }) {
  const pdfPath = await generarGafetePDF(nombre, matricula);
  try {
    await enviarCorreo({
      para: correo,
      plantilla,
      adjuntos: [{ filename: `Credencial_${matricula}.pdf`, path: pdfPath }]
    });
  } finally {
    fs.unlink(pdfPath, () => {});
  }
}

// Segundo correo del registro: el usuario ya aceptó y recibe su credencial con QR
async function enviarCredencial({ correo, nombre, matricula }) {
  await enviarConGafete({ correo, nombre, matricula, plantilla: plantillas.correoCredencial({ nombre, matricula }) });
}

async function enviarCorreoRecuperacion(email, nombre, matricula) {
  try {
    await enviarConGafete({ correo: email, nombre, matricula, plantilla: plantillas.correoRecuperacion({ nombre, matricula }) });
    return { success: true };
  } catch (error) {
    console.error('Error enviando correo de recuperación:', error);
    return { success: false, error: error.message };
  }
}

function setupEmailListeners(window) {
  mainWindow = window;

  // Evitar registrar listeners múltiples veces
  if (!listenersConfigured) {
    ipcMain.on('navigate', (event, routeName) => {
      const viewPath = path.join(__dirname, '..', 'renderer', 'views', `${routeName}.html`);
      console.log(`[NAVIGATE] Navegando a: ${routeName} (${viewPath})`);
      // Se navega en la ventana que lo pidió (principal o lector de accesos)
      const ventana = BrowserWindow.fromWebContents(event.sender) || mainWindow;
      ventana.loadFile(viewPath).catch(err => {
        console.error(`[ERROR] Error al cargar vista ${routeName}:`, err);
      });
    });

    ipcMain.on('recuperar-qr', async (event, { matricula, email, nombre }) => {
      const resultado = await enviarCorreoRecuperacion(email, nombre, matricula);
      if (resultado.success) {
        event.reply('recuperar-qr-respuesta', { success: true, matricula });
      } else {
        event.reply('recuperar-qr-respuesta', { success: false, matricula, error: resultado.error });
      }
    });

    listenersConfigured = true;
  }
}

module.exports = {
  setupEmailListeners,
  validarEmail,
  generarGafetePDF,
  enviarCorreoTerminos,
  enviarCredencial,
  enviarCorreoRecuperacion
};
