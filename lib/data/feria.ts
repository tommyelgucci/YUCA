import type { Sector, Stand, StandStatus } from '@/lib/types';

/**
 * Plano de la feria.
 *
 * El mapa NO se dibuja a mano: se genera desde estos datos. Cambiar la
 * distribución de una edición es cambiar este archivo (mañana, filas de la base
 * de datos), no reabrir un SVG en Illustrator.
 *
 * Todas las coordenadas viven en el sistema del `viewBox` del plano.
 */

export const PLANO = { width: 1000, height: 700 } as const;

export const sectores: Sector[] = [
  {
    id: 'lobby',
    name: 'Lobby',
    description: 'Entrada principal, acreditación y stands de bienvenida.',
    x: 40,
    y: 60,
    width: 420,
    height: 240,
  },
  {
    id: 'galeria',
    name: 'Galería',
    description: 'El grueso de la feria: ilustración, cómics, pines y stickers.',
    x: 40,
    y: 330,
    width: 420,
    height: 330,
  },
  {
    id: 'teatro',
    name: 'Teatro',
    description: 'Escenario de la pasarela cosplay, talleres y concursos.',
    x: 490,
    y: 60,
    width: 470,
    height: 600,
  },
];

/** Elementos del plano que no son stands, para orientarse. */
export const referencias = [
  { id: 'entrada', label: 'Entrada', x: 175, y: 20, width: 150, height: 28 },
  { id: 'escenario', label: 'Escenario', x: 530, y: 540, width: 390, height: 90 },
  { id: 'banos', label: 'Baños', x: 40, y: 672, width: 120, height: 24 },
];

const STAND = { width: 56, height: 44 } as const;

interface RowOptions {
  prefix: string;
  count: number;
  /** Número del primer stand de la fila (C7, C13…). */
  from?: number;
  sectorId: Sector['id'];
  x: number;
  y: number;
  gap?: number;
  priceBob: number;
}

/** Genera una fila de stands equiespaciados, todos disponibles por defecto. */
function fila({ prefix, count, from = 1, sectorId, x, y, gap = 8, priceBob }: RowOptions): Stand[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${from + i}`,
    sectorId,
    x: x + i * (STAND.width + gap),
    y,
    width: STAND.width,
    height: STAND.height,
    status: 'disponible' as StandStatus,
    priceBob,
  }));
}

const PRECIO_LOBBY = 320; // TODO: precios reales por sector
const PRECIO_GALERIA = 250;
const PRECIO_TEATRO = 280;

const layout: Stand[] = [
  // Lobby — dos filas cortas junto a la entrada
  ...fila({ prefix: 'A', count: 5, sectorId: 'lobby', x: 70, y: 120, priceBob: PRECIO_LOBBY }),
  ...fila({ prefix: 'B', count: 5, sectorId: 'lobby', x: 70, y: 200, priceBob: PRECIO_LOBBY }),

  // Galería — cuatro filas de seis
  ...fila({ prefix: 'C', count: 6, from: 1, sectorId: 'galeria', x: 62, y: 380, priceBob: PRECIO_GALERIA }),
  ...fila({ prefix: 'C', count: 6, from: 7, sectorId: 'galeria', x: 62, y: 448, priceBob: PRECIO_GALERIA }),
  ...fila({ prefix: 'C', count: 6, from: 13, sectorId: 'galeria', x: 62, y: 516, priceBob: PRECIO_GALERIA }),
  ...fila({ prefix: 'C', count: 6, from: 19, sectorId: 'galeria', x: 62, y: 584, priceBob: PRECIO_GALERIA }),

  // Teatro — filas laterales al escenario
  ...fila({ prefix: 'D', count: 6, from: 1, sectorId: 'teatro', x: 530, y: 130, priceBob: PRECIO_TEATRO }),
  ...fila({ prefix: 'D', count: 6, from: 7, sectorId: 'teatro', x: 530, y: 198, priceBob: PRECIO_TEATRO }),
  ...fila({ prefix: 'E', count: 6, from: 1, sectorId: 'teatro', x: 530, y: 300, priceBob: PRECIO_TEATRO }),
  ...fila({ prefix: 'E', count: 6, from: 7, sectorId: 'teatro', x: 530, y: 368, priceBob: PRECIO_TEATRO }),
];

/**
 * Ocupación de la edición vigente.
 *
 * ⚠️ Demo. En producción esto sale de la tabla `reservations`: un stand está
 * `ocupado` si tiene reserva confirmada y `reservado` si la tiene pendiente.
 */
const ocupacion: Record<string, { status: StandStatus; exhibitorId?: string; externalName?: string }> = {
  A1: { status: 'externo', externalName: 'Acreditación' },
  A2: { status: 'externo', externalName: 'Merch oficial Yuca' },
  A3: { status: 'ocupado', exhibitorId: 'lunaria' },
  A4: { status: 'ocupado', exhibitorId: 'papaya' },
  A5: { status: 'reservado' },
  B1: { status: 'ocupado', exhibitorId: 'cactus' },
  B2: { status: 'ocupado', exhibitorId: 'mishi' },
  B3: { status: 'reservado' },
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
  D1: { status: 'ocupado', exhibitorId: 'nogal' },
  D2: { status: 'externo', externalName: 'Food truck' },
  D3: { status: 'externo', externalName: 'Food truck' },
  E1: { status: 'ocupado', exhibitorId: 'raiz' },
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

/** Etiqueta y color de cada estado. Fuente única para mapa y leyenda. */
export const ESTADOS: Record<
  StandStatus,
  { label: string; help: string; fill: string; stroke: string; text: string }
> = {
  disponible: {
    label: 'Disponible',
    help: 'Se puede reservar',
    fill: 'fill-white',
    stroke: 'stroke-yuca-green/40',
    text: 'fill-yuca-ink',
  },
  reservado: {
    label: 'Reservado',
    help: 'Pago pendiente de confirmar',
    fill: 'fill-yuca-mustard/30',
    stroke: 'stroke-yuca-mustard',
    text: 'fill-yuca-ink',
  },
  ocupado: {
    label: 'Ocupado',
    help: 'Mesa confirmada de un artista',
    fill: 'fill-yuca-green',
    stroke: 'stroke-yuca-green-deep',
    text: 'fill-white',
  },
  externo: {
    label: 'Externo',
    help: 'Organización, auspicio o comida',
    fill: 'fill-yuca-coral/85',
    stroke: 'stroke-yuca-coral-deep',
    text: 'fill-white',
  },
};
