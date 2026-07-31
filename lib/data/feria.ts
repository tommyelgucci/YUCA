import type { Sector, Stand, StandKind, StandStatus } from '@/lib/types';

/**
 * Plano de la feria.
 *
 * ⚠️ Distribución provisional: todavía no hay sede confirmada, así que este
 * plano es una maqueta con la forma que suele tener el evento. Cuando se cierre
 * el local se sustituyen sectores y coordenadas por los reales — el resto de la
 * web no se toca, porque el mapa se genera desde estos datos.
 *
 * Todas las coordenadas viven en el sistema del `viewBox` del plano.
 */

export const PLANO = { width: 1000, height: 700 } as const;

export const sectores: Sector[] = [
  {
    id: 'lobby',
    name: 'Lobby',
    description: 'Entrada, acreditación y emprendimientos.',
    kind: 'emprendimiento',
    x: 40,
    y: 60,
    width: 420,
    height: 180,
  },
  {
    id: 'galeria',
    name: 'Galería',
    description: 'El grueso de la feria: ilustración, cómics, pines y stickers.',
    kind: 'arte',
    x: 40,
    y: 270,
    width: 420,
    height: 390,
  },
  {
    id: 'teatro',
    name: 'Teatro',
    description: 'Más mesas de arte y el escenario de la pasarela cosplay.',
    kind: 'arte',
    x: 490,
    y: 60,
    width: 470,
    height: 380,
  },
  {
    id: 'comidas',
    name: 'Patio de comidas',
    description: 'Food trucks, repostería y puestos de comida.',
    kind: 'comida',
    x: 490,
    y: 470,
    width: 470,
    height: 190,
  },
];

/** Elementos del plano que no son stands, para orientarse. */
export const referencias = [
  { id: 'entrada', label: 'Entrada', x: 175, y: 20, width: 150, height: 28 },
  { id: 'escenario', label: 'Escenario', x: 530, y: 330, width: 376, height: 70 },
  { id: 'banos', label: 'Baños', x: 40, y: 672, width: 120, height: 24 },
];

const STAND = { width: 56, height: 44 } as const;

interface RowOptions {
  prefix: string;
  count: number;
  /** Número del primer stand de la fila (C7, C13…). */
  from?: number;
  sectorId: Sector['id'];
  kind: StandKind;
  x: number;
  y: number;
  gap?: number;
  priceBob: number;
}

/** Genera una fila de stands equiespaciados, todos disponibles por defecto. */
function fila({
  prefix,
  count,
  from = 1,
  sectorId,
  kind,
  x,
  y,
  gap = 8,
  priceBob,
}: RowOptions): Stand[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${from + i}`,
    sectorId,
    kind,
    x: x + i * (STAND.width + gap),
    y,
    width: STAND.width,
    height: STAND.height,
    status: 'disponible' as StandStatus,
    priceBob,
  }));
}

// TODO: precios reales por zona.
const PRECIO_LOBBY = 320;
const PRECIO_GALERIA = 250;
const PRECIO_TEATRO = 280;
const PRECIO_COMIDAS = 400;

const layout: Stand[] = [
  // Lobby — emprendimientos, junto a la entrada
  ...fila({ prefix: 'A', count: 5, sectorId: 'lobby', kind: 'emprendimiento', x: 70, y: 110, priceBob: PRECIO_LOBBY }),
  ...fila({ prefix: 'B', count: 5, sectorId: 'lobby', kind: 'emprendimiento', x: 70, y: 175, priceBob: PRECIO_LOBBY }),

  // Galería — cuatro filas de seis, arte
  ...fila({ prefix: 'C', count: 6, from: 1, sectorId: 'galeria', kind: 'arte', x: 62, y: 330, priceBob: PRECIO_GALERIA }),
  ...fila({ prefix: 'C', count: 6, from: 7, sectorId: 'galeria', kind: 'arte', x: 62, y: 400, priceBob: PRECIO_GALERIA }),
  ...fila({ prefix: 'C', count: 6, from: 13, sectorId: 'galeria', kind: 'arte', x: 62, y: 470, priceBob: PRECIO_GALERIA }),
  ...fila({ prefix: 'C', count: 6, from: 19, sectorId: 'galeria', kind: 'arte', x: 62, y: 540, priceBob: PRECIO_GALERIA }),

  // Teatro — arte, alrededor del escenario
  ...fila({ prefix: 'D', count: 6, from: 1, sectorId: 'teatro', kind: 'arte', x: 530, y: 120, priceBob: PRECIO_TEATRO }),
  ...fila({ prefix: 'D', count: 6, from: 7, sectorId: 'teatro', kind: 'arte', x: 530, y: 190, priceBob: PRECIO_TEATRO }),
  ...fila({ prefix: 'E', count: 6, from: 1, sectorId: 'teatro', kind: 'arte', x: 530, y: 260, priceBob: PRECIO_TEATRO }),

  // Patio de comidas
  ...fila({ prefix: 'F', count: 5, from: 1, sectorId: 'comidas', kind: 'comida', x: 530, y: 520, priceBob: PRECIO_COMIDAS }),
  ...fila({ prefix: 'F', count: 5, from: 6, sectorId: 'comidas', kind: 'comida', x: 530, y: 590, priceBob: PRECIO_COMIDAS }),
];

/**
 * Ocupación de la edición vigente.
 *
 * ⚠️ Demo. En producción esto sale de la tabla `reservations`: un stand está
 * `ocupado` si tiene reserva confirmada y `reservado` si la tiene pendiente.
 */
const ocupacion: Record<
  string,
  { status?: StandStatus; kind?: StandKind; exhibitorId?: string; externalName?: string }
> = {
  // Espacios de la organización: nunca se ponen a la venta.
  A1: { status: 'ocupado', kind: 'organizacion', externalName: 'Acreditación' },
  A2: { status: 'ocupado', kind: 'organizacion', externalName: 'Merch oficial Yuca' },

  // Emprendimientos
  A3: { status: 'ocupado', exhibitorId: 'quirquincho' },
  A4: { status: 'ocupado', exhibitorId: 'telar' },
  A5: { status: 'reservado' },
  B1: { status: 'reservado' },

  // Arte — Galería
  C1: { status: 'ocupado', exhibitorId: 'tinta-verde' },
  C2: { status: 'ocupado', exhibitorId: 'colibri' },
  C3: { status: 'ocupado', exhibitorId: 'wawita' },
  C5: { status: 'reservado' },
  C7: { status: 'ocupado', exhibitorId: 'sirena' },
  C8: { status: 'ocupado', exhibitorId: 'chaco' },
  C13: { status: 'ocupado', exhibitorId: 'nube' },
  C14: { status: 'reservado' },
  C19: { status: 'ocupado', exhibitorId: 'pixel-yuca' },
  C20: { status: 'ocupado', exhibitorId: 'tornillo' },
  C21: { status: 'reservado' },
  C22: { status: 'ocupado', exhibitorId: 'lunaria' },
  C23: { status: 'ocupado', exhibitorId: 'papaya' },

  // Arte — Teatro
  D1: { status: 'ocupado', exhibitorId: 'nogal' },
  D2: { status: 'ocupado', exhibitorId: 'cactus' },
  D3: { status: 'ocupado', exhibitorId: 'mishi' },
  E1: { status: 'ocupado', exhibitorId: 'raiz' },

  // Comidas
  F1: { status: 'ocupado', exhibitorId: 'saltenas' },
  F2: { status: 'ocupado', exhibitorId: 'matcha' },
  F3: { status: 'reservado' },
};

/** Stands de la edición vigente, ya con su estado de ocupación aplicado. */
export const stands: Stand[] = layout.map((stand) => {
  const estado = ocupacion[stand.id];
  return estado ? { ...stand, ...estado } : stand;
});

export const standsPorId = new Map(stands.map((stand) => [stand.id, stand]));

export function getStand(id: string | null | undefined): Stand | undefined {
  return id ? standsPorId.get(id) : undefined;
}

/**
 * Estado del stand: dice si se puede pedir.
 * Es lo que decide el relleno de la mesa en el mapa.
 */
export const ESTADOS: Record<StandStatus, { label: string; help: string }> = {
  disponible: { label: 'Disponible', help: 'Se puede reservar' },
  reservado: { label: 'Reservado', help: 'Pago pendiente de confirmar' },
  ocupado: { label: 'Ocupado', help: 'Mesa ya confirmada' },
};

/**
 * Tipo de mesa: dice para qué es.
 * Es lo que decide el color de la mesa en el mapa.
 */
export const ZONAS: Record<
  StandKind,
  { label: string; help: string; fill: string; stroke: string; text: string; swatch: string }
> = {
  arte: {
    label: 'Arte',
    help: 'Ilustración, cómics, pines, stickers',
    fill: 'fill-yuca-green',
    stroke: 'stroke-yuca-green-deep',
    text: 'fill-white',
    swatch: 'bg-yuca-green border-yuca-green-deep',
  },
  comida: {
    label: 'Comida',
    help: 'Food trucks y repostería',
    fill: 'fill-yuca-coral',
    stroke: 'stroke-yuca-coral-deep',
    text: 'fill-white',
    swatch: 'bg-yuca-coral border-yuca-coral-deep',
  },
  emprendimiento: {
    label: 'Emprendimiento',
    help: 'Marcas y productos',
    fill: 'fill-yuca-mustard',
    stroke: 'stroke-yuca-mustard-deep',
    text: 'fill-yuca-ink',
    swatch: 'bg-yuca-mustard border-yuca-mustard-deep',
  },
  organizacion: {
    label: 'Organización',
    help: 'Acreditación, merch oficial',
    fill: 'fill-yuca-ink-soft',
    stroke: 'stroke-yuca-ink',
    text: 'fill-white',
    swatch: 'bg-yuca-ink-soft border-yuca-ink',
  },
};
