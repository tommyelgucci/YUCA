import { ESTADOS } from '@/lib/data/feria';
import type { StandStatus } from '@/lib/types';

/**
 * Muestra de cada estado. Replica en CSS la trama que el mapa dibuja en SVG,
 * para que la leyenda distinga los estados sin depender del color.
 */
const SWATCH: Record<StandStatus, string> = {
  disponible: 'bg-white border-yuca-green/40',
  reservado:
    'border-yuca-mustard bg-[repeating-linear-gradient(45deg,rgba(226,176,76,.55)_0_3px,rgba(226,176,76,.12)_3px_7px)]',
  ocupado: 'bg-yuca-green border-yuca-green-deep',
  externo:
    'border-yuca-coral-deep bg-yuca-coral/85 bg-[radial-gradient(rgba(255,255,255,.75)_1px,transparent_1px)] bg-[length:6px_6px]',
};

const ORDEN: StandStatus[] = ['disponible', 'reservado', 'ocupado', 'externo'];

export default function StandLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
      {ORDEN.map((status) => (
        <li key={status} className="flex items-center gap-2">
          <span
            className={`h-5 w-7 shrink-0 rounded-md border-2 ${SWATCH[status]}`}
            aria-hidden="true"
          />
          <span className="text-sm">
            <span className="font-bold text-yuca-green-deep">{ESTADOS[status].label}</span>
            <span className="text-yuca-ink-soft"> — {ESTADOS[status].help}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
