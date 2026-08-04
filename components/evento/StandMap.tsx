'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { ESTADOS, ZONAS, espaciosPorId, espacios } from '@/lib/data/feria';
import { useFeria } from './FeriaContext';
import type { EspacioId } from '@/lib/types';
import type { SelectionOrigin } from '@/hooks/useStandSelection';

const ZOOMS = [1, 1.6, 2.4] as const;

interface Props {
  espacioId: EspacioId;
  onEspacioChange: (espacioId: EspacioId) => void;
  selectedId: string | null;
  origin: SelectionOrigin;
  onSelect: (standId: string, origin: SelectionOrigin) => void;
}

/**
 * Plano interactivo de la feria.
 *
 * Se genera desde `lib/data/feria.ts`, con el contorno real de cada sala —son
 * polígonos, no rectángulos— y la posición y giro que tiene cada mesa en el
 * plano impreso. Cada mesa es un `<g>` enfocable con teclado y con un
 * `aria-label` que dice tipo, número y estado en palabras.
 */
export default function StandMap({
  espacioId,
  onEspacioChange,
  selectedId,
  origin,
  onSelect,
}: Props) {
  const [zoom, setZoom] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { standsDeEspacio, getExpositoresPorStand } = useFeria();

  const espacio = espaciosPorId.get(espacioId)!;
  const mesas = standsDeEspacio(espacioId);

  // Selección venida de la lista o de un enlace: hay que traer la mesa a la
  // vista. Si viene del propio mapa, ya está delante.
  useEffect(() => {
    if (!selectedId || origin === 'mapa') return;
    document.getElementById(`stand-${selectedId}`)?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedId, origin, reduce, espacioId]);

  return (
    <div className="card overflow-hidden">
      {/* Cambio de espacio: son dos salas conectadas, no un solo plano */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-yuca-green/10 p-2">
        <div role="tablist" aria-label="Espacio del recinto" className="flex gap-1">
          {espacios.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === espacioId}
              onClick={() => onEspacioChange(item.id)}
              className={`rounded-2xl px-3.5 py-2 text-sm font-bold transition-colors ${
                item.id === espacioId
                  ? 'bg-yuca-green text-white'
                  : 'text-yuca-ink-soft hover:bg-yuca-cream'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 1, 0))}
            disabled={zoom === 0}
            className="btn-ghost p-2"
            aria-label="Alejar el plano"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <span className="w-11 text-center text-xs font-bold text-yuca-ink-soft" aria-live="polite">
            {Math.round(ZOOMS[zoom] * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 1, ZOOMS.length - 1))}
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

      <div ref={scrollRef} className="overflow-auto bg-yuca-cream/20 p-3">
        <svg
          viewBox={`-30 -46 ${espacio.viewBox.width + 60} ${espacio.viewBox.height + 92}`}
          className="h-auto"
          style={{ width: `${ZOOMS[zoom] * 100}%`, minWidth: ZOOMS[zoom] > 1 ? 780 : 420 }}
          role="group"
          aria-label={`Plano de ${espacio.name}`}
        >
          <defs>
            {/* La mesa apartada lleva trama además de color: el estado no puede
                depender sólo del relleno. */}
            <pattern id="trama-reservada" width="9" height="9" patternUnits="userSpaceOnUse">
              <path d="M0,9 l9,-9" className="stroke-yuca-ink/45" strokeWidth="3" />
            </pattern>
          </defs>

          {/* Contorno de la sala */}
          <polygon
            points={espacio.outline}
            className="fill-white stroke-yuca-green/40"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Escenario, entradas y estructuras */}
          {espacio.landmarks.map((landmark) => {
            const cx = landmark.x + landmark.width / 2;
            const cy = landmark.y + landmark.height / 2;

            return (
              <g key={landmark.id}>
                <rect
                  x={landmark.x}
                  y={landmark.y}
                  width={landmark.width}
                  height={landmark.height}
                  rx={landmark.variant === 'hueco' ? 4 : 10}
                  className={
                    landmark.variant === 'estructura'
                      ? 'fill-yuca-cream-deep/70 stroke-yuca-cream-deep'
                      : landmark.variant === 'hueco'
                        ? 'fill-yuca-mustard/70 stroke-yuca-mustard-deep'
                        : 'fill-yuca-cream stroke-yuca-cream-deep'
                  }
                  strokeWidth="1.5"
                />
                {landmark.label && (
                  <text
                    x={cx}
                    y={
                      landmark.labelPlacement === 'arriba'
                        ? landmark.y - 10
                        : landmark.labelPlacement === 'abajo'
                          ? landmark.y + landmark.height + 24
                          : cy + 6
                    }
                    textAnchor="middle"
                    className="fill-yuca-ink-soft"
                    fontSize={landmark.labelPlacement && landmark.labelPlacement !== 'dentro' ? 17 : 19}
                    fontWeight="800"
                    transform={landmark.vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
                  >
                    {landmark.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Mesas.
              El color dice de qué tipo es (los mismos del plano impreso) y el
              relleno dice si se puede pedir: blanca libre, con trama apartada,
              sólida pagada. */}
          {mesas.map((stand) => {
            const zona = ZONAS[stand.kind];
            const estado = ESTADOS[stand.status];
            const ocupantes = getExpositoresPorStand(stand.id);
            const isSelected = selectedId === stand.id;
            const pagada = stand.status === 'ocupado';

            const cx = stand.x + stand.width / 2;
            const cy = stand.y + stand.height / 2;
            const giro = stand.rotate ? `rotate(${stand.rotate} ${cx} ${cy})` : undefined;

            // Se nombran todos: quien no ve el mapa se entera por aquí de que
            // esa mesa la comparten dos personas, igual que quien la mira.
            const ocupante =
              ocupantes.map((persona) => persona.displayName).join(' y ') || stand.externalName;
            const etiqueta = `${zona.label} ${stand.numero}. ${estado.label}.${
              ocupante ? ` ${ocupante}.` : ''
            }`;

            return (
              <g
                key={stand.id}
                id={`stand-${stand.id}`}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={etiqueta}
                transform={giro}
                className="cursor-pointer outline-none [&:focus-visible>rect:first-of-type]:stroke-yuca-ink"
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
                  rx="5"
                  className={`${pagada ? zona.fill : 'fill-white'} ${zona.stroke} transition-[filter] duration-200 hover:brightness-110`}
                  strokeWidth={pagada ? 2 : 3}
                />

                {stand.status === 'reservado' && (
                  <rect
                    x={stand.x}
                    y={stand.y}
                    width={stand.width}
                    height={stand.height}
                    rx="5"
                    fill="url(#trama-reservada)"
                    pointerEvents="none"
                  />
                )}

                <text
                  x={cx}
                  y={cy + 8}
                  textAnchor="middle"
                  fontSize="24"
                  fontWeight="800"
                  className={`${pagada ? zona.text : 'fill-yuca-ink'} pointer-events-none select-none`}
                >
                  {stand.numero}
                </text>

                {isSelected && (
                  <rect
                    x={stand.x - 6}
                    y={stand.y - 6}
                    width={stand.width + 12}
                    height={stand.height + 12}
                    rx="10"
                    fill="none"
                    className="stroke-yuca-ink motion-safe:animate-pulse"
                    strokeWidth="4"
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
