import { requireDb } from './index';
import * as schema from './schema';
import { edicionActual } from '../lib/data/edicion';
import { druida } from '../lib/data/eventos';
import { espacios, stands as standsMock } from '../lib/data/feria';
import { expositores } from '../lib/data/expositores';
import { actividades } from '../lib/data/actividades';
import { preventaVigente, precioActual } from '../lib/data/preventas';
import type { Edition } from '../lib/types';

/**
 * Siembra la base con los datos de `lib/data/`.
 *
 * Uso: `npm run db:seed` (necesita DATABASE_URL y las migraciones aplicadas).
 * Es destructivo: vacía las tablas antes de escribir, para poder repetirlo
 * mientras se desarrolla.
 */

function filaEdicion(edicion: Edition) {
  return {
    id: edicion.id,
    name: edicion.name,
    startsAt: edicion.startsAt ? new Date(edicion.startsAt) : null,
    endsAt: edicion.endsAt ? new Date(edicion.endsAt) : null,
    dateLabel: edicion.dateLabel,
    venue: edicion.venue,
    address: edicion.address,
    city: edicion.city,
    ticketPriceBob: edicion.ticket.priceBob,
    ticketLabel: edicion.ticket.label,
    standPriceBob: edicion.standPriceBob,
    description: edicion.description,
    hasFeria: edicion.hasFeria,
  };
}

async function seed() {
  const db = requireDb();

  console.log('Vaciando tablas…');
  // El orden importa: primero lo que depende de otras tablas.
  await db.delete(schema.activityRegistrations);
  await db.delete(schema.reservations);
  await db.delete(schema.activities);
  await db.delete(schema.standCompanions);
  await db.delete(schema.stands);
  await db.delete(schema.espacios);
  await db.delete(schema.exhibitors);
  await db.delete(schema.editions);

  console.log('Ediciones…');
  await db.insert(schema.editions).values([filaEdicion(edicionActual), filaEdicion(druida)]);

  console.log('Espacios…');
  const espaciosInsertados = await db
    .insert(schema.espacios)
    .values(
      espacios.map((espacio) => ({
        editionId: edicionActual.id,
        code: espacio.id,
        name: espacio.name,
        description: espacio.description,
      })),
    )
    .returning({ id: schema.espacios.id, code: schema.espacios.code });

  const idPorEspacio = new Map(espaciosInsertados.map((e) => [e.code, e.id]));

  console.log('Expositores…');
  const expositoresInsertados = await db
    .insert(schema.exhibitors)
    .values(
      expositores.map((expositor) => ({
        // Hasta que cada artista cree su cuenta real en Clerk, se usa un id
        // provisional reconocible; el enlace real se hace en el registro.
        clerkUserId: `seed_${expositor.id}`,
        slug: expositor.slug,
        displayName: expositor.displayName,
        audience: expositor.audience,
        categories: expositor.categories,
        verified: expositor.verified,
        avatarUrl: expositor.avatar,
        bio: expositor.bio,
        instagram: expositor.socials.instagram,
        tiktok: expositor.socials.tiktok,
        facebook: expositor.socials.facebook,
        web: expositor.socials.web,
      })),
    )
    .returning({ id: schema.exhibitors.id, slug: schema.exhibitors.slug });

  const idPorExpositor = new Map(expositoresInsertados.map((e) => [e.slug, e.id]));

  console.log('Stands…');
  const standsInsertados = await db
    .insert(schema.stands)
    .values(
      standsMock.map((stand) => ({
        editionId: edicionActual.id,
        espacioId: idPorEspacio.get(stand.espacioId)!,
        code: stand.id,
        numero: stand.numero,
        x: stand.x,
        y: stand.y,
        width: stand.width,
        height: stand.height,
        rotate: stand.rotate,
        status: stand.status,
        kind: stand.kind,
        maxCompaneros: stand.maxCompaneros ?? 1,
        externalName: stand.externalName,
      })),
    )
    .returning({ id: schema.stands.id, code: schema.stands.code });

  const idPorStand = new Map(standsInsertados.map((s) => [s.code, s.id]));

  // Cada mesa ocupada necesita su reserva confirmada detrás: sin ella el estado
  // 'ocupado' no tendría respaldo y el panel de admin mostraría una mesa
  // ocupada por nadie.
  console.log('Reservas de las mesas ocupadas…');
  const reservasConfirmadas = expositores
    .filter((expositor) => expositor.standId && idPorStand.has(expositor.standId))
    .map((expositor) => ({
      standId: idPorStand.get(expositor.standId!)!,
      exhibitorId: idPorExpositor.get(expositor.slug)!,
      status: 'confirmada' as const,
      preventaId: preventaVigente?.id,
      amountBob:
        precioActual(standsMock.find((s) => s.id === expositor.standId)?.kind ?? 'ilustrador') ?? 0,
      proofReference: 'SEED',
      expiresAt: new Date(),
      confirmedBy: 'seed',
      confirmedAt: new Date(),
    }));

  if (reservasConfirmadas.length > 0) {
    await db.insert(schema.reservations).values(reservasConfirmadas);
  }

  console.log('Actividades…');
  await db.insert(schema.activities).values(
    actividades.map((actividad) => ({
      editionId: edicionActual.id,
      slug: actividad.slug,
      title: actividad.title,
      kind: actividad.kind,
      description: actividad.description,
      bannerUrl: actividad.banner,
      conditions: actividad.conditions,
      capacity: actividad.capacity,
      schedule: actividad.schedule,
      location: actividad.location,
    })),
  );

  console.log(
    `Listo: 2 ediciones, ${espacios.length} espacios, ${standsMock.length} mesas, ` +
      `${expositores.length} expositores, ${reservasConfirmadas.length} reservas, ` +
      `${actividades.length} actividades.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Falló el sembrado:', error);
    process.exit(1);
  });
