'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, MapPin, Store } from 'lucide-react';
import { proximosEventos } from '@/lib/data/eventos';
import { useMotionPresets } from '@/hooks/useMotionPresets';
import Section, { SectionHeading } from '@/components/ui/Section';

/** Agenda: los eventos que vienen, con enlace al que ya tiene página propia. */
export default function ProximosEventos() {
  const { fadeUp, stagger, hoverLift, transition, viewport } = useMotionPresets();

  return (
    <Section id="agenda" aria-labelledby="titulo-agenda">
      <SectionHeading
        id="titulo-agenda"
        eyebrow="Agenda"
        title="Próximos eventos"
        description="Lo que se viene este año. Las fechas y sedes que faltan se anuncian primero en nuestras redes y en el Discord."
      />

      <motion.ul
        className="grid gap-4 sm:grid-cols-2"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
      >
        {proximosEventos.map((evento) => (
          <motion.li key={evento.id} variants={fadeUp}>
            <motion.article
              whileHover={hoverLift}
              transition={transition}
              className="card flex h-full flex-col p-6 hover:shadow-card"
            >
              <h3 className="mb-3 text-2xl leading-tight">{evento.name}</h3>

              <ul className="mb-4 flex flex-col gap-2 text-sm font-semibold text-yuca-ink-soft">
                <li className="flex items-center gap-2">
                  <CalendarDays size={15} className="shrink-0 text-yuca-green" aria-hidden="true" />
                  {evento.dateLabel}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={15} className="shrink-0 text-yuca-green" aria-hidden="true" />
                  {evento.venue}
                </li>
                {evento.hasFeria && (
                  <li className="flex items-center gap-2">
                    <Store size={15} className="shrink-0 text-yuca-green" aria-hidden="true" />
                    Con feria de artistas
                  </li>
                )}
              </ul>

              <p className="mb-5 text-sm leading-relaxed text-yuca-ink-soft">{evento.description}</p>

              <div className="mt-auto">
                {evento.href ? (
                  <Link href={evento.href} className="btn-secondary btn-md group w-full sm:w-auto">
                    Ver el evento
                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                ) : (
                  <span className="pill bg-yuca-cream text-yuca-green-deep">Detalles pronto</span>
                )}
              </div>
            </motion.article>
          </motion.li>
        ))}
      </motion.ul>
    </Section>
  );
}
