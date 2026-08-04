import { and, count, eq, inArray } from 'drizzle-orm';
import { getDb, type YucaDb } from '@/db';
import { activities, activityRegistrations } from '@/db/schema';
import { actividades as actividadesMock } from '@/lib/data/actividades';
import { edicionActual } from '@/lib/data/edicion';
import type { Activity, ActivityKind } from '@/lib/types';

/**
 * Inscripción a las actividades de la feria.
 *
 * Hasta ahora las actividades se enseñaban con cupos de mentira y el botón de
 * "quiero inscribirme" no hacía nada: las inscripciones se llevaban por
 * Instagram a mano. La tabla `activity_registrations` existía desde el primer
 * esquema y nadie escribía en ella.
 *
 * **El cupo es el mismo problema que una mesa**: dos personas pidiendo la
 * última plaza a la vez. Se resuelve igual que en `lib/reservas.ts`, que ya
 * está probado — dentro de una transacción y bloqueando la fila de la
 * actividad—, y no leyendo el contador antes de escribir, que es justo lo que
 * deja pasar a las dos.
 */

export type ResultadoInscripcion =
  | { ok: true }
  | { ok: false; motivo: 'no-existe' | 'sin-cupos' | 'ya-inscrito' };

/**
 * Las actividades de la edición, con cuánta gente hay inscrita de verdad.
 *
 * El conteo se hace aquí y no se guarda en una columna: un contador duplicado
 * es un contador que algún día no coincide con las filas que dice contar, y
 * son cuatro actividades, no cuarenta mil.
 */
export async function actividadesDesdeBase(db: YucaDb, editionId: string): Promise<Activity[]> {
  const filas = await db
    .select()
    .from(activities)
    .where(eq(activities.editionId, editionId))
    .orderBy(activities.title);

  if (filas.length === 0) return [];

  const inscritos = await db
    .select({ activityId: activityRegistrations.activityId, cuantos: count() })
    .from(activityRegistrations)
    .where(
      inArray(
        activityRegistrations.activityId,
        filas.map((fila) => fila.id),
      ),
    )
    .groupBy(activityRegistrations.activityId);

  const porActividad = new Map(inscritos.map((fila) => [fila.activityId, fila.cuantos]));

  return filas.map((fila) => ({
    id: fila.id,
    slug: fila.slug,
    title: fila.title,
    kind: fila.kind as ActivityKind,
    description: fila.description,
    banner: fila.bannerUrl,
    conditions: fila.conditions,
    capacity: fila.capacity,
    enrolled: porActividad.get(fila.id) ?? 0,
    schedule: fila.schedule,
    location: fila.location,
  }));
}

/**
 * Apunta a alguien a una actividad, si queda sitio.
 *
 * Los dos "no" posibles los impone la base, no una comprobación previa:
 *
 * - **Dos veces la misma persona** lo impide el índice único
 *   `activity_registrations_unica_key`. Aquí sólo se traduce el error.
 * - **Más gente que cupos** no se puede imponer con un índice —es un conteo, no
 *   un valor repetido—, así que se bloquea la fila de la actividad con
 *   `for update` y se cuenta dentro de la transacción. Dos peticiones
 *   simultáneas por la última plaza se ponen en fila y sólo entra la primera.
 */
export async function inscribirse(
  db: YucaDb,
  params: { activityId: string; clerkUserId: string; displayName: string },
): Promise<ResultadoInscripcion> {
  return db.transaction(async (tx) => {
    const [actividad] = await tx
      .select({ id: activities.id, capacity: activities.capacity })
      .from(activities)
      .where(eq(activities.id, params.activityId))
      .for('update')
      .limit(1);

    if (!actividad) return { ok: false, motivo: 'no-existe' };

    // Sin límite no hay nada que contar: entra quien quiera.
    if (actividad.capacity !== null) {
      const [{ cuantos }] = await tx
        .select({ cuantos: count() })
        .from(activityRegistrations)
        .where(eq(activityRegistrations.activityId, actividad.id));

      if (cuantos >= actividad.capacity) return { ok: false, motivo: 'sin-cupos' };
    }

    /*
     * `onConflictDoNothing` en vez de leer antes: si esta misma persona ya
     * estaba apuntada, el índice único lo detiene y no hace falta preguntarlo
     * en una consulta aparte que además podría quedarse vieja.
     */
    const filas = await tx
      .insert(activityRegistrations)
      .values({
        activityId: actividad.id,
        clerkUserId: params.clerkUserId,
        displayName: params.displayName,
      })
      .onConflictDoNothing()
      .returning({ id: activityRegistrations.id });

    return filas.length > 0 ? { ok: true } : { ok: false, motivo: 'ya-inscrito' };
  });
}

/**
 * Da de baja una inscripción y libera el cupo.
 *
 * Se borra la fila en vez de marcarla: una inscripción cancelada no es
 * historial que nadie vaya a consultar, y dejarla obligaría a excluirla en cada
 * conteo de cupos —que es exactamente donde un olvido se paga caro—.
 */
export async function cancelarInscripcion(
  db: YucaDb,
  params: { activityId: string; clerkUserId: string },
): Promise<boolean> {
  const filas = await db
    .delete(activityRegistrations)
    .where(
      and(
        eq(activityRegistrations.activityId, params.activityId),
        eq(activityRegistrations.clerkUserId, params.clerkUserId),
      ),
    )
    .returning({ id: activityRegistrations.id });

  return filas.length > 0;
}

/** A qué actividades de la edición está apuntada esta persona. */
export async function inscripcionesDe(
  db: YucaDb,
  params: { clerkUserId: string; editionId: string },
): Promise<string[]> {
  const filas = await db
    .select({ activityId: activityRegistrations.activityId })
    .from(activityRegistrations)
    .innerJoin(activities, eq(activityRegistrations.activityId, activities.id))
    .where(
      and(
        eq(activityRegistrations.clerkUserId, params.clerkUserId),
        eq(activities.editionId, params.editionId),
      ),
    );

  return filas.map((fila) => fila.activityId);
}

export interface VistaActividades {
  actividades: Activity[];
  /** `demostracion` = datos de `lib/data/`, sin base detrás: no se puede inscribir. */
  origen: 'base' | 'demostracion';
}

/**
 * Lo que necesita la pestaña de actividades.
 *
 * Mismo criterio que `vistaFeria`: sin base configurada —o con la base sin
 * sembrar— se enseñan las de demostración, porque un clon recién bajado tiene
 * que poder verse. Lo que cambia es que ahí el botón de inscribirse no se
 * ofrece: apuntarse a una actividad que no existe en ninguna base sería mentir.
 */
export async function vistaActividades(editionId = edicionActual.id): Promise<VistaActividades> {
  const db = getDb();
  if (!db) return { actividades: actividadesMock, origen: 'demostracion' };

  const actividades = await actividadesDesdeBase(db, editionId);
  if (actividades.length === 0) return { actividades: actividadesMock, origen: 'demostracion' };

  return { actividades, origen: 'base' };
}
