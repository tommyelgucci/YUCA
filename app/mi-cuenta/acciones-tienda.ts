'use server';

import { revalidatePath } from 'next/cache';
import { requireDb } from '@/db';
import { getUsuarioId } from '@/lib/auth';
import { perfilPorClerkId } from '@/lib/perfiles';
import {
  actualizarProducto,
  agregarFoto,
  borrarProducto,
  cambiarTienda,
  publicarProducto,
  quitarFoto,
} from '@/lib/tienda';
import { borrarImagen, explicarSubida, rutaDeUrl, subirImagen } from '@/lib/almacenamiento';
import type { ResultadoAccion } from './acciones';

/**
 * Acciones de la tienda del vendedor.
 *
 * Van aparte de `acciones.ts` porque son otro producto: la feria es de una vez
 * al año y esto funciona todos los días. Comparten la misma regla de siempre —
 * el perfil se resuelve desde la sesión de Clerk, nunca desde el formulario,
 * porque una Server Action es un endpoint público.
 */

async function perfilDeLaSesion() {
  const userId = await getUsuarioId();
  if (!userId) throw new Error('No autorizado');

  const db = requireDb();
  const perfil = await perfilPorClerkId(db, userId);

  return { db, perfil };
}

/** Se refresca también la tienda pública: es lo que ve el comprador. */
function refrescar(slug: string) {
  revalidatePath('/mi-cuenta');
  revalidatePath('/tienda');
  revalidatePath(`/tienda/${slug}`);
}

export async function cambiarTiendaAction(abierta: boolean): Promise<ResultadoAccion> {
  const { db, perfil } = await perfilDeLaSesion();
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  if (abierta && !perfil.verified) {
    return {
      ok: false,
      mensaje: 'Para vender hace falta que el equipo verifique tu perfil primero.',
    };
  }

  await cambiarTienda(db, { exhibitorId: perfil.id, abierta });
  refrescar(perfil.slug);

  return abierta
    ? { ok: true, mensaje: 'Tu tienda está abierta. Publica tu primer producto.' }
    : { ok: true, mensaje: 'Tienda cerrada. Tus productos siguen guardados.' };
}

export async function publicarProductoAction(formData: FormData): Promise<ResultadoAccion> {
  const { db, perfil } = await perfilDeLaSesion();
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const nombre = String(formData.get('nombre') ?? '').trim();
  const descripcion = String(formData.get('descripcion') ?? '').trim();
  const precioBob = Number(formData.get('precioBob'));
  const stockCrudo = String(formData.get('stock') ?? '').trim();

  if (!nombre) return { ok: false, mensaje: 'Ponle un nombre a tu producto.' };

  const resultado = await publicarProducto(db, {
    exhibitorId: perfil.id,
    nombre,
    descripcion,
    precioBob,
    // Vacío = por encargo. Es lo más común en esta comunidad: se hace cuando
    // alguien lo pide, y llevar la cuenta de existencias sólo estorbaría.
    stock: stockCrudo === '' ? null : Number(stockCrudo),
    publicar: formData.get('publicar') === 'on',
  });

  refrescar(perfil.slug);

  if (resultado.ok) return { ok: true, mensaje: `"${nombre}" añadido a tu tienda.` };

  const mensajes: Record<typeof resultado.motivo, string> = {
    'sin-verificar': 'Para vender hace falta que el equipo verifique tu perfil primero.',
    'tienda-cerrada': 'Abre tu tienda antes de publicar productos.',
    'precio-invalido': 'El precio tiene que ser un número entero de bolivianos, mayor que cero.',
    'slug-repetido': 'Ya tienes demasiados productos con ese mismo nombre.',
  };
  return { ok: false, mensaje: mensajes[resultado.motivo] };
}

export async function cambiarEstadoProductoAction(
  productoId: string,
  estado: 'borrador' | 'publicado' | 'agotado',
): Promise<ResultadoAccion> {
  const { db, perfil } = await perfilDeLaSesion();
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const hecho = await actualizarProducto(db, { productoId, exhibitorId: perfil.id, estado });
  refrescar(perfil.slug);

  const dicho = { borrador: 'guardado como borrador', publicado: 'publicado', agotado: 'marcado como agotado' };

  return hecho
    ? { ok: true, mensaje: `Producto ${dicho[estado]}.` }
    : { ok: false, mensaje: 'No se pudo cambiar ese producto.' };
}

export async function borrarProductoAction(productoId: string): Promise<ResultadoAccion> {
  const { db, perfil } = await perfilDeLaSesion();
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const hecho = await borrarProducto(db, { productoId, exhibitorId: perfil.id });
  refrescar(perfil.slug);

  return hecho
    ? { ok: true, mensaje: 'Producto borrado.' }
    : { ok: false, mensaje: 'No se pudo borrar ese producto.' };
}

/* -------------------------------------------------------------------------- */
/* Fotos                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Sube una foto y la cuelga del producto.
 *
 * El orden importa: primero el archivo, después la fila. Si se hiciera al revés
 * y la subida fallara, quedaría una foto apuntando a una URL que no existe —y
 * eso se ve en el catálogo, mientras que un archivo huérfano no lo ve nadie.
 */
export async function subirFotoAction(formData: FormData): Promise<ResultadoAccion> {
  const { db, perfil } = await perfilDeLaSesion();
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const productoId = String(formData.get('productoId') ?? '');
  const archivo = formData.get('foto');

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, mensaje: 'Elige una foto.' };
  }

  const subida = await subirImagen(archivo, { carpeta: productoId });
  if (!subida.ok) return { ok: false, mensaje: explicarSubida(subida) };

  const colgada = await agregarFoto(db, {
    productoId,
    exhibitorId: perfil.id,
    url: subida.url,
    alt: String(formData.get('alt') ?? ''),
  });

  if (!colgada) {
    // El producto no es suyo o ya no existe: el archivo recién subido sobra.
    await borrarImagen(subida.ruta);
    return { ok: false, mensaje: 'Ese producto no es tuyo.' };
  }

  refrescar(perfil.slug);
  return { ok: true, mensaje: 'Foto subida.' };
}

export async function quitarFotoAction(fotoId: string): Promise<ResultadoAccion> {
  const { db, perfil } = await perfilDeLaSesion();
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const url = await quitarFoto(db, { fotoId, exhibitorId: perfil.id });
  if (!url) return { ok: false, mensaje: 'No se pudo quitar esa foto.' };

  const ruta = rutaDeUrl(url);
  if (ruta) await borrarImagen(ruta);

  refrescar(perfil.slug);
  return { ok: true, mensaje: 'Foto quitada.' };
}
