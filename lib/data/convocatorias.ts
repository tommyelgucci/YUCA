import type { Convocatoria } from '@/lib/types';

/**
 * Convocatorias abiertas.
 *
 * Hoy la postulación se hace con formularios de Google (los mismos que están
 * publicados en el Linktree). Cuando entre la Fase 2 —cuentas, elección de mesa
 * en el mapa y pago— estos enlaces se sustituyen por el flujo interno; hasta
 * entonces la web apunta al proceso que realmente funciona.
 *
 * ⚠️ `open` está en `true` para las tres: confirmar cuáles siguen abiertas y
 * hasta qué fecha.
 */
export const convocatorias: Convocatoria[] = [
  {
    id: 'artistas',
    audience: 'artistas',
    title: 'Convocatoria de artistas',
    description:
      'Para ilustración, cómics, pines, stickers y webcomics. Postula con tu portafolio y te asignamos mesa en la feria.',
    formUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLScRsufVA9XF5swA1E4vdjjJwQbfHvjoCj3kK6NIt688IOfT7w/viewform',
    phaseLabel: 'Fase 3',
    shortLabel: 'Ser expositor',
    open: true,
  },
  {
    id: 'comidas',
    audience: 'comidas',
    title: 'Convocatoria de comidas',
    description:
      'Para food trucks, repostería y puestos de comida que quieran un espacio dentro del evento.',
    formUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSd_0n2kDNjQ_AZUjNFNZz86zyre5lvsnQhmpeLyScfsdCGpYQ/viewform',
    phaseLabel: 'Fase 3',
    shortLabel: 'Vender comida',
    open: true,
  },
  {
    id: 'emprendimientos',
    audience: 'emprendimientos',
    title: 'Convocatoria de emprendimientos',
    description:
      'Para marcas y emprendimientos que quieran vender o mostrar su producto en la feria.',
    formUrl: 'https://forms.gle/5Tgg8g9o1Za4Am9j8',
    phaseLabel: 'Fase 3',
    shortLabel: 'Traer mi emprendimiento',
    open: true,
  },
];

export function getConvocatoria(id: Convocatoria['id']): Convocatoria | undefined {
  return convocatorias.find((c) => c.id === id);
}

/** Formulario de artistas: el que enlazan los CTA de mesa del mapa. */
export const convocatoriaArtistas = convocatorias[0];
