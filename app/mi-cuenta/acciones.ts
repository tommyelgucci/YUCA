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
import { REGLAMENTO, esVersionVigente } from '@/lib/data/reglamento';
import { esAudiencia, type ArtCategory } from '@/lib/types';
import { puedeSerExpositor, situacionEdad } from '@/lib/edad';

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
  const audience = formData.get('audience');
  const bio = String(formData.get('bio') ?? '').trim();
  const categories = formData.getAll('categories').map(String) as ArtCategory[];
  const instagram = String(formData.get('instagram') ?? '').trim();
  const tiktok = String(formData.get('tiktok') ?? '').trim();
  const facebook = String(formData.get('facebook') ?? '').trim();
  const web = String(formData.get('web') ?? '').trim();

  if (!displayName) return { ok: false, mensaje: 'Escribe tu nombre o el de tu marca.' };
  if (!esAudiencia(audience)) {
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
  const audience = formData.get('audience');
  const bio = String(formData.get('bio') ?? '').trim();
  const categories = formData.getAll('categories').map(String) as ArtCategory[];

  if (!displayName) return { ok: false, mensaje: 'Escribe tu nombre o el de tu marca.' };
  if (!esAudiencia(audience)) {
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
  if (birthDate && situacionEdad(birthDate) === 'sin-fecha') {
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
    guardianName: String(formData.get('guardianName') ?? '').trim(),
    guardianContact: String(formData.get('guardianContact') ?? '').trim(),
    declaraPermiso: formData.get('declaraPermiso') === 'on',
  });

  revalidatePath('/mi-cuenta');

  if (!hecho) return { ok: false, mensaje: 'No se pudieron guardar tus datos.' };

  // Se guarda igual y se avisa después: negarse a registrar la fecha dejaría a
  // la organización sin saber que esa persona no puede tener mesa.
  const situacion = situacionEdad(birthDate);
  if (situacion === 'menor') {
    return {
      ok: true,
      mensaje: 'Datos guardados, pero para tener mesa hay que tener 17 años cumplidos.',
    };
  }
  if (situacion === 'requiere-permiso') {
    return {
      ok: true,
      mensaje: 'Datos guardados. Al ser menor de 19 necesitas el permiso de tu tutor para apartar mesa.',
    };
  }

  return { ok: true, mensaje: 'Datos guardados. Sólo los ve el equipo.' };
}

/** Traducción de por qué la edad impide apartar mesa. */
const MOTIVO_EDAD: Record<string, string> = {
  'sin-fecha': 'Antes de apartar mesa carga tu fecha de nacimiento en información personal.',
  menor: 'Para tener mesa hay que tener 17 años cumplidos.',
  'sin-permiso':
    'Al tener 17 o 18 necesitas el permiso de tu tutor: cárgalo en información personal.',
};

/* -------------------------------------------------------------------------- */
/* Mesa y pago                                                                 */
/* -------------------------------------------------------------------------- */

export async function reservarMesaAction(
  standCode: string,
  /** Versión del reglamento que la persona tuvo delante al marcar la casilla. */
  versionReglas: string,
): Promise<ResultadoAccion> {
  const clerkUserId = await exigirSesion();
  const db = requireDb();

  const perfil = await perfilPorClerkId(db, clerkUserId);
  if (!perfil) return { ok: false, mensaje: 'Primero completa tu perfil de expositor.' };

  // El control de edad se impone aquí, que es donde alguien pasa a ocupar una
  // mesa de verdad. Esconder el selector en la interfaz no basta: esta acción
  // es un endpoint público al que se puede llamar directo.
  const edad = puedeSerExpositor(perfil);
  if (!edad.ok) return { ok: false, mensaje: MOTIVO_EDAD[edad.motivo] };

  // Mismo motivo: la casilla del formulario no defiende nada por sí sola. Y se
  // exige la versión vigente, no una cualquiera, para que no valga la de hace
  // dos reglamentos.
  if (!esVersionVigente(versionReglas)) {
    return {
      ok: false,
      mensaje: versionReglas
        ? 'Las reglas cambiaron mientras leías. Recarga la página y acéptalas de nuevo.'
        : 'Antes de apartar mesa tienes que aceptar las reglas para expositores.',
    };
  }

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
    termsVersion: REGLAMENTO.version,
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
  // Se acepta pegado el enlace del perfil, que es lo que la gente tiene a mano:
  // de "proyectoyuca.bo/artistas/lunaria" nos quedamos con "lunaria".
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .replace(/\/+$/, '')
    .split('/')
    .pop()!;

  if (!slug) return { ok: false, mensaje: 'Escribe el usuario de tu acompañante.' };

  const resultado = await agregarCompanero(db, {
    reservationId,
    exhibitorId: perfil.id,
    slug,
  });

  revalidatePath('/mi-cuenta');

  if (resultado.ok) return { ok: true, mensaje: `${resultado.displayName} ya comparte tu mesa.` };

  const mensajes: Record<typeof resultado.motivo, string> = {
    'reserva-inactiva': 'Tu reserva ya no está activa.',
    'sin-cupo': 'Esa mesa ya no tiene cupo para más acompañantes.',
    'no-es-tuya': 'Esa reserva no es tuya.',
    'no-existe': `No encontramos a nadie con el usuario "${slug}". Pídele el enlace de su perfil.`,
    'sin-verificar':
      'Esa persona todavía no está verificada por el equipo. En cuanto lo esté, podrás sumarla.',
    'eres-tu': 'Ese eres tú: el acompañante es la otra persona.',
    'tiene-mesa': 'Esa persona ya tiene su propia mesa en esta edición.',
    'ya-comparte': 'Esa persona ya está compartiendo otra mesa.',
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
