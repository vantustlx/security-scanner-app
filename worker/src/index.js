/**
 * Buzón de confirmaciones de registro (Cloudflare Worker).
 *
 * El usuario abre el enlace del correo y acepta o rechaza los Términos y
 * Condiciones. La decisión queda guardada en KV aunque la PC de la facultad
 * esté apagada; la app de escritorio la recoge con /api/decisiones.
 *
 * KV:
 *   p:<token>  solicitud registrada por la app { nombre, expiraEn, estado, fechaDecision }
 *   d:<token>  decisión pendiente de recoger    { token, accion, fecha }
 */
import { LOGO_UATX, LOGO_FCBIYT } from './logos.js';

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{32}$/;
const DIA = 24 * 60 * 60;

const LOGOS = {
  '/logo-uatx.png': LOGO_UATX,
  '/logo-fcbiyt.png': LOGO_FCBIYT
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (request.method === 'GET' && LOGOS[pathname]) {
        return imagen(LOGOS[pathname]);
      }

      const coincidencia = pathname.match(/^\/confirmar\/([^/]+)$/);
      if (coincidencia) {
        const token = coincidencia[1];
        if (request.method === 'GET') return mostrarSolicitud(token, env);
        if (request.method === 'POST') return registrarDecision(token, request, env);
      }

      if (pathname.startsWith('/api/')) {
        if (!(await autorizado(request, env))) return json({ error: 'No autorizado' }, 401);
        if (request.method === 'POST' && pathname === '/api/pendientes') return crearPendiente(request, env);
        if (request.method === 'GET' && pathname === '/api/decisiones') return listarDecisiones(env);
        if (request.method === 'POST' && pathname === '/api/decisiones/ack') return confirmarRecepcion(request, env);
      }

      return pagina('Página no encontrada', '<p>El enlace no es válido.</p>', 404);
    } catch (error) {
      console.error(error);
      if (pathname.startsWith('/api/')) return json({ error: 'Error interno' }, 500);
      return pagina('Ocurrió un error', '<p>No pudimos procesar tu solicitud. Intenta de nuevo en unos minutos.</p>', 500);
    }
  }
};

// ---------------------------------------------------------------------------
// API privada para la app de escritorio
// ---------------------------------------------------------------------------

async function autorizado(request, env) {
  if (!env.API_KEY) return false;
  const recibido = new TextEncoder().encode(request.headers.get('Authorization') || '');
  const esperado = new TextEncoder().encode(`Bearer ${env.API_KEY}`);
  return recibido.byteLength === esperado.byteLength && crypto.subtle.timingSafeEqual(recibido, esperado);
}

async function crearPendiente(request, env) {
  const { token, nombre, expiraEn } = await request.json();
  if (!TOKEN_VALIDO.test(token || '') || typeof expiraEn !== 'number' || !nombre) {
    return json({ error: 'Datos inválidos' }, 400);
  }
  const registro = { nombre: String(nombre).slice(0, 60), expiraEn, estado: 'pendiente' };
  await env.CONFIRMACIONES.put(`p:${token}`, JSON.stringify(registro), {
    expiration: Math.floor(expiraEn / 1000) + 7 * DIA
  });
  return json({ ok: true }, 201);
}

async function listarDecisiones(env) {
  const decisiones = [];
  let cursor;
  do {
    const pagina = await env.CONFIRMACIONES.list({ prefix: 'd:', cursor });
    for (const { name } of pagina.keys) {
      const decision = await env.CONFIRMACIONES.get(name, 'json');
      if (decision) decisiones.push(decision);
    }
    cursor = pagina.list_complete ? null : pagina.cursor;
  } while (cursor);
  return json({ decisiones });
}

async function confirmarRecepcion(request, env) {
  const { tokens } = await request.json();
  if (!Array.isArray(tokens)) return json({ error: 'Datos inválidos' }, 400);
  await Promise.all(tokens.filter((t) => TOKEN_VALIDO.test(t)).map((t) => env.CONFIRMACIONES.delete(`d:${t}`)));
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
// Páginas para el usuario
// ---------------------------------------------------------------------------

async function obtenerSolicitud(token, env) {
  if (!TOKEN_VALIDO.test(token)) return null;
  return env.CONFIRMACIONES.get(`p:${token}`, 'json');
}

// Las respuestas inválidas comparten el mismo mensaje para no revelar qué tokens existen
function paginaEstado(solicitud) {
  if (!solicitud) {
    return pagina('Enlace no válido', '<p>Este enlace no es válido o ya no está disponible. Si necesitas registrarte, acude con el administrador del sistema de acceso.</p>', 404);
  }
  if (solicitud.estado === 'aceptado') {
    return pagina('Registro ya confirmado', '<p>Ya habías aceptado los Términos y Condiciones. Recibirás tu credencial con código QR en tu correo electrónico.</p>');
  }
  if (solicitud.estado === 'rechazado') {
    return pagina('Solicitud cancelada', '<p>Ya habías rechazado esta solicitud de registro. Si cambias de opinión, acude con el administrador para registrarte de nuevo.</p>');
  }
  if (Date.now() > solicitud.expiraEn) {
    return pagina('El enlace venció', '<p>El plazo para responder esta solicitud terminó. Acude con el administrador del sistema de acceso para registrarte de nuevo.</p>', 410);
  }
  return null;
}

async function mostrarSolicitud(token, env) {
  const solicitud = await obtenerSolicitud(token, env);
  const estado = paginaEstado(solicitud);
  if (estado) return estado;

  const vence = new Date(solicitud.expiraEn).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short'
  });

  // Se confirma con POST: los antivirus de correo abren los enlaces (GET) por su cuenta
  return pagina('Confirma tu registro', `
    <p>Hola <strong>${escapar(solicitud.nombre)}</strong>, el administrador del sistema de acceso de la facultad inició tu registro.</p>
    <p>Para completarlo, lee los <strong>Términos y Condiciones</strong> que te enviamos adjuntos en el correo y confirma si los aceptas.</p>
    <form method="POST" class="formulario">
      <label class="casilla">
        <input type="checkbox" name="acepto" value="si" required>
        <span>He leído y acepto los Términos y Condiciones de Uso del Sistema de Acceso.</span>
      </label>
      <button type="submit" name="accion" value="aceptar" class="boton boton-principal">Aceptar y confirmar registro</button>
      <button type="submit" name="accion" value="rechazar" class="boton boton-secundario" formnovalidate>No acepto</button>
    </form>
    <p class="nota">Este enlace vence el ${escapar(vence)}</p>
  `);
}

async function registrarDecision(token, request, env) {
  const solicitud = await obtenerSolicitud(token, env);
  const estado = paginaEstado(solicitud);
  if (estado) return estado;

  const formulario = await request.formData();
  const accion = formulario.get('accion');
  if (accion !== 'aceptar' && accion !== 'rechazar') return mostrarSolicitud(token, env);
  if (accion === 'aceptar' && formulario.get('acepto') !== 'si') return mostrarSolicitud(token, env);

  const fecha = new Date().toISOString();
  const estadoFinal = accion === 'aceptar' ? 'aceptado' : 'rechazado';
  await env.CONFIRMACIONES.put(`d:${token}`, JSON.stringify({ token, accion, fecha }), { expirationTtl: 60 * DIA });
  await env.CONFIRMACIONES.put(`p:${token}`, JSON.stringify({ ...solicitud, estado: estadoFinal, fechaDecision: fecha }), {
    expiration: Math.floor(solicitud.expiraEn / 1000) + 7 * DIA
  });

  if (accion === 'aceptar') {
    return pagina('¡Registro confirmado!', `
      <p>Gracias, <strong>${escapar(solicitud.nombre)}</strong>. Aceptaste los Términos y Condiciones.</p>
      <p>Te enviaremos tu <strong>credencial de acceso con código QR</strong> al correo electrónico en cuanto el sistema de la facultad procese tu confirmación. Si respondiste fuera del horario de la facultad, la recibirás el siguiente día hábil.</p>
      <p class="nota">Ya puedes cerrar esta ventana.</p>
    `);
  }
  return pagina('Solicitud cancelada', `
    <p>Rechazaste los Términos y Condiciones, por lo que <strong>no se completó tu registro</strong> y tus datos no se guardarán en el sistema.</p>
    <p class="nota">Si cambias de opinión, acude con el administrador del sistema de acceso para registrarte de nuevo.</p>
  `);
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function json(datos, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function imagen(base64) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }
  });
}

function pagina(titulo, contenido, status = 200) {
  const documento = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapar(titulo)} · Sistema de Acceso FCBIyT</title>
  <style>
    :root { --guinda: #6B1719; --guinda-oscuro: #4A0E12; --dorado: #C49A40; --gris: #6B6B6B; --fondo: #F4EFEA; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--fondo); font-family: Arial, Helvetica, sans-serif; color: #333; }
    .tarjeta { max-width: 560px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 24px rgba(74, 14, 18, .12); }
    .logos { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 24px; }
    .logos img:first-child { width: 64px; height: 64px; }
    .logos img:last-child { width: 160px; height: auto; }
    .banda { background: var(--guinda); color: #fff; text-align: center; padding: 14px 16px; border-bottom: 4px solid var(--dorado); }
    .banda h1 { margin: 0; font-size: 20px; letter-spacing: .5px; }
    .contenido { padding: 24px; line-height: 1.6; font-size: 15px; }
    .formulario { margin-top: 20px; display: grid; gap: 12px; }
    .casilla { display: flex; gap: 10px; align-items: flex-start; padding: 12px; background: #FBF7F0; border: 1px solid #EADCC0; border-radius: 8px; cursor: pointer; }
    .casilla input { margin-top: 4px; width: 18px; height: 18px; accent-color: var(--guinda); flex-shrink: 0; }
    .boton { display: block; width: 100%; padding: 14px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; }
    .boton-principal { background: var(--guinda); color: #fff; border: none; }
    .boton-principal:hover { background: var(--guinda-oscuro); }
    .boton-secundario { background: #fff; color: var(--gris); border: 1px solid #CFCFCF; }
    .nota { color: var(--gris); font-size: 13px; }
    .pie { background: var(--guinda); color: #EADEDE; text-align: center; padding: 14px; font-size: 12px; border-top: 3px solid var(--dorado); }
    .pie strong { color: #fff; letter-spacing: 1px; }
    @media (max-width: 480px) { .tarjeta { margin: 0; border-radius: 0; } .logos img:last-child { width: 130px; } }
  </style>
</head>
<body>
  <main class="tarjeta">
    <div class="logos">
      <img src="/logo-uatx.png" alt="Universidad Autónoma de Tlaxcala">
      <img src="/logo-fcbiyt.png" alt="FCBIyT">
    </div>
    <div class="banda"><h1>${escapar(titulo)}</h1></div>
    <div class="contenido">${contenido}</div>
    <div class="pie">
      <strong>UNIVERSIDAD AUTÓNOMA DE TLAXCALA</strong><br>
      Facultad de Ciencias Básicas, Ingeniería y Tecnología
    </div>
  </main>
</body>
</html>`;
  return new Response(documento, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
