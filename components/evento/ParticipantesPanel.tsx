'use client';

import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MapPin, Search } from 'lucide-react';
import { expositores } from '@/lib/data/expositores';
import { ZONAS, getStand } from '@/lib/data/feria';
import { useStandSelection } from '@/hooks/useStandSelection';
import type { EspacioId, StandKind } from '@/lib/types';
import { Avatar, VerifiedBadge } from '@/components/ui/Badges';
import StandMap from './StandMap';
import StandLegend from './StandLegend';
import StandDetail from './StandDetail';
import ExpositorSocials from './ExpositorSocials';

/**
 * El tipo de un participante se deduce de la mesa que ocupa, no de su perfil:
 * el plano es la fuente de verdad de quién es ilustrador, tienda o comida.
 */
const TIPOS: { id: 'todos' | StandKind; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'ilustrador', label: ZONAS.ilustrador.plural },
  { id: 'emprendimiento', label: ZONAS.emprendimiento.plural },
  { id: 'tienda', label: ZONAS.tienda.plural },
  { id: 'comida', label: ZONAS.comida.plural },
];

type TipoId = (typeof TIPOS)[number]['id'];

function tipoDe(expositor: (typeof expositores)[number]): StandKind | undefined {
  return getStand(expositor.standId)?.kind;
}

/** Categorías de arte presentes en esta edición, para el segundo filtro. */
function categoriasDisponibles() {
  const set = new Set<string>();
  expositores.forEach((e) => e.categories.forEach((c) => set.add(c)));
  return ['Todas', ...Array.from(set).sort()];
}

/** Bajo el nombre: sus categorías de arte, o el tipo de mesa si no es artista. */
function subtitulo(expositor: (typeof expositores)[number]): string {
  if (expositor.categories.length > 0) return expositor.categories.join(' · ');
  const kind = tipoDe(expositor);
  return kind ? ZONAS[kind].label : '';
}

/**
 * Mapa + lista de participantes, sincronizados en ambos sentidos:
 * clic en el mapa resalta la tarjeta, clic en la tarjeta centra el mapa.
 */
export default function ParticipantesPanel() {
  const { selected, origin, select } = useStandSelection();
  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState<TipoId>('todos');
  const [espacioId, setEspacioId] = useState<EspacioId>('lirio');
  const [categoria, setCategoria] = useState('Todas');
  const reduce = useReducedMotion();

  const categorias = useMemo(categoriasDisponibles, []);

  const visibles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expositores.filter((e) => {
      const coincideTexto =
        !q ||
        e.displayName.toLowerCase().includes(q) ||
        e.standId?.toLowerCase().includes(q) ||
        e.categories.some((c) => c.toLowerCase().includes(q));
      const coincideTipo = tipo === 'todos' || tipoDe(e) === tipo;
      const coincideCategoria =
        categoria === 'Todas' || e.categories.includes(categoria as never);
      return coincideTexto && coincideTipo && coincideCategoria;
    });
  }, [query, tipo, categoria]);

  // La categoría de arte sólo tiene sentido mirando ilustradores.
  const mostrarCategorias = tipo === 'todos' || tipo === 'ilustrador';

  /** Elegir a alguien de la lista lleva el mapa a su sala y resalta su mesa. */
  const irAMesa = (standId: string | undefined) => {
    if (!standId) return;
    const stand = getStand(standId);
    if (stand) setEspacioId(stand.espacioId);
    select(standId, 'lista');
  };

  // Selección hecha en el mapa -> traer su tarjeta a la vista en la lista.
  useEffect(() => {
    if (!selected || origin.current !== 'mapa') return;
    document.getElementById(`participante-${selected}`)?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [selected, origin, reduce]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
      {/* Columna del mapa.
          `min-w-0` es imprescindible: por defecto un hijo de grid usa
          min-width:auto, así que el ancho mínimo del plano estiraría la página
          entera en móvil en vez de hacer scroll dentro de su tarjeta. */}
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
        <StandMap
          espacioId={espacioId}
          onEspacioChange={setEspacioId}
          selectedId={selected}
          origin={origin.current}
          onSelect={select}
        />
        <StandLegend />
        <StandDetail standId={selected} onClose={() => selected && select(selected, 'mapa')} />
      </div>

      {/* Columna de la lista */}
      <div className="min-w-0">
        <div className="mb-4 flex flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">Buscar artista o stand</span>
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-yuca-ink-soft"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, stand o categoría"
              className="field pl-11"
            />
          </label>

          <div>
            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-yuca-ink-soft">
              Tipo
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTipo(item.id);
                    setCategoria('Todas');
                  }}
                  aria-pressed={tipo === item.id}
                  className={`pill transition-colors ${
                    tipo === item.id
                      ? 'bg-yuca-green text-white'
                      : 'bg-yuca-cream/70 text-yuca-green-deep hover:bg-yuca-cream'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {mostrarCategorias && (
            <div>
              <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-yuca-ink-soft">
                Categoría de arte
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categorias.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategoria(item)}
                    aria-pressed={categoria === item}
                    className={`pill transition-colors ${
                      categoria === item
                        ? 'bg-yuca-green text-white'
                        : 'bg-yuca-cream/70 text-yuca-green-deep hover:bg-yuca-cream'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mb-3 text-sm text-yuca-ink-soft" aria-live="polite">
          {visibles.length} {visibles.length === 1 ? 'participante' : 'participantes'}
        </p>

        <ul className="flex max-h-[70vh] flex-col gap-2.5 overflow-y-auto pr-1 lg:max-h-[calc(100vh-16rem)]">
          {visibles.map((expositor) => {
            const isSelected = selected === expositor.standId;

            return (
              <li key={expositor.id} id={`participante-${expositor.standId}`}>
                <div
                  className={`card flex items-start gap-3 p-3.5 transition-colors ${
                    isSelected ? 'border-yuca-coral bg-yuca-cream/40' : 'hover:bg-yuca-cream/25'
                  }`}
                >
                  <Avatar src={expositor.avatar} name={expositor.displayName} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-display text-base leading-tight text-yuca-green-deep">
                      {expositor.displayName}
                      {expositor.verified && <VerifiedBadge />}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-yuca-ink-soft">
                      {subtitulo(expositor)}
                    </p>
                    <div className="mt-2">
                      <ExpositorSocials
                        socials={expositor.socials}
                        name={expositor.displayName}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Este botón es el puente lista -> mapa */}
                  <button
                    type="button"
                    onClick={() => irAMesa(expositor.standId)}
                    aria-label={`Ver la mesa de ${expositor.displayName} en el mapa`}
                    className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition-colors ${
                      isSelected
                        ? 'bg-yuca-coral text-white'
                        : 'bg-yuca-green-mist text-yuca-green-deep hover:bg-yuca-cream'
                    }`}
                  >
                    <MapPin size={13} aria-hidden="true" />
                    {getStand(expositor.standId)?.numero ?? expositor.standId}
                  </button>
                </div>
              </li>
            );
          })}

          {visibles.length === 0 && (
            <li className="card p-6 text-center text-sm text-yuca-ink-soft">
              No encontramos artistas con ese filtro.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
