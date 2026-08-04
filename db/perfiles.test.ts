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
  cambiarAvatar,
  crearPerfil,
  marcarVerificado,
  perfilesPorVerificar,
  perfilPorClerkId,
  perfilPublicoPorSlug,
} from '../lib/perfiles';
import { rutaDeUrl } from '../lib/almacenamiento';

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
    guardianName: null,
    guardianContact: null,
    declaraPermiso: false,
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
    guardianName: null,
    guardianContact: null,
    declaraPermiso: false,
  });

  const [enCola] = await perfilesPorVerificar(db);
  assert.equal(enCola.fullName, 'Ana Quiroga');
  assert.equal(enCola.phone, '59169006784');
  assert.equal(enCola.department, 'Santa Cruz');
});

test('se puede dar de alta un perfil del público tiendas', async () => {
  const { db } = await baseDePrueba();

  // Vale por la migración del enum tanto como por el alta: si
  // `ALTER TYPE ... ADD VALUE` no hubiera corrido, esto reventaría aquí.
  const resultado = await crearPerfil(db, {
    clerkUserId: 'user_tienda',
    displayName: 'Quirquincho Store',
    audience: 'tiendas',
    categories: [],
    bio: '',
  });

  assert.equal(resultado.ok, true);
  const perfil = await perfilPorClerkId(db, 'user_tienda');
  assert.equal(perfil?.audience, 'tiendas');
});

test('el permiso del tutor sólo queda registrado si vienen sus datos', async () => {
  const { db } = await baseDePrueba();

  await crearPerfil(db, {
    clerkUserId: 'user_teen',
    displayName: 'Wawita',
    audience: 'artistas',
    categories: [],
    bio: '',
  });
  const perfil = await perfilPorClerkId(db, 'user_teen');

  const datosBase = {
    exhibitorId: perfil!.id,
    fullName: 'Ana Menor',
    birthDate: '2009-11-15',
    contactEmail: null,
    phone: null,
    gender: null,
    department: null,
  };

  // Marcar la casilla sin cargar al tutor no vale como permiso.
  await actualizarDatosPrivados(db, {
    ...datosBase,
    guardianName: null,
    guardianContact: null,
    declaraPermiso: true,
  });
  assert.equal((await perfilPorClerkId(db, 'user_teen'))?.guardianConsentAt, null);

  // Con tutor y casilla marcada, sí.
  await actualizarDatosPrivados(db, {
    ...datosBase,
    guardianName: 'Rosa Quiroga',
    guardianContact: '59170000000',
    declaraPermiso: true,
  });
  const conPermiso = await perfilPorClerkId(db, 'user_teen');
  assert.ok(conPermiso?.guardianConsentAt instanceof Date);
  assert.equal(conPermiso?.guardianName, 'Rosa Quiroga');

  // Y retirar los datos del tutor retira el permiso.
  await actualizarDatosPrivados(db, {
    ...datosBase,
    guardianName: null,
    guardianContact: null,
    declaraPermiso: false,
  });
  assert.equal((await perfilPorClerkId(db, 'user_teen'))?.guardianConsentAt, null);
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

test('cambiar la foto de perfil devuelve la anterior, para poder borrarla', async () => {
  const { db } = await baseDePrueba();

  await crearPerfil(db, {
    clerkUserId: 'user_ana',
    displayName: 'Estudio Lunaria',
    audience: 'artistas',
    categories: [],
    bio: '',
  });
  const perfil = (await perfilPorClerkId(db, 'user_ana'))!;

  // La primera vez no hay nada que borrar.
  const primera = await cambiarAvatar(db, { exhibitorId: perfil.id, url: 'https://x/uno.jpg' });
  assert.equal(primera.ok, true);
  assert.equal(primera.anterior, null);

  // La segunda devuelve la primera: ese archivo ya no lo usa nadie.
  const segunda = await cambiarAvatar(db, { exhibitorId: perfil.id, url: 'https://x/dos.jpg' });
  assert.equal(segunda.anterior, 'https://x/uno.jpg');
  assert.equal((await perfilPublicoPorSlug(db, perfil.slug))?.avatarUrl, 'https://x/dos.jpg');

  // Quitarla la deja en null, y también devuelve la que había.
  const quitada = await cambiarAvatar(db, { exhibitorId: perfil.id, url: null });
  assert.equal(quitada.anterior, 'https://x/dos.jpg');
  assert.equal((await perfilPublicoPorSlug(db, perfil.slug))?.avatarUrl, null);
});

test('la ruta dentro del bucket se recupera de la URL pública', () => {
  const publica =
    'https://proyecto.supabase.co/storage/v1/object/public/productos/avatares/abc/foto.jpg';
  assert.equal(rutaDeUrl(publica), 'avatares/abc/foto.jpg');

  // Un avatar sembrado a mano no vive en el bucket: no hay nada que borrar.
  assert.equal(rutaDeUrl('https://images.unsplash.com/photo-123'), null);
});
