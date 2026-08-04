import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { YucaDb } from './index';
import {
  actividadesDesdeBase,
  cancelarInscripcion,
  inscribirse,
  inscripcionesDe,
} from '../lib/actividades';

/**
 * Pruebas de la inscripción a actividades.
 *
 * Lo que se ejercita no son las consultas sino **el cupo**: que no entre más
 * gente de la que cabe ni siquiera pidiéndolo a la vez, que nadie ocupe dos
 * plazas de lo mismo, y que darse de baja libere el sitio de verdad.
 */

const EDICION = 'yukawaii-4';
const OTRA = 'druida-1';

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

  const insertadas = await db
    .insert(schema.activities)
    .values([
      { editionId: EDICION, slug: 'taller', title: 'Taller de entintado', kind: 'taller', capacity: 2 },
      // Sin límite: entra quien quiera.
      { editionId: EDICION, slug: 'sellos', title: 'Cacería de Sellos', kind: 'stamp-rally', capacity: null },
      // De la otra feria: no debe mezclarse.
      { editionId: OTRA, slug: 'otra', title: 'Actividad de Druida', kind: 'taller', capacity: 5 },
    ])
    .returning({ id: schema.activities.id, slug: schema.activities.slug });

  const porSlug = (slug: string) => insertadas.find((a) => a.slug === slug)!.id;

  return { db, taller: porSlug('taller'), sellos: porSlug('sellos'), otra: porSlug('otra') };
}

test('inscribirse ocupa un cupo y se ve en el conteo', async () => {
  const { db, taller } = await baseDePrueba();

  const hecho = await inscribirse(db, {
    activityId: taller,
    clerkUserId: 'user_ana',
    displayName: 'Ana',
  });
  assert.deepEqual(hecho, { ok: true });

  const actividades = await actividadesDesdeBase(db, EDICION);
  const taller1 = actividades.find((a) => a.id === taller);

  assert.equal(taller1?.enrolled, 1);
  assert.equal(taller1?.capacity, 2);
});

test('nadie ocupa dos plazas de la misma actividad', async () => {
  const { db, taller } = await baseDePrueba();

  await inscribirse(db, { activityId: taller, clerkUserId: 'user_ana', displayName: 'Ana' });
  const segunda = await inscribirse(db, {
    activityId: taller,
    clerkUserId: 'user_ana',
    displayName: 'Ana',
  });

  assert.deepEqual(segunda, { ok: false, motivo: 'ya-inscrito' });

  const actividades = await actividadesDesdeBase(db, EDICION);
  assert.equal(actividades.find((a) => a.id === taller)?.enrolled, 1);
});

test('cuando se llena el cupo, el siguiente se queda fuera', async () => {
  const { db, taller } = await baseDePrueba();

  await inscribirse(db, { activityId: taller, clerkUserId: 'user_ana', displayName: 'Ana' });
  await inscribirse(db, { activityId: taller, clerkUserId: 'user_beto', displayName: 'Beto' });

  const tercera = await inscribirse(db, {
    activityId: taller,
    clerkUserId: 'user_cami',
    displayName: 'Cami',
  });

  assert.deepEqual(tercera, { ok: false, motivo: 'sin-cupos' });
});

/*
 * ⚠️ Lo que esta prueba **no** demuestra.
 *
 * PGlite corre sobre una sola conexión, así que dos transacciones lanzadas a la
 * vez se ejecutan una detrás de otra pase lo que pase. Quitando el
 * `for('update')` de `inscribirse`, esta prueba sigue en verde — se comprobó.
 *
 * O sea que aquí se verifica que **la cuenta de cupos es correcta**, no que el
 * bloqueo funcione. El bloqueo es una garantía de Postgres de verdad y protege
 * en Supabase, donde sí hay muchas conexiones a la vez; simplemente este banco
 * de pruebas no puede ejercitarlo.
 *
 * Y no se puede sustituir por un índice único, como sí se hace con las mesas:
 * un cupo es un **conteo**, no un valor repetido, y no hay índice que cuente.
 */
test('pedidas dos plazas cuando sólo queda una, entra exactamente una', async () => {
  const { db, taller } = await baseDePrueba();

  await inscribirse(db, { activityId: taller, clerkUserId: 'user_ana', displayName: 'Ana' });

  const [beto, cami] = await Promise.all([
    inscribirse(db, { activityId: taller, clerkUserId: 'user_beto', displayName: 'Beto' }),
    inscribirse(db, { activityId: taller, clerkUserId: 'user_cami', displayName: 'Cami' }),
  ]);

  const entraron = [beto, cami].filter((r) => r.ok).length;
  assert.equal(entraron, 1, 'entraron las dos: el cupo no se está imponiendo');

  const actividades = await actividadesDesdeBase(db, EDICION);
  assert.equal(actividades.find((a) => a.id === taller)?.enrolled, 2);
});

test('una actividad sin límite no rechaza a nadie', async () => {
  const { db, sellos } = await baseDePrueba();

  for (const nombre of ['ana', 'beto', 'cami', 'dani']) {
    const hecho = await inscribirse(db, {
      activityId: sellos,
      clerkUserId: `user_${nombre}`,
      displayName: nombre,
    });
    assert.equal(hecho.ok, true);
  }

  const actividades = await actividadesDesdeBase(db, EDICION);
  assert.equal(actividades.find((a) => a.id === sellos)?.enrolled, 4);
});

test('darse de baja libera el cupo para otra persona', async () => {
  const { db, taller } = await baseDePrueba();

  await inscribirse(db, { activityId: taller, clerkUserId: 'user_ana', displayName: 'Ana' });
  await inscribirse(db, { activityId: taller, clerkUserId: 'user_beto', displayName: 'Beto' });

  // Con el cupo lleno, Cami no entra…
  assert.deepEqual(
    await inscribirse(db, { activityId: taller, clerkUserId: 'user_cami', displayName: 'Cami' }),
    { ok: false, motivo: 'sin-cupos' },
  );

  // …hasta que Ana se da de baja.
  assert.equal(await cancelarInscripcion(db, { activityId: taller, clerkUserId: 'user_ana' }), true);
  assert.deepEqual(
    await inscribirse(db, { activityId: taller, clerkUserId: 'user_cami', displayName: 'Cami' }),
    { ok: true },
  );
});

test('darse de baja de algo a lo que no se estaba apuntado no hace nada', async () => {
  const { db, taller } = await baseDePrueba();

  const hecho = await cancelarInscripcion(db, { activityId: taller, clerkUserId: 'user_ana' });
  assert.equal(hecho, false);
});

test('las inscripciones propias no mezclan las dos ferias', async () => {
  const { db, taller, otra } = await baseDePrueba();

  await inscribirse(db, { activityId: taller, clerkUserId: 'user_ana', displayName: 'Ana' });
  await inscribirse(db, { activityId: otra, clerkUserId: 'user_ana', displayName: 'Ana' });

  const suyas = await inscripcionesDe(db, { clerkUserId: 'user_ana', editionId: EDICION });

  assert.deepEqual(suyas, [taller]);
});

test('las actividades de la otra feria no salen en esta', async () => {
  const { db, otra } = await baseDePrueba();

  const actividades = await actividadesDesdeBase(db, EDICION);

  assert.equal(actividades.length, 2);
  assert.equal(
    actividades.some((a) => a.id === otra),
    false,
  );
});
