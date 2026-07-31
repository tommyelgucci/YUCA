import { useMemo } from 'react';
import { useReducedMotion, type Transition, type Variants } from 'framer-motion';

/** Curva de entrada de la marca. Tupla `as const`: Framer exige 4 números exactos. */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Variantes compartidas de Framer Motion.
 *
 * Cuando el sistema pide `prefers-reduced-motion: reduce`, cada preset se
 * degrada a un cambio instantáneo de opacidad (sin desplazamientos, sin escalas
 * y sin bucles), en vez de desactivar la animación a mano en cada componente.
 */
export function useMotionPresets() {
  const reduce = useReducedMotion();

  return useMemo(() => {
    const dur = (value: number) => (reduce ? 0 : value);
    const shift = (value: number) => (reduce ? 0 : value);

    const fadeIn: Variants = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: dur(0.4), ease: EASE } },
    };

    const fadeUp: Variants = {
      hidden: { opacity: 0, y: shift(24) },
      show: { opacity: 1, y: 0, transition: { duration: dur(0.55), ease: EASE } },
    };

    const popIn: Variants = {
      hidden: { opacity: 0, scale: reduce ? 1 : 0.92 },
      show: { opacity: 1, scale: 1, transition: { duration: dur(0.5), ease: EASE } },
    };

    /** Contenedor que escalona la entrada de sus hijos. */
    const stagger: Variants = {
      hidden: {},
      show: {
        transition: { staggerChildren: dur(0.08), delayChildren: dur(0.05) },
      },
    };

    /** Entrada/salida de capas modales. */
    const overlay: Variants = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: dur(0.2) } },
      exit: { opacity: 0, transition: { duration: dur(0.15) } },
    };

    const dialog: Variants = {
      hidden: { opacity: 0, y: shift(24), scale: reduce ? 1 : 0.97 },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: dur(0.28), ease: EASE },
      },
      exit: {
        opacity: 0,
        y: shift(12),
        scale: reduce ? 1 : 0.97,
        transition: { duration: dur(0.18), ease: 'easeIn' },
      },
    };

    /** Transición estándar de hover/selección, reutilizable en cualquier componente. */
    const transition: Transition = { duration: dur(0.25), ease: EASE };

    return {
      /** `true` si hay que evitar movimiento. */
      reduce,
      /** Configuración estándar de scroll-reveal. */
      viewport: { once: true, amount: 0.15 } as const,
      ease: EASE,
      transition,

      fadeIn,
      fadeUp,
      popIn,
      stagger,
      overlay,
      dialog,

      /** Elevación al pasar el cursor. `{}` si se pide menos movimiento. */
      hoverLift: reduce ? {} : { y: -4 },
      hoverPop: reduce ? {} : { y: -3, scale: 1.02 },
      tapPress: reduce ? {} : { scale: 0.98 },

      /** Bucle suave para la mascota; sin bucle si se pide menos movimiento. */
      floatLoop: reduce
        ? {}
        : {
            y: [0, -10, 0],
            transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
          },
    };
  }, [reduce]);
}
