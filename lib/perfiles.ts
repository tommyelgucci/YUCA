import { asc, eq } from 'drizzle-orm';
import type { YucaDb } from '@/db';
import { exhibitors } from '@/db/schema';
import { esViolacionUnica } from '@/lib/db-errores';
import type { ArtCategory, ConvocatoriaAudience } from '@/lib/types';

/**
 * Perfil de expositor.
 *
 * Lo crea la propia persona al entrar con Clerk por primera vez; a partir de
 * ahí `mi cuenta` lee este perfil para saber si ya puede elegir mesa.
 * `verified` es aparte porque sólo el staff lo otorga, nunca el expositor.
 */

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

export async function perfilPorClerkId(db: YucaDb, clerkUserId: string) {
  const [perfil] = await db
    .select()
    .from(exhibitors)
    .where(eq(exhibitors.clerkUserId, clerkUserId))
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

/** Perfiles a la espera de la insignia de verificado, del más viejo al más nuevo. */
export async function perfilesPorVerificar(db: YucaDb) {
  return db
    .select({
      id: exhibitors.id,
      slug: exhibitors.slug,
      displayName: exhibitors.displayName,
      audience: exhibitors.audience,
      categories: exhibitors.categories,
      bio: exhibitors.bio,
      instagram: exhibitors.instagram,
      tiktok: exhibitors.tiktok,
      facebook: exhibitors.facebook,
      web: exhibitors.web,
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
