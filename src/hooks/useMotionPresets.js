import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

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
    const ease = [0.22, 1, 0.36, 1];
    const dur = (value) => (reduce ? 0 : value);
    const shift = (value) => (reduce ? 0 : value);

    return {
      /** `true` si hay que evitar movimiento. */
      reduce,

      /**
       * Configuración estándar de scroll-reveal.
       * `amount` bajo para que también se dispare con scroll rápido o en
       * pantallas cortas, donde una sección alta apenas asoma.
       */
      viewport: { once: true, amount: 0.15 },

      fadeIn: {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: dur(0.4), ease } },
      },

      fadeUp: {
        hidden: { opacity: 0, y: shift(24) },
        show: { opacity: 1, y: 0, transition: { duration: dur(0.55), ease } },
      },

      popIn: {
        hidden: { opacity: 0, scale: reduce ? 1 : 0.92 },
        show: { opacity: 1, scale: 1, transition: { duration: dur(0.5), ease } },
      },

      /** Contenedor que escalona la entrada de sus hijos. */
      stagger: {
        hidden: {},
        show: {
          transition: { staggerChildren: dur(0.08), delayChildren: dur(0.05) },
        },
      },

      /** Elevación al pasar el cursor / enfocar. `{}` si se pide menos movimiento. */
      hoverLift: reduce ? {} : { y: -4 },
      hoverPop: reduce ? {} : { y: -3, scale: 1.02 },
      tapPress: reduce ? {} : { scale: 0.98 },

      /** Entrada/salida del modal y del panel móvil. */
      overlay: {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: dur(0.2) } },
        exit: { opacity: 0, transition: { duration: dur(0.15) } },
      },

      dialog: {
        hidden: { opacity: 0, y: shift(24), scale: reduce ? 1 : 0.97 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: dur(0.28), ease },
        },
        exit: {
          opacity: 0,
          y: shift(12),
          scale: reduce ? 1 : 0.97,
          transition: { duration: dur(0.18), ease: 'easeIn' },
        },
      },

      /** Bucle suave para la mascota; sin bucle si se pide menos movimiento. */
      floatLoop: reduce
        ? {}
        : {
            y: [0, -10, 0],
            transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          },
    };
  }, [reduce]);
}
