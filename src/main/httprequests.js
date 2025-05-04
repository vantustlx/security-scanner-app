//Servidor de correos
const nodemailer = require('nodemailer');

ipcMain.on('enviar-correo', async (event, datos) => {
  const { email, nombre } = datos;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'gonzalezcazarescarlosdaniel@gmail.com',
      pass: 'CarlosDani19/#'
    }
  });

  const mailOptions = {
    from: 'tucorreo@gmail.com',
    to: email,
    subject: 'Confirmación de registro',
    text: `Hola ${nombre}, confirma tu registro aquí: https://confirmar-registro.app`
  };

  try {
    await transporter.sendMail(mailOptions);
    event.reply('correo-enviado', { success: true });
  } catch (error) {
    console.error('Error enviando correo:', error);
    event.reply('correo-enviado', { success: false, error });
  }
});
