import { and, eq, inArray } from 'drizzle-orm';
import { getDb, type YucaDb } from '@/db';
import { exhibitors, reservations, standCompanions, stands as standsTabla } from '@/db/schema';
import { COLUMNAS_PUBLICAS, perfilPublicoPorSlug } from '@/lib/perfiles';
import { stands as standsMock } from '@/lib/data/feria';
import { expositores as expositoresMock } from '@/lib/data/expositores';
import { edicionActual } from '@/lib/data/edicion';
import type { ArtCategory, Exhibitor, Stand } from '@/lib/types';

/**
 * La feria vista desde fuera: qué mesas hay y quién está en cada una.
 *
 * Es el puente entre la base y las páginas públicas. Hasta ahora el mapa y la
 * lista de participantes leían `lib/data/`, o sea que un expositor que se
 * registraba de verdad no aparecía en ningún lado.
 *
 * **Devuelve exactamente las mismas formas que los mocks** (`Stand`,
 * `Exhibitor`). Eso es a propósito: los componentes del mapa están afinados
 * contra esas formas y no tienen por qué enterarse de dónde salen los datos.
 *
 * **Sin base configurada sigue funcionando**, con los datos de demostración.
 * Un clon recién bajado del repositorio tiene que poder verse.
 */

/**
 * La geometría del plano vive en el código, no en la base.
 *
 * `lib/data/feria.ts` guarda el contorno de las salas, el escenario y las
 * entradas: es del local, no de la edición, y dibujarlo desde filas sería
 * cambiar un archivo legible por veinte números sueltos. De la base sólo salen
 * las mesas y su estado.
 */
export { espacios, espaciosPorId, ESTADOS, ZONAS } from '@/lib/data/feria';

/**
 * Las mesas de la edición, con quién la ocupa si la reserva está confirmada.
 *
 * Exportada para poder probarla contra PGlite; `vistaFeria` resuelve la base
 * por su cuenta y no admite inyectarla.
 */
export async function standsDesdeBase(db: YucaDb, editionId: string): Promise<Stand[]> {
  const filas = await db
    .select({
      code: standsTabla.code,
      numero: standsTabla.numero,
      x: standsTabla.x,
      y: standsTabla.y,
      width: standsTabla.width,
      height: standsTabla.height,
      rotate: standsTabla.rotate,
      status: standsTabla.status,
      kind: standsTabla.kind,
      maxCompaneros: standsTabla.maxCompaneros,
      externalName: standsTabla.externalName,
    })
    .from(standsTabla)
    .where(eq(standsTabla.editionId, editionId));

  /*
   * El plano de `lib/data/feria.ts` manda en la geometría.
   *
   * La base guarda coordenadas porque se sembraron desde ahí, pero la fuente de
   * verdad del dibujo sigue siendo el código: rehacer el plano es editar un
   * archivo, no migrar cincuenta filas. De la base sale lo que cambia solo —el
   * estado de cada mesa y quién la ocupa—.
   *
   * Una mesa que la base tenga y el plano no, no se puede dibujar, así que se
   * queda fuera en vez de aparecer encima del escenario en la esquina 0,0.
   */
  const geometria = new Map(standsMock.map((stand) => [stand.id, stand]));

  return filas.flatMap((fila) => {
    const dibujo = geometria.get(fila.code);
    if (!dibujo) return [];

    return [
      {
        ...dibujo,
        numero: fila.numero,
        status: fila.status,
        kind: fila.kind,
        maxCompaneros: fila.maxCompaneros,
        externalName: fila.externalName ?? undefined,
      } satisfies Stand,
    ];
  });
}

/** Una fila de `COLUMNAS_PUBLICAS` más de qué mesa viene y en qué estado. */
interface FilaParticipante {
  id: string;
  slug: string;
  displayName: string;
  audience: Exhibitor['audience'];
  categories: string[];
  verified: boolean;
  avatarUrl: string | null;
  bio: string;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  web: string | null;
  standCode: string;
  estado: string;
}

/**
 * De fila a `Exhibitor`.
 *
 * Existe porque titulares y acompañantes se consultan por separado —salen de
 * tablas distintas— pero se publican exactamente igual: para quien mira el
 * mapa, los dos son gente que va a estar en esa mesa.
 */
function comoExpositor(fila: FilaParticipante): Exhibitor {
  return {
    id: fila.id,
    slug: fila.slug,
    displayName: fila.displayName,
    audience: fila.audience,
    categories: fila.categories as ArtCategory[],
    verified: fila.verified,
    avatar: fila.avatarUrl,
    bio: fila.bio,
    socials: {
      instagram: fila.instagram ?? undefined,
      tiktok: fila.tiktok ?? undefined,
      facebook: fila.facebook ?? undefined,
      web: fila.web ?? undefined,
    },
    // Sólo se anuncia la mesa cuando el pago está confirmado. Con la reserva
    // aún pendiente la persona ya cuenta como participante, pero la mesa
    // todavía se le puede caer y no conviene publicarla.
    standId: fila.estado === 'confirmada' ? fila.standCode : undefined,
  };
}

/**
 * Los expositores que se ven en la web.
 *
 * Sólo salen quienes tienen una reserva **viva** en la edición: quien no apartó
 * mesa todavía no es participante, y quien la dejó vencer deja de serlo. Se
 * seleccionan por `COLUMNAS_PUBLICAS` para que ningún dato personal se escape
 * por esta puerta.
 *
 * **Incluye a los acompañantes de mesa**, no sólo a quien pagó. Una mesa
 * compartida tiene dos personas detrás y las dos van a estar ahí el día de la
 * feria; enseñar sólo al titular dejaba a la otra fuera del mapa y de la lista
 * de participantes, aunque ya estuviera verificada y saliera en las
 * credenciales impresas. Se devuelven primero los titulares para que cada mesa
 * se lea encabezada por quien la reservó.
 */
export async function expositoresDesdeBase(db: YucaDb, editionId: string): Promise<Exhibitor[]> {
  const vivas = and(
    eq(standsTabla.editionId, editionId),
    inArray(reservations.status, ['pendiente', 'confirmada']),
  );

  const [titulares, acompanantes] = await Promise.all([
    db
      .select({ ...COLUMNAS_PUBLICAS, standCode: standsTabla.code, estado: reservations.status })
      .from(reservations)
      .innerJoin(standsTabla, eq(reservations.standId, standsTabla.id))
      .innerJoin(exhibitors, eq(reservations.exhibitorId, exhibitors.id))
      .where(vivas),

    db
      .select({ ...COLUMNAS_PUBLICAS, standCode: standsTabla.code, estado: reservations.status })
      .from(standCompanions)
      .innerJoin(reservations, eq(standCompanions.reservationId, reservations.id))
      .innerJoin(standsTabla, eq(reservations.standId, standsTabla.id))
      .innerJoin(exhibitors, eq(standCompanions.exhibitorId, exhibitors.id))
      .where(vivas),
  ]);

  return [...titulares, ...acompanantes].map(comoExpositor);
}

export interface VistaFeria {
  stands: Stand[];
  expositores: Exhibitor[];
  /** De dónde salieron los datos; la interfaz lo avisa cuando son de mentira. */
  origen: 'base' | 'demostracion';
}

/** Todo lo que necesitan el mapa y la lista de participantes, de una vez. */
export async function vistaFeria(editionId = edicionActual.id): Promise<VistaFeria> {
  const db = getDb();
  if (!db) return { stands: standsMock, expositores: expositoresMock, origen: 'demostracion' };

  const [stands, expositores] = await Promise.all([
    standsDesdeBase(db, editionId),
    expositoresDesdeBase(db, editionId),
  ]);

  // Base configurada pero sin sembrar: es más útil enseñar la demostración que
  // un plano vacío que parece un error.
  if (stands.length === 0) {
    return { stands: standsMock, expositores: expositoresMock, origen: 'demostracion' };
  }

  return { stands, expositores, origen: 'base' };
}

/**
 * Un perfil público por su slug, para `/artistas/[slug]`.
 *
 * Busca en **todos** los perfiles, no sólo en quienes tienen mesa: esa
 * dirección es la que el artista comparte en sus redes, y no puede dejar de
 * existir porque este año no haya alcanzado a reservar o porque su reserva se
 * venciera. Lo que sí depende de la mesa es el bloque de "dónde encontrarle".
 */
export async function expositorPorSlug(slug: string): Promise<Exhibitor | null> {
  const db = getDb();

  if (!db) return expositoresMock.find((expositor) => expositor.slug === slug) ?? null;

  const perfil = await perfilPublicoPorSlug(db, slug);
  if (!perfil) return null;

  const { expositores } = await vistaFeria();
  const conMesa = expositores.find((expositor) => expositor.slug === slug);

  return {
    id: perfil.id,
    slug: perfil.slug,
    displayName: perfil.displayName,
    audience: perfil.audience,
    categories: (perfil.categories ?? []) as ArtCategory[],
    verified: perfil.verified,
    avatar: perfil.avatarUrl,
    bio: perfil.bio,
    socials: {
      instagram: perfil.instagram ?? undefined,
      tiktok: perfil.tiktok ?? undefined,
      facebook: perfil.facebook ?? undefined,
      web: perfil.web ?? undefined,
    },
    standId: conMesa?.standId,
  };
}
