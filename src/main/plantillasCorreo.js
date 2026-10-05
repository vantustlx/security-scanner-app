// plantillasCorreo.js — HTML institucional de los correos (tablas y estilos en línea para Gmail/Outlook)

const COLORES = {
  guinda: '#6B1719',
  dorado: '#C49A40',
  fondo: '#F4EFEA',
  texto: '#333333',
  gris: '#6B6B6B',
  rosaClaro: '#EADEDE',
  avisoFondo: '#FBF7F0'
};

// Identificadores de las imágenes incrustadas (adjuntos con cid)
const CID_LOGO_UATX = 'logo-uatx@fcbiyt';
const CID_LOGO_FCBIYT = 'logo-fcbiyt@fcbiyt';
const CID_CODIGO_BARRAS = 'codigo-barras@fcbiyt';

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatearFecha(fecha) {
  return fecha.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
}

function parrafo(html) {
  return `<p style="margin:0 0 16px 0;">${html}</p>`;
}

function aviso(html) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;">
    <tr><td style="background:${COLORES.avisoFondo};border-left:4px solid ${COLORES.dorado};border-radius:6px;padding:12px 16px;font-size:14px;">${html}</td></tr>
  </table>`;
}

function boton(enlace, texto) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 20px auto;">
    <tr><td align="center" style="border-radius:8px;background:${COLORES.guinda};">
      <a href="${escapar(enlace)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapar(texto)}</a>
    </td></tr>
  </table>`;
}

function layout({ titulo, preencabezado, contenido }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapar(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORES.fondo};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(preencabezado)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORES.fondo};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:${COLORES.texto};">
        <tr><td style="padding:18px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="left" valign="middle"><img src="cid:${CID_LOGO_UATX}" width="64" height="64" alt="Universidad Autónoma de Tlaxcala" style="display:block;border:0;"></td>
            <td align="right" valign="middle"><img src="cid:${CID_LOGO_FCBIYT}" width="170" alt="FCBIyT" style="display:block;border:0;height:auto;"></td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="background:${COLORES.guinda};border-bottom:4px solid ${COLORES.dorado};padding:16px 24px;">
          <h1 style="margin:0;font-size:20px;line-height:1.3;color:#FFFFFF;letter-spacing:.5px;">${escapar(titulo)}</h1>
        </td></tr>
        <tr><td style="padding:28px 32px 12px 32px;font-size:15px;line-height:1.6;">${contenido}</td></tr>
        <tr><td align="center" style="background:${COLORES.guinda};border-top:3px solid ${COLORES.dorado};padding:16px 24px;font-size:12px;line-height:1.6;color:${COLORES.rosaClaro};">
          <strong style="color:#FFFFFF;letter-spacing:1px;">UNIVERSIDAD AUTÓNOMA DE TLAXCALA</strong><br>
          Facultad de Ciencias Básicas, Ingeniería y Tecnología<br>
          <span style="font-size:11px;">Sistema de Acceso · Mensaje automático, por favor no respondas a este correo.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function correoTerminos({ nombre, enlace, expiraEn }) {
  const vence = formatearFecha(expiraEn);
  return {
    asunto: 'Confirma tu registro al Sistema de Acceso FCBIyT',
    html: layout({
      titulo: 'Confirma tu registro',
      preencabezado: 'Revisa los Términos y Condiciones y confirma tu registro al Sistema de Acceso.',
      contenido:
        parrafo(`Hola <strong>${escapar(nombre)}</strong>:`) +
        parrafo('El administrador del Sistema de Acceso de la facultad inició tu registro. Para completarlo, revisa los <strong>Términos y Condiciones</strong> que encontrarás adjuntos en este correo y confirma si los aceptas.') +
        boton(enlace, 'Revisar y confirmar registro') +
        aviso(`Tienes hasta el <strong>${escapar(vence)}</strong> para responder. Al confirmar, recibirás en este correo tu credencial de acceso con código QR.`) +
        parrafo(`<span style="font-size:13px;color:${COLORES.gris};">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${escapar(enlace)}" style="color:${COLORES.guinda};word-break:break-all;">${escapar(enlace)}</a></span>`) +
        parrafo(`<span style="font-size:13px;color:${COLORES.gris};">Si no solicitaste este registro, ignora este mensaje y tus datos no se guardarán.</span>`)
    }),
    texto: `Hola ${nombre}:\n\nEl administrador del Sistema de Acceso de la facultad inició tu registro. Revisa los Términos y Condiciones adjuntos y confirma tu registro en este enlace:\n${enlace}\n\nTienes hasta el ${vence} para responder. Si no solicitaste este registro, ignora este mensaje.`
  };
}

function correoCredencial({ nombre, matricula }) {
  return {
    asunto: 'Tu credencial de acceso – FCBIyT',
    html: layout({
      titulo: '¡Bienvenido al Sistema de Acceso!',
      preencabezado: 'Tu registro está completo. Adjuntamos tu credencial de acceso con código QR.',
      contenido:
        parrafo(`Hola <strong>${escapar(nombre)}</strong>:`) +
        parrafo(`Tu registro con la matrícula <strong>${escapar(matricula)}</strong> quedó completo. Adjuntamos tu <strong>credencial de acceso</strong> en PDF con tu código QR personal.`) +
        aviso('Presenta el código QR en el lector de la entrada de la facultad. Puedes guardarlo en tu celular o imprimir la credencial.') +
        parrafo(`<span style="font-size:13px;color:${COLORES.gris};">Tu código es personal: no lo compartas. Si lo pierdes, solicita su recuperación con el administrador del sistema.</span>`)
    }),
    texto: `Hola ${nombre}:\n\nTu registro con la matrícula ${matricula} quedó completo. Adjuntamos tu credencial de acceso con tu código QR personal. Preséntalo en el lector de la entrada de la facultad.`
  };
}

function correoRecuperacion({ nombre, matricula }) {
  return {
    asunto: 'Recuperación de tu credencial de acceso – FCBIyT',
    html: layout({
      titulo: 'Recuperación de credencial',
      preencabezado: 'Adjuntamos de nuevo tu credencial de acceso con código QR.',
      contenido:
        parrafo(`Hola <strong>${escapar(nombre)}</strong>:`) +
        parrafo(`Como lo solicitaste, adjuntamos de nuevo tu <strong>credencial de acceso</strong> con el código QR de la matrícula <strong>${escapar(matricula)}</strong>.`) +
        aviso('Presenta el código QR en el lector de la entrada de la facultad.') +
        parrafo(`<span style="font-size:13px;color:${COLORES.gris};">Si no solicitaste este correo, avisa al administrador del sistema.</span>`)
    }),
    texto: `Hola ${nombre}:\n\nAdjuntamos de nuevo tu credencial de acceso con el código QR de la matrícula ${matricula}.`
  };
}

function correoPaseVisitante({ nombre, folio, tipo, vigencia }) {
  const frecuente = tipo === 'Frecuente';
  const cuando = frecuente ? `hasta el <strong>${escapar(vigencia)}</strong>` : `el <strong>${escapar(vigencia)}</strong>`;
  return {
    asunto: 'Tu pase de visitante – FCBIyT',
    html: layout({
      titulo: 'Pase de visitante',
      preencabezado: 'Presenta este código de barras en el lector de la entrada de la facultad.',
      contenido:
        parrafo(`Hola <strong>${escapar(nombre)}</strong>:`) +
        parrafo(`Tu registro como <strong>visitante ${frecuente ? 'frecuente' : 'ocasional'}</strong> quedó listo. Presenta este código de barras en cualquiera de los lectores de la entrada de la facultad:`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;">
          <tr><td align="center" style="padding:16px;background:#FFFFFF;">
            <img src="cid:${CID_CODIGO_BARRAS}" width="300" alt="Código de barras ${escapar(folio)}" style="display:block;border:0;max-width:100%;height:auto;">
          </td></tr>
        </table>` +
        aviso(`Tu folio es <strong>${escapar(folio)}</strong> y es válido ${cuando}. Si no puedes mostrar el código, teclea el folio en la opción "Acceder" del sistema de visitantes.`) +
        parrafo(`<span style="font-size:13px;color:${COLORES.gris};">También adjuntamos tu pase en PDF por si prefieres imprimirlo.</span>`)
    }),
    texto: `Hola ${nombre}:\n\nTu registro como visitante ${frecuente ? 'frecuente' : 'ocasional'} quedó listo. Tu folio es ${folio} y es válido ${frecuente ? 'hasta el' : 'el'} ${vigencia}. Presenta el código de barras adjunto en el lector de la entrada o teclea tu folio en la opción "Acceder".`
  };
}

module.exports = { CID_LOGO_UATX, CID_LOGO_FCBIYT, CID_CODIGO_BARRAS, correoTerminos, correoCredencial, correoRecuperacion, correoPaseVisitante };
