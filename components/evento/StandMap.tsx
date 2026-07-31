'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { ESTADOS, PLANO, referencias, sectores, stands } from '@/lib/data/feria';
import { getExpositorPorStand } from '@/lib/data/expositores';
import type { SelectionOrigin } from '@/hooks/useStandSelection';

const ZOOMS = [1, 1.5, 2.25] as const;

interface Props {
  selectedId: string | null;
  origin: SelectionOrigin;
  onSelect: (standId: string, origin: SelectionOrigin) => void;
}

/**
 * Plano interactivo de la feria.
 *
 * El SVG se genera desde `lib/data/feria.ts`: cada stand es un `<g>` con su
 * propio id, enfocable con teclado y con `aria-label` que dice el estado en
 * palabras — el color nunca es la única señal (cada estado tiene además su
 * propia trama, ver la leyenda).
 */
export default function StandMap({ selectedId, origin, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0);
  const reduce = useReducedMotion();

  // Cuando la selección viene de la lista (o de un enlace), hay que traer el
  // stand al centro del visor; si viene del propio mapa ya está a la vista.
  useEffect(() => {
    if (!selectedId || origin === 'mapa') return;
    const node = document.getElementById(`stand-${selectedId}`);
    node?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedId, origin, reduce]);

  const zoomIn = () => setZoom((z) => Math.min(z + 1, ZOOMS.length - 1));
  const zoomOut = () => setZoom((z) => Math.max(z - 1, 0));

  return (
    <div className="card overflow-hidden">
      {/* Controles de zoom: en móvil el plano completo no se lee a 390 px */}
      <div className="flex items-center justify-between gap-3 border-b border-yuca-green/10 px-4 py-2.5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-yuca-ink-soft">
          Plano de la feria
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom === 0}
            className="btn-ghost p-2"
            aria-label="Alejar el plano"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <span className="w-10 text-center text-xs font-bold text-yuca-ink-soft" aria-live="polite">
            {Math.round(ZOOMS[zoom] * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom === ZOOMS.length - 1}
            className="btn-ghost p-2"
            aria-label="Acercar el plano"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(0)}
            className="btn-ghost p-2"
            aria-label="Ver el plano completo"
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-auto bg-yuca-cream/25 p-3">
        <svg
          viewBox={`0 0 ${PLANO.width} ${PLANO.height}`}
          className="h-auto"
          style={{ width: `${ZOOMS[zoom] * 100}%`, minWidth: ZOOMS[zoom] > 1 ? 900 : 520 }}
          role="group"
          aria-label="Plano interactivo de stands"
        >
          <defs>
            {/* Tramas: el estado no puede depender sólo del color */}
            <pattern id="trama-reservado" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M0,8 l8,-8" className="stroke-yuca-mustard" strokeWidth="2.5" />
            </pattern>
            <pattern id="trama-externo" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.1" className="fill-white/70" />
            </pattern>
          </defs>

          {/* Sectores */}
          {sectores.map((sector) => (
            <g key={sector.id}>
              <rect
                x={sector.x}
                y={sector.y}
                width={sector.width}
                height={sector.height}
                rx="22"
                className="fill-white/70 stroke-yuca-green/25"
                strokeWidth="1.5"
                strokeDasharray="6 5"
              />
              <text
                x={sector.x + 16}
                y={sector.y + 26}
                className="fill-yuca-green-deep font-display"
                fontSize="19"
              >
                {sector.name}
              </text>
            </g>
          ))}

          {/* Referencias del recinto */}
          {referencias.map((ref) => (
            <g key={ref.id}>
              <rect
                x={ref.x}
                y={ref.y}
                width={ref.width}
                height={ref.height}
                rx="10"
                className="fill-yuca-cream stroke-yuca-cream-deep"
                strokeWidth="1.5"
              />
              <text
                x={ref.x + ref.width / 2}
                y={ref.y + ref.height / 2 + 4}
                textAnchor="middle"
                className="fill-yuca-ink-soft"
                fontSize="12"
                fontWeight="700"
              >
                {ref.label}
              </text>
            </g>
          ))}

          {/* Stands */}
          {stands.map((stand) => {
            const estado = ESTADOS[stand.status];
            const expositor = getExpositorPorStand(stand.id);
            const isSelected = selectedId === stand.id;

            const ocupante =
              expositor?.displayName ?? stand.externalName ?? estado.label.toLowerCase();

            return (
              <g
                key={stand.id}
                id={`stand-${stand.id}`}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Stand ${stand.id}. ${estado.label}. ${ocupante}.`}
                className="cursor-pointer outline-none [&:focus-visible>rect:first-of-type]:stroke-yuca-coral"
                onClick={() => onSelect(stand.id, 'mapa')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(stand.id, 'mapa');
                  }
                }}
              >
                <rect
                  x={stand.x}
                  y={stand.y}
                  width={stand.width}
                  height={stand.height}
                  rx="9"
                  className={`${estado.fill} ${estado.stroke} transition-[filter] duration-200 hover:brightness-105`}
                  strokeWidth="1.5"
                />

                {/* Trama por estado, encima del relleno */}
                {stand.status === 'reservado' && (
                  <rect
                    x={stand.x}
                    y={stand.y}
                    width={stand.width}
                    height={stand.height}
                    rx="9"
                    fill="url(#trama-reservado)"
                    opacity="0.55"
                    pointerEvents="none"
                  />
                )}
                {stand.status === 'externo' && (
                  <rect
                    x={stand.x}
                    y={stand.y}
                    width={stand.width}
                    height={stand.height}
                    rx="9"
                    fill="url(#trama-externo)"
                    pointerEvents="none"
                  />
                )}

                <text
                  x={stand.x + stand.width / 2}
                  y={stand.y + stand.height / 2 + 4}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="800"
                  className={`${estado.text} pointer-events-none select-none`}
                >
                  {stand.id}
                </text>

                {/* Realce del stand seleccionado */}
                {isSelected && (
                  <rect
                    x={stand.x - 4}
                    y={stand.y - 4}
                    width={stand.width + 8}
                    height={stand.height + 8}
                    rx="13"
                    fill="none"
                    className="stroke-yuca-coral motion-safe:animate-pulse"
                    strokeWidth="3"
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
