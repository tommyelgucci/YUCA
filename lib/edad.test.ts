import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularEdad, puedeSerExpositor, situacionEdad } from './edad';

/**
 * Pruebas del control de edad.
 *
 * Todas fijan el "hoy" a mano: una regla que depende de la fecha del sistema y
 * se prueba contra la fecha del sistema no prueba nada.
 */

const HOY = new Date(2026, 10, 15); // 15 de noviembre de 2026

test('la edad no cuenta el año si todavía no cumplió', () => {
  assert.equal(calcularEdad('2000-11-14', HOY), 26, 'cumplió ayer');
  assert.equal(calcularEdad('2000-11-15', HOY), 26, 'cumple hoy: ya los tiene');
  assert.equal(calcularEdad('2000-11-16', HOY), 25, 'cumple mañana: todavía no');
  assert.equal(calcularEdad('2000-12-01', HOY), 25, 'cumple el mes que viene');
});

test('una fecha imposible o futura no da edad', () => {
  assert.equal(calcularEdad('2001-02-31', HOY), null, '31 de febrero no existe');
  assert.equal(calcularEdad('2030-01-01', HOY), null, 'todavía no nació');
  assert.equal(calcularEdad('no-es-fecha', HOY), null);
  assert.equal(calcularEdad('2001-2-3', HOY), null, 'sin ceros a la izquierda');
});

test('el 29 de febrero cumple el 1 de marzo en los años sin bisiesto', () => {
  assert.equal(calcularEdad('2008-02-29', new Date(2026, 1, 28)), 17, 'el 28 todavía no');
  assert.equal(calcularEdad('2008-02-29', new Date(2026, 2, 1)), 18, 'el 1 de marzo ya');
});

test('los tres tramos de la regla caen donde deben', () => {
  // Cumplen justo hoy, para clavar cada borde.
  assert.equal(situacionEdad('2010-11-15', HOY), 'menor', 'recién cumple 16');
  assert.equal(situacionEdad('2009-11-15', HOY), 'requiere-permiso', 'cumple 17');
  assert.equal(situacionEdad('2008-11-15', HOY), 'requiere-permiso', 'cumple 18');
  assert.equal(situacionEdad('2007-11-15', HOY), 'libre', 'cumple 19');
});

test('el día antes de cumplir 17 todavía es menor', () => {
  assert.equal(situacionEdad('2009-11-16', HOY), 'menor');
});

test('sin fecha de nacimiento no se puede decidir', () => {
  assert.equal(situacionEdad(null, HOY), 'sin-fecha');
  assert.equal(situacionEdad('', HOY), 'sin-fecha');
});

test('el menor de 17 no puede ser expositor ni con permiso', () => {
  const resultado = puedeSerExpositor(
    { birthDate: '2010-11-15', guardianConsentAt: new Date() },
    HOY,
  );
  assert.deepEqual(resultado, { ok: false, motivo: 'menor' });
});

test('a los 17 hace falta el permiso del tutor, y con él alcanza', () => {
  const sinPermiso = puedeSerExpositor(
    { birthDate: '2009-11-15', guardianConsentAt: null },
    HOY,
  );
  assert.deepEqual(sinPermiso, { ok: false, motivo: 'sin-permiso' });

  const conPermiso = puedeSerExpositor(
    { birthDate: '2009-11-15', guardianConsentAt: new Date() },
    HOY,
  );
  assert.deepEqual(conPermiso, { ok: true });
});

test('el mayor de 18 no necesita permiso', () => {
  const resultado = puedeSerExpositor({ birthDate: '1999-03-29', guardianConsentAt: null }, HOY);
  assert.deepEqual(resultado, { ok: true });
});

test('sin fecha cargada no se puede apartar mesa', () => {
  const resultado = puedeSerExpositor({ birthDate: null, guardianConsentAt: null }, HOY);
  assert.deepEqual(resultado, { ok: false, motivo: 'sin-fecha' });
});
