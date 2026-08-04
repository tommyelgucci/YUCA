import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { YucaDb } from './index';
import { expositoresDesdeBase, standsDesdeBase } from '../lib/feria';
import { reservarStand, confirmarPago, cancelarReserva, agregarCompanero } from '../lib/reservas';
import { stands as standsMock } from '../lib/data/feria';

/**
 * Pruebas de lo que la feria enseña al público.
 *
 * Es la capa que decide qué se ve desde fuera, así que lo que se comprueba aquí
 * no es que las consultas corran, sino **qué se publica y qué no**: la mesa sólo
 * se anuncia con el pago confirmado, y quien pierde la reserva desaparece.
 */

const EDICION = 'yukawaii-4';
const TANDA = { preventaId: 'preventa-2', amountBob: 300, termsVersion: 'reglas-2026-08' } as const;

/** Dos mesas que existen en el plano de `lib/data/feria.ts`. */
const [PRIMERA, SEGUNDA] = standsMock.slice(0, 2);

async function baseDePrueba() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as YucaDb;
  await migrate(drizzle(client, { schema }), { migrationsFolder: './db/migrations' });

  await db.insert(schema.editions).values({
    id: EDICION,
    name: 'YukaWaii Fest 4',
    dateLabel: 'Noviembre 2026',
    venue: 'Sede por anunciar',
    standPriceBob: 250,
    hasFeria: true,
  });

  const [espacio] = await db
    .insert(schema.espacios)
    .values({ editionId: EDICION, code: 'lirio', name: 'Salón Lirio' })
    .returning({ id: schema.espacios.id });

  await db.insert(schema.stands).values(
    [PRIMERA, SEGUNDA].map((stand) => ({
      editionId: EDICION,
      espacioId: espacio.id,
      code: stand.id,
      numero: stand.numero,
      x: stand.x,
      y: stand.y,
      width: stand.width,
      height: stand.height,
      kind: stand.kind,
    })),
  );

  // Una mesa que la base tiene pero el plano no conoce.
  await db.insert(schema.stands).values({
    editionId: EDICION,
    espacioId: espacio.id,
    code: 'FANTASMA-1',
    numero: 99,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
  });

  const [ana] = await db
    .insert(schema.exhibitors)
    .values({
      clerkUserId: 'user_ana',
      slug: 'ana',
      displayName: 'Ana',
      bio: 'Ilustra gatos',
      instagram: '@ana',
      fullName: 'Ana Pérez',
      phone: '77712345',
      birthDate: '1998-04-02',
    })
    .returning({ id: schema.exhibitors.id });

  return { db, ana: ana.id };
}

test('las mesas que el plano no conoce no salen: no se pueden dibujar', async () => {
  const { db } = await baseDePrueba();

  const stands = await standsDesdeBase(db, EDICION);

  assert.deepEqual(
    stands.map((s) => s.id).sort(),
    [PRIMERA.id, SEGUNDA.id].sort(),
  );
});

test('el estado de cada mesa sale de la base, no del plano', async () => {
  const { db, ana } = await baseDePrueba();

  await reservarStand(db, { editionId: EDICION, standCode: PRIMERA.id, exhibitorId: ana, ...TANDA });

  const stands = await standsDesdeBase(db, EDICION);

  assert.equal(stands.find((s) => s.id === PRIMERA.id)?.status, 'reservado');
  assert.equal(stands.find((s) => s.id === SEGUNDA.id)?.status, 'disponible');
});

test('con la reserva pendiente se es participante, pero la mesa no se anuncia', async () => {
  const { db, ana } = await baseDePrueba();

  await reservarStand(db, { editionId: EDICION, standCode: PRIMERA.id, exhibitorId: ana, ...TANDA });

  const [expositor] = await expositoresDesdeBase(db, EDICION);

  assert.equal(expositor.displayName, 'Ana');
  // Todavía puede caerse: anunciar la mesa sería prometer de más.
  assert.equal(expositor.standId, undefined);
});

test('al confirmarse el pago se publica la mesa', async () => {
  const { db, ana } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: PRIMERA.id,
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) throw new Error('la reserva debería haber entrado');

  await confirmarPago(db, { reservationId: reserva.reservationId, staffUserId: 'user_staff' });

  const [expositor] = await expositoresDesdeBase(db, EDICION);
  assert.equal(expositor.standId, PRIMERA.id);
});

test('quien cancela su reserva deja de ser participante', async () => {
  const { db, ana } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: PRIMERA.id,
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) throw new Error('la reserva debería haber entrado');

  await cancelarReserva(db, { reservationId: reserva.reservationId, motivo: 'Se arrepintió' });

  assert.equal((await expositoresDesdeBase(db, EDICION)).length, 0);
});

test('la lista pública no arrastra ningún dato personal', async () => {
  const { db, ana } = await baseDePrueba();

  await reservarStand(db, { editionId: EDICION, standCode: PRIMERA.id, exhibitorId: ana, ...TANDA });

  const [expositor] = await expositoresDesdeBase(db, EDICION);
  const serializado = JSON.stringify(expositor);

  // Los tres datos personales que tiene Ana cargados en la base.
  for (const dato of ['Ana Pérez', '77712345', '1998-04-02']) {
    assert.ok(!serializado.includes(dato), `se filtró "${dato}" a la web pública`);
  }
});

test('un expositor sin reserva no aparece en la lista', async () => {
  const { db } = await baseDePrueba();

  await db.insert(schema.exhibitors).values({
    clerkUserId: 'user_beto',
    slug: 'beto',
    displayName: 'Beto',
  });

  assert.equal((await expositoresDesdeBase(db, EDICION)).length, 0);
  assert.equal(
    (await db.select().from(schema.exhibitors).where(eq(schema.exhibitors.slug, 'beto'))).length,
    1,
  );
});

test('quien comparte la mesa también sale como participante, detrás del titular', async () => {
  const { db, ana } = await baseDePrueba();

  const [beto] = await db
    .insert(schema.exhibitors)
    .values({
      clerkUserId: 'user_beto',
      slug: 'beto',
      displayName: 'Beto',
      // El acompañante tiene que estar verificado para poder sumarse.
      verified: true,
    })
    .returning({ id: schema.exhibitors.id });

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: PRIMERA.id,
    exhibitorId: ana,
    ...TANDA,
  });
  assert.equal(reserva.ok, true);
  if (!reserva.ok) return;

  await confirmarPago(db, { reservationId: reserva.reservationId, staffUserId: 'user_staff' });
  const sumado = await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: ana,
    slug: 'beto',
  });
  assert.equal(sumado.ok, true);

  const expositores = await expositoresDesdeBase(db, EDICION);

  // Los dos están en la misma mesa, y quien la reservó va primero: el mapa se
  // apoya en ese orden para encabezar la ficha.
  assert.deepEqual(
    expositores.map((expositor) => expositor.displayName),
    ['Ana', 'Beto'],
  );
  assert.equal(expositores[1].standId, PRIMERA.id);
});

test('el acompañante tampoco anuncia mesa mientras el pago siga pendiente', async () => {
  const { db, ana } = await baseDePrueba();

  await db.insert(schema.exhibitors).values({
    clerkUserId: 'user_beto',
    slug: 'beto',
    displayName: 'Beto',
    verified: true,
  });

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: PRIMERA.id,
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) return;

  await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: ana,
    slug: 'beto',
  });

  const expositores = await expositoresDesdeBase(db, EDICION);
  const beto = expositores.find((expositor) => expositor.displayName === 'Beto');

  // Es participante, pero la mesa todavía se puede caer: misma regla que el
  // titular, porque se cae para los dos a la vez.
  assert.equal(beto?.standId, undefined);
});

test('si la reserva se cancela, su acompañante deja de ser participante', async () => {
  const { db, ana } = await baseDePrueba();

  await db.insert(schema.exhibitors).values({
    clerkUserId: 'user_beto',
    slug: 'beto',
    displayName: 'Beto',
    verified: true,
  });

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: PRIMERA.id,
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) return;

  await confirmarPago(db, { reservationId: reserva.reservationId, staffUserId: 'user_staff' });
  await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: ana,
    slug: 'beto',
  });
  await cancelarReserva(db, { reservationId: reserva.reservationId, motivo: 'prueba' });

  const expositores = await expositoresDesdeBase(db, EDICION);
  assert.deepEqual(expositores, []);
});
