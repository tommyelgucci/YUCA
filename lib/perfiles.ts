import { asc, eq } from 'drizzle-orm';
import type { YucaDb } from '@/db';
import { exhibitors } from '@/db/schema';
import { esViolacionUnica } from '@/lib/db-errores';
import type { ArtCategory, ConvocatoriaAudience, DatosPrivados } from '@/lib/types';

/**
 * Perfil de expositor.
 *
 * Lo crea la propia persona al entrar con Clerk por primera vez; a partir de
 * ahí `mi cuenta` lee este perfil para saber si ya puede elegir mesa.
 * `verified` es aparte porque sólo el staff lo otorga, nunca el expositor.
 *
 * El perfil tiene dos mitades con público distinto (ver el comentario de la
 * tabla en `db/schema.ts`): lo público y los datos personales. La frontera se
 * sostiene con `COLUMNAS_PUBLICAS`: toda consulta que alimente la web pública
 * debe seleccionar por ahí y nunca hacer `select()` de la tabla entera.
 */

/**
 * Las únicas columnas que pueden salir a la web pública.
 *
 * Existe para que añadir un dato personal nuevo a la tabla no lo filtre solo:
 * si no está en esta lista, no se publica.
 */
export const COLUMNAS_PUBLICAS = {
  id: exhibitors.id,
  slug: exhibitors.slug,
  displayName: exhibitors.displayName,
  audience: exhibitors.audience,
  categories: exhibitors.categories,
  verified: exhibitors.verified,
  avatarUrl: exhibitors.avatarUrl,
  bio: exhibitors.bio,
  instagram: exhibitors.instagram,
  tiktok: exhibitors.tiktok,
  facebook: exhibitors.facebook,
  web: exhibitors.web,
} as const;

function slugBase(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'expositor'
  );
}

/**
 * Perfil completo de quien está conectado, datos personales incluidos.
 *
 * Aquí sí se traen todas las columnas: es su propio perfil, va a "mi cuenta" y
 * nadie más lo ve.
 */
export async function perfilPorClerkId(db: YucaDb, clerkUserId: string) {
  const [perfil] = await db
    .select()
    .from(exhibitors)
    .where(eq(exhibitors.clerkUserId, clerkUserId))
    .limit(1);

  return perfil ?? null;
}

/** Perfil para la web pública: sólo lo que puede ver cualquiera. */
export async function perfilPublicoPorSlug(db: YucaDb, slug: string) {
  const [perfil] = await db
    .select(COLUMNAS_PUBLICAS)
    .from(exhibitors)
    .where(eq(exhibitors.slug, slug))
    .limit(1);

  return perfil ?? null;
}

export type ResultadoPerfil = { ok: true; id: string } | { ok: false; motivo: 'ya-tienes-perfil' };

/**
 * Crea el perfil. El slug sale del nombre y se desambigua añadiendo un número
 * si ya existe uno igual (dos artistas pueden llamarse "Estudio Luna").
 */
export async function crearPerfil(
  db: YucaDb,
  params: {
    clerkUserId: string;
    displayName: string;
    audience: ConvocatoriaAudience;
    categories: ArtCategory[];
    bio: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    web?: string;
  },
): Promise<ResultadoPerfil> {
  const base = slugBase(params.displayName);

  for (let intento = 0; intento < 20; intento += 1) {
    const slug = intento === 0 ? base : `${base}-${intento + 1}`;

    try {
      const [fila] = await db
        .insert(exhibitors)
        .values({
          clerkUserId: params.clerkUserId,
          slug,
          displayName: params.displayName.trim(),
          audience: params.audience,
          categories: params.categories,
          bio: params.bio.trim(),
          instagram: params.instagram || null,
          tiktok: params.tiktok || null,
          facebook: params.facebook || null,
          web: params.web || null,
        })
        .returning({ id: exhibitors.id });

      return { ok: true, id: fila.id };
    } catch (error) {
      if (esViolacionUnica(error, 'exhibitors_clerk_user_id_key')) {
        return { ok: false, motivo: 'ya-tienes-perfil' };
      }
      if (esViolacionUnica(error, 'exhibitors_slug_key')) {
        continue; // el nombre ya existe: probar el siguiente sufijo
      }
      throw error;
    }
  }

  throw new Error(`No se pudo generar un slug único para "${params.displayName}"`);
}

/**
 * La persona edita su propio perfil público.
 *
 * El slug NO se recalcula al cambiar el nombre: es la URL pública del perfil
 * (`/artistas/[slug]`) y los artistas la comparten en redes. Renombrarse no
 * puede romper los enlaces que ya publicó nadie.
 */
export async function actualizarPerfilPublico(
  db: YucaDb,
  params: {
    exhibitorId: string;
    displayName: string;
    audience: ConvocatoriaAudience;
    categories: ArtCategory[];
    bio: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    web?: string;
  },
): Promise<boolean> {
  const filas = await db
    .update(exhibitors)
    .set({
      displayName: params.displayName.trim(),
      audience: params.audience,
      categories: params.categories,
      bio: params.bio.trim(),
      instagram: params.instagram || null,
      tiktok: params.tiktok || null,
      facebook: params.facebook || null,
      web: params.web || null,
      updatedAt: new Date(),
    })
    .where(eq(exhibitors.id, params.exhibitorId))
    .returning({ id: exhibitors.id });

  return filas.length > 0;
}

/**
 * La persona edita sus datos personales; sólo los verá el equipo.
 *
 * `guardianConsentAt` no lo manda el formulario: lo pone esta función cuando
 * hay declaración válida (tutor con nombre y contacto), y lo borra si se
 * retiran esos datos. Así la marca de "tiene permiso" no puede llegar suelta
 * desde el cliente sin los datos que la respaldan.
 */
export async function actualizarDatosPrivados(
  db: YucaDb,
  params: { exhibitorId: string; declaraPermiso: boolean } & DatosPrivados,
): Promise<boolean> {
  const guardianName = params.guardianName || null;
  const guardianContact = params.guardianContact || null;
  const hayPermiso = Boolean(params.declaraPermiso && guardianName && guardianContact);

  const filas = await db
    .update(exhibitors)
    .set({
      fullName: params.fullName || null,
      birthDate: params.birthDate || null,
      contactEmail: params.contactEmail || null,
      phone: params.phone || null,
      gender: params.gender || null,
      department: params.department || null,
      guardianName,
      guardianContact,
      guardianConsentAt: hayPermiso ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(exhibitors.id, params.exhibitorId))
    .returning({ id: exhibitors.id });

  return filas.length > 0;
}

/**
 * Pone o quita la foto de perfil, y devuelve la que había.
 *
 * Devuelve la anterior para que quien llama pueda borrar ese archivo del
 * bucket: sin eso, cambiar de foto cinco veces deja cuatro archivos pagando
 * espacio que nadie va a mirar nunca.
 *
 * Va aparte de `actualizarPerfilPublico` porque se guarda sola, en cuanto se
 * elige el archivo. Meterla en aquel formulario obligaría a subir la imagen
 * antes de saber si el resto de campos son válidos.
 */
export async function cambiarAvatar(
  db: YucaDb,
  params: { exhibitorId: string; url: string | null },
): Promise<{ ok: boolean; anterior: string | null }> {
  // Se lee antes de escribir porque `returning` de un `update` devuelve la
  // fila nueva, no la vieja. Dos peticiones a la vez podrían dejar un archivo
  // huérfano; es el mismo daño asumido en el resto del módulo —un archivo que
  // no ve nadie— y no justifica una transacción.
  const [antes] = await db
    .select({ avatarUrl: exhibitors.avatarUrl })
    .from(exhibitors)
    .where(eq(exhibitors.id, params.exhibitorId))
    .limit(1);

  if (!antes) return { ok: false, anterior: null };

  await db
    .update(exhibitors)
    .set({ avatarUrl: params.url, updatedAt: new Date() })
    .where(eq(exhibitors.id, params.exhibitorId));

  return { ok: true, anterior: antes.avatarUrl };
}

/**
 * Perfiles a la espera de la insignia de verificado, del más viejo al más nuevo.
 *
 * Trae los datos personales a propósito: verificar es justamente cotejar que
 * detrás del nombre artístico hay una persona identificable. Es una consulta
 * de staff, y `/admin` ya comprueba el rol antes de llamarla.
 */
export async function perfilesPorVerificar(db: YucaDb) {
  return db
    .select({
      ...COLUMNAS_PUBLICAS,
      fullName: exhibitors.fullName,
      birthDate: exhibitors.birthDate,
      contactEmail: exhibitors.contactEmail,
      phone: exhibitors.phone,
      gender: exhibitors.gender,
      department: exhibitors.department,
      guardianName: exhibitors.guardianName,
      guardianContact: exhibitors.guardianContact,
      guardianConsentAt: exhibitors.guardianConsentAt,
      createdAt: exhibitors.createdAt,
    })
    .from(exhibitors)
    .where(eq(exhibitors.verified, false))
    .orderBy(asc(exhibitors.createdAt));
}

/** El staff otorga (o retira) la insignia de verificado tras revisar el perfil. */
export async function marcarVerificado(
  db: YucaDb,
  params: { exhibitorId: string; verified: boolean },
): Promise<boolean> {
  const filas = await db
    .update(exhibitors)
    .set({ verified: params.verified, updatedAt: new Date() })
    .where(eq(exhibitors.id, params.exhibitorId))
    .returning({ id: exhibitors.id });

  return filas.length > 0;
}
