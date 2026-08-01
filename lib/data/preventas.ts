import type { StandKind } from '@/lib/types';

/**
 * Preventas por tandas.
 *
 * El precio de una mesa no es fijo: depende de en qué preventa se compre. Por
 * eso el precio no vive en la mesa sino aquí, y la mesa sólo dice de qué tipo
 * es. Al reservar se congela el importe vigente en la reserva (`amountBob`),
 * de modo que subir la tanda siguiente no cambia lo que ya pagó nadie.
 */

export type PreventaId = 'preventa-1' | 'preventa-2' | 'preventa-3';

export type PreventaEstado = 'cerrada' | 'abierta' | 'proximamente';

export interface Preventa {
  id: PreventaId;
  label: string;
  orden: number;
  estado: PreventaEstado;
  /** Precio por tipo de mesa. `null` = ese tipo no se vende en esta tanda. */
  precios: Record<StandKind, number | null>;
  /** Texto corto para la interfaz. */
  nota: string;
}

// TODO: precios reales de cada preventa. Los de abajo son marcadores para
// poder maquetar; en cuanto los tengas, se cambian sólo aquí.
export const preventas: Preventa[] = [
  {
    id: 'preventa-1',
    label: 'Primera preventa',
    orden: 1,
    estado: 'cerrada',
    precios: {
      ilustrador: 250,
      emprendimiento: 300,
      tienda: 350,
      comida: 400,
      organizacion: null,
    },
    nota: 'El precio más bajo, ya cerrada.',
  },
  {
    id: 'preventa-2',
    label: 'Segunda preventa',
    orden: 2,
    estado: 'abierta',
    precios: {
      ilustrador: 300,
      emprendimiento: 350,
      tienda: 400,
      comida: 450,
      organizacion: null,
    },
    nota: 'Tanda vigente.',
  },
  {
    id: 'preventa-3',
    label: 'Tercera preventa',
    orden: 3,
    estado: 'proximamente',
    precios: {
      ilustrador: 350,
      emprendimiento: 400,
      tienda: 450,
      comida: 500,
      organizacion: null,
    },
    nota: 'La última tanda, al precio más alto.',
  },
];

/** La tanda que está vendiendo ahora mismo, si hay alguna. */
export const preventaVigente = preventas.find((p) => p.estado === 'abierta') ?? null;

/**
 * Precio de una mesa hoy. `null` si no hay preventa abierta o si ese tipo de
 * mesa no se vende (la organización no paga por su espacio).
 */
export function precioActual(kind: StandKind): number | null {
  return preventaVigente?.precios[kind] ?? null;
}

/** Precio de ese tipo de mesa en cada tanda, para la tabla comparativa. */
export function preciosPorTanda(kind: StandKind) {
  return preventas.map((preventa) => ({
    preventa,
    precio: preventa.precios[kind],
  }));
}
