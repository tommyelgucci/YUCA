import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
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
  'ilustrador',
  'emprendimiento',
  'tienda',
  'comida',
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
  'tiendas',
  'emprendimientos',
]);

/* -------------------------------------------------------------------------- */
/* Personas                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Perfil de expositor. Lo crea y edita la propia persona al registrarse;
 * `verified` es lo único que sólo puede tocar el staff.
 *
 * La tabla mezcla dos cosas con público distinto:
 *
 * - lo **público**, que se muestra en la web a cualquiera (nombre artístico,
 *   bio, categorías, redes);
 * - los **datos personales**, que sólo ve el equipo para poder identificar a
 *   quien reserva una mesa y contactarle si algo pasa con su pago.
 *
 * Están en la misma tabla porque son uno a uno con la persona y separarlos en
 * dos sería una abstracción sin uso real hoy. Lo que impide filtrarlos es que
 * las consultas de la web pública seleccionan columna por columna
 * (`COLUMNAS_PUBLICAS` en `lib/perfiles.ts`), nunca `select()` entero.
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

    /* --- Datos personales: sólo para el equipo, nunca para la web pública --- */

    /** Nombre legal, para cotejar con el comprobante de la transferencia. */
    fullName: text('full_name'),
    /** Sin hora ni zona: es un dato de calendario, no un instante. */
    birthDate: date('birth_date'),
    /** Correo de contacto. Puede no ser el mismo con el que entró a Clerk. */
    contactEmail: text('contact_email'),
    /** Teléfono de contacto; en la práctica, su WhatsApp. */
    phone: text('phone'),
    /** Texto libre acotado en la interfaz, no un enum: las opciones cambian. */
    gender: text('gender'),
    /** Departamento de Bolivia donde vive. */
    department: text('department'),

    /*
     * Permiso del tutor, obligatorio a los 17 y 18 años (ver `lib/edad.ts`).
     *
     * Lo que se guarda es la declaración hecha en la web, no el documento
     * firmado: el papel lo pide el equipo aparte, y por eso `/admin` muestra
     * estos datos junto al perfil en vez de darlo por bueno sin más.
     */
    guardianName: text('guardian_name'),
    guardianContact: text('guardian_contact'),
    /** Cuándo se declaró el permiso. `null` = no lo hay. */
    guardianConsentAt: timestamp('guardian_consent_at', { withTimezone: true }),

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

/**
 * Sala del recinto (Salón Lirio, Patio Orquídea).
 *
 * La geometría del dibujo —contorno, escenario, entradas— vive en el código
 * (`lib/data/feria.ts`) porque es del local y no cambia por edición. Aquí sólo
 * está lo que hace falta para relacionar mesas con su sala.
 */
export const espacios = pgTable(
  'espacios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
  },
  (table) => [uniqueIndex('espacios_edition_code_key').on(table.editionId, table.code)],
);

export const stands = pgTable(
  'stands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    espacioId: uuid('espacio_id')
      .notNull()
      .references(() => espacios.id, { onDelete: 'cascade' }),
    /** Código único: 'I13', 'E7'. Letra del tipo + número del plano. */
    code: text('code').notNull(),
    /** Número tal cual sale impreso en el plano. */
    numero: integer('numero').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    /** Giro en grados; las mesas en diagonal del plano real. */
    rotate: integer('rotate'),
    status: standStatus('status').notNull().default('disponible'),
    kind: standKind('kind').notNull().default('ilustrador'),
    /** Acompañantes admitidos además del titular. */
    maxCompaneros: integer('max_companeros').notNull().default(1),
    /** Nombre del ocupante cuando es espacio de la organización. */
    externalName: text('external_name'),
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
    /**
     * Tanda de preventa en la que se compró, y el importe que regía entonces.
     * Se congela aquí a propósito: abrir la siguiente preventa sube el precio
     * de las mesas libres, pero no puede cambiar lo que ya acordó alguien.
     */
    preventaId: text('preventa_id'),
    amountBob: integer('amount_bob').notNull(),
    /*
     * Reglas aceptadas para poder apartar la mesa (`lib/data/reglamento.ts`).
     *
     * Cuelgan de la reserva y no del expositor porque lo que se acepta es
     * participar en *esta* edición con *este* texto: quien reserve el año que
     * viene tendrá que volver a leer lo que rija entonces.
     *
     * Ambas son `not null` **sin default** a propósito: así no existe forma de
     * insertar una reserva sin dejar constancia de qué versión se aceptó y
     * cuándo, ni desde el código ni con un insert a mano.
     */
    termsVersion: text('terms_version').notNull(),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }).notNull(),
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

/**
 * Compañero de mesa.
 *
 * Quien tiene la mesa pagada puede sumar a alguien que la comparta.
 *
 * Cuelga de la reserva, no de la mesa. Cancelar una reserva no borra su fila
 * —queda como historial— así que los acompañantes siguen colgando de ella;
 * lo que importa es que la reserva siguiente sobre esa misma mesa nace sin
 * ninguno, que es la garantía que hace falta.
 *
 * **El acompañante es siempre un expositor registrado** (`exhibitor_id` es
 * `not null`), porque así lo pidió la organización: quien esté detrás de una
 * mesa tiene que ser alguien identificable, no un nombre escrito a mano. De ahí
 * salen su nombre, sus redes y sus categorías, y por eso no se copian aquí:
 * un duplicado sólo serviría para quedarse viejo.
 */
export const standCompanions = pgTable(
  'stand_companions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    exhibitorId: uuid('exhibitor_id')
      .notNull()
      .references(() => exhibitors.id, { onDelete: 'cascade' }),
    /**
     * Nombre tal como estaba al sumarlo.
     *
     * Se guarda aunque el perfil ya lo tenga: es lo que se imprimió en su
     * credencial. Si después se renombra, el gafete que lleva puesto sigue
     * diciendo lo de antes, y el equipo necesita poder cotejarlo.
     */
    displayName: text('display_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('stand_companions_reservation_idx').on(table.reservationId),
    index('stand_companions_exhibitor_idx').on(table.exhibitorId),
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
  espacios: many(espacios),
  stands: many(stands),
  activities: many(activities),
}));

export const espaciosRelations = relations(espacios, ({ one, many }) => ({
  edition: one(editions, { fields: [espacios.editionId], references: [editions.id] }),
  stands: many(stands),
}));

export const standsRelations = relations(stands, ({ one, many }) => ({
  edition: one(editions, { fields: [stands.editionId], references: [editions.id] }),
  espacio: one(espacios, { fields: [stands.espacioId], references: [espacios.id] }),
  reservations: many(reservations),
}));

export const exhibitorsRelations = relations(exhibitors, ({ many }) => ({
  reservations: many(reservations),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  stand: one(stands, { fields: [reservations.standId], references: [stands.id] }),
  exhibitor: one(exhibitors, { fields: [reservations.exhibitorId], references: [exhibitors.id] }),
  companions: many(standCompanions),
}));

export const standCompanionsRelations = relations(standCompanions, ({ one }) => ({
  reservation: one(reservations, {
    fields: [standCompanions.reservationId],
    references: [reservations.id],
  }),
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
