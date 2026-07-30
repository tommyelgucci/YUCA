import { Leaf } from 'lucide-react';

const RATIOS = {
  '1/1': 'aspect-square',
  '3/4': 'aspect-[3/4]',
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-video',
};

/** Fondos del marcador de posición por tono de marca. */
const TONES = {
  green: 'from-yuca-green to-yuca-green-deep',
  coral: 'from-yuca-coral to-yuca-coral-deep',
  mustard: 'from-yuca-mustard to-yuca-mustard-deep',
  cream: 'from-yuca-cream to-yuca-cream-deep',
  rose: 'from-[#d79aab] to-[#b06e83]',
};

/**
 * Contenedor de imagen listo para recibir fotos reales.
 *
 * Si `src` es `null` (la foto aún no se subió a `src/assets/events/`), pinta un
 * marcador de posición con el color de la edición en lugar de romperse.
 */
export default function ImageFrame({
  src,
  alt = '',
  ratio = '3/4',
  tone = 'green',
  className = '',
  imgClassName = '',
  children,
}) {
  const ratioClass = RATIOS[ratio] ?? RATIOS['3/4'];
  const toneClass = TONES[tone] ?? TONES.green;

  return (
    <div className={`relative isolate overflow-hidden ${ratioClass} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      ) : (
        // Marcador de posición: decorativo, no anuncia nada a lectores de pantalla.
        <div
          className={`h-full w-full bg-gradient-to-br ${toneClass}`}
          aria-hidden="true"
          data-placeholder="true"
        >
          {/* La trama va en su propia capa: `bg-dots` también usa background-image
              y pisaría el degradado si compartieran elemento. */}
          <div className="absolute inset-0 bg-dots-light" />
          <Leaf
            className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/40"
            strokeWidth={1.5}
          />
        </div>
      )}
      {children}
    </div>
  );
}
