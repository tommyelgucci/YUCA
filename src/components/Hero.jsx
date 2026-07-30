import { motion } from 'framer-motion';
import { ArrowRight, Leaf, Sparkles } from 'lucide-react';
import { brand, nextEdition } from '../data/site';
import { useMotionPresets } from '../hooks/useMotionPresets';
import Mascot from './Mascot';

export default function Hero({ onOpenAuth }) {
  const { fadeUp, popIn, stagger } = useMotionPresets();

  return (
    <section id="inicio" className="relative overflow-hidden">
      {/* Manchas decorativas de fondo */}
      <div
        className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-yuca-cream/70 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-32 top-40 h-72 w-72 rounded-full bg-yuca-green-mist blur-3xl"
        aria-hidden="true"
      />

      <div className="container-yuca relative grid items-center gap-10 pb-16 pt-12 sm:pt-16 md:grid-cols-2 md:gap-14 lg:pb-24 lg:pt-20">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.span
            variants={fadeUp}
            className="pill mb-5 bg-yuca-cream text-yuca-green-deep"
          >
            <Sparkles size={14} aria-hidden="true" /> Comunidad de arte boliviana
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mb-4 text-4xl leading-[1.1] sm:text-5xl lg:text-6xl"
          >
            Un mundo donde los <span className="text-gradient-yuca">artistas conviven</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mb-8 max-w-md text-lg leading-relaxed text-yuca-ink-soft"
          >
            {brand.description} Próxima edición del {brand.festival}:{' '}
            <span className="font-bold text-yuca-green-deep">{nextEdition.date.toLowerCase()}</span>.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="btn-primary btn-lg group"
            >
              Únete a la comunidad
              <ArrowRight
                size={18}
                aria-hidden="true"
                className="transition-transform duration-200 ease-yuca group-hover:translate-x-1"
              />
            </button>
            <a href="#festival" className="btn-outline btn-lg">
              Ver próximo evento
            </a>
          </motion.div>

          {/* Resumen rápido de lo que ofrece el festival */}
          <motion.ul
            variants={fadeUp}
            className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-yuca-ink-soft"
          >
            {nextEdition.highlights.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Leaf size={15} className="text-yuca-green" aria-hidden="true" />
                {item}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Mascota */}
        <motion.div
          className="relative flex justify-center"
          variants={popIn}
          initial="hidden"
          animate="show"
        >
          <div className="relative flex h-64 w-64 items-center justify-center rounded-full bg-yuca-cream/70 ring-1 ring-yuca-green/10 sm:h-80 sm:w-80 lg:h-96 lg:w-96">
            {/* Hojas satélite */}
            <Leaf
              className="absolute -left-2 top-8 h-9 w-9 -rotate-12 text-yuca-green/70 motion-safe:animate-float"
              aria-hidden="true"
            />
            <Leaf
              className="absolute -right-1 bottom-10 h-7 w-7 rotate-45 text-yuca-mustard motion-safe:animate-float [animation-delay:1.5s]"
              aria-hidden="true"
            />
            <Mascot
              floating
              alt="Yuquita, la mascota de Proyecto Yuca"
              className="h-48 w-48 drop-shadow-sm sm:h-60 sm:w-60 lg:h-72 lg:w-72"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
