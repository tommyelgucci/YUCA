import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { YucaDb } from './index';
import {
  actualizarDatosPrivados,
  actualizarPerfilPublico,
  crearPerfil,
  marcarVerificado,
  perfilesPorVerificar,
  perfilPorClerkId,
  perfilPublicoPorSlug,
} from '../lib/perfiles';

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

test('editar el perfil no cambia el slug ya publicado', async () => {
  const { db } = await baseDePrueba();

  await crearPerfil(db, {
    clerkUserId: 'user_ana',
    displayName: 'Estudio Lunaria',
    audience: 'artistas',
    categories: [],
    bio: '',
  });

  const antes = await perfilPorClerkId(db, 'user_ana');
  const hecho = await actualizarPerfilPublico(db, {
    exhibitorId: antes!.id,
    displayName: 'Lunaria Prints',
    audience: 'artistas',
    categories: ['Stickers'],
    bio: 'Ahora también stickers.',
    instagram: 'https://instagram.com/lunaria',
  });
  assert.equal(hecho, true);

  const despues = await perfilPorClerkId(db, 'user_ana');
  assert.equal(despues?.displayName, 'Lunaria Prints');
  assert.deepEqual(despues?.categories, ['Stickers']);
  assert.equal(despues?.instagram, 'https://instagram.com/lunaria');
  // Lo importante: la URL pública sigue siendo la que ya compartió.
  assert.equal(despues?.slug, 'estudio-lunaria');
});

test('los datos personales se guardan y no salen en la consulta pública', async () => {
  const { db } = await baseDePrueba();

  await crearPerfil(db, {
    clerkUserId: 'user_ana',
    displayName: 'Estudio Lunaria',
    audience: 'artistas',
    categories: [],
    bio: '',
  });

  const perfil = await perfilPorClerkId(db, 'user_ana');
  await actualizarDatosPrivados(db, {
    exhibitorId: perfil!.id,
    fullName: 'Ana Quiroga',
    birthDate: '1999-03-29',
    contactEmail: 'ana@ejemplo.bo',
    phone: '59169006784',
    gender: 'Femenino',
    department: 'Santa Cruz',
  });

  // Ella los ve completos en su propia cuenta…
  const propio = await perfilPorClerkId(db, 'user_ana');
  assert.equal(propio?.fullName, 'Ana Quiroga');
  assert.equal(propio?.birthDate, '1999-03-29');
  assert.equal(propio?.phone, '59169006784');

  // …y la web pública no recibe ninguno de esos campos.
  const publico = await perfilPublicoPorSlug(db, 'estudio-lunaria');
  assert.equal(publico?.displayName, 'Estudio Lunaria');
  for (const campo of ['fullName', 'birthDate', 'contactEmail', 'phone', 'gender', 'department']) {
    assert.equal(campo in publico!, false, `la consulta pública filtró ${campo}`);
  }
});

test('el staff sí ve los datos personales de la cola por verificar', async () => {
  const { db } = await baseDePrueba();

  await crearPerfil(db, {
    clerkUserId: 'user_ana',
    displayName: 'Estudio Lunaria',
    audience: 'artistas',
    categories: [],
    bio: '',
  });

  const perfil = await perfilPorClerkId(db, 'user_ana');
  await actualizarDatosPrivados(db, {
    exhibitorId: perfil!.id,
    fullName: 'Ana Quiroga',
    birthDate: null,
    contactEmail: null,
    phone: '59169006784',
    gender: null,
    department: 'Santa Cruz',
  });

  const [enCola] = await perfilesPorVerificar(db);
  assert.equal(enCola.fullName, 'Ana Quiroga');
  assert.equal(enCola.phone, '59169006784');
  assert.equal(enCola.department, 'Santa Cruz');
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
