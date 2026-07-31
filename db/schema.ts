import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Esquema de la base de datos (PostgreSQL / Supabase).
 *
 * Produce exactamente las formas de `lib/types.ts`, que es el contrato con la
 * interfaz. La identidad la lleva Clerk: aquí sólo se guarda `clerkUserId` para
 * enlazar, nunca contraseñas.
 */

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const userRole = pgEnum('user_role', ['asistente', 'expositor', 'staff']);
export const standStatus = pgEnum('stand_status', ['disponible', 'reservado', 'ocupado']);

/** Para qué es la mesa. Dimensión aparte del estado. */
export const standKind = pgEnum('stand_kind', [
  'arte',
  'comida',
  'emprendimiento',
  'organizacion',
]);
export const reservationStatus = pgEnum('reservation_status', [
  'pendiente',
  'confirmada',
  'expirada',
  'cancelada',
]);
export const paymentMethod = pgEnum('payment_method', ['qr']);
export const convocatoriaAudience = pgEnum('convocatoria_audience', [
  'artistas',
  'comidas',
  'emprendimientos',
]);

/* -------------------------------------------------------------------------- */
/* Personas                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Perfil de expositor. Lo crea y edita la propia persona al registrarse;
 * `verified` es lo único que sólo puede tocar el staff.
 */
export const exhibitors = pgTable(
  'exhibitors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Id de Clerk. Único: una cuenta, un perfil de expositor. */
    clerkUserId: text('clerk_user_id').notNull(),
    slug: text('slug').notNull(),
    displayName: text('display_name').notNull(),
    /** Público al que pertenece: artistas, comidas o emprendimientos. */
    audience: convocatoriaAudience('audience').notNull().default('artistas'),
    /** Categorías de arte; texto libre acotado en la interfaz. */
    categories: text('categories').array().notNull().default(sql`ARRAY[]::text[]`),
    verified: boolean('verified').notNull().default(false),
    avatarUrl: text('avatar_url'),
    bio: text('bio').notNull().default(''),
    instagram: text('instagram'),
    tiktok: text('tiktok'),
    facebook: text('facebook'),
    web: text('web'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('exhibitors_clerk_user_id_key').on(table.clerkUserId),
    uniqueIndex('exhibitors_slug_key').on(table.slug),
  ],
);

/* -------------------------------------------------------------------------- */
/* Ediciones y feria                                                           */
/* -------------------------------------------------------------------------- */

export const editions = pgTable('editions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  dateLabel: text('date_label').notNull(),
  venue: text('venue').notNull(),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  ticketPriceBob: integer('ticket_price_bob'),
  ticketLabel: text('ticket_label').notNull().default('Entrada libre'),
  standPriceBob: integer('stand_price_bob').notNull().default(0),
  description: text('description').notNull().default(''),
  hasFeria: boolean('has_feria').notNull().default(false),
  /** Minutos que dura la reserva antes de expirar si no se confirma el pago. */
  reservationTtlMinutes: integer('reservation_ttl_minutes').notNull().default(2880),
});

export const sectors = pgTable(
  'sectors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    kind: standKind('kind').notNull().default('arte'),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
  },
  (table) => [uniqueIndex('sectors_edition_code_key').on(table.editionId, table.code)],
);

export const stands = pgTable(
  'stands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    sectorId: uuid('sector_id')
      .notNull()
      .references(() => sectors.id, { onDelete: 'cascade' }),
    /** Código visible: 'C20'. Único dentro de su edición. */
    code: text('code').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    status: standStatus('status').notNull().default('disponible'),
    kind: standKind('kind').notNull().default('arte'),
    /** Nombre del ocupante cuando es espacio de la organización. */
    externalName: text('external_name'),
    priceBob: integer('price_bob').notNull(),
  },
  (table) => [
    uniqueIndex('stands_edition_code_key').on(table.editionId, table.code),
    index('stands_edition_status_idx').on(table.editionId, table.status),
  ],
);

/* -------------------------------------------------------------------------- */
/* Reservas                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Reserva de mesa.
 *
 * La regla de oro —una mesa no puede tener dos reservas vivas a la vez— la
 * impone la base de datos con un índice único parcial, no el código de la
 * aplicación. Dos peticiones simultáneas para el mismo stand: una entra y la
 * otra recibe un error de unicidad. Sin esto, con pago manual y días de espera,
 * es cuestión de tiempo que dos personas paguen por la misma mesa.
 */
export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    standId: uuid('stand_id')
      .notNull()
      .references(() => stands.id, { onDelete: 'cascade' }),
    exhibitorId: uuid('exhibitor_id')
      .notNull()
      .references(() => exhibitors.id, { onDelete: 'cascade' }),
    status: reservationStatus('status').notNull().default('pendiente'),
    method: paymentMethod('method').notNull().default('qr'),
    amountBob: integer('amount_bob').notNull(),
    /** Referencia de la transferencia que declara el expositor. */
    proofReference: text('proof_reference'),
    /** Captura del comprobante, cuando haya almacenamiento de archivos. */
    proofUrl: text('proof_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Al vencer sin confirmar, la reserva expira y la mesa se libera. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    confirmedBy: text('confirmed_by'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    /** Motivo del rechazo, para poder explicárselo al expositor. */
    cancelledReason: text('cancelled_reason'),
  },
  (table) => [
    // Una sola reserva viva (pendiente o confirmada) por mesa.
    uniqueIndex('reservations_stand_activa_key')
      .on(table.standId)
      .where(sql`${table.status} in ('pendiente', 'confirmada')`),
    // Un expositor no puede tener dos mesas vivas en la misma edición.
    uniqueIndex('reservations_exhibitor_activa_key')
      .on(table.exhibitorId)
      .where(sql`${table.status} in ('pendiente', 'confirmada')`),
    index('reservations_status_idx').on(table.status),
  ],
);

/* -------------------------------------------------------------------------- */
/* Actividades                                                                 */
/* -------------------------------------------------------------------------- */

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    kind: text('kind').notNull(),
    description: text('description').notNull().default(''),
    bannerUrl: text('banner_url'),
    conditions: text('conditions').array().notNull().default(sql`ARRAY[]::text[]`),
    /** `null` = sin límite de cupos. */
    capacity: integer('capacity'),
    schedule: text('schedule').notNull().default(''),
    location: text('location').notNull().default(''),
  },
  (table) => [uniqueIndex('activities_edition_slug_key').on(table.editionId, table.slug)],
);

/**
 * Inscripción a una actividad con cupos.
 *
 * El cupo se controla contando filas dentro de una transacción; la unicidad
 * evita que la misma persona ocupe dos plazas de la misma actividad.
 */
export const activityRegistrations = pgTable(
  'activity_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    activityId: uuid('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    clerkUserId: text('clerk_user_id').notNull(),
    displayName: text('display_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('activity_registrations_unica_key').on(table.activityId, table.clerkUserId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Relaciones                                                                  */
/* -------------------------------------------------------------------------- */

export const editionsRelations = relations(editions, ({ many }) => ({
  sectors: many(sectors),
  stands: many(stands),
  activities: many(activities),
}));

export const sectorsRelations = relations(sectors, ({ one, many }) => ({
  edition: one(editions, { fields: [sectors.editionId], references: [editions.id] }),
  stands: many(stands),
}));

export const standsRelations = relations(stands, ({ one, many }) => ({
  edition: one(editions, { fields: [stands.editionId], references: [editions.id] }),
  sector: one(sectors, { fields: [stands.sectorId], references: [sectors.id] }),
  reservations: many(reservations),
}));

export const exhibitorsRelations = relations(exhibitors, ({ many }) => ({
  reservations: many(reservations),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  stand: one(stands, { fields: [reservations.standId], references: [stands.id] }),
  exhibitor: one(exhibitors, { fields: [reservations.exhibitorId], references: [exhibitors.id] }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  edition: one(editions, { fields: [activities.editionId], references: [editions.id] }),
  registrations: many(activityRegistrations),
}));

export const activityRegistrationsRelations = relations(activityRegistrations, ({ one }) => ({
  activity: one(activities, {
    fields: [activityRegistrations.activityId],
    references: [activities.id],
  }),
}));
