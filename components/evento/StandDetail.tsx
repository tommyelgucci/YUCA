'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Clock3, MapPin, X } from 'lucide-react';
import { ESTADOS, ZONAS, espaciosPorId } from '@/lib/data/feria';
import { useFeria } from './FeriaContext';
import { useMotionPresets } from '@/hooks/useMotionPresets';
import { Avatar, CategoryBadge, VerifiedBadge } from '@/components/ui/Badges';
import { ctaMesa } from '@/lib/data/convocatorias';
import { precioActual, preventaVigente } from '@/lib/data/preventas';
import ExpositorSocials from './ExpositorSocials';
import { bs } from '@/lib/utils';

/**
 * Tarjeta del stand seleccionado en el mapa.
 *
 * Cambia de contenido según el estado: quién expone, o la vía para reservar la
 * mesa si está libre.
 */
export default function StandDetail({
  standId,
  onClose,
}: {
  standId: string | null;
  onClose: () => void;
}) {
  const { reduce, transition } = useMotionPresets();
  const { getStand, getExpositorPorStand } = useFeria();
  const mesa = ctaMesa();

  const stand = getStand(standId);
  const expositor = getExpositorPorStand(standId);
  const espacio = stand ? espaciosPorId.get(stand.espacioId) : undefined;
  const precio = stand ? precioActual(stand.kind) : null;

  return (
    <AnimatePresence mode="wait">
      {stand && (
        <motion.aside
          key={stand.id}
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : 8 }}
          transition={transition}
          className="card relative p-5"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost absolute right-3 top-3 p-1.5"
            aria-label="Cerrar detalle del stand"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="pill bg-yuca-green-deep text-white">
              {ZONAS[stand.kind].label} {stand.numero}
            </span>
            <span className="pill bg-yuca-cream text-yuca-ink-soft">{espacio?.name}</span>
            <span className="text-xs font-bold text-yuca-ink-soft">
              {ESTADOS[stand.status].label}
            </span>
          </div>

          {expositor ? (
            /* ---------- Stand ocupado por un artista ---------- */
            <div>
              <div className="mb-3 flex items-start gap-3">
                <Avatar src={expositor.avatar} name={expositor.displayName} />
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-lg leading-tight">
                    {expositor.displayName}
                    {expositor.verified && <VerifiedBadge />}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-yuca-ink-soft">
                    <MapPin size={12} aria-hidden="true" /> {espacio?.name}
                  </p>
                </div>
              </div>

              <ul className="mb-3 flex flex-wrap gap-1.5">
                {expositor.categories.map((category) => (
                  <li key={category}>
                    <CategoryBadge category={category} />
                  </li>
                ))}
              </ul>

              <p className="mb-4 text-sm leading-relaxed text-yuca-ink-soft">{expositor.bio}</p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <ExpositorSocials socials={expositor.socials} name={expositor.displayName} size="sm" />
                <Link href={`/artistas/${expositor.slug}`} className="btn-ghost btn-sm group">
                  Ver perfil
                  <ArrowRight
                    size={15}
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </div>
          ) : stand.kind === 'organizacion' ? (
            /* ---------- Espacio de la organización o auspicio ---------- */
            <div>
              <h3 className="mb-1 text-lg">{stand.externalName}</h3>
              <p className="text-sm leading-relaxed text-yuca-ink-soft">
                Espacio de la organización en {espacio?.name}. No se pone a la venta.
              </p>
            </div>
          ) : stand.status === 'reservado' ? (
            /* ---------- Reservado, esperando confirmación de pago ---------- */
            <div>
              <h3 className="mb-1 text-lg">Mesa reservada</h3>
              <p className="flex items-start gap-2 text-sm leading-relaxed text-yuca-ink-soft">
                <Clock3 size={15} className="mt-0.5 shrink-0 text-yuca-mustard" aria-hidden="true" />
                Alguien la apartó y su pago está pendiente de confirmación. Si no se confirma dentro
                del plazo, la mesa vuelve a quedar libre.
              </p>
            </div>
          ) : (
            /* ---------- Disponible ---------- */
            <div>
              <h3 className="mb-1 text-lg">Mesa disponible</h3>
              <p className="mb-4 text-sm leading-relaxed text-yuca-ink-soft">
                {precio !== null && preventaVigente ? (
                  <>
                    <span className="font-bold text-yuca-ink">{bs(precio)}</span> en la{' '}
                    {preventaVigente.label.toLowerCase()}. El precio sube en la tanda siguiente.
                  </>
                ) : (
                  'Precio por confirmar en la próxima preventa.'
                )}
              </p>
              {/* El destino lo decide `ctaMesa()`: el formulario si la
                  convocatoria está abierta, el Discord si la fase ya cerró. */}
              <a
                href={mesa.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-md group w-full"
              >
                {mesa.label}
                <ArrowUpRight
                  size={15}
                  aria-hidden="true"
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
              <p className="mt-2 text-center text-xs text-yuca-ink-soft">{mesa.nota}</p>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
