const nodemailer = require('nodemailer');
const { ipcMain } = require('electron');
const http = require('http');

let mainWindow; // Lo llenamos desde `setupRouting`

function setupEmailListeners(window) {
  mainWindow = window;

  ipcMain.on('navigate', (event, routeName) => {
    const path = require('path');
    const viewPath = path.join(__dirname, '..', 'renderer', 'views', `${routeName}.html`);
    window.loadFile(viewPath).catch(console.error);
  });

  ipcMain.on('enviar-correo', async (event, datos) => {
    const { email, nombre } = datos;

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
    `;

    const mailOptions = {
      from: 'dangonzares@gmail.com',
      to: email,
      subject: 'Confirma tu registro',
      html: htmlContent
    };

    try {
      await transporter.sendMail(mailOptions);
      event.reply('correo-enviado', { success: true });
    } catch (error) {
      console.error('Error enviando correo:', error);
      event.reply('correo-enviado', { success: false, error });
    }
  });

  iniciarServidorConfirmacion();
}

// Pequeño servidor local que escucha confirmaciones
function iniciarServidorConfirmacion() {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/confirmar')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Registro confirmado. Puedes cerrar esta ventana.</h1>');

      if (mainWindow) {
        mainWindow.webContents.send('registro-confirmado');
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
