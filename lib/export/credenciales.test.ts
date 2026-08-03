import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNAS, filasCredenciales } from './credenciales';
import { aCsv, nombreArchivo } from './serializar';

/**
 * Pruebas del exportador de credenciales.
 *
 * Corren sobre los datos de `lib/data/` (sin DATABASE_URL), que es justamente
 * el camino que usa la vista previa del panel.
 */

test('sale una fila por persona, no una por mesa', async () => {
  const filas = await filasCredenciales();

  const titulares = filas.filter((fila) => fila.rol === 'Titular');
  const companeros = filas.filter((fila) => fila.rol === 'Compañero');

  assert.ok(titulares.length > 0, 'debería haber titulares');
  assert.ok(companeros.length > 0, 'quien comparte mesa también lleva credencial');
  assert.equal(filas.length, titulares.length + companeros.length);
});

test('cada credencial tiene un identificador único', async () => {
  const filas = await filasCredenciales();
  const ids = filas.map((fila) => fila.credencial_id);

  assert.equal(new Set(ids).size, ids.length);
});

test('el titular y su compañero comparten mesa pero no credencial', async () => {
  const filas = await filasCredenciales();
  const enLaMesa = filas.filter((fila) => fila.mesa_codigo === 'I20');

  assert.equal(enLaMesa.length, 2);
  assert.deepEqual(
    enLaMesa.map((fila) => fila.rol),
    ['Titular', 'Compañero'],
  );
  assert.equal(new Set(enLaMesa.map((fila) => fila.credencial_id)).size, 2);
  // Misma mesa, mismo espacio, mismo estado de pago.
  assert.equal(new Set(enLaMesa.map((fila) => fila.espacio)).size, 1);
  assert.equal(new Set(enLaMesa.map((fila) => fila.estado_pago)).size, 1);
});

test('el nombre del archivo de foto coincide con el id de la credencial', async () => {
  const filas = await filasCredenciales();

  for (const fila of filas) {
    assert.equal(fila.foto_archivo, `${fila.credencial_id}.png`);
  }
});

test('sólo se exportan mesas apartadas o pagadas', async () => {
  const filas = await filasCredenciales();
  const estados = new Set(filas.map((fila) => fila.estado_pago));

  assert.ok(!estados.has('Libre'), 'una mesa libre no imprime credencial');
});

test('las filas vienen ordenadas por espacio, tipo y número', async () => {
  const filas = await filasCredenciales();

  for (let i = 1; i < filas.length; i += 1) {
    const anterior = filas[i - 1];
    const actual = filas[i];
    const orden =
      anterior.espacio.localeCompare(actual.espacio) ||
      anterior.tipo.localeCompare(actual.tipo) ||
      Number(anterior.mesa) - Number(actual.mesa);

    assert.ok(orden <= 0, `${anterior.credencial_id} debería ir antes de ${actual.credencial_id}`);
  }
});

test('el CSV lleva BOM y las cabeceras que espera Illustrator', async () => {
  const csv = aCsv(await filasCredenciales());

  // Sin BOM, Excel en Windows destroza las tildes y las eñes.
  assert.ok(csv.startsWith('﻿'), 'falta el BOM UTF-8');

  const cabecera = csv.slice(1).split('\r\n')[0];
  assert.equal(cabecera, COLUMNAS.map((columna) => columna.titulo).join(','));

  // Los nombres de variable de Illustrator no admiten espacios ni tildes.
  for (const columna of COLUMNAS) {
    assert.match(columna.titulo, /^[a-z][a-z0-9_]*$/, `cabecera inválida: ${columna.titulo}`);
  }
});

test('el CSV escapa comas y comillas sin romper la fila', () => {
  const fila = {
    credencial_id: 'X1-1',
    nombre_artistico: 'Tinta, Verde',
    nombre_real: 'Dijo "hola"',
    rol: 'Titular' as const,
    tipo: 'Ilustrador',
    mesa: '1',
    mesa_codigo: 'X1',
    espacio: 'Salón Lirio',
    categorias: 'Cómics, Stickers',
    instagram: '',
    tiktok: '',
    estado_pago: 'Pagada',
    preventa: 'Segunda preventa',
    monto_bs: '300',
    foto_archivo: 'X1-1.png',
    qr_texto: 'https://proyectoyuca.com/artistas/x',
  };

  const lineas = aCsv([fila]).slice(1).split('\r\n');

  assert.equal(lineas.length, 3, 'cabecera, fila y salto final');
  assert.ok(lineas[1].includes('"Tinta, Verde"'));
  assert.ok(lineas[1].includes('"Dijo ""hola"""'));
  assert.ok(lineas[1].includes('"Cómics, Stickers"'));
});

test('el nombre del archivo no arrastra tildes ni espacios', () => {
  const nombre = nombreArchivo('csv', 'YukaWaii Fest 4');

  assert.match(nombre, /^credenciales-yukawaii-fest-4-\d{4}-\d{2}-\d{2}\.csv$/);
});
