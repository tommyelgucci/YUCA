import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { YucaDb } from './index';
import { filasDesdeBase } from '../lib/export/credenciales';
import { agregarCompanero, confirmarPago, reservarStand } from '../lib/reservas';
import { stands as standsMock } from '../lib/data/feria';

/**
 * Pruebas de la exportación de credenciales **contra la base**.
 *
 * `lib/export/credenciales.test.ts` cubre el otro camino, el de los datos de
 * demostración que alimenta la vista previa. Este es el que se imprime de
 * verdad, y no tenía ninguna prueba: por ahí se colaron dos fallos —el filtro
 * de edición que se perdía y el nombre real que salía siempre vacío—.
 */

const EDICION = 'yukawaii-4';
const OTRA = 'druida-1';
const TANDA = { preventaId: 'preventa-2', amountBob: 300, termsVersion: 'reglas-2026-08' } as const;

const [PRIMERA, SEGUNDA] = standsMock.slice(0, 2);

async function baseDePrueba() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as YucaDb;
  await migrate(drizzle(client, { schema }), { migrationsFolder: './db/migrations' });

  await db.insert(schema.editions).values(
    [EDICION, OTRA].map((id) => ({
      id,
      name: id,
      dateLabel: 'Noviembre 2026',
      venue: 'Sede por anunciar',
      standPriceBob: 250,
      hasFeria: true,
    })),
  );

  const espacios = await db
    .insert(schema.espacios)
    .values([
      { editionId: EDICION, code: 'lirio', name: 'Salón Lirio' },
      { editionId: OTRA, code: 'otra', name: 'Sala de Druida' },
    ])
    .returning({ id: schema.espacios.id, editionId: schema.espacios.editionId });

  const espacioDe = (editionId: string) => espacios.find((e) => e.editionId === editionId)!.id;

  await db.insert(schema.stands).values([
    {
      editionId: EDICION,
      espacioId: espacioDe(EDICION),
      code: PRIMERA.id,
      numero: PRIMERA.numero,
      x: PRIMERA.x,
      y: PRIMERA.y,
      width: PRIMERA.width,
      height: PRIMERA.height,
      kind: PRIMERA.kind,
    },
    // La misma mesa, pero de la otra feria: no debe salir en esta exportación.
    {
      editionId: OTRA,
      espacioId: espacioDe(OTRA),
      code: SEGUNDA.id,
      numero: SEGUNDA.numero,
      x: SEGUNDA.x,
      y: SEGUNDA.y,
      width: SEGUNDA.width,
      height: SEGUNDA.height,
      kind: SEGUNDA.kind,
    },
  ]);

  const personas = await db
    .insert(schema.exhibitors)
    .values([
      {
        clerkUserId: 'user_ana',
        slug: 'ana',
        displayName: 'Ana Ilustra',
        fullName: 'Ana Quiroga Vaca',
      },
      {
        clerkUserId: 'user_beto',
        slug: 'beto',
        displayName: 'Beto Prints',
        fullName: 'Roberto Áñez',
        verified: true,
      },
      // Sin nombre real cargado: la columna sale vacía, no rompe la fila.
      { clerkUserId: 'user_cami', slug: 'cami', displayName: 'Cami' },
    ])
    .returning({ id: schema.exhibitors.id, slug: schema.exhibitors.slug });

  const porSlug = (slug: string) => personas.find((p) => p.slug === slug)!.id;

  return { db, ana: porSlug('ana'), beto: porSlug('beto'), cami: porSlug('cami') };
}

test('el nombre real sale de los datos personales, no vacío', async () => {
  const { db, ana } = await baseDePrueba();

  await reservarStand(db, { editionId: EDICION, standCode: PRIMERA.id, exhibitorId: ana, ...TANDA });

  const [fila] = await filasDesdeBase(db, EDICION);

  assert.equal(fila.nombre_artistico, 'Ana Ilustra');
  assert.equal(fila.nombre_real, 'Ana Quiroga Vaca');
});

test('quien no cargó su nombre real exporta esa columna vacía, sin romperse', async () => {
  const { db, cami } = await baseDePrueba();

  await reservarStand(db, {
    editionId: EDICION,
    standCode: PRIMERA.id,
    exhibitorId: cami,
    ...TANDA,
  });

  const [fila] = await filasDesdeBase(db, EDICION);

  assert.equal(fila.nombre_artistico, 'Cami');
  assert.equal(fila.nombre_real, '');
});

test('no se cuelan las mesas de la otra feria', async () => {
  const { db, ana, cami } = await baseDePrueba();

  await reservarStand(db, { editionId: EDICION, standCode: PRIMERA.id, exhibitorId: ana, ...TANDA });
  await reservarStand(db, { editionId: OTRA, standCode: SEGUNDA.id, exhibitorId: cami, ...TANDA });

  const filas = await filasDesdeBase(db, EDICION);

  // Con el `&&` de JavaScript que había antes, aquí salían las dos.
  assert.deepEqual(
    filas.map((fila) => fila.nombre_artistico),
    ['Ana Ilustra'],
  );
});

test('el acompañante también lleva su nombre real en la credencial', async () => {
  const { db, ana } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: PRIMERA.id,
    exhibitorId: ana,
    ...TANDA,
  });
  assert.equal(reserva.ok, true);
  if (!reserva.ok) return;

  await confirmarPago(db, { reservationId: reserva.reservationId, staffUserId: 'user_staff' });
  await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: ana,
    slug: 'beto',
  });

  const filas = await filasDesdeBase(db, EDICION);
  const companero = filas.find((fila) => fila.rol === 'Compañero');

  assert.equal(companero?.nombre_artistico, 'Beto Prints');
  assert.equal(companero?.nombre_real, 'Roberto Áñez');
  // Comparte mesa con quien le invitó, pero su credencial es suya.
  assert.equal(companero?.mesa_codigo, PRIMERA.id);
  assert.equal(companero?.credencial_id, `${PRIMERA.id}-2`);
});
