import type { Espacio, Stand, StandKind, StandStatus } from '@/lib/types';

/**
 * Plano real de la feria: Salón Lirio y Patio Orquídea.
 *
 * Las coordenadas se trazaron sobre los planos oficiales del evento, así que
 * la posición y el giro de cada mesa reproducen el impreso. La numeración es la
 * del plano: se reinicia por tipo de mesa, y los emprendedores son una única
 * serie repartida entre los dos espacios (1-6 en el Lirio, 7-14 en el Patio).
 *
 * Por eso el `id` interno lleva la letra del tipo delante (`I13`, `E7`, `C2`,
 * `T1`): el número solo no es único, pero es el que se muestra encima de la
 * mesa para que coincida con el plano que ya conoce la gente.
 */

/* -------------------------------------------------------------------------- */
/* Espacios                                                                    */
/* -------------------------------------------------------------------------- */

export const espacios: Espacio[] = [
  {
    id: 'lirio',
    name: 'Salón Lirio',
    description: 'Ilustradores, escenario y entrada principal.',
    viewBox: { width: 1000, height: 1040 },
    // Sala irregular: la esquina superior izquierda y la inferior derecha
    // están cortadas en diagonal.
    outline: '229,0 1000,0 1000,797 754,1039 0,1039 0,396',
    landmarks: [
      { id: 'escenario', label: 'Escenario', x: 0, y: 396, width: 137, height: 344, variant: 'sala', vertical: true },
      { id: 'entrada', label: 'Entrada', x: 985, y: 202, width: 30, height: 194, variant: 'hueco', vertical: true },
      {
        id: 'a-orquidea',
        label: 'Patio Orquídea',
        x: 826,
        y: -12,
        width: 46,
        height: 24,
        variant: 'hueco',
        labelPlacement: 'arriba',
      },
      { id: 'estructura-escenario', x: 101, y: 783, width: 35, height: 101, variant: 'estructura' },
    ],
  },
  {
    id: 'orquidea',
    name: 'Patio Orquídea',
    description: 'Emprendedores, tiendas y patio de comidas.',
    viewBox: { width: 760, height: 1016 },
    outline: '544,0 760,0 760,1015 135,1015 0,887 0,424',
    landmarks: [
      // TODO: confirmar qué son estos dos elementos del plano (¿jardinera?
      // ¿tarima? ¿zona de descanso?) para poder etiquetarlos.
      { id: 'estructura-centro', x: 172, y: 336, width: 176, height: 132, variant: 'estructura' },
      { id: 'estructura-esquina', x: 608, y: 641, width: 151, height: 217, variant: 'estructura' },
      {
        id: 'a-lirio',
        label: 'Salón Lirio',
        x: 557,
        y: 1003,
        width: 106,
        height: 24,
        variant: 'hueco',
        labelPlacement: 'abajo',
      },
    ],
  },
];

export const espaciosPorId = new Map(espacios.map((espacio) => [espacio.id, espacio]));

/* -------------------------------------------------------------------------- */
/* Mesas                                                                       */
/* -------------------------------------------------------------------------- */

/** Prefijo del código según el tipo de mesa. */
const PREFIJO: Record<StandKind, string> = {
  ilustrador: 'I',
  emprendimiento: 'E',
  tienda: 'T',
  comida: 'C',
  organizacion: 'O',
};

type Plaza = {
  numero: number;
  kind: StandKind;
  espacioId: Stand['espacioId'];
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
};

/** Atajo para declarar una fila horizontal de mesas equiespaciadas. */
function filaH(
  base: Omit<Plaza, 'numero' | 'x'>,
  numeros: number[],
  xInicial: number,
  paso: number,
): Plaza[] {
  return numeros.map((numero, i) => ({ ...base, numero, x: xInicial + i * paso }));
}

/** Atajo para declarar una columna vertical de mesas equiespaciadas. */
function filaV(
  base: Omit<Plaza, 'numero' | 'y'>,
  numeros: number[],
  yInicial: number,
  paso: number,
): Plaza[] {
  return numeros.map((numero, i) => ({ ...base, numero, y: yInicial + i * paso }));
}

const LIRIO = 'lirio' as const;
const ORQUIDEA = 'orquidea' as const;

const plazas: Plaza[] = [
  /* ----------------------------- SALÓN LIRIO ----------------------------- */

  // Emprendedores 1-5: fila superior
  ...filaH(
    { kind: 'emprendimiento', espacioId: LIRIO, y: 34, width: 97, height: 33 },
    [1, 2, 3, 4, 5],
    289,
    101,
  ),
  // Emprendedor 6: junto a la entrada
  { numero: 6, kind: 'emprendimiento', espacioId: LIRIO, x: 932, y: 39, width: 40, height: 113 },

  // Ilustradores 10-12: diagonal de la esquina cortada
  { numero: 12, kind: 'ilustrador', espacioId: LIRIO, x: 198, y: 78, width: 44, height: 97, rotate: -45 },
  { numero: 11, kind: 'ilustrador', espacioId: LIRIO, x: 132, y: 153, width: 44, height: 97, rotate: -45 },
  { numero: 10, kind: 'ilustrador', espacioId: LIRIO, x: 66, y: 228, width: 44, height: 97, rotate: -45 },

  // Isla 1 (13-24), en torno al hueco central de arriba
  ...filaH({ kind: 'ilustrador', espacioId: LIRIO, y: 169, width: 94, height: 40 }, [13, 14, 15, 16], 386, 101),
  ...filaV({ kind: 'ilustrador', espacioId: LIRIO, x: 793, width: 40, height: 88 }, [17, 18], 219, 97),
  ...filaH({ kind: 'ilustrador', espacioId: LIRIO, y: 426, width: 94, height: 40 }, [22, 21, 20, 19], 386, 101),
  ...filaV({ kind: 'ilustrador', espacioId: LIRIO, x: 339, width: 40, height: 88 }, [24, 23], 219, 97),

  // Isla 2 (25-34), en torno al hueco central de abajo
  ...filaH({ kind: 'ilustrador', espacioId: LIRIO, y: 570, width: 94, height: 40 }, [25, 26, 27], 386, 101),
  ...filaV({ kind: 'ilustrador', espacioId: LIRIO, x: 692, width: 40, height: 88 }, [28, 29], 620, 97),
  ...filaH({ kind: 'ilustrador', espacioId: LIRIO, y: 827, width: 94, height: 40 }, [32, 31, 30], 386, 101),
  ...filaV({ kind: 'ilustrador', espacioId: LIRIO, x: 339, width: 40, height: 88 }, [34, 33], 620, 97),

  // Ilustradores 1-2: pared derecha
  ...filaV({ kind: 'ilustrador', espacioId: LIRIO, x: 929, width: 40, height: 88 }, [1, 2], 523, 97),

  // Ilustradores 3-4: diagonal de la esquina inferior derecha
  { numero: 3, kind: 'ilustrador', espacioId: LIRIO, x: 846, y: 792, width: 44, height: 88, rotate: -55 },
  { numero: 4, kind: 'ilustrador', espacioId: LIRIO, x: 780, y: 854, width: 44, height: 88, rotate: -55 },

  // Ilustradores 5-9: fila inferior
  ...filaH({ kind: 'ilustrador', espacioId: LIRIO, y: 958, width: 97, height: 40 }, [9, 8, 7, 6, 5], 150, 101),

  /* --------------------------- PATIO ORQUÍDEA ---------------------------- */

  // Emprendedores 12-14: columna central
  ...filaV({ kind: 'emprendimiento', espacioId: ORQUIDEA, x: 377, width: 45, height: 107 }, [14, 13, 12], 165, 109),

  // Emprendedores 10-11: fila bajo la estructura central
  ...filaH({ kind: 'emprendimiento', espacioId: ORQUIDEA, y: 494, width: 109, height: 37 }, [10, 11], 129, 113),

  // Emprendedores 8-9: pared izquierda
  ...filaV({ kind: 'emprendimiento', espacioId: ORQUIDEA, x: 66, width: 45, height: 107 }, [9, 8], 544, 109),

  // Emprendedor 7: diagonal de la esquina
  { numero: 7, kind: 'emprendimiento', espacioId: ORQUIDEA, x: 96, y: 777, width: 45, height: 107, rotate: -25 },

  // Comida 1-4: columna de la pared derecha
  ...filaV({ kind: 'comida', espacioId: ORQUIDEA, x: 671, width: 45, height: 105 }, [1, 2, 3, 4], 165, 107),

  // Tiendas 1-2: fila inferior
  ...filaH({ kind: 'tienda', espacioId: ORQUIDEA, y: 898, width: 106, height: 37 }, [1, 2], 191, 108),
];

/**
 * Ocupación de la edición vigente.
 *
 * ⚠️ Demo, mientras la Fase 4 no reparta mesas de verdad. En producción esto
 * sale de la tabla `reservations`: `ocupado` con reserva confirmada,
 * `reservado` con reserva pendiente de pago.
 */
const ocupacion: Record<
  string,
  { status?: StandStatus; exhibitorId?: string; externalName?: string }
> = {
  I13: { status: 'ocupado', exhibitorId: 'tinta-verde' },
  I14: { status: 'ocupado', exhibitorId: 'colibri' },
  I15: { status: 'ocupado', exhibitorId: 'wawita' },
  I17: { status: 'reservado' },
  I20: { status: 'ocupado', exhibitorId: 'tornillo' },
  I21: { status: 'ocupado', exhibitorId: 'sirena' },
  I25: { status: 'ocupado', exhibitorId: 'chaco' },
  I26: { status: 'ocupado', exhibitorId: 'nube' },
  I28: { status: 'reservado' },
  I30: { status: 'ocupado', exhibitorId: 'pixel-yuca' },
  I33: { status: 'ocupado', exhibitorId: 'lunaria' },
  I5: { status: 'ocupado', exhibitorId: 'papaya' },
  I6: { status: 'ocupado', exhibitorId: 'cactus' },
  I7: { status: 'reservado' },
  I10: { status: 'ocupado', exhibitorId: 'mishi' },
  I11: { status: 'ocupado', exhibitorId: 'nogal' },
  I1: { status: 'ocupado', exhibitorId: 'raiz' },

  E1: { status: 'ocupado', exhibitorId: 'quirquincho' },
  E2: { status: 'reservado' },
  E9: { status: 'ocupado', exhibitorId: 'telar' },

  C1: { status: 'ocupado', exhibitorId: 'saltenas' },
  C2: { status: 'ocupado', exhibitorId: 'matcha' },
  C3: { status: 'reservado' },
};

export const stands: Stand[] = plazas.map((plaza) => {
  const id = `${PREFIJO[plaza.kind]}${plaza.numero}`;
  return {
    id,
    numero: plaza.numero,
    espacioId: plaza.espacioId,
    kind: plaza.kind,
    x: plaza.x,
    y: plaza.y,
    width: plaza.width,
    height: plaza.height,
    rotate: plaza.rotate,
    status: 'disponible' as StandStatus,
    maxCompaneros: 1,
    ...ocupacion[id],
  };
});

export const standsPorId = new Map(stands.map((stand) => [stand.id, stand]));

export function getStand(id: string | null | undefined): Stand | undefined {
  return id ? standsPorId.get(id) : undefined;
}

export function standsDeEspacio(espacioId: Stand['espacioId']): Stand[] {
  return stands.filter((stand) => stand.espacioId === espacioId);
}

/* -------------------------------------------------------------------------- */
/* Presentación                                                                */
/* -------------------------------------------------------------------------- */

/** Estado de la mesa: decide el relleno. */
export const ESTADOS: Record<StandStatus, { label: string; help: string }> = {
  disponible: { label: 'Libre', help: 'Se puede reservar' },
  reservado: { label: 'Reservada', help: 'Apartada, pago sin confirmar' },
  ocupado: { label: 'Pagada', help: 'Mesa confirmada' },
};

/**
 * Tipo de mesa: decide el color.
 * Se respetan los colores del plano impreso para que la gente reconozca el
 * mapa: morado emprendedores, rosa tiendas, celeste comida, verde ilustradores.
 */
export const ZONAS: Record<
  StandKind,
  { label: string; plural: string; help: string; fill: string; stroke: string; text: string; swatch: string }
> = {
  ilustrador: {
    label: 'Ilustrador',
    plural: 'Ilustradores',
    help: 'Ilustración, cómics, pines y stickers',
    fill: 'fill-feria-verde',
    stroke: 'stroke-feria-verde-deep',
    text: 'fill-white',
    swatch: 'bg-feria-verde border-feria-verde-deep',
  },
  emprendimiento: {
    label: 'Emprendedor',
    plural: 'Emprendedores',
    help: 'Marcas y productos',
    fill: 'fill-feria-morado',
    stroke: 'stroke-feria-morado-deep',
    text: 'fill-white',
    swatch: 'bg-feria-morado border-feria-morado-deep',
  },
  tienda: {
    label: 'Tienda',
    plural: 'Tiendas',
    help: 'Comercios invitados',
    fill: 'fill-feria-rosa',
    stroke: 'stroke-feria-rosa-deep',
    text: 'fill-white',
    swatch: 'bg-feria-rosa border-feria-rosa-deep',
  },
  comida: {
    label: 'Comida',
    plural: 'Comida',
    help: 'Food trucks y repostería',
    fill: 'fill-feria-celeste',
    stroke: 'stroke-feria-celeste-deep',
    text: 'fill-white',
    swatch: 'bg-feria-celeste border-feria-celeste-deep',
  },
  organizacion: {
    label: 'Organización',
    plural: 'Organización',
    help: 'Acreditación y merch oficial',
    fill: 'fill-yuca-ink-soft',
    stroke: 'stroke-yuca-ink',
    text: 'fill-white',
    swatch: 'bg-yuca-ink-soft border-yuca-ink',
  },
};
