'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, MapPin, Sparkles, Ticket } from 'lucide-react';
import { edicionActual } from '@/lib/data/edicion';
import { ctaMesa } from '@/lib/data/convocatorias';
import { useAuthModal } from '@/components/layout/AuthModalContext';
import { useMotionPresets } from '@/hooks/useMotionPresets';
import { bs } from '@/lib/utils';

/** Banner principal de la página del evento. */
export default function EventHero() {
  const { fadeUp, stagger } = useMotionPresets();
  const openAuth = useAuthModal();
  const { ticket } = edicionActual;
  const mesa = ctaMesa();

  const datos = [
    { Icon: CalendarDays, value: edicionActual.dateLabel },
    { Icon: MapPin, value: `${edicionActual.venue} · ${edicionActual.city}` },
    { Icon: Ticket, value: ticket.label },
  ];

  return (
    <section className="relative isolate overflow-hidden border-b border-yuca-green/10 bg-yuca-cream/40">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-70" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yuca-green-mist blur-3xl"
        aria-hidden="true"
      />

      <motion.div
        className="container-yuca relative py-12 sm:py-16"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.span variants={fadeUp} className="pill mb-4 bg-white text-yuca-green-deep shadow-soft">
          <Sparkles size={14} aria-hidden="true" /> Próxima edición
        </motion.span>

        <motion.h1 variants={fadeUp} className="mb-4 text-4xl leading-[1.1] sm:text-5xl">
          {edicionActual.name}
        </motion.h1>

        <motion.ul
          variants={fadeUp}
          className="mb-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6"
        >
          {datos.map(({ Icon, value }) => (
            <li key={value} className="flex items-center gap-2 font-semibold text-yuca-ink-soft">
              <Icon size={16} className="shrink-0 text-yuca-green" aria-hidden="true" />
              {value}
            </li>
          ))}
        </motion.ul>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
          <button type="button" onClick={() => openAuth('signup')} className="btn-primary btn-lg">
            <Ticket size={18} aria-hidden="true" />
            {ticket.priceBob === null
              ? 'Confirmar asistencia'
              : `Reservar entrada · ${bs(ticket.priceBob)}`}
          </button>
          <a
            href={mesa.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline btn-lg group"
          >
            {mesa.label}
            <ArrowUpRight
              size={17}
              aria-hidden="true"
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
