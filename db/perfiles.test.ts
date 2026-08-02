import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { YucaDb } from './index';
import { crearPerfil, marcarVerificado, perfilesPorVerificar, perfilPorClerkId } from '../lib/perfiles';

/**
 * Pruebas del alta de perfil de expositor y su verificación por el staff.
 *
 * Mismo enfoque que `reservas.test.ts`: PGlite, para ejercitar el índice único
 * real que impide que una misma cuenta de Clerk tenga dos perfiles.
 */

async function baseDePrueba(): Promise<{ db: YucaDb }> {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as YucaDb;
  await migrate(drizzle(client, { schema }), { migrationsFolder: './db/migrations' });
  return { db };
}

test('crear un perfil genera su slug a partir del nombre', async () => {
  const { db } = await baseDePrueba();

  const resultado = await crearPerfil(db, {
    clerkUserId: 'user_ana',
    displayName: 'Estudio Lunaria',
    audience: 'artistas',
    categories: ['Ilustración Digital'],
    bio: 'Retratos con paleta nocturna.',
  });

  assert.equal(resultado.ok, true);
  const perfil = await perfilPorClerkId(db, 'user_ana');
  assert.equal(perfil?.slug, 'estudio-lunaria');
  assert.equal(perfil?.verified, false);
});

test('una misma cuenta de Clerk no puede tener dos perfiles', async () => {
  const { db } = await baseDePrueba();

  await crearPerfil(db, {
    clerkUserId: 'user_ana',
    displayName: 'Estudio Lunaria',
    audience: 'artistas',
    categories: [],
    bio: '',
  });

  const segundo = await crearPerfil(db, {
    clerkUserId: 'user_ana',
    displayName: 'Otro nombre',
    audience: 'artistas',
    categories: [],
    bio: '',
  });

  assert.deepEqual(segundo, { ok: false, motivo: 'ya-tienes-perfil' });
});

test('dos perfiles con el mismo nombre no chocan de slug', async () => {
  const { db } = await baseDePrueba();

  await crearPerfil(db, {
    clerkUserId: 'user_ana',
    displayName: 'Cactus Morado',
    audience: 'artistas',
    categories: [],
    bio: '',
  });
  await crearPerfil(db, {
    clerkUserId: 'user_beto',
    displayName: 'Cactus Morado',
    audience: 'artistas',
    categories: [],
    bio: '',
  });

  const ana = await perfilPorClerkId(db, 'user_ana');
  const beto = await perfilPorClerkId(db, 'user_beto');

  assert.equal(ana?.slug, 'cactus-morado');
  assert.equal(beto?.slug, 'cactus-morado-2');
});

test('el staff verifica un perfil y deja de aparecer en la cola', async () => {
  const { db } = await baseDePrueba();

  await crearPerfil(db, {
    clerkUserId: 'user_ana',
    displayName: 'Estudio Lunaria',
    audience: 'artistas',
    categories: [],
    bio: '',
  });

  const antes = await perfilesPorVerificar(db);
  assert.equal(antes.length, 1);

  const hecho = await marcarVerificado(db, { exhibitorId: antes[0].id, verified: true });
  assert.equal(hecho, true);

  const despues = await perfilesPorVerificar(db);
  assert.equal(despues.length, 0);
});
