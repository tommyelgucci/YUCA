import { motion } from 'framer-motion';
import { useMotionPresets } from '../hooks/useMotionPresets';

/**
 * Envoltorio de sección: mantiene el mismo ritmo vertical y ancho máximo
 * en toda la página (mucho aire entre bloques, como pide el sistema de diseño).
 */
export default function Section({ id, className = '', children, ...rest }) {
  return (
    <section id={id} className={`container-yuca py-16 sm:py-20 ${className}`} {...rest}>
      {children}
    </section>
  );
}

/** Cabecera de sección: antetítulo opcional + título + descripción. */
export function SectionHeading({ eyebrow, title, description, id, className = '' }) {
  const { fadeUp, viewport } = useMotionPresets();

  return (
    <motion.div
      className={`mb-10 max-w-2xl ${className}`}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
    >
      {eyebrow && (
        <span className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-yuca-green">
          {eyebrow}
        </span>
      )}
      <h2 id={id} className="text-3xl leading-tight sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base leading-relaxed text-yuca-ink-soft sm:text-lg">{description}</p>
      )}
    </motion.div>
  );
}
