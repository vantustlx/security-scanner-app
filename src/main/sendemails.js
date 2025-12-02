const nodemailer = require('nodemailer');
const path = require('path');
const { ipcMain } = require('electron');
const http = require('http');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const os = require('os');

let mainWindow;
let listenersConfigured = false; // Bandera para evitar registro múltiple
let confirmationServer = null; // Referencia al servidor HTTP

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
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

    // Generar el código QR como dataURL
    const qrDataURL = await QRCode.toDataURL(matricula.toString());

    // Crear PDF con el QR
    const pdfPath = path.join(os.tmpdir(), `${matricula}_qr.pdf`);
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(20).text(`Registro para: ${nombre}`, { align: 'center' });
    doc.moveDown();
    doc.text(`Matrícula: ${matricula}`, { align: 'center' });

    // Convertir base64 a imagen en el PDF
    doc.image(qrDataURL, {
      fit: [200, 200],
      align: 'center',
      valign: 'center'
    });

    doc.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));

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
    const qrDataURL = await QRCode.toDataURL(matricula.toString());
    const pdfPath = path.join(os.tmpdir(), `${matricula}_qr.pdf`);
    
    // Crear PDF con el QR
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(20).text(`Recuperación de código QR para: ${nombre}`, { align: 'center' });
    doc.moveDown();
    doc.text(`Matrícula: ${matricula}`, { align: 'center' });

    doc.image(qrDataURL, {
        fit: [200, 200],
        align: 'center',
        valign: 'center'
    });

    doc.end();
    await new Promise((resolve) => writeStream.on('finish', resolve));

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

module.exports = { setupEmailListeners,validarEmail,enviarCorreoRecuperacion, iniciarServidorConfirmacion};
