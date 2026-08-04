'use server';

import { revalidatePath } from 'next/cache';
import { requireDb } from '@/db';
import { getNombreUsuario, getUsuarioId } from '@/lib/auth';
import { cancelarInscripcion, inscribirse } from '@/lib/actividades';

/**
 * Inscripción a las actividades de la feria.
 *
 * Como el resto de acciones del proyecto: quién es se resuelve desde la sesión
 * de Clerk, nunca desde el formulario. Una Server Action es un endpoint público
 * al que se puede llamar directo, así que un `clerkUserId` que llegue por el
 * cuerpo de la petición no vale nada.
 */

export type ResultadoInscripcionAccion = { ok: boolean; mensaje: string };

export async function inscribirseAction(activityId: string): Promise<ResultadoInscripcionAccion> {
  const clerkUserId = await getUsuarioId();
  if (!clerkUserId) {
    return { ok: false, mensaje: 'Entra con tu cuenta para poder inscribirte.' };
  }

  const db = requireDb();

  /*
   * El nombre se toma de la cuenta y no de un campo del formulario, por lo
   * mismo que en las reseñas: la lista de inscritos la va a leer alguien del
   * equipo en la puerta para dejar pasar, y un nombre escrito a mano no sirve
   * para identificar a nadie.
   */
  const displayName = (await getNombreUsuario()) ?? 'Sin nombre';

  const resultado = await inscribirse(db, { activityId, clerkUserId, displayName });
  revalidatePath('/evento');

  if (resultado.ok) return { ok: true, mensaje: '¡Listo! Ya tienes tu cupo.' };

  const mensajes: Record<typeof resultado.motivo, string> = {
    'no-existe': 'Esa actividad ya no está disponible.',
    'sin-cupos': 'Se acabaron los cupos mientras te inscribías.',
    'ya-inscrito': 'Ya estabas inscrito en esta actividad.',
  };

  return { ok: false, mensaje: mensajes[resultado.motivo] };
}

export async function cancelarInscripcionAction(
  activityId: string,
): Promise<ResultadoInscripcionAccion> {
  const clerkUserId = await getUsuarioId();
  if (!clerkUserId) return { ok: false, mensaje: 'Entra con tu cuenta.' };

  const hecho = await cancelarInscripcion(requireDb(), { activityId, clerkUserId });
  revalidatePath('/evento');

  return hecho
    ? { ok: true, mensaje: 'Tu cupo quedó libre para otra persona.' }
    : { ok: false, mensaje: 'No estabas inscrito en esa actividad.' };
}
