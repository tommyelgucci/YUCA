import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import type { YucaDb } from '@/db';
import { editions, exhibitors, reservations, stands } from '@/db/schema';

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

/** Código de Postgres para violación de restricción única. */
const UNIQUE_VIOLATION = '23505';

type ErrorPg = {
  code?: string;
  constraint?: string;
  constraint_name?: string;
  detail?: string;
  message?: string;
  cause?: unknown;
};

/**
 * Busca el error real de Postgres dentro de la cadena de causas.
 *
 * Drizzle envuelve el error del driver en uno propio ("Failed query: …"), así
 * que el `code` no está en el error que se recibe sino en su `cause`.
 */
function errorPostgres(error: unknown): ErrorPg | null {
  let actual: unknown = error;

  for (let salto = 0; salto < 5 && actual; salto += 1) {
    const candidato = actual as ErrorPg;
    if (candidato.code === UNIQUE_VIOLATION) return candidato;
    actual = candidato.cause;
  }

  return null;
}

function esViolacionUnica(error: unknown, indice: string): boolean {
  const pg = errorPostgres(error);
  if (!pg) return false;

  // Según el driver el nombre del índice viaja en un campo u otro.
  const pistas = [pg.constraint_name, pg.constraint, pg.detail, pg.message];
  return pistas.some((pista) => typeof pista === 'string' && pista.includes(indice));
}

/**
 * Aparta una mesa para un expositor y abre el plazo de pago.
 *
 * La reserva nace `pendiente`: la mesa deja de estar disponible pero todavía no
 * es de nadie hasta que el staff confirme la transferencia.
 */
export async function reservarStand(
  db: YucaDb,
  params: { editionId: string; standCode: string; exhibitorId: string },
): Promise<ResultadoReserva> {
  const { editionId, standCode, exhibitorId } = params;

  try {
    return await db.transaction(async (tx) => {
      const [stand] = await tx
        .select({ id: stands.id, status: stands.status, priceBob: stands.priceBob })
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
          amountBob: stand.priceBob,
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
      exhibitorName: exhibitors.displayName,
      exhibitorSlug: exhibitors.slug,
    })
    .from(reservations)
    .innerJoin(stands, eq(reservations.standId, stands.id))
    .innerJoin(exhibitors, eq(reservations.exhibitorId, exhibitors.id))
    .where(and(eq(reservations.status, 'pendiente'), eq(stands.editionId, editionId)))
    .orderBy(sql`${reservations.createdAt} asc`);
}
