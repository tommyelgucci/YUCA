'use server';

import { revalidatePath } from 'next/cache';
import { requireDb } from '@/db';
import { getUsuarioId } from '@/lib/auth';
import {
  actualizarDatosPrivados,
  actualizarPerfilPublico,
  crearPerfil,
  perfilPorClerkId,
} from '@/lib/perfiles';
import {
  agregarCompanero,
  cancelarReserva,
  kindDeStand,
  quitarCompanero,
  registrarComprobante,
  reservaActivaDe,
  reservarStand,
} from '@/lib/reservas';
import { edicionActual } from '@/lib/data/edicion';
import { precioActual, preventaVigente } from '@/lib/data/preventas';
import type { ArtCategory, ConvocatoriaAudience } from '@/lib/types';

/**
 * Acciones de "mi cuenta".
 *
 * Cada una vuelve a resolver el perfil a partir de la sesión de Clerk: nunca
 * se confía en un `exhibitorId` que mande el formulario, porque una Server
 * Action es un endpoint público al que se puede llamar directo.
 */

export type ResultadoAccion = { ok: boolean; mensaje: string };

async function exigirSesion(): Promise<string> {
  const userId = await getUsuarioId();
  if (!userId) throw new Error('No autorizado');
  return userId;
}

/** Límite del comprobante en bruto; de sobra para una captura de pantalla. */
const MAX_COMPROBANTE_BYTES = 4 * 1024 * 1024;

/* -------------------------------------------------------------------------- */
/* Perfil                                                                      */
/* -------------------------------------------------------------------------- */

export async function crearPerfilAction(formData: FormData): Promise<ResultadoAccion> {
  const clerkUserId = await exigirSesion();
  const db = requireDb();

  const displayName = String(formData.get('displayName') ?? '').trim();
  const audience = String(formData.get('audience') ?? '') as ConvocatoriaAudience;
  const bio = String(formData.get('bio') ?? '').trim();
  const categories = formData.getAll('categories').map(String) as ArtCategory[];
  const instagram = String(formData.get('instagram') ?? '').trim();
  const tiktok = String(formData.get('tiktok') ?? '').trim();
  const facebook = String(formData.get('facebook') ?? '').trim();
  const web = String(formData.get('web') ?? '').trim();

  if (!displayName) return { ok: false, mensaje: 'Escribe tu nombre o el de tu marca.' };
  if (!['artistas', 'comidas', 'emprendimientos'].includes(audience)) {
    return { ok: false, mensaje: 'Elige a qué público perteneces.' };
  }

  const resultado = await crearPerfil(db, {
    clerkUserId,
    displayName,
    audience,
    categories: audience === 'artistas' ? categories : [],
    bio,
    instagram,
    tiktok,
    facebook,
    web,
  });

  revalidatePath('/mi-cuenta');

  return resultado.ok
    ? { ok: true, mensaje: 'Perfil creado. Ya puedes elegir tu mesa.' }
    : { ok: false, mensaje: 'Ya tienes un perfil de expositor con esta cuenta.' };
}

export async function actualizarPerfilAction(formData: FormData): Promise<ResultadoAccion> {
  const clerkUserId = await exigirSesion();
  const db = requireDb();

  const perfil = await perfilPorClerkId(db, clerkUserId);
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const displayName = String(formData.get('displayName') ?? '').trim();
  const audience = String(formData.get('audience') ?? '') as ConvocatoriaAudience;
  const bio = String(formData.get('bio') ?? '').trim();
  const categories = formData.getAll('categories').map(String) as ArtCategory[];

  if (!displayName) return { ok: false, mensaje: 'Escribe tu nombre o el de tu marca.' };
  if (!['artistas', 'comidas', 'emprendimientos'].includes(audience)) {
    return { ok: false, mensaje: 'Elige a qué público perteneces.' };
  }

  const hecho = await actualizarPerfilPublico(db, {
    exhibitorId: perfil.id,
    displayName,
    audience,
    categories: audience === 'artistas' ? categories : [],
    bio,
    instagram: String(formData.get('instagram') ?? '').trim(),
    tiktok: String(formData.get('tiktok') ?? '').trim(),
    facebook: String(formData.get('facebook') ?? '').trim(),
    web: String(formData.get('web') ?? '').trim(),
  });

  revalidatePath('/mi-cuenta');
  revalidatePath(`/artistas/${perfil.slug}`);

  return hecho
    ? { ok: true, mensaje: 'Perfil actualizado.' }
    : { ok: false, mensaje: 'No se pudo actualizar tu perfil.' };
}

/**
 * Guarda los datos personales.
 *
 * No valida el formato de nada salvo la fecha: son datos que el equipo lee a
 * ojo para identificar a la persona, no llaves de las que dependa el sistema,
 * y rechazar un teléfono por su formato sólo estorbaría.
 */
export async function actualizarDatosPrivadosAction(
  formData: FormData,
): Promise<ResultadoAccion> {
  const clerkUserId = await exigirSesion();
  const db = requireDb();

  const perfil = await perfilPorClerkId(db, clerkUserId);
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const birthDate = String(formData.get('birthDate') ?? '').trim();
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { ok: false, mensaje: 'La fecha de nacimiento no es válida.' };
  }

  const hecho = await actualizarDatosPrivados(db, {
    exhibitorId: perfil.id,
    fullName: String(formData.get('fullName') ?? '').trim(),
    birthDate,
    contactEmail: String(formData.get('contactEmail') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    gender: String(formData.get('gender') ?? '').trim(),
    department: String(formData.get('department') ?? '').trim(),
  });

  revalidatePath('/mi-cuenta');

  return hecho
    ? { ok: true, mensaje: 'Datos guardados. Sólo los ve el equipo.' }
    : { ok: false, mensaje: 'No se pudieron guardar tus datos.' };
}

/* -------------------------------------------------------------------------- */
/* Mesa y pago                                                                 */
/* -------------------------------------------------------------------------- */

export async function reservarMesaAction(standCode: string): Promise<ResultadoAccion> {
  const clerkUserId = await exigirSesion();
  const db = requireDb();

  const perfil = await perfilPorClerkId(db, clerkUserId);
  if (!perfil) return { ok: false, mensaje: 'Primero completa tu perfil de expositor.' };

  const kind = await kindDeStand(db, { editionId: edicionActual.id, standCode });
  if (!kind) return { ok: false, mensaje: 'Esa mesa ya no existe.' };

  const amountBob = precioActual(kind);
  if (amountBob === null || !preventaVigente) {
    return { ok: false, mensaje: 'No hay una preventa abierta para este tipo de mesa.' };
  }

  const resultado = await reservarStand(db, {
    editionId: edicionActual.id,
    standCode,
    exhibitorId: perfil.id,
    preventaId: preventaVigente.id,
    amountBob,
  });

  revalidatePath('/mi-cuenta');

  if (resultado.ok) {
    return { ok: true, mensaje: `Mesa apartada. Tienes hasta ${resultado.expiresAt.toLocaleString('es-BO')} para pagar.` };
  }

  const mensajes: Record<typeof resultado.motivo, string> = {
    'stand-inexistente': 'Esa mesa ya no existe.',
    'stand-no-disponible': 'Alguien más apartó esa mesa justo antes que tú.',
    'ya-reservada': 'Alguien más apartó esa mesa justo antes que tú.',
    'ya-tienes-mesa': 'Ya tienes una mesa apartada.',
  };
  return { ok: false, mensaje: mensajes[resultado.motivo] };
}

export async function declararComprobanteAction(formData: FormData): Promise<ResultadoAccion> {
  const clerkUserId = await exigirSesion();
  const db = requireDb();

  const perfil = await perfilPorClerkId(db, clerkUserId);
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const reserva = await reservaActivaDe(db, perfil.id);
  if (!reserva) return { ok: false, mensaje: 'No tienes una mesa apartada.' };

  const referencia = String(formData.get('referencia') ?? '').trim();
  if (!referencia) return { ok: false, mensaje: 'Escribe el número o la referencia de la transferencia.' };

  const archivo = formData.get('comprobante');
  let proofUrl: string | undefined;

  if (archivo instanceof File && archivo.size > 0) {
    if (!archivo.type.startsWith('image/')) {
      return { ok: false, mensaje: 'El comprobante debe ser una imagen.' };
    }
    if (archivo.size > MAX_COMPROBANTE_BYTES) {
      return { ok: false, mensaje: 'La imagen pesa demasiado; sube una captura de menos de 4 MB.' };
    }
    // Mientras no haya un bucket de almacenamiento (Supabase Storage u otro),
    // la captura se guarda como data URL en la propia fila: evita depender de
    // credenciales externas para algo tan chico como una captura de pantalla.
    const bytes = Buffer.from(await archivo.arrayBuffer());
    proofUrl = `data:${archivo.type};base64,${bytes.toString('base64')}`;
  }

  const hecho = await registrarComprobante(db, {
    reservationId: reserva.id,
    proofReference: referencia,
    proofUrl,
  });

  revalidatePath('/mi-cuenta');

  return hecho
    ? { ok: true, mensaje: 'Comprobante declarado. El staff lo revisará pronto.' }
    : { ok: false, mensaje: 'Esa reserva ya no está pendiente.' };
}

export async function cancelarMiReservaAction(reservationId: string): Promise<ResultadoAccion> {
  const clerkUserId = await exigirSesion();
  const db = requireDb();

  const perfil = await perfilPorClerkId(db, clerkUserId);
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const reserva = await reservaActivaDe(db, perfil.id);
  // Sólo se puede cancelar la propia reserva, y sólo antes de que el staff
  // confirme el pago: una vez confirmada, liberar la mesa pasa por el staff.
  if (!reserva || reserva.id !== reservationId || reserva.status !== 'pendiente') {
    return { ok: false, mensaje: 'No puedes cancelar esa reserva.' };
  }

  const hecho = await cancelarReserva(db, {
    reservationId,
    motivo: 'Cancelada por el expositor',
  });

  revalidatePath('/mi-cuenta');

  return hecho
    ? { ok: true, mensaje: 'Reserva cancelada. Ya puedes elegir otra mesa.' }
    : { ok: false, mensaje: 'Esa reserva ya no estaba activa.' };
}

/* -------------------------------------------------------------------------- */
/* Acompañantes                                                                */
/* -------------------------------------------------------------------------- */

export async function agregarCompaneroAction(formData: FormData): Promise<ResultadoAccion> {
  const clerkUserId = await exigirSesion();
  const db = requireDb();

  const perfil = await perfilPorClerkId(db, clerkUserId);
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const reservationId = String(formData.get('reservationId') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const instagram = String(formData.get('instagram') ?? '').trim();
  const contacto = String(formData.get('contacto') ?? '').trim();

  if (!displayName) return { ok: false, mensaje: 'Escribe el nombre de tu acompañante.' };

  const resultado = await agregarCompanero(db, {
    reservationId,
    exhibitorId: perfil.id,
    displayName,
    instagram: instagram || undefined,
    contacto: contacto || undefined,
  });

  revalidatePath('/mi-cuenta');

  if (resultado.ok) return { ok: true, mensaje: 'Acompañante sumado.' };

  const mensajes: Record<typeof resultado.motivo, string> = {
    'reserva-inactiva': 'Tu reserva ya no está activa.',
    'sin-cupo': 'Esa mesa ya no tiene cupo para más acompañantes.',
    'no-es-tuya': 'Esa reserva no es tuya.',
  };
  return { ok: false, mensaje: mensajes[resultado.motivo] };
}

export async function quitarCompaneroAction(companionId: string): Promise<ResultadoAccion> {
  const clerkUserId = await exigirSesion();
  const db = requireDb();

  const perfil = await perfilPorClerkId(db, clerkUserId);
  if (!perfil) return { ok: false, mensaje: 'No tienes perfil de expositor.' };

  const hecho = await quitarCompanero(db, { companionId, exhibitorId: perfil.id });

  revalidatePath('/mi-cuenta');

  return hecho
    ? { ok: true, mensaje: 'Acompañante quitado.' }
    : { ok: false, mensaje: 'No se pudo quitar a ese acompañante.' };
}
