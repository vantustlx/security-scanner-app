const nodemailer = require('nodemailer');
const path = require('path');
const { ipcMain, nativeImage } = require('electron');
const http = require('http');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const os = require('os');

let mainWindow;
let listenersConfigured = false; // Bandera para evitar registro múltiple
let confirmationServer = null; // Referencia al servidor HTTP

// Paleta tomada de los logos de la UATx y la FCBIyT
const COLORES = {
  guinda: '#6B1719',
  guindaOscuro: '#2B0A0D',
  dorado: '#C49A40',
  gris: '#9B9B9B',
  texto: '#333333',
  rosaClaro: '#EADEDE'
};

const ASSETS_DIR = path.join(__dirname, '..', 'renderer', 'assets');
let logosGafete = null;

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Los logos originales pesan varios MB: se reducen una sola vez para no inflar cada PDF
function obtenerLogosGafete() {
  if (!logosGafete) {
    const reducir = (archivo, ancho) => nativeImage
      .createFromPath(path.join(ASSETS_DIR, archivo))
      .resize({ width: ancho, quality: 'best' })
      .toPNG();
    logosGafete = {
      uatx: reducir('logo_uatx.png', 360),
      fcbiyt: reducir('logo_FCBIyT.png', 960)
    };
  }
  return logosGafete;
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

function setupEmailListeners(window) {
  mainWindow = window;

  // Evitar registrar listeners múltiples veces
  if (!listenersConfigured) {
    ipcMain.on('navigate', (event, routeName) => {
      const viewPath = path.join(__dirname, '..', 'renderer', 'views', `${routeName}.html`);
      console.log(`[NAVIGATE] Navegando a: ${routeName} (${viewPath})`);
      mainWindow.loadFile(viewPath).catch(err => {
        console.error(`[ERROR] Error al cargar vista ${routeName}:`, err);
      });
    });

    // Inicia el servidor de confirmación solo una vez
    iniciarServidorConfirmacion();

    ipcMain.on('enviar-correo', async (event, datos) => {
    const { email, nombre, matricula } = datos;

    const pdfPath = await generarGafetePDF(nombre, matricula);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'dangonzares@gmail.com',
        pass: 'itkhozuwhujqvmqu'
      }
    });

    const confirmationLink = `http://localhost:3000/confirmar?email=${encodeURIComponent(email)}`;

    const htmlContent = `
      <h2>Hola ${nombre}</h2>
      <p>Haz clic en el botón para confirmar tu registro:</p>
      <a href="${confirmationLink}" style="
        display:inline-block;
        padding:10px 20px;
        background-color:#28a745;
        color:#fff;
        text-decoration:none;
        border-radius:5px;">Confirmar registro</a>
      <p>Adjunto encontrarás tu código QR personal.</p>
    `;

    const mailOptions = {
      from: 'dangonzares@gmail.com',
      to: email,
      subject: 'Confirma tu registro',
      html: htmlContent,
      attachments: [{
        filename: `${matricula}_qr.pdf`,
        path: pdfPath
      }]
    };

    try {
      await transporter.sendMail(mailOptions);
      event.reply('correo-enviado', { success: true });
    } catch (error) {
      console.error('Error enviando correo:', error);
      event.reply('correo-enviado', { success: false, error });
    }
  });

    ipcMain.on('recuperar-qr', async (event, { matricula, email, nombre }) => {
      try {
          const resultado = await enviarCorreoRecuperacion(email, nombre, matricula);
          if (resultado.success) {
              event.reply('recuperar-qr-respuesta', { success: true, matricula });
          } else {
              event.reply('recuperar-qr-respuesta', { success: false, matricula, error: resultado.error });
          }
      } catch (error) {
          console.error('Error en recuperar-qr:', error);
          event.reply('recuperar-qr-respuesta', { success: false, matricula, error });
      }
    });

    listenersConfigured = true;
  }
}

function iniciarServidorConfirmacion() {
  // Si ya hay un servidor ejecutándose, no crear otro
  if (confirmationServer) {
    console.log('[SERVER] Servidor de confirmación ya está ejecutándose');
    return;
  }

  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/confirmar')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

      const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirmación de Registro</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #0a2e52, #006064);
      font-family: Arial, sans-serif;
    }
    h1 {
      color: #000000;
      text-align: center;
      padding: 30px;
      background-color: rgba(255, 255, 255, 0.8);
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
  </style>
</head>
<body>
  <h1>Registro confirmado. Puedes cerrar esta ventana.</h1>
</body>
</html>`;

      res.end(htmlContent);

      if (mainWindow) {
        const viewPath = path.join(__dirname, '..', 'renderer', 'views', `termsandconditions.html`);
        mainWindow.loadFile(viewPath).catch(console.error);
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  // Manejar errores del servidor
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log('[SERVER] Puerto 3000 ya en uso, servidor no iniciado');
      confirmationServer = null;
    } else {
      console.error('[SERVER] Error en servidor de confirmación:', error);
    }
  });

  server.listen(3000, () => {
    console.log('[SERVER] Servidor de confirmación escuchando en http://localhost:3000');
    confirmationServer = server;
  });
}

async function enviarCorreoRecuperacion(email, nombre, matricula) {
    const pdfPath = await generarGafetePDF(nombre, matricula);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'dangonzares@gmail.com',
            pass: 'itkhozuwhujqvmqu'
        }
    });

    const htmlContent = `
        <h2>Hola ${nombre}</h2>
        <p>Adjunto encontrarás tu código QR personal para el sistema de acceso.</p>
        <p>Si no solicitaste este correo, por favor ignóralo.</p>
    `;

    const mailOptions = {
        from: 'dangonzares@gmail.com',
        to: email,
        subject: 'Recuperación de código QR',
        html: htmlContent,
        attachments: [{
            filename: `${matricula}_qr.pdf`,
            path: pdfPath
        }]
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Error enviando correo de recuperación:', error);
        return { success: false, error };
    }
}

module.exports = { setupEmailListeners,validarEmail,enviarCorreoRecuperacion, iniciarServidorConfirmacion, generarGafetePDF};
