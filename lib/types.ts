/**
 * Modelo de dominio de Proyecto Yuca.
 *
 * Estos tipos son el contrato entre la UI y los datos. Hoy se alimentan de los
 * mocks de `lib/data/`, y mañana de la base de datos sin tocar los componentes:
 * el esquema de Drizzle debe producir exactamente estas formas.
 */

/* -------------------------------------------------------------------------- */
/* Personas y roles                                                            */
/* -------------------------------------------------------------------------- */

/**
 * `asistente`  visitante con cuenta (guarda favoritos, participa en juegos)
 * `expositor`  artista con mesa/stand en la feria
 * `staff`      organización: confirma pagos, asigna stands, verifica perfiles
 */
export type UserRole = 'asistente' | 'expositor' | 'staff';

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  web?: string;
}

/** Categoría de arte del expositor; se muestra como badge en su perfil. */
export type ArtCategory =
  | 'Ilustración Digital'
  | 'Ilustración Tradicional'
  | 'Cómics'
  | 'Pines'
  | 'Stickers'
  | 'Webcomics'
  | 'Otro';

export interface Exhibitor {
  id: string;
  /** Público al que pertenece; decide en qué zona va su mesa. */
  audience: ConvocatoriaAudience;
  /** Identificador de la URL pública: /artistas/[slug] */
  slug: string;
  displayName: string;
  categories: ArtCategory[];
  /**
   * Insignia de verificado. La otorga el staff tras revisar el perfil;
   * NO es algo que el propio expositor pueda activarse.
   */
  verified: boolean;
  /** Ruta bajo /public, o null mientras no haya subido foto. */
  avatar: string | null;
  bio: string;
  socials: SocialLinks;
  /** Stand asignado en la edición vigente, si ya pagó. */
  standId?: string;
}

/* -------------------------------------------------------------------------- */
/* Feria: sectores y stands                                                    */
/* -------------------------------------------------------------------------- */



/**
 * Estado de un stand: si se puede pedir o no.
 *
 * `reservado` es imprescindible con pago manual por transferencia: entre que
 * alguien elige la mesa y el staff confirma el pago pasan horas o días, y en
 * esa ventana el stand no puede aparecer ni libre ni ocupado.
 * Sin este estado, dos personas pagan por la misma mesa.
 */
export type StandStatus = 'disponible' | 'reservado' | 'ocupado';

/**
 * Para qué es la mesa. Es una dimensión aparte del estado: una mesa de comida
 * también puede estar libre, reservada u ocupada.
 *
 * Antes las comidas se modelaban como estado `externo`, y era un error: pagan y
 * ocupan mesa igual que un artista. `organizacion` sí es espacio propio del
 * equipo (acreditación, merch) y nunca se pone a la venta.
 */
export type StandKind =
  | 'ilustrador'
  | 'emprendimiento'
  | 'tienda'
  | 'comida'
  | 'organizacion';

/** Espacio físico del recinto. Cada uno tiene su propio plano. */
export type EspacioId = 'lirio' | 'orquidea';

/** Elemento del plano que no es una mesa: escenario, entrada, estructuras. */
export interface Landmark {
  id: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** `hueco` dibuja un vano en la pared (puertas y conexiones). */
  variant?: 'sala' | 'hueco' | 'estructura';
  /** Texto en vertical, para etiquetas altas y estrechas. */
  vertical?: boolean;
  /** Dónde va el rótulo. Los vanos son estrechos y no admiten texto dentro. */
  labelPlacement?: 'dentro' | 'arriba' | 'abajo';
}

/**
 * Un espacio del recinto con su plano propio.
 *
 * El contorno es un polígono porque las salas reales no son rectángulos: el
 * Salón Lirio y el Patio Orquídea tienen esquinas en diagonal.
 */
export interface Espacio {
  id: EspacioId;
  name: string;
  description: string;
  viewBox: { width: number; height: number };
  /** Puntos del polígono del contorno, en unidades del viewBox. */
  outline: string;
  landmarks: Landmark[];
}

export interface Stand {
  /**
   * Código único: 'I13', 'E7', 'C2', 'T1'.
   * La letra es el tipo de mesa y el número es el que sale impreso en el plano.
   * Es también el ancla en la URL.
   */
  id: string;
  /** Número tal cual aparece en el plano impreso. */
  numero: number;
  espacioId: EspacioId;
  /** Geometría dentro del plano (mismas unidades que el viewBox del SVG). */
  x: number;
  y: number;
  width: number;
  height: number;
  status: StandStatus;
  kind: StandKind;
  /** Giro en grados sobre su centro; las mesas en diagonal del plano real. */
  rotate?: number;
  /** Cuántos acompañantes admite además del titular. */
  maxCompaneros?: number;
  /** Ocupante confirmado; sólo cuando `status === 'ocupado'`. */
  exhibitorId?: string;
  /** Nombre del ocupante cuando es espacio de la organización. */
  externalName?: string;
}

/* -------------------------------------------------------------------------- */
/* Reservas y pagos                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Único medio de pago aceptado: transferencia por QR.
 *
 * Es una unión de un solo miembro a propósito. Si algún día se suma otro medio,
 * basta con ampliarla: TypeScript señalará todos los sitios que hay que
 * actualizar (el mapa de métodos de `InfoPanel`, entre otros).
 */
export type PaymentMethod = 'qr';

export type ReservationStatus =
  | 'pendiente' // esperando comprobante o confirmación del staff
  | 'confirmada' // staff validó el pago -> el stand pasa a 'ocupado'
  | 'expirada' // se venció el plazo sin pagar -> el stand vuelve a 'disponible'
  | 'cancelada';

export interface Reservation {
  id: string;
  standId: string;
  exhibitorId: string;
  status: ReservationStatus;
  method: PaymentMethod;
  amountBob: number;
  /** Comprobante de la transferencia subido por el expositor. */
  proofUrl?: string;
  createdAt: string;
  /** Plazo para pagar. Al vencer, el stand se libera automáticamente. */
  expiresAt: string;
  /** Miembro del staff que confirmó el pago (auditoría). */
  confirmedBy?: string;
  confirmedAt?: string;
}

/* -------------------------------------------------------------------------- */
/* Convocatorias                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A quién va dirigida cada convocatoria.
 *
 * Ojo: no todos los que ocupan una mesa son artistas. Comidas y emprendimientos
 * también pagan y ocupan stand, así que no deben modelarse como `externo`
 * (ese estado es sólo para espacios de la organización).
 */
export type ConvocatoriaAudience = 'artistas' | 'comidas' | 'emprendimientos';

/**
 * Las convocatorias van por fases. Entre una fase y la siguiente hay un hueco
 * en el que no se puede postular, y ese hueco necesita su propio estado: no es
 * lo mismo "cerrada para siempre" que "cerrada mientras preparamos la próxima".
 */
export type ConvocatoriaEstado = 'abierta' | 'cerrada' | 'proximamente';

export interface Convocatoria {
  id: string;
  audience: ConvocatoriaAudience;
  title: string;
  description: string;
  /** Formulario de Google que se usa hoy para postular. */
  formUrl: string;
  /** Ronda de la convocatoria, tal como se anuncia en redes ("Fase 3"). */
  phaseLabel: string;
  /** Rótulo corto para el footer ("Ser expositor"). */
  shortLabel: string;
  estado: ConvocatoriaEstado;
}

/* -------------------------------------------------------------------------- */
/* Evento y actividades                                                        */
/* -------------------------------------------------------------------------- */

export interface Edition {
  id: string;
  name: string;
  /** ISO 8601. `null` mientras la fecha no esté confirmada. */
  startsAt: string | null;
  endsAt: string | null;
  /** Texto que se muestra si aún no hay fecha cerrada. */
  dateLabel: string;
  venue: string;
  address: string;
  city: string;
  /** Entrada del público general. */
  ticket: {
    priceBob: number | null; // null = entrada libre
    label: string;
    methods: PaymentMethod[];
  };
  /** Mesa para expositores. */
  standPriceBob: number;
  description: string;
  /** `true` si tiene feria de artistas con mapa de stands en la web. */
  hasFeria: boolean;
  /** Página propia del evento, si ya existe. */
  href?: string;
}

export type ActivityKind = 'stamp-rally' | 'taller' | 'concurso' | 'pasarela';

export interface Activity {
  id: string;
  slug: string;
  title: string;
  kind: ActivityKind;
  description: string;
  /** Ruta bajo /public, o null mientras no haya arte. */
  banner: string | null;
  /** Requisitos de participación, uno por línea. */
  conditions: string[];
  /** `null` = sin límite de cupos. */
  capacity: number | null;
  enrolled: number;
  schedule: string;
  location: string;
}

/** Cupos restantes; `null` cuando la actividad no tiene límite. */
export function remainingSlots(activity: Activity): number | null {
  if (activity.capacity === null) return null;
  return Math.max(0, activity.capacity - activity.enrolled);
}

export function isSoldOut(activity: Activity): boolean {
  return remainingSlots(activity) === 0;
}
