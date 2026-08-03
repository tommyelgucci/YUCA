import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, sql } from 'drizzle-orm';
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
  reservaActivaDe,
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

/**
 * Lo que aporta quien llama en cada reserva: la tanda con su importe y la
 * versión del reglamento que se aceptó. Nada de esto lo decide la base.
 */
const TANDA = {
  preventaId: 'preventa-2',
  amountBob: 300,
  termsVersion: 'reglas-2026-08',
} as const;

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
      // Verificada: es la única que puede compartir mesa de acompañante.
      { clerkUserId: 'user_cami', slug: 'cami', displayName: 'Cami', verified: true },
      { clerkUserId: 'user_dani', slug: 'dani', displayName: 'Dani', verified: true },
      // Sin verificar, para comprobar que el equipo tiene que aprobarla antes.
      { clerkUserId: 'user_eli', slug: 'eli', displayName: 'Eli' },
    ])
    .returning({ id: schema.exhibitors.id, slug: schema.exhibitors.slug });

  const porSlug = (slug: string) => artistas.find((a) => a.slug === slug)!.id;
  const ana = porSlug('ana');
  const beto = porSlug('beto');

  const estadoStand = async (code: string) => {
    const [stand] = await db
      .select({ status: schema.stands.status })
      .from(schema.stands)
      .where(eq(schema.stands.code, code));
    return stand.status;
  };

  return { db, ana, beto, porSlug, estadoStand };
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

test('la reserva deja constancia de qué reglas se aceptaron y cuándo', async () => {
  const { db, ana } = await baseDePrueba();

  const antes = new Date();
  const reserva = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  if (!reserva.ok) throw new Error('la reserva debería haber entrado');

  const [fila] = await db
    .select({
      termsVersion: schema.reservations.termsVersion,
      termsAcceptedAt: schema.reservations.termsAcceptedAt,
    })
    .from(schema.reservations)
    .where(eq(schema.reservations.id, reserva.reservationId));

  assert.equal(fila.termsVersion, TANDA.termsVersion);
  assert.ok(fila.termsAcceptedAt.getTime() >= antes.getTime());
});

test('la base rechaza una reserva sin reglas aceptadas', async () => {
  const { db, ana } = await baseDePrueba();

  const [stand] = await db
    .select({ id: schema.stands.id })
    .from(schema.stands)
    .where(eq(schema.stands.code, 'C20'));

  // Se inserta a mano salteándose `reservarStand`: quien tiene que rechazarlo
  // es el `not null` de la base, no una comprobación de la aplicación.
  await assert.rejects(() =>
    db.execute(sql`
      insert into reservations (stand_id, exhibitor_id, amount_bob, expires_at)
      values (${stand.id}, ${ana}, 300, now() + interval '2 days')
    `),
  );
});

test('la reserva activa trae la sala, que la pantalla de confirmación necesita', async () => {
  const { db, ana } = await baseDePrueba();

  await reservarStand(db, { editionId: EDICION, standCode: 'C20', exhibitorId: ana, ...TANDA });

  const reserva = await reservaActivaDe(db, ana);

  assert.equal(reserva?.espacioNombre, 'Salón Lirio');
  assert.equal(reserva?.standNumero, 20);
});

test('el titular puede sumar un compañero verificado', async () => {
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
    slug: 'cami',
  });

  assert.equal(resultado.ok, true);

  // El nombre sale del perfil, no de lo que escriba el titular.
  const companeros = await companerosDe(db, reserva.reservationId);
  assert.deepEqual(
    companeros.map((c) => [c.displayName, c.slug]),
    [['Cami', 'cami']],
  );
});

test('no se puede sumar a alguien que el equipo no verificó', async () => {
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
    slug: 'eli',
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.ok === false && resultado.motivo, 'sin-verificar');
  assert.equal((await companerosDe(db, reserva.reservationId)).length, 0);
});

test('no se puede sumar a alguien que no existe', async () => {
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
    slug: 'nadie-con-este-nombre',
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.ok === false && resultado.motivo, 'no-existe');
});

test('el titular no puede sumarse a sí mismo', async () => {
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
    slug: 'ana',
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.ok === false && resultado.motivo, 'eres-tu');
});

test('quien ya tiene mesa propia no puede compartir la de otro', async () => {
  const { db, ana, porSlug } = await baseDePrueba();

  // Cami está verificada, pero aparta su propia mesa.
  await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C21',
    exhibitorId: porSlug('cami'),
    ...TANDA,
  });

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
    slug: 'cami',
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.ok === false && resultado.motivo, 'tiene-mesa');
});

test('nadie comparte dos mesas a la vez', async () => {
  const { db, ana, beto } = await baseDePrueba();

  const deAna = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  const deBeto = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C21',
    exhibitorId: beto,
    ...TANDA,
  });
  if (!deAna.ok || !deBeto.ok) throw new Error('las reservas deberían haber entrado');

  const primera = await agregarCompanero(db, {
    reservationId: deAna.reservationId,
    exhibitorId: ana,
    slug: 'cami',
  });
  const segunda = await agregarCompanero(db, {
    reservationId: deBeto.reservationId,
    exhibitorId: beto,
    slug: 'cami',
  });

  assert.equal(primera.ok, true);
  assert.equal(segunda.ok, false);
  assert.equal(segunda.ok === false && segunda.motivo, 'ya-comparte');
});

test('quien compartía una mesa cancelada puede compartir otra', async () => {
  const { db, ana, beto } = await baseDePrueba();

  const deAna = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C20',
    exhibitorId: ana,
    ...TANDA,
  });
  if (!deAna.ok) throw new Error('la reserva debería haber entrado');

  await agregarCompanero(db, {
    reservationId: deAna.reservationId,
    exhibitorId: ana,
    slug: 'cami',
  });
  await cancelarReserva(db, { reservationId: deAna.reservationId, motivo: 'Se arrepintió' });

  // La fila vieja sigue ahí como historial, pero no le ata a nada.
  const deBeto = await reservarStand(db, {
    editionId: EDICION,
    standCode: 'C21',
    exhibitorId: beto,
    ...TANDA,
  });
  if (!deBeto.ok) throw new Error('la reserva debería haber entrado');

  const resultado = await agregarCompanero(db, {
    reservationId: deBeto.reservationId,
    exhibitorId: beto,
    slug: 'cami',
  });

  assert.equal(resultado.ok, true);
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
    slug: 'cami',
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
    slug: 'cami',
  });
  const segundo = await agregarCompanero(db, {
    reservationId: reserva.reservationId,
    exhibitorId: ana,
    slug: 'dani',
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
    slug: 'cami',
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
