import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { YucaDb } from './index';
import {
  agregarCompanero,
  cancelarReserva,
  companerosDe,
  confirmarPago,
  expirarReservasVencidas,
  registrarComprobante,
  reservarStand,
} from '../lib/reservas';

/**
 * Pruebas de la lógica de reservas contra Postgres de verdad.
 *
 * PGlite es Postgres compilado a WASM: corre en memoria, sin servidor, con el
 * mismo dialecto y las mismas restricciones que Supabase. Lo que se comprueba
 * aquí —sobre todo el índice único parcial que impide doble reserva— es lo que
 * va a correr en producción.
 */

const EDICION = 'yukawaii-4';

/** Tanda e importe vigentes; los fija quien llama, no la base. */
const TANDA = { preventaId: 'preventa-2', amountBob: 300 } as const;

/** Base limpia y sembrada para cada prueba. */
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
    reservationTtlMinutes: 2880,
  });

  const [espacio] = await db
    .insert(schema.espacios)
    .values({ editionId: EDICION, code: 'lirio', name: 'Salón Lirio' })
    .returning({ id: schema.espacios.id });

  await db.insert(schema.stands).values([
    { editionId: EDICION, espacioId: espacio.id, code: 'C20', numero: 20, x: 0, y: 0, width: 56, height: 44 },
    { editionId: EDICION, espacioId: espacio.id, code: 'C21', numero: 21, x: 64, y: 0, width: 56, height: 44 },
  ]);

  const artistas = await db
    .insert(schema.exhibitors)
    .values([
      { clerkUserId: 'user_ana', slug: 'ana', displayName: 'Ana' },
      { clerkUserId: 'user_beto', slug: 'beto', displayName: 'Beto' },
    ])
    .returning({ id: schema.exhibitors.id, slug: schema.exhibitors.slug });

  const ana = artistas.find((a) => a.slug === 'ana')!.id;
  const beto = artistas.find((a) => a.slug === 'beto')!.id;

  const estadoStand = async (code: string) => {
    const [stand] = await db
      .select({ status: schema.stands.status })
      .from(schema.stands)
      .where(eq(schema.stands.code, code));
    return stand.status;
  };

  return { db, ana, beto, estadoStand };
}

test('reservar una mesa libre la deja apartada, no ocupada', async () => {
  const { db, ana, estadoStand } = await baseDePrueba();

  const resultado = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });

  assert.equal(resultado.ok, true);
  assert.equal(await estadoStand('C20'), 'reservado');
});

test('dos personas no pueden reservar la misma mesa', async () => {
  const { db, ana, beto, estadoStand } = await baseDePrueba();

  const primera = await reservarStand(db, { editionId: EDICION, standCode: 'C20', exhibitorId: ana, ...TANDA });
  const segunda = await reservarStand(db, { editionId: EDICION, standCode: 'C20', exhibitorId: beto, ...TANDA });

  assert.equal(primera.ok, true);
  assert.equal(segunda.ok, false);
  assert.equal(await estadoStand('C20'), 'reservado');
});

test('en una carrera por la misma mesa gana exactamente una', async () => {
  const { db, ana, beto } = await baseDePrueba();

  const resultados = await Promise.all([
    reservarStand(db, { editionId: EDICION, standCode: 'C20', exhibitorId: ana, ...TANDA }),
    reservarStand(db, { editionId: EDICION, standCode: 'C20', exhibitorId: beto, ...TANDA }),
  ]);

  assert.equal(resultados.filter((r) => r.ok).length, 1);
});

test('un expositor no puede apartar dos mesas a la vez', async () => {
  const { db, ana } = await baseDePrueba();

  await reservarStand(db, { editionId: EDICION, standCode: 'C20', exhibitorId: ana, ...TANDA });
  const segunda = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C21',
    exhibitorId: ana,
    ...TANDA,
  });

  assert.equal(segunda.ok, false);
  assert.equal(segunda.ok === false && segunda.motivo, 'ya-tienes-mesa');
});

test('confirmar el pago deja la mesa ocupada y registra quién lo hizo', async () => {
  const { db, ana, estadoStand } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  assert.equal(reserva.ok, true);
  if (!reserva.ok) return;

  await registrarComprobante(db, {
    reservationId: reserva.reservationId,
    proofReference: 'TRX-889211',
  });

  const confirmada = await confirmarPago(db, {
    reservationId: reserva.reservationId,
    staffUserId: 'user_staff',
  });

  assert.equal(confirmada, true);
  assert.equal(await estadoStand('C20'), 'ocupado');

  const [fila] = await db
    .select({
      status: schema.reservations.status,
      confirmedBy: schema.reservations.confirmedBy,
      proofReference: schema.reservations.proofReference,
    })
    .from(schema.reservations)
    .where(eq(schema.reservations.id, reserva.reservationId));

  assert.equal(fila.status, 'confirmada');
  assert.equal(fila.confirmedBy, 'user_staff');
  assert.equal(fila.proofReference, 'TRX-889211');
});

test('una reserva vencida libera la mesa y permite reservarla de nuevo', async () => {
  const { db, ana, beto, estadoStand } = await baseDePrueba();

  await reservarStand(db, { editionId: EDICION, standCode: 'C20', exhibitorId: ana, ...TANDA });

  // El plazo por defecto son 48 h: se mira el mundo dos días más tarde.
  const pasadoManana = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const liberadas = await expirarReservasVencidas(db, pasadoManana);

  assert.equal(liberadas, 1);
  assert.equal(await estadoStand('C20'), 'disponible');

  const nueva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: beto,
    ...TANDA,
  });
  assert.equal(nueva.ok, true);
});

test('una reserva confirmada no expira aunque pase el plazo', async () => {
  const { db, ana, estadoStand } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) throw new Error('la reserva debería haber entrado');

  await confirmarPago(db, { reservationId: reserva.reservationId, staffUserId: 'user_staff' });

  const liberadas = await expirarReservasVencidas(
    db,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );

  assert.equal(liberadas, 0);
  assert.equal(await estadoStand('C20'), 'ocupado');
});

test('cancelar una reserva devuelve la mesa al mapa', async () => {
  const { db, ana, beto, estadoStand } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) throw new Error('la reserva debería haber entrado');

  const cancelada = await cancelarReserva(db, {
    reservationId: reserva.reservationId,
    motivo: 'No llegó la transferencia',
  });

  assert.equal(cancelada, true);
  assert.equal(await estadoStand('C20'), 'disponible');

  // Y la mesa vuelve a estar disponible para otra persona.
  const nueva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: beto,
    ...TANDA,
  });
  assert.equal(nueva.ok, true);
});

test('no se puede reservar una mesa de la organización', async () => {
  const { db, ana } = await baseDePrueba();

  // Los espacios del equipo nunca se ponen a la venta: van ya ocupados.
  await db
    .update(schema.stands)
    .set({ status: 'ocupado', kind: 'organizacion', externalName: 'Acreditación' })
    .where(eq(schema.stands.code, 'C21'));

  const resultado = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C21',
    exhibitorId: ana,
    ...TANDA,
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.ok === false && resultado.motivo, 'stand-no-disponible');
});

test('la base impide la doble reserva aunque el estado del stand se desincronice', async () => {
  const { db, ana, beto } = await baseDePrueba();

  await reservarStand(db, { editionId: EDICION, standCode: 'C20', exhibitorId: ana, ...TANDA });

  // Se fuerza el estado a 'disponible' con la reserva de Ana todavía viva: así
  // el guardia de la aplicación no salta y quien tiene que rechazar es el
  // índice único parcial de la base.
  await db
    .update(schema.stands)
    .set({ status: 'disponible' })
    .where(eq(schema.stands.code, 'C20'));

  const segunda = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: beto,
    ...TANDA,
  });

  assert.equal(segunda.ok, false);
  assert.equal(segunda.ok === false && segunda.motivo, 'ya-reservada');
});

test('el titular puede sumar un compañero de mesa', async () => {
  const { db, ana } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) throw new Error('la reserva debería haber entrado');

  const resultado = await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: ana,
    displayName: 'Guamancita',
    instagram: '@guamancita',
  });

  assert.equal(resultado.ok, true);
  assert.deepEqual(
    (await companerosDe(db, reserva.reservationId)).map((c) => c.displayName),
    ['Guamancita'],
  );
});

test('nadie puede sumar compañeros a la mesa de otro', async () => {
  const { db, ana, beto } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) throw new Error('la reserva debería haber entrado');

  const intruso = await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: beto,
    displayName: 'Colado',
  });

  assert.equal(intruso.ok, false);
  assert.equal(intruso.ok === false && intruso.motivo, 'no-es-tuya');
  assert.equal((await companerosDe(db, reserva.reservationId)).length, 0);
});

test('la mesa no admite más compañeros que su cupo', async () => {
  const { db, ana } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) throw new Error('la reserva debería haber entrado');

  // El cupo por defecto es 1 acompañante.
  const primero = await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: ana,
    displayName: 'Primera',
  });
  const segundo = await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: ana,
    displayName: 'Segunda',
  });

  assert.equal(primero.ok, true);
  assert.equal(segundo.ok, false);
  assert.equal(segundo.ok === false && segundo.motivo, 'sin-cupo');
});

test('la mesa liberada queda sin compañeros para el siguiente', async () => {
  const { db, ana, beto } = await baseDePrueba();

  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) throw new Error('la reserva debería haber entrado');

  await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: ana,
    displayName: 'Guamancita',
  });
  await cancelarReserva(db, { reservationId: reserva.reservationId, motivo: 'Se arrepintió' });

  // La reserva cancelada conserva su historial…
  assert.equal((await companerosDe(db, reserva.reservationId)).length, 1);

  // …pero quien tome la mesa después empieza de cero.
  const nueva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: beto,
    ...TANDA,
  });
  if (!nueva.ok) throw new Error('la mesa debería haber quedado libre');

  assert.equal((await companerosDe(db, nueva.reservationId)).length, 0);
});
