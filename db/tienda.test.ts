import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { YucaDb } from './index';
import {
  actualizarProducto,
  borrarProducto,
  cambiarTienda,
  catalogoDe,
  dejarResena,
  productosDe,
  publicarProducto,
  reputacionDe,
  tiendasAbiertas,
} from '../lib/tienda';

/**
 * Pruebas de la tienda contra Postgres de verdad (PGlite).
 *
 * Lo que se ejercita aquí es sobre todo quién puede vender y qué llega a verse
 * en público: son las dos cosas que, si fallan, se notan desde fuera.
 */

async function baseDePrueba() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as YucaDb;
  await migrate(drizzle(client, { schema }), { migrationsFolder: './db/migrations' });

  const perfiles = await db
    .insert(schema.exhibitors)
    .values([
      // Verificada y con tienda abierta: la única que puede vender.
      {
        clerkUserId: 'user_lunaria',
        slug: 'lunaria',
        displayName: 'Estudio Lunaria',
        verified: true,
        tiendaAbierta: true,
      },
      // Verificado, pero sin abrir tienda: sólo hace feria.
      { clerkUserId: 'user_papaya', slug: 'papaya', displayName: 'Papaya', verified: true },
      // Con tienda abierta pero sin verificar todavía.
      {
        clerkUserId: 'user_nuevo',
        slug: 'nuevo',
        displayName: 'Recién Llegado',
        tiendaAbierta: true,
      },
    ])
    .returning({ id: schema.exhibitors.id, slug: schema.exhibitors.slug });

  const porSlug = (slug: string) => perfiles.find((p) => p.slug === slug)!.id;

  return { db, porSlug };
}

test('una vendedora verificada con tienda abierta publica un producto', async () => {
  const { db, porSlug } = await baseDePrueba();

  const resultado = await publicarProducto(db, {
    exhibitorId: porSlug('lunaria'),
    nombre: 'Llavero de acrílico gato',
    precioBob: 25,
    publicar: true,
  });

  assert.equal(resultado.ok, true);

  const catalogo = await catalogoDe(db, 'lunaria');
  assert.deepEqual(
    catalogo.map((p) => [p.nombre, p.slug, p.precioBob]),
    [['Llavero de acrílico gato', 'llavero-de-acrilico-gato', 25]],
  );
});

test('sin verificar no se puede publicar', async () => {
  const { db, porSlug } = await baseDePrueba();

  const resultado = await publicarProducto(db, {
    exhibitorId: porSlug('nuevo'),
    nombre: 'Pin esmaltado',
    precioBob: 30,
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.ok === false && resultado.motivo, 'sin-verificar');
});

test('con la tienda cerrada tampoco, aunque esté verificado', async () => {
  const { db, porSlug } = await baseDePrueba();

  const resultado = await publicarProducto(db, {
    exhibitorId: porSlug('papaya'),
    nombre: 'Print A4',
    precioBob: 40,
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.ok === false && resultado.motivo, 'tienda-cerrada');
});

test('el borrador no sale en el catálogo público, el publicado sí', async () => {
  const { db, porSlug } = await baseDePrueba();
  const lunaria = porSlug('lunaria');

  await publicarProducto(db, { exhibitorId: lunaria, nombre: 'A medias', precioBob: 10 });
  await publicarProducto(db, {
    exhibitorId: lunaria,
    nombre: 'Listo',
    precioBob: 20,
    publicar: true,
  });

  assert.equal((await productosDe(db, lunaria)).length, 2);
  assert.deepEqual((await catalogoDe(db, 'lunaria')).map((p) => p.nombre), ['Listo']);
});

test('dos productos del mismo nombre no chocan de slug', async () => {
  const { db, porSlug } = await baseDePrueba();
  const lunaria = porSlug('lunaria');

  await publicarProducto(db, { exhibitorId: lunaria, nombre: 'Sticker', precioBob: 5, publicar: true });
  await publicarProducto(db, { exhibitorId: lunaria, nombre: 'Sticker', precioBob: 8, publicar: true });

  assert.deepEqual(
    (await catalogoDe(db, 'lunaria')).map((p) => p.slug).sort(),
    ['sticker', 'sticker-2'],
  );
});

test('el precio tiene que ser un entero positivo', async () => {
  const { db, porSlug } = await baseDePrueba();

  for (const precioBob of [0, -5, 12.5]) {
    const resultado = await publicarProducto(db, {
      exhibitorId: porSlug('lunaria'),
      nombre: 'Cosa',
      precioBob,
    });
    assert.equal(resultado.ok === false && resultado.motivo, 'precio-invalido');
  }
});

test('nadie edita ni borra el producto de otro', async () => {
  const { db, porSlug } = await baseDePrueba();

  const creado = await publicarProducto(db, {
    exhibitorId: porSlug('lunaria'),
    nombre: 'Llavero',
    precioBob: 25,
    publicar: true,
  });
  if (!creado.ok) throw new Error('debería haberse creado');

  const editado = await actualizarProducto(db, {
    productoId: creado.productoId,
    exhibitorId: porSlug('papaya'),
    precioBob: 1,
  });
  const borrado = await borrarProducto(db, {
    productoId: creado.productoId,
    exhibitorId: porSlug('papaya'),
  });

  assert.equal(editado, false);
  assert.equal(borrado, false);
  assert.equal((await catalogoDe(db, 'lunaria'))[0].precioBob, 25);
});

test('quitarle la verificación a alguien le vacía el catálogo público', async () => {
  const { db, porSlug } = await baseDePrueba();
  const lunaria = porSlug('lunaria');

  await publicarProducto(db, { exhibitorId: lunaria, nombre: 'Pin', precioBob: 30, publicar: true });
  assert.equal((await catalogoDe(db, 'lunaria')).length, 1);

  await db
    .update(schema.exhibitors)
    .set({ verified: false })
    .where(eq(schema.exhibitors.id, lunaria));

  // El producto sigue existiendo para ella, pero deja de verse fuera.
  assert.equal((await productosDe(db, lunaria)).length, 1);
  assert.equal((await catalogoDe(db, 'lunaria')).length, 0);
});

test('las estrellas van de 1 a 5 y una persona opina una sola vez', async () => {
  const { db, porSlug } = await baseDePrueba();
  const lunaria = porSlug('lunaria');

  const fuera = await dejarResena(db, {
    exhibitorId: lunaria,
    autorClerkUserId: 'user_compradora',
    autorNombre: 'Rosa',
    estrellas: 6,
  });
  assert.equal(fuera.ok === false && fuera.motivo, 'estrellas-invalidas');

  const primera = await dejarResena(db, {
    exhibitorId: lunaria,
    autorClerkUserId: 'user_compradora',
    autorNombre: 'Rosa',
    estrellas: 5,
    comentario: 'Llegó puntual y precioso.',
  });
  const segunda = await dejarResena(db, {
    exhibitorId: lunaria,
    autorClerkUserId: 'user_compradora',
    autorNombre: 'Rosa',
    estrellas: 1,
  });

  assert.equal(primera.ok, true);
  assert.equal(segunda.ok === false && segunda.motivo, 'ya-opinaste');
});

test('nadie se puntúa a sí mismo', async () => {
  const { db, porSlug } = await baseDePrueba();

  const resultado = await dejarResena(db, {
    exhibitorId: porSlug('lunaria'),
    autorClerkUserId: 'user_lunaria',
    autorNombre: 'Estudio Lunaria',
    estrellas: 5,
  });

  assert.equal(resultado.ok === false && resultado.motivo, 'eres-tu');
});

test('sin reseñas el promedio es null, no cero', async () => {
  const { db, porSlug } = await baseDePrueba();
  const lunaria = porSlug('lunaria');

  assert.deepEqual(await reputacionDe(db, lunaria), { promedio: null, total: 0 });

  await dejarResena(db, {
    exhibitorId: lunaria,
    autorClerkUserId: 'user_a',
    autorNombre: 'A',
    estrellas: 5,
  });
  await dejarResena(db, {
    exhibitorId: lunaria,
    autorClerkUserId: 'user_b',
    autorNombre: 'B',
    estrellas: 4,
  });

  assert.deepEqual(await reputacionDe(db, lunaria), { promedio: 4.5, total: 2 });
});

test('el listado sólo trae tiendas con algo publicado', async () => {
  const { db, porSlug } = await baseDePrueba();
  const lunaria = porSlug('lunaria');

  // Tienda abierta pero vacía: no entra al listado.
  assert.equal((await tiendasAbiertas(db)).length, 0);

  // Un borrador tampoco cuenta: nadie puede verlo.
  await publicarProducto(db, { exhibitorId: lunaria, nombre: 'A medias', precioBob: 10 });
  assert.equal((await tiendasAbiertas(db)).length, 0);

  await publicarProducto(db, {
    exhibitorId: lunaria,
    nombre: 'Llavero',
    precioBob: 25,
    publicar: true,
  });
  await publicarProducto(db, {
    exhibitorId: lunaria,
    nombre: 'Print',
    precioBob: 40,
    publicar: true,
  });

  const tiendas = await tiendasAbiertas(db);
  assert.equal(tiendas.length, 1);
  assert.equal(tiendas[0].slug, 'lunaria');
  assert.equal(tiendas[0].productos, 2);
  // "Desde" es el más barato de los publicados, no el borrador de 10.
  assert.equal(tiendas[0].desde, 25);
});

test('cerrar la tienda la saca del listado sin borrar nada', async () => {
  const { db, porSlug } = await baseDePrueba();
  const lunaria = porSlug('lunaria');

  await publicarProducto(db, {
    exhibitorId: lunaria,
    nombre: 'Llavero',
    precioBob: 25,
    publicar: true,
  });
  assert.equal((await tiendasAbiertas(db)).length, 1);

  await cambiarTienda(db, { exhibitorId: lunaria, abierta: false });

  assert.equal((await tiendasAbiertas(db)).length, 0);
  assert.equal((await productosDe(db, lunaria)).length, 1);
});
