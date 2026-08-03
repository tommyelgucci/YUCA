import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { YucaDb } from '@/db';
import { exhibitors, productoFotos, productos, resenas } from '@/db/schema';
import { esViolacionUnica } from '@/lib/db-errores';

/**
 * Tienda: catálogo de productos y reputación del vendedor.
 *
 * Es la parte de la plataforma que funciona todo el año, aparte de la feria.
 * Se apoya en lo que ya existe —el perfil de expositor y su verificación— en
 * vez de inventar un concepto nuevo de "vendedor": quien tiene perfil
 * verificado y abre su tienda, vende.
 *
 * **Aquí no hay dinero.** No se cobra, no se retiene y no se reparte nada: el
 * catálogo y la reputación funcionan igual con o sin pagos, y separarlo así
 * deja esa decisión —comisión, membresía, o nada— para cuando esté tomada, sin
 * que bloquee lo demás.
 */

/** Sólo el staff verifica; sin eso no se puede publicar nada. */
export type ResultadoProducto =
  | { ok: true; productoId: string }
  | { ok: false; motivo: 'sin-verificar' | 'tienda-cerrada' | 'slug-repetido' | 'precio-invalido' };

function slugDe(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'producto'
  );
}

/**
 * Publica un producto en la tienda de un vendedor.
 *
 * Las dos condiciones —perfil verificado y tienda abierta— se comprueban aquí y
 * no con un índice, porque dependen del estado del vendedor en este momento y
 * no de la fila que se inserta. Verificar es lo que la organización usa para
 * saber quién hay detrás de cada venta.
 */
export async function publicarProducto(
  db: YucaDb,
  params: {
    exhibitorId: string;
    nombre: string;
    descripcion?: string;
    precioBob: number;
    stock?: number | null;
    /** Nace en borrador salvo que se pida publicarlo ya. */
    publicar?: boolean;
  },
): Promise<ResultadoProducto> {
  if (!Number.isInteger(params.precioBob) || params.precioBob <= 0) {
    return { ok: false, motivo: 'precio-invalido' };
  }

  const [vendedor] = await db
    .select({ verified: exhibitors.verified, tiendaAbierta: exhibitors.tiendaAbierta })
    .from(exhibitors)
    .where(eq(exhibitors.id, params.exhibitorId))
    .limit(1);

  if (!vendedor?.verified) return { ok: false, motivo: 'sin-verificar' };
  if (!vendedor.tiendaAbierta) return { ok: false, motivo: 'tienda-cerrada' };

  const base = slugDe(params.nombre);

  // Mismo patrón que el alta de perfil: se prueba el siguiente sufijo en vez de
  // leer antes de escribir, que dejaría una carrera entre la lectura y el alta.
  for (let intento = 0; intento < 20; intento += 1) {
    const slug = intento === 0 ? base : `${base}-${intento + 1}`;

    try {
      const [fila] = await db
        .insert(productos)
        .values({
          exhibitorId: params.exhibitorId,
          slug,
          nombre: params.nombre.trim(),
          descripcion: params.descripcion?.trim() ?? '',
          precioBob: params.precioBob,
          stock: params.stock ?? null,
          estado: params.publicar ? 'publicado' : 'borrador',
        })
        .returning({ id: productos.id });

      return { ok: true, productoId: fila.id };
    } catch (error) {
      if (esViolacionUnica(error, 'productos_tienda_slug_key')) continue;
      throw error;
    }
  }

  return { ok: false, motivo: 'slug-repetido' };
}

/** Cambia lo editable de un producto. Sólo su dueño; se comprueba en el `where`. */
export async function actualizarProducto(
  db: YucaDb,
  params: {
    productoId: string;
    exhibitorId: string;
    nombre?: string;
    descripcion?: string;
    precioBob?: number;
    stock?: number | null;
    estado?: 'borrador' | 'publicado' | 'agotado';
  },
): Promise<boolean> {
  if (params.precioBob !== undefined && (!Number.isInteger(params.precioBob) || params.precioBob <= 0)) {
    return false;
  }

  const filas = await db
    .update(productos)
    .set({
      ...(params.nombre !== undefined && { nombre: params.nombre.trim() }),
      ...(params.descripcion !== undefined && { descripcion: params.descripcion.trim() }),
      ...(params.precioBob !== undefined && { precioBob: params.precioBob }),
      ...(params.stock !== undefined && { stock: params.stock }),
      ...(params.estado !== undefined && { estado: params.estado }),
      updatedAt: new Date(),
    })
    // El `exhibitorId` en el filtro es lo que impide editar el producto de otro.
    .where(and(eq(productos.id, params.productoId), eq(productos.exhibitorId, params.exhibitorId)))
    .returning({ id: productos.id });

  return filas.length > 0;
}

export async function borrarProducto(
  db: YucaDb,
  params: { productoId: string; exhibitorId: string },
): Promise<boolean> {
  const filas = await db
    .delete(productos)
    .where(and(eq(productos.id, params.productoId), eq(productos.exhibitorId, params.exhibitorId)))
    .returning({ id: productos.id });

  return filas.length > 0;
}

/** Todo el catálogo de un vendedor, borradores incluidos: es para su panel. */
export async function productosDe(db: YucaDb, exhibitorId: string) {
  return db
    .select()
    .from(productos)
    .where(eq(productos.exhibitorId, exhibitorId))
    .orderBy(desc(productos.updatedAt));
}

/**
 * Catálogo público de una tienda.
 *
 * Sólo lo publicado, y sólo si el vendedor sigue verificado y con la tienda
 * abierta: si el staff le retira la verificación, su catálogo desaparece de la
 * web sin tener que tocar producto por producto.
 */
export async function catalogoDe(db: YucaDb, slug: string) {
  return db
    .select({
      id: productos.id,
      slug: productos.slug,
      nombre: productos.nombre,
      descripcion: productos.descripcion,
      precioBob: productos.precioBob,
      stock: productos.stock,
      estado: productos.estado,
    })
    .from(productos)
    .innerJoin(exhibitors, eq(productos.exhibitorId, exhibitors.id))
    .where(
      and(
        eq(exhibitors.slug, slug),
        eq(exhibitors.verified, true),
        eq(exhibitors.tiendaAbierta, true),
        eq(productos.estado, 'publicado'),
      ),
    )
    .orderBy(asc(productos.nombre));
}

export async function fotosDe(db: YucaDb, productoId: string) {
  return db
    .select({ id: productoFotos.id, url: productoFotos.url, alt: productoFotos.alt })
    .from(productoFotos)
    .where(eq(productoFotos.productoId, productoId))
    .orderBy(asc(productoFotos.orden));
}

/* -------------------------------------------------------------------------- */
/* Reputación                                                                  */
/* -------------------------------------------------------------------------- */

export type ResultadoResena =
  | { ok: true; resenaId: string }
  | { ok: false; motivo: 'ya-opinaste' | 'eres-tu' | 'estrellas-invalidas' };

/**
 * Deja una reseña a un vendedor.
 *
 * Va firmada con el nombre de quien la escribe: no se ofrece reseña anónima.
 * Mientras no existan pedidos no hay forma de comprobar que quien opina compró
 * de verdad, y en una comunidad donde todos se conocen, poner la cara delante
 * sostiene la confianza mejor que un sello de "compra verificada" que todavía
 * no se puede emitir.
 *
 * Una por persona y vendedor: lo impone un índice único, no una comprobación.
 */
export async function dejarResena(
  db: YucaDb,
  params: {
    exhibitorId: string;
    autorClerkUserId: string;
    autorNombre: string;
    estrellas: number;
    comentario?: string;
  },
): Promise<ResultadoResena> {
  if (!Number.isInteger(params.estrellas) || params.estrellas < 1 || params.estrellas > 5) {
    return { ok: false, motivo: 'estrellas-invalidas' };
  }

  // Nadie se puntúa a sí mismo.
  const [suyo] = await db
    .select({ id: exhibitors.id })
    .from(exhibitors)
    .where(
      and(eq(exhibitors.id, params.exhibitorId), eq(exhibitors.clerkUserId, params.autorClerkUserId)),
    )
    .limit(1);

  if (suyo) return { ok: false, motivo: 'eres-tu' };

  try {
    const [fila] = await db
      .insert(resenas)
      .values({
        exhibitorId: params.exhibitorId,
        autorClerkUserId: params.autorClerkUserId,
        autorNombre: params.autorNombre.trim(),
        estrellas: params.estrellas,
        comentario: params.comentario?.trim() ?? '',
      })
      .returning({ id: resenas.id });

    return { ok: true, resenaId: fila.id };
  } catch (error) {
    if (esViolacionUnica(error, 'resenas_autor_vendedor_key')) {
      return { ok: false, motivo: 'ya-opinaste' };
    }
    throw error;
  }
}

export async function resenasDe(db: YucaDb, exhibitorId: string) {
  return db
    .select({
      id: resenas.id,
      autorNombre: resenas.autorNombre,
      estrellas: resenas.estrellas,
      comentario: resenas.comentario,
      createdAt: resenas.createdAt,
    })
    .from(resenas)
    .where(eq(resenas.exhibitorId, exhibitorId))
    .orderBy(desc(resenas.createdAt));
}

/**
 * Promedio y total de estrellas de un vendedor.
 *
 * Devuelve `null` en el promedio si no hay ninguna reseña, en vez de un cero:
 * "todavía nadie opinó" y "todos le pusieron cero" no son lo mismo, y mostrar
 * cero estrellas a quien acaba de abrir su tienda sería injusto.
 */
export async function reputacionDe(
  db: YucaDb,
  exhibitorId: string,
): Promise<{ promedio: number | null; total: number }> {
  const [fila] = await db
    .select({
      promedio: sql<string | null>`avg(${resenas.estrellas})`,
      total: sql<number>`count(*)::int`,
    })
    .from(resenas)
    .where(eq(resenas.exhibitorId, exhibitorId));

  return {
    promedio: fila.promedio === null ? null : Math.round(Number(fila.promedio) * 10) / 10,
    total: fila.total,
  };
}
