import { motion } from 'framer-motion';
import { getMascotImage } from '../assets';
import { useMotionPresets } from '../hooks/useMotionPresets';

/**
 * Mascota de Proyecto Yuca.
 *
 * Muestra el arte real en cuanto exista una imagen en `src/assets/mascot/`
 * (o se pase `src` por props). Mientras tanto dibuja el SVG placeholder, para
 * que la web se pueda desarrollar y publicar sin el arte final.
 *
 * @param {string}  src      Ruta de imagen concreta (prioridad sobre /assets).
 * @param {string}  alt      Texto alternativo; vacío = decorativa.
 * @param {boolean} floating Bucle de flotación (se anula con reduced-motion).
 */
export default function Mascot({ src, alt = '', className = '', floating = false }) {
  const { floatLoop } = useMotionPresets();
  const imageSrc = src ?? getMascotImage();
  const animation = floating ? floatLoop : undefined;

  if (imageSrc) {
    return (
      <motion.img
        src={imageSrc}
        alt={alt}
        aria-hidden={alt ? undefined : 'true'}
        className={`select-none object-contain ${className}`}
        draggable="false"
        animate={animation}
      />
    );
  }

  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : 'true'}
      animate={animation}
    >
      {/* Hojas */}
      <path d="M60 55 Q45 20 75 15 Q90 35 85 58 Z" className="fill-yuca-green" />
      <path d="M140 55 Q155 20 125 15 Q110 35 115 58 Z" className="fill-yuca-mustard" />
      {/* Cuerpo */}
      <circle cx="100" cy="110" r="62" fill="#fbeee0" />
      <circle cx="100" cy="110" r="62" fill="none" stroke="#e8d9c4" strokeWidth="2" />
      {/* Brazos */}
      <path d="M40 100 Q20 130 35 165 Q55 155 60 130 Z" className="fill-yuca-coral" />
      <path d="M160 100 Q180 130 165 165 Q145 155 140 130 Z" className="fill-yuca-coral" />
      {/* Cara */}
      <circle cx="78" cy="105" r="5.5" className="fill-yuca-ink" />
      <circle cx="122" cy="105" r="5.5" className="fill-yuca-ink" />
      <circle cx="76" cy="103" r="1.8" fill="#ffffff" />
      <circle cx="120" cy="103" r="1.8" fill="#ffffff" />
      <circle cx="65" cy="118" r="9" className="fill-yuca-coral-soft" opacity="0.7" />
      <circle cx="135" cy="118" r="9" className="fill-yuca-coral-soft" opacity="0.7" />
      <path
        d="M90 130 Q100 138 110 130"
        fill="none"
        className="stroke-yuca-ink"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}
