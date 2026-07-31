'use client';

import { motion } from 'framer-motion';
import { useMotionPresets } from '@/hooks/useMotionPresets';

/** Puntos de anclaje de las hojas sobre la onda de la vid. */
const LEAVES = Array.from({ length: 8 }, (_, i) => ({
  x: 75 + i * 150,
  y: i % 2 === 0 ? 19 : 41, // crestas arriba / abajo, alternadas
  up: i % 2 === 0,
}));

/**
 * Motivo de vid/enredadera: la firma visual que separa las secciones.
 *
 * `flip` voltea la onda para alternar el motivo entre secciones.
 */
export default function VineDivider({ flip = false, className = '' }) {
  const { reduce, viewport } = useMotionPresets();

  return (
    <div
      className={`w-full overflow-hidden leading-none ${flip ? 'rotate-180' : ''} ${className}`}
      aria-hidden="true"
    >
      <motion.svg
        viewBox="0 0 1200 60"
        className="h-10 w-full sm:h-14"
        preserveAspectRatio="none"
        initial="hidden"
        whileInView="show"
        viewport={viewport}
      >
        {/* Tallo principal: se “dibuja” al entrar en pantalla */}
        <motion.path
          d="M0,30 Q75,8 150,30 T300,30 T450,30 T600,30 T750,30 T900,30 T1050,30 T1200,30"
          fill="none"
          stroke="currentColor"
          className="text-yuca-mustard"
          strokeWidth="2.5"
          strokeLinecap="round"
          variants={{
            hidden: { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 },
            show: {
              pathLength: 1,
              opacity: 1,
              transition: { duration: reduce ? 0 : 1.1, ease: 'easeInOut' },
            },
          }}
        />

        {LEAVES.map((leaf, index) => (
          <motion.g
            key={leaf.x}
            transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.up ? -28 : 152})`}
            variants={{
              hidden: { opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.4 },
              show: {
                opacity: 1,
                scale: 1,
                transition: {
                  duration: reduce ? 0 : 0.35,
                  delay: reduce ? 0 : 0.25 + index * 0.07,
                },
              },
            }}
            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
          >
            {/* Hoja */}
            <path
              d="M0,0 C7,-11 21,-13 28,-6 C21,3 7,6 0,0 Z"
              className={leaf.up ? 'fill-yuca-green' : 'fill-yuca-green-soft'}
            />
            {/* Nervadura */}
            <path d="M2,-1 C10,-4 18,-5 25,-6" fill="none" stroke="#faf8f5" strokeWidth="1" strokeLinecap="round" />
          </motion.g>
        ))}

        {/* Frutos: acentos de color de marca */}
        {[
          { cx: 300, cy: 30, className: 'fill-yuca-coral' },
          { cx: 750, cy: 30, className: 'fill-yuca-green' },
          { cx: 1050, cy: 30, className: 'fill-yuca-coral' },
        ].map((berry) => (
          <motion.circle
            key={berry.cx}
            cx={berry.cx}
            cy={berry.cy}
            r="4"
            className={berry.className}
            variants={{
              hidden: { opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0 },
              show: {
                opacity: 1,
                scale: 1,
                transition: { duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.7 },
              },
            }}
            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
          />
        ))}
      </motion.svg>
    </div>
  );
}
