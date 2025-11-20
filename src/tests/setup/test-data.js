// tests/setup/test-data.js

/**
 * Genera una matrícula única para pruebas
 */
function generarMatriculaUnica() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100);
  return parseInt(`2024${timestamp.toString().slice(-4)}${random.toString().padStart(2, '0')}`);
}

/**
 * Genera un correo único para pruebas
 */
function generarCorreoUnico(nombre = 'test') {
  const timestamp = Date.now();
  return `${nombre}.${timestamp}@test.com`;
}

/**
 * Usuario válido para registro exitoso
 */
function getUsuarioValido() {
  const timestamp = Date.now();
  return {
    nombre: 'Juan',
    apellidoP: 'Pérez',
    apellidoM: 'García',
    fechaNacimiento: '1995-05-15',
    correo: generarCorreoUnico('juan.perez'),
    matricula: generarMatriculaUnica().toString(),
    turno: 'Matutino',
    carrera: '1',
    telefono: '2221234567',
    rol: 'Estudiante'
  };
}

/**
 * Usuario con matrícula duplicada (existe en BD de pruebas)
 */
function getUsuarioDuplicado() {
  return {
    nombre: 'Carlos',
    apellidoP: 'López',
    apellidoM: 'Martínez',
    fechaNacimiento: '1998-03-20',
    correo: generarCorreoUnico('carlos.lopez'),
    matricula: '12345678', // Esta matrícula ya existe en BD de pruebas
    turno: 'Vespertino',
    carrera: '2',
    telefono: '2229876543',
    rol: 'Estudiante'
  };
}

/**
 * Usuario con campos inválidos para validaciones
 */
function getUsuarioInvalido() {
  return {
    nombre: 'Juan123', // Contiene números (inválido)
    apellidoP: 'Pérez456', // Contiene números (inválido)
    apellidoM: 'García789', // Contiene números (inválido)
    fechaNacimiento: '2022-01-01', // Edad menor a 5 años
    correo: 'correo-invalido', // Formato inválido
    matricula: '123', // Menos de 8 dígitos
    turno: 'Matutino',
    carrera: '1',
    telefono: 'abc123', // Contiene letras
    rol: 'Estudiante'
  };
}

/**
 * Conjunto de usuarios para pruebas de validación
 */
const usuariosPrueba = {
  nombreConNumeros: {
    ...getUsuarioValido(),
    nombre: 'Juan123'
  },
  
  apellidoPaternoInvalido: {
    ...getUsuarioValido(),
    apellidoP: 'Pérez@#'
  },
  
  apellidoMaternoInvalido: {
    ...getUsuarioValido(),
    apellidoM: 'García123'
  },
  
  edadMenor5: {
    ...getUsuarioValido(),
    fechaNacimiento: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  
  edadMayor100: {
    ...getUsuarioValido(),
    fechaNacimiento: new Date(Date.now() - 105 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  
  correoInvalido: {
    ...getUsuarioValido(),
    correo: 'correo-sin-arroba.com'
  },
  
  matriculaCorta: {
    ...getUsuarioValido(),
    matricula: '1234567' // Solo 7 dígitos
  },
  
  matriculaLarga: {
    ...getUsuarioValido(),
    matricula: '123456789' // 9 dígitos
  },
  
  matriculaConLetras: {
    ...getUsuarioValido(),
    matricula: '1234567A'
  },
  
  telefonoCorto: {
    ...getUsuarioValido(),
    telefono: '123456789' // Solo 9 dígitos
  },
  
  telefonoLargo: {
    ...getUsuarioValido(),
    telefono: '12345678901234567' // Más de 15 dígitos
  },
  
  telefonoConLetras: {
    ...getUsuarioValido(),
    telefono: '222ABC1234'
  }
};

/**
 * Visitantes de prueba
 */
const visitantesPrueba = {
  frecuente: {
    nombre: 'Ana',
    apellidoP: 'Martínez',
    apellidoM: 'Sánchez',
    telefono: '2223334455',
    correo: generarCorreoUnico('ana.martinez'),
    motivo: 'Reunión académica'
  },
  
  temporal: {
    nombre: 'Luis',
    apellidoP: 'Hernández',
    apellidoM: 'Díaz',
    telefono: '2225556677',
    correo: generarCorreoUnico('luis.hernandez'),
    motivo: 'Trámite administrativo'
  }
};

/**
 * Matrículas existentes en BD de pruebas
 */
const matriculasExistentes = [
  12345678, // Usuario Prueba Existente
  87654321, // María González López
  11223344  // Carlos Ramírez Torres
];

module.exports = {
  generarMatriculaUnica,
  generarCorreoUnico,
  getUsuarioValido,
  getUsuarioDuplicado,
  getUsuarioInvalido,
  usuariosPrueba,
  visitantesPrueba,
  matriculasExistentes
};