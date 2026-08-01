'use client';

import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Sparkles, Ticket } from 'lucide-react';
import { nextEdition } from '@/lib/site';
import { useMotionPresets } from '@/hooks/useMotionPresets';

/** Burbujas decorativas: tamaño, posición y ritmo fijos (deterministas). */
const BUBBLES = [
  { size: 96, left: '6%', delay: '0s', duration: '14s' },
  { size: 44, left: '22%', delay: '3.5s', duration: '11s' },
  { size: 128, left: '48%', delay: '1.5s', duration: '17s' },
  { size: 36, left: '68%', delay: '5s', duration: '10s' },
  { size: 72, left: '82%', delay: '2.5s', duration: '13s' },
  { size: 56, left: '92%', delay: '6.5s', duration: '15s' },
];

/**
 * Banner Frutiger Aero / Y2K para promocionar la edición vigente del festival.
 * Es la única zona de la web que sale de la paleta oliva/crema: cristal,
 * burbujas y verdes/celestes vibrantes.
 */
export default function FrutigerBanner() {
  const { fadeUp, viewport } = useMotionPresets();

  const meta = [
    { icon: CalendarDays, label: nextEdition.date },
    { icon: MapPin, label: nextEdition.venue },
    { icon: Ticket, label: nextEdition.entry },
  ];

  return (
    <section id="festival" className="container-yuca py-8 sm:py-12">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        className="relative isolate overflow-hidden rounded-4xl bg-gradient-to-br from-aero-sky via-aero-aqua to-aero-lime p-1 shadow-glass"
      >
        {/* Burbujas ascendentes. Se ocultan si se pide menos movimiento: sin la
            animación quedarían amontonadas al pie del banner. */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
          aria-hidden="true"
        >
          {BUBBLES.map((bubble) => (
            <span
              key={bubble.left}
              className="absolute bottom-0 rounded-full opacity-70 motion-safe:animate-rise"
              style={{
                width: bubble.size,
                height: bubble.size,
                left: bubble.left,
                animationDelay: bubble.delay,
                animationDuration: bubble.duration,
                background:
                  'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(255,255,255,0.12) 62%, rgba(255,255,255,0.04))',
                boxShadow: 'inset 0 -6px 12px rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>

        {/* Brillo superior tipo Y2K */}
        <div
          className="pointer-events-none absolute -top-1/2 left-1/2 h-full w-[120%] -translate-x-1/2 rounded-[50%] bg-white/35 blur-2xl"
          aria-hidden="true"
        />

        {/* Velo oscuro sobre la mitad del texto: sube el contraste del blanco
            sin apagar el degradado vibrante del resto del banner. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-aero-ink/65 via-aero-ink/25 to-transparent"
          aria-hidden="true"
        />

        <div className="relative grid gap-8 rounded-[1.75rem] p-7 sm:p-10 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <span className="pill mb-4 bg-white/90 text-aero-ink shadow-sm">
              <Sparkles size={14} aria-hidden="true" /> {nextEdition.badge}
            </span>

            <h2 className="mb-3 text-3xl leading-tight text-white drop-shadow-[0_2px_8px_rgba(13,74,99,0.5)] sm:text-4xl">
              {nextEdition.title}
            </h2>

            <p className="max-w-xl text-base leading-relaxed text-white drop-shadow-[0_1px_4px_rgba(13,74,99,0.45)]">
              {nextEdition.description}
            </p>
          </div>

          {/* Tarjeta de cristal con los datos del evento */}
          <div className="glass rounded-3xl bg-white/45 p-5 shadow-glass sm:p-6">
            <ul className="mb-5 flex flex-col gap-3">
              {meta.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm font-bold text-aero-ink">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            <a
              href={nextEdition.cta.href}
              className="btn btn-lg w-full bg-aero-ink text-white shadow-soft hover:bg-[#0a3c52]"
            >
              {nextEdition.cta.label}
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
