// validacion.js — reglas de los datos personales, aplicadas también en el proceso principal:
// las pantallas validan, pero lo que llega a la BD (y luego se muestra en otras pantallas) se revisa aquí.

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,50}$/;
const CORREO = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
const TELEFONO = /^\d{10,15}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ESTATUS = ['Activo', 'Inactivo'];

// Diferencia de años, igual que la pantalla de registro, para que ambas acepten lo mismo
function edad(fechaTexto) {
  const nacimiento = new Date(`${fechaTexto}T00:00:00`);
  if (!FECHA.test(fechaTexto) || Number.isNaN(nacimiento.getTime())) return NaN;
  return new Date().getFullYear() - nacimiento.getFullYear();
}

/**
 * Devuelve la lista de errores (vacía si todo es válido).
 * nuevo: alta de usuario (matrícula de hasta 8 dígitos y edad de 5 a 100 años).
 * Sin "nuevo" es una edición: se revisa además el estatus.
 */
function validarDatosPersonales(d = {}, { nuevo = false } = {}) {
  const errores = [];
  const texto = (v) => String(v ?? '').trim();
  [['nombre', 'Nombre'], ['apellido_paterno', 'Apellido paterno'], ['apellido_materno', 'Apellido materno']]
    .forEach(([campo, etiqueta]) => {
      if (!SOLO_LETRAS.test(texto(d[campo]))) errores.push(`${etiqueta}: solo letras, de 2 a 50 caracteres`);
    });
  const correo = texto(d.correo);
  if (correo.length > 100 || !CORREO.test(correo)) errores.push('Correo electrónico no válido');
  if (!TELEFONO.test(texto(d.numero_telefono))) errores.push('El teléfono debe tener entre 10 y 15 dígitos');

  const anios = edad(texto(d.fecha_nacimiento));
  if (Number.isNaN(anios)) errores.push('Fecha de nacimiento no válida');
  else if (nuevo && (anios < 5 || anios > 100)) errores.push('Debe tener entre 5 y 100 años');

  // La pantalla exige 4 u 8 dígitos y envía un número (sin ceros a la izquierda)
  if (nuevo && !/^\d{1,8}$/.test(texto(d.matricula))) errores.push('La matrícula debe tener hasta 8 dígitos');
  if (!nuevo && !/^\d{1,9}$/.test(texto(d.matricula))) errores.push('Matrícula no válida');
  if (!nuevo && !ESTATUS.includes(d.estatus)) errores.push('Estatus no válido');
  return errores;
}

module.exports = { validarDatosPersonales };
