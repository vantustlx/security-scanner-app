// areas.js — áreas, carreras y turnos de los usuarios
//
// Una persona (un solo registro en usuario, un solo QR) puede tener varias combinaciones
// en usuario_area: área + carrera (solo en áreas con requiere_carrera) + turnos (casillas
// en usuario_area_turno). Una de ellas es la principal.
// Formato que viaja entre renderer y proceso principal:
//   [{ id_area, id_carrera, turnos: [id_turno], principal }]
const { ipcMain } = require('electron');

const MAX_COMBINACIONES = 10;

let pool;

async function obtenerCatalogos(db = pool) {
  const [areas] = await db.query('SELECT id_area, nombre, requiere_carrera FROM area ORDER BY id_area');
  const [carreras] = await db.query('SELECT id_carrera, nombre_carrera AS nombre FROM carrera ORDER BY id_carrera');
  const [turnos] = await db.query('SELECT id_turno, nombre FROM turno ORDER BY id_turno');
  return {
    areas: areas.map((a) => ({ ...a, requiere_carrera: Boolean(a.requiere_carrera) })),
    carreras,
    turnos
  };
}

/**
 * Valida y normaliza las combinaciones de un usuario contra los catálogos.
 * Devuelve { errores, areas } con ids numéricos, sin duplicados de turno y una sola principal.
 */
function validarAreas(entrada, catalogos) {
  const errores = [];
  if (!Array.isArray(entrada) || entrada.length === 0) {
    return { errores: ['Agrega al menos un área'], areas: [] };
  }
  if (entrada.length > MAX_COMBINACIONES) errores.push(`Máximo ${MAX_COMBINACIONES} áreas por persona`);

  const areas = [];
  const vistas = new Set();
  entrada.forEach((item, i) => {
    const n = i + 1;
    const area = catalogos.areas.find((a) => a.id_area === Number(item && item.id_area));
    if (!area) {
      errores.push(`Área ${n}: selecciona un área`);
      return;
    }
    let idCarrera = null;
    if (area.requiere_carrera) {
      const carrera = catalogos.carreras.find((c) => c.id_carrera === Number(item.id_carrera));
      if (!carrera) errores.push(`Área ${n} (${area.nombre}): selecciona una carrera`);
      else idCarrera = carrera.id_carrera;
    }
    const turnos = [...new Set((Array.isArray(item.turnos) ? item.turnos : []).map(Number))]
      .filter((id) => catalogos.turnos.some((t) => t.id_turno === id));
    if (turnos.length === 0) errores.push(`Área ${n} (${area.nombre}): marca al menos un turno`);

    const clave = `${area.id_area}:${idCarrera}`;
    if (vistas.has(clave)) errores.push(`Área ${n} (${area.nombre}): está repetida`);
    vistas.add(clave);

    areas.push({ id_area: area.id_area, id_carrera: idCarrera, turnos, principal: Boolean(item.principal) });
  });

  const principales = areas.filter((a) => a.principal).length;
  if (principales !== 1 && errores.length === 0) errores.push('Marca una sola área como principal');
  return { errores, areas };
}

// Reemplaza las combinaciones del usuario (usar dentro de una transacción)
async function guardarAreas(conexion, matricula, areas) {
  await conexion.query('DELETE FROM usuario_area WHERE matricula = ?', [matricula]);
  for (const area of areas) {
    const [resultado] = await conexion.query(
      'INSERT INTO usuario_area (matricula, id_area, id_carrera, principal) VALUES (?, ?, ?, ?)',
      [matricula, area.id_area, area.id_carrera, area.principal ? 1 : 0]
    );
    await conexion.query(
      'INSERT INTO usuario_area_turno (id_usuario_area, id_turno) VALUES ?',
      [area.turnos.map((idTurno) => [resultado.insertId, idTurno])]
    );
  }
}

/**
 * Combinaciones de varios usuarios: Map matricula -> [{ id_area, area, id_carrera, carrera, turnos, principal }],
 * con la principal primero.
 */
async function obtenerAreasDeUsuarios(matriculas, db = pool) {
  const resultado = new Map();
  const lista = [...new Set(matriculas.filter((m) => m != null).map(Number))];
  if (lista.length === 0) return resultado;
  const [filas] = await db.query(
    `SELECT ua.matricula, ua.id_usuario_area, ua.id_area, a.nombre AS area, ua.id_carrera,
            c.nombre_carrera AS carrera, ua.principal, t.id_turno, t.nombre AS turno
       FROM usuario_area ua
       JOIN area a ON a.id_area = ua.id_area
       LEFT JOIN carrera c ON c.id_carrera = ua.id_carrera
       LEFT JOIN usuario_area_turno uat ON uat.id_usuario_area = ua.id_usuario_area
       LEFT JOIN turno t ON t.id_turno = uat.id_turno
      WHERE ua.matricula IN (?)
      ORDER BY ua.matricula, ua.principal DESC, ua.id_usuario_area, t.id_turno`,
    [lista]
  );
  const porCombinacion = new Map();
  for (const f of filas) {
    let combinacion = porCombinacion.get(f.id_usuario_area);
    if (!combinacion) {
      combinacion = {
        id_area: f.id_area, area: f.area, id_carrera: f.id_carrera, carrera: f.carrera,
        turnos: [], principal: Boolean(f.principal)
      };
      porCombinacion.set(f.id_usuario_area, combinacion);
      if (!resultado.has(f.matricula)) resultado.set(f.matricula, []);
      resultado.get(f.matricula).push(combinacion);
    }
    if (f.id_turno) combinacion.turnos.push({ id_turno: f.id_turno, nombre: f.turno });
  }
  return resultado;
}

// Agrega la propiedad "areas" a cada fila que tenga matricula
async function adjuntarAreas(filas, db = pool) {
  const mapa = await obtenerAreasDeUsuarios(filas.map((f) => f.matricula), db);
  return filas.map((f) => ({ ...f, areas: mapa.get(Number(f.matricula)) || [] }));
}

// "Estudiante (Ing. en Computación · Matutino, Vespertino); Limpieza (Nocturno)"
function resumenAreas(areas = []) {
  return areas.map((a) => {
    const detalle = [a.carrera, a.turnos.map((t) => t.nombre).join(', ')].filter(Boolean).join(' · ');
    return detalle ? `${a.area} (${detalle})` : a.area;
  }).join('; ');
}

// Para espacios cortos (monitor del lector, PDF del cierre): área principal y cuántas más tiene
function areaPrincipal(areas = []) {
  if (areas.length === 0) return '';
  const principal = areas.find((a) => a.principal) || areas[0];
  return areas.length > 1 ? `${principal.area} (+${areas.length - 1})` : principal.area;
}

/**
 * Condición SQL para búsquedas por grupo. Los filtros se aplican a la MISMA combinación:
 * "Docente + Vespertino" no incluye a quien es estudiante en la tarde y docente en la mañana.
 * Cada filtro es opcional (null o '' = todos). La tabla de usuario debe llamarse "u".
 */
function filtroPorAreas({ area, carrera, turno } = {}) {
  const valor = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
  const [idArea, idCarrera, idTurno] = [valor(area), valor(carrera), valor(turno)];
  return {
    sql: `EXISTS (
      SELECT 1 FROM usuario_area ua
       WHERE ua.matricula = u.matricula
         AND (? IS NULL OR ua.id_area = ?)
         AND (? IS NULL OR ua.id_carrera = ?)
         AND (? IS NULL OR EXISTS (SELECT 1 FROM usuario_area_turno uat
                                    WHERE uat.id_usuario_area = ua.id_usuario_area AND uat.id_turno = ?)))`,
    params: [idArea, idArea, idCarrera, idCarrera, idTurno, idTurno]
  };
}

function setupAreas(poolDB) {
  pool = poolDB;
  ipcMain.handle('obtener-catalogos', () => obtenerCatalogos());
}

module.exports = {
  setupAreas,
  obtenerCatalogos,
  validarAreas,
  guardarAreas,
  obtenerAreasDeUsuarios,
  adjuntarAreas,
  resumenAreas,
  areaPrincipal,
  filtroPorAreas
};
