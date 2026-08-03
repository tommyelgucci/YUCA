import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import type { YucaDb } from '@/db';
import { editions, espacios, exhibitors, reservations, standCompanions, stands } from '@/db/schema';
import { esViolacionUnica } from '@/lib/db-errores';
import type { StandKind } from '@/lib/types';

/**
 * Reservas de mesa.
 *
 * Con pago manual por transferencia pasan horas o días entre que alguien elige
 * la mesa y el staff confirma el comprobante. Toda la lógica de esa ventana
 * vive aquí.
 *
 * La regla "una mesa, una reserva viva" NO se comprueba leyendo antes de
 * escribir —eso deja una carrera entre la lectura y la inserción— sino con un
 * índice único parcial en la base. Aquí sólo se traduce el error de unicidad a
 * un resultado que la interfaz pueda explicar.
 */

export type ResultadoReserva =
  | { ok: true; reservationId: string; expiresAt: Date }
  | {
      ok: false;
      motivo: 'stand-inexistente' | 'stand-no-disponible' | 'ya-reservada' | 'ya-tienes-mesa';
    };

/**
 * Aparta una mesa para un expositor y abre el plazo de pago.
 *
 * La reserva nace `pendiente`: la mesa deja de estar disponible pero todavía no
 * es de nadie hasta que el staff confirme la transferencia.
 */
export async function reservarStand(
  db: YucaDb,
  params: {
    editionId: string;
    standCode: string;
    exhibitorId: string;
    /** Tanda vigente e importe que rige en ella; se congelan en la reserva. */
    preventaId: string;
    amountBob: number;
    /**
     * Versión del reglamento que aceptó. Es obligatoria en la firma porque la
     * columna es `not null`: no hay reserva sin constancia de qué aceptó.
     * Que sea la versión *vigente* lo comprueba quien llama, que es quien tiene
     * delante el texto que se le mostró.
     */
    termsVersion: string;
  },
): Promise<ResultadoReserva> {
  const { editionId, standCode, exhibitorId, preventaId, amountBob, termsVersion } = params;

  try {
    return await db.transaction(async (tx) => {
      const [stand] = await tx
        .select({ id: stands.id, status: stands.status })
        .from(stands)
        .where(and(eq(stands.editionId, editionId), eq(stands.code, standCode)))
        .limit(1);

      if (!stand) return { ok: false, motivo: 'stand-inexistente' } as const;
      if (stand.status !== 'disponible') {
        return { ok: false, motivo: 'stand-no-disponible' } as const;
      }

      const [edicion] = await tx
        .select({ ttl: editions.reservationTtlMinutes })
        .from(editions)
        .where(eq(editions.id, editionId))
        .limit(1);

      const expiresAt = new Date(Date.now() + (edicion?.ttl ?? 2880) * 60_000);

      const [reserva] = await tx
        .insert(reservations)
        .values({
          standId: stand.id,
          exhibitorId,
          preventaId,
          amountBob,
          termsVersion,
          termsAcceptedAt: new Date(),
          expiresAt,
        })
        .returning({ id: reservations.id });

      await tx.update(stands).set({ status: 'reservado' }).where(eq(stands.id, stand.id));

      return { ok: true, reservationId: reserva.id, expiresAt } as const;
    });
  } catch (error) {
    // Dos peticiones simultáneas por la misma mesa: la base rechaza la segunda.
    if (esViolacionUnica(error, 'reservations_stand_activa_key')) {
      return { ok: false, motivo: 'ya-reservada' };
    }
    if (esViolacionUnica(error, 'reservations_exhibitor_activa_key')) {
      return { ok: false, motivo: 'ya-tienes-mesa' };
    }
    throw error;
  }
}

/** El expositor declara la referencia de su transferencia. */
export async function registrarComprobante(
  db: YucaDb,
  params: { reservationId: string; proofReference: string; proofUrl?: string },
): Promise<boolean> {
  const filas = await db
    .update(reservations)
    .set({ proofReference: params.proofReference, proofUrl: params.proofUrl })
    .where(
      and(eq(reservations.id, params.reservationId), eq(reservations.status, 'pendiente')),
    )
    .returning({ id: reservations.id });

  return filas.length > 0;
}

/**
 * El staff valida la transferencia: la mesa pasa a ser del expositor.
 * Queda registrado quién confirmó, para poder auditarlo después.
 */
export async function confirmarPago(
  db: YucaDb,
  params: { reservationId: string; staffUserId: string },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [reserva] = await tx
      .update(reservations)
      .set({
        status: 'confirmada',
        confirmedBy: params.staffUserId,
        confirmedAt: new Date(),
      })
      .where(
        and(eq(reservations.id, params.reservationId), eq(reservations.status, 'pendiente')),
      )
      .returning({ standId: reservations.standId });

    if (!reserva) return false;

    await tx.update(stands).set({ status: 'ocupado' }).where(eq(stands.id, reserva.standId));
    return true;
  });
}

/** El staff rechaza el pago o el expositor cancela: la mesa vuelve a estar libre. */
export async function cancelarReserva(
  db: YucaDb,
  params: { reservationId: string; motivo: string },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [reserva] = await tx
      .update(reservations)
      .set({ status: 'cancelada', cancelledReason: params.motivo })
      .where(
        and(
          eq(reservations.id, params.reservationId),
          inArray(reservations.status, ['pendiente', 'confirmada']),
        ),
      )
      .returning({ standId: reservations.standId });

    if (!reserva) return false;

    await tx.update(stands).set({ status: 'disponible' }).where(eq(stands.id, reserva.standId));
    return true;
  });
}

/**
 * Libera las mesas cuyo plazo de pago venció.
 *
 * Pensado para ejecutarse periódicamente (cron de Vercel o Supabase). Es
 * idempotente: correrlo de más no rompe nada.
 */
export async function expirarReservasVencidas(db: YucaDb, ahora = new Date()): Promise<number> {
  return db.transaction(async (tx) => {
    const vencidas = await tx
      .update(reservations)
      .set({ status: 'expirada' })
      .where(and(eq(reservations.status, 'pendiente'), lt(reservations.expiresAt, ahora)))
      .returning({ standId: reservations.standId });

    if (vencidas.length === 0) return 0;

    await tx
      .update(stands)
      .set({ status: 'disponible' })
      .where(
        inArray(
          stands.id,
          vencidas.map((fila) => fila.standId),
        ),
      );

    return vencidas.length;
  });
}

/* -------------------------------------------------------------------------- */
/* Compañeros de mesa                                                          */
/* -------------------------------------------------------------------------- */

export type ResultadoCompanero =
  | { ok: true; companionId: string }
  | { ok: false; motivo: 'reserva-inactiva' | 'sin-cupo' | 'no-es-tuya' };

/**
 * Suma un acompañante a una mesa.
 *
 * Se permite desde que la mesa está apartada (no hace falta esperar a que el
 * staff confirme el pago), porque los artistas suelen cerrar con quién la
 * comparten antes de transferir. Si la reserva se cae, los acompañantes se van
 * con ella: cuelgan de la reserva, no de la mesa.
 *
 * `exhibitorId` es quien dice ser el titular; se comprueba contra la reserva
 * para que nadie sume gente a la mesa de otro.
 */
export async function agregarCompanero(
  db: YucaDb,
  params: {
    reservationId: string;
    exhibitorId: string;
    displayName: string;
    instagram?: string;
    contacto?: string;
  },
): Promise<ResultadoCompanero> {
  return db.transaction(async (tx) => {
    const [reserva] = await tx
      .select({
        exhibitorId: reservations.exhibitorId,
        status: reservations.status,
        maxCompaneros: stands.maxCompaneros,
      })
      .from(reservations)
      .innerJoin(stands, eq(reservations.standId, stands.id))
      .where(eq(reservations.id, params.reservationId))
      .limit(1);

    if (!reserva) return { ok: false, motivo: 'reserva-inactiva' } as const;
    if (reserva.exhibitorId !== params.exhibitorId) {
      return { ok: false, motivo: 'no-es-tuya' } as const;
    }
    if (reserva.status !== 'pendiente' && reserva.status !== 'confirmada') {
      return { ok: false, motivo: 'reserva-inactiva' } as const;
    }

    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(standCompanions)
      .where(eq(standCompanions.reservationId, params.reservationId));

    if (total >= reserva.maxCompaneros) {
      return { ok: false, motivo: 'sin-cupo' } as const;
    }

    const [companero] = await tx
      .insert(standCompanions)
      .values({
        reservationId: params.reservationId,
        displayName: params.displayName.trim(),
        instagram: params.instagram,
        contacto: params.contacto,
      })
      .returning({ id: standCompanions.id });

    return { ok: true, companionId: companero.id } as const;
  });
}

/** Quita un acompañante; sólo el titular de la reserva puede hacerlo. */
export async function quitarCompanero(
  db: YucaDb,
  params: { companionId: string; exhibitorId: string },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [fila] = await tx
      .select({ titular: reservations.exhibitorId })
      .from(standCompanions)
      .innerJoin(reservations, eq(standCompanions.reservationId, reservations.id))
      .where(eq(standCompanions.id, params.companionId))
      .limit(1);

    if (!fila || fila.titular !== params.exhibitorId) return false;

    await tx.delete(standCompanions).where(eq(standCompanions.id, params.companionId));
    return true;
  });
}

export async function companerosDe(db: YucaDb, reservationId: string) {
  return db
    .select({
      id: standCompanions.id,
      displayName: standCompanions.displayName,
      instagram: standCompanions.instagram,
    })
    .from(standCompanions)
    .where(eq(standCompanions.reservationId, reservationId));
}

/* -------------------------------------------------------------------------- */
/* Consultas del panel                                                         */
/* -------------------------------------------------------------------------- */

/** Cola de pagos por revisar, de la más antigua a la más reciente. */
export async function reservasPendientes(db: YucaDb, editionId: string) {
  return db
    .select({
      reservationId: reservations.id,
      standCode: stands.code,
      amountBob: reservations.amountBob,
      proofReference: reservations.proofReference,
      createdAt: reservations.createdAt,
      expiresAt: reservations.expiresAt,
      termsVersion: reservations.termsVersion,
      termsAcceptedAt: reservations.termsAcceptedAt,
      exhibitorName: exhibitors.displayName,
      exhibitorSlug: exhibitors.slug,
    })
    .from(reservations)
    .innerJoin(stands, eq(reservations.standId, stands.id))
    .innerJoin(exhibitors, eq(reservations.exhibitorId, exhibitors.id))
    .where(and(eq(reservations.status, 'pendiente'), eq(stands.editionId, editionId)))
    .orderBy(sql`${reservations.createdAt} asc`);
}

/* -------------------------------------------------------------------------- */
/* Consultas de "mi cuenta"                                                    */
/* -------------------------------------------------------------------------- */

/** Mesas libres de la edición, para que el expositor elija una. */
export async function standsDisponibles(db: YucaDb, editionId: string) {
  return db
    .select({
      code: stands.code,
      numero: stands.numero,
      kind: stands.kind,
      espacioNombre: espacios.name,
    })
    .from(stands)
    .innerJoin(espacios, eq(stands.espacioId, espacios.id))
    .where(and(eq(stands.editionId, editionId), eq(stands.status, 'disponible')))
    .orderBy(stands.kind, stands.numero);
}

/**
 * Tipo real de una mesa, leído de la base.
 *
 * El precio depende del tipo (`lib/data/preventas.ts`); se resuelve aquí y no
 * con lo que mande el cliente, porque el código de la mesa es lo único que
 * hace falta para que el importe no se pueda manipular desde el formulario.
 */
export async function kindDeStand(
  db: YucaDb,
  params: { editionId: string; standCode: string },
): Promise<StandKind | null> {
  const [stand] = await db
    .select({ kind: stands.kind })
    .from(stands)
    .where(and(eq(stands.editionId, params.editionId), eq(stands.code, params.standCode)))
    .limit(1);

  return stand?.kind ?? null;
}

/** La reserva viva (pendiente o confirmada) de un expositor, si tiene una. */
export async function reservaActivaDe(db: YucaDb, exhibitorId: string) {
  const [reserva] = await db
    .select({
      id: reservations.id,
      status: reservations.status,
      amountBob: reservations.amountBob,
      proofReference: reservations.proofReference,
      expiresAt: reservations.expiresAt,
      standCode: stands.code,
      standNumero: stands.numero,
      standKind: stands.kind,
      maxCompaneros: stands.maxCompaneros,
    })
    .from(reservations)
    .innerJoin(stands, eq(reservations.standId, stands.id))
    .where(
      and(
        eq(reservations.exhibitorId, exhibitorId),
        inArray(reservations.status, ['pendiente', 'confirmada']),
      ),
    )
    .limit(1);

  if (!reserva) return null;

  // El filtro de arriba ya garantiza uno de estos dos valores; sólo hace
  // falta decírselo a TypeScript, que ve el enum completo de la columna.
  return { ...reserva, status: reserva.status as 'pendiente' | 'confirmada' };
}
