'use client';

import { motion } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
import { community } from '@/lib/site';
import { useMotionPresets } from '@/hooks/useMotionPresets';
import Mascot from '@/components/layout/Mascot';

/** Bloque "Sé una YUQUITA más": invitación a entrar al Discord. */
export default function CommunityCTA() {
  const { fadeUp, viewport } = useMotionPresets();
  const isExternal = community.cta.href.startsWith('http');

  return (
    <section id="comunidad" className="container-yuca py-16 sm:py-20">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        className="relative isolate overflow-hidden rounded-4xl bg-yuca-green px-6 py-10 shadow-lift sm:px-10 sm:py-12"
      >
        {/* Textura y mascota de fondo */}
        <div className="absolute inset-0 bg-dots opacity-40" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -bottom-10 -right-6 hidden opacity-20 sm:block"
          aria-hidden="true"
        >
          <Mascot className="h-56 w-56" />
        </div>

        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:gap-10 sm:text-left">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-yuca-cream/20 ring-1 ring-white/25"
            aria-hidden="true"
          >
            <Heart size={32} className="text-yuca-cream" />
          </span>

          <div className="flex-1">
            <h2 className="mb-2 text-2xl text-white sm:text-3xl">{community.title}</h2>
            <p className="max-w-xl leading-relaxed text-white/85">{community.description}</p>
          </div>

          <a
            href={community.cta.href}
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="btn btn-lg w-full shrink-0 bg-white text-yuca-green-deep shadow-soft hover:bg-yuca-cream sm:w-auto"
          >
            <MessageCircle size={18} aria-hidden="true" />
            {community.cta.label}
          </a>
        </div>
      </motion.div>
    </section>
  );
}
