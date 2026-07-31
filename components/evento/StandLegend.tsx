import { ESTADOS, ZONAS } from '@/lib/data/feria';
import type { StandKind, StandStatus } from '@/lib/types';

/**
 * Leyenda del plano.
 *
 * El mapa cruza dos cosas en cada mesa: de qué zona es (el borde) y si se puede
 * pedir (el relleno). Se explican por separado porque son preguntas distintas:
 * "¿qué venden aquí?" y "¿queda libre?".
 */

/** Muestras del estado; replican en CSS la trama que el SVG dibuja. */
const MUESTRA_ESTADO: Record<StandStatus, string> = {
  disponible: 'bg-white border-yuca-ink-soft/50',
  reservado:
    'border-yuca-mustard bg-[repeating-linear-gradient(45deg,rgba(226,176,76,.6)_0_3px,rgba(255,255,255,0)_3px_7px)]',
  ocupado: 'bg-yuca-ink-soft/80 border-yuca-ink',
};

const ORDEN_ESTADO: StandStatus[] = ['disponible', 'reservado', 'ocupado'];
const ORDEN_ZONA: StandKind[] = ['arte', 'comida', 'emprendimiento', 'organizacion'];

export default function StandLegend() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <h3 className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-yuca-ink-soft">
          Estado de la mesa
        </h3>
        <ul className="flex flex-col gap-2">
          {ORDEN_ESTADO.map((status) => (
            <li key={status} className="flex items-center gap-2">
              <span
                className={`h-5 w-7 shrink-0 rounded-md border-2 ${MUESTRA_ESTADO[status]}`}
                aria-hidden="true"
              />
              <span className="text-sm">
                <span className="font-bold text-yuca-green-deep">{ESTADOS[status].label}</span>
                <span className="text-yuca-ink-soft"> — {ESTADOS[status].help}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-yuca-ink-soft">
          Zona
        </h3>
        <ul className="flex flex-col gap-2">
          {ORDEN_ZONA.map((kind) => (
            <li key={kind} className="flex items-center gap-2">
              <span
                className={`h-5 w-7 shrink-0 rounded-md border-2 ${ZONAS[kind].swatch}`}
                aria-hidden="true"
              />
              <span className="text-sm">
                <span className="font-bold text-yuca-green-deep">{ZONAS[kind].label}</span>
                <span className="text-yuca-ink-soft"> — {ZONAS[kind].help}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
