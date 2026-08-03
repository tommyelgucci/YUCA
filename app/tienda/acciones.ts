'use server';

import { revalidatePath } from 'next/cache';
import { requireDb } from '@/db';
import { getNombreUsuario, getUsuarioId } from '@/lib/auth';
import { perfilPublicoPorSlug } from '@/lib/perfiles';
import { dejarResena } from '@/lib/tienda';

export type ResultadoResenaAccion = { ok: boolean; mensaje: string };

/**
 * Dejar una reseña a un vendedor.
 *
 * Exige sesión iniciada, y el nombre se toma de la cuenta —no del formulario—
 * porque la reseña **va firmada**: es lo único que sostiene la confianza
 * mientras no existan pedidos con los que comprobar que quien opina compró.
 * Dejar que el nombre lo escriba el navegador convertiría la firma en adorno.
 */
export async function dejarResenaAction(formData: FormData): Promise<ResultadoResenaAccion> {
  const clerkUserId = await getUsuarioId();
  if (!clerkUserId) {
    return { ok: false, mensaje: 'Inicia sesión para dejar tu reseña.' };
  }

  const db = requireDb();
  const slug = String(formData.get('slug') ?? '');

  const vendedor = await perfilPublicoPorSlug(db, slug);
  if (!vendedor) return { ok: false, mensaje: 'Esa tienda no existe.' };

  const nombre = (await getNombreUsuario()) ?? 'Alguien de la comunidad';

  const resultado = await dejarResena(db, {
    exhibitorId: vendedor.id,
    autorClerkUserId: clerkUserId,
    autorNombre: nombre,
    estrellas: Number(formData.get('estrellas')),
    comentario: String(formData.get('comentario') ?? ''),
  });

  revalidatePath(`/tienda/${slug}`);

  if (resultado.ok) return { ok: true, mensaje: '¡Gracias! Tu reseña ya está publicada.' };

  const mensajes: Record<typeof resultado.motivo, string> = {
    'ya-opinaste': 'Ya dejaste tu reseña a esta tienda.',
    'eres-tu': 'No puedes reseñar tu propia tienda.',
    'estrellas-invalidas': 'Elige de una a cinco estrellas.',
  };
  return { ok: false, mensaje: mensajes[resultado.motivo] };
}
