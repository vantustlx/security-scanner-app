const nodemailer = require('nodemailer');
const path = require('path');
const { ipcMain } = require('electron');
const http = require('http');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const os = require('os');

let mainWindow;

function setupEmailListeners(window) {
  mainWindow = window;

  ipcMain.on('navigate', (event, routeName) => {
    const viewPath = path.join(__dirname, '..', 'renderer', 'views', `${routeName}.html`);
    window.loadFile(viewPath).catch(console.error);
  });

  ipcMain.on('enviar-correo', async (event, datos) => {
    const { email, nombre } = datos;
    const matricula = datos.matricula;
    // 🧠 Generar el código QR como dataURL
    const qrDataURL = await QRCode.toDataURL(matricula.toString());

    // 📄 Crear PDF con el QR
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

    await new Promise((resolve) => writeStream.on('finish', resolve)); // Esperar a que termine el PDF

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

  iniciarServidorConfirmacion(matricula);
}

function iniciarServidorConfirmacion(matricula) {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/confirmar')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

      // Asegurarnos de que el string template se está renderizando correctamente
      // evitando problemas con los backticks anidados y espacios en blanco
      const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
        //ipcRenderer.send('apuntador-matricula', matricula);
        mainWindow.loadFile(viewPath).catch(console.error);
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(3000, () => {
    console.log('Servidor de confirmación escuchando en http://localhost:3000');
  });
}

module.exports = { setupEmailListeners };

let matriculaTemp = null;

ipcMain.on('apuntador-matricula', (event, data) => {
    matriculaTemp = data.matricula;
    // cuando la vista ya esté cargada, se la mandamos
    mainWindow.webContents.send('matricula-a-waitconfirm', matriculaTemp);
});
