'use server';

import { revalidatePath } from 'next/cache';
import { requireDb } from '@/db';
import { esStaff, getUsuarioId } from '@/lib/auth';
import { marcarVerificado } from '@/lib/perfiles';
import { cancelarReserva, confirmarPago } from '@/lib/reservas';

/**
 * Acciones del panel de administración.
 *
 * Cada una vuelve a comprobar que quien la ejecuta es staff: el middleware sólo
 * garantiza que hay sesión, y una Server Action es un endpoint público al que
 * se puede llamar directamente.
 */

export type ResultadoAccion = { ok: boolean; mensaje: string };

async function exigirStaff(): Promise<string> {
  const [staff, userId] = await Promise.all([esStaff(), getUsuarioId()]);
  if (!staff || !userId) {
    throw new Error('No autorizado');
  }
  return userId;
}

/** Da por buena la transferencia: la mesa pasa a ser del expositor. */
export async function confirmarPagoAction(reservationId: string): Promise<ResultadoAccion> {
  const staffUserId = await exigirStaff();
  const db = requireDb();

  const hecho = await confirmarPago(db, { reservationId, staffUserId });
  revalidatePath('/admin');
  revalidatePath('/evento');

  return hecho
    ? { ok: true, mensaje: 'Pago confirmado. La mesa quedó asignada.' }
    : { ok: false, mensaje: 'Esa reserva ya no estaba pendiente.' };
}

/** Rechaza la transferencia y devuelve la mesa al mapa. */
export async function rechazarPagoAction(
  reservationId: string,
  motivo: string,
): Promise<ResultadoAccion> {
  await exigirStaff();
  const db = requireDb();

  const hecho = await cancelarReserva(db, {
    reservationId,
    motivo: motivo.trim() || 'Sin motivo indicado',
  });
  revalidatePath('/admin');
  revalidatePath('/evento');

  return hecho
    ? { ok: true, mensaje: 'Reserva cancelada. La mesa volvió a estar disponible.' }
    : { ok: false, mensaje: 'Esa reserva ya no estaba activa.' };
}

/** Otorga la insignia de verificado tras revisar el perfil del expositor. */
export async function verificarPerfilAction(exhibitorId: string): Promise<ResultadoAccion> {
  await exigirStaff();
  const db = requireDb();

  const hecho = await marcarVerificado(db, { exhibitorId, verified: true });
  revalidatePath('/admin');
  revalidatePath('/evento');

  return hecho
    ? { ok: true, mensaje: 'Perfil verificado.' }
    : { ok: false, mensaje: 'No se encontró ese perfil.' };
}
