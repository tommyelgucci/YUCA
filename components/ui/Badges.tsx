import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArtCategory } from '@/lib/types';

/**
 * Insignia de verificado.
 * La otorga el staff tras revisar el perfil: no es autoservicio.
 */
export function VerifiedBadge({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-yuca-green', className)}
      title="Perfil verificado por Proyecto Yuca"
    >
      <BadgeCheck size={16} aria-hidden="true" />
      <span className={withLabel ? 'text-xs font-bold' : 'sr-only'}>Verificado</span>
    </span>
  );
}

/** Categoría de arte del expositor. */
export function CategoryBadge({ category }: { category: ArtCategory }) {
  return (
    <span className="pill bg-yuca-cream text-yuca-green-deep">{category}</span>
  );
}

/** Avatar con inicial de respaldo mientras no haya foto subida. */
export function Avatar({
  src,
  name,
  size = 'md',
}: {
  src: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dimensions = {
    sm: 'h-10 w-10 text-base',
    md: 'h-14 w-14 text-xl',
    lg: 'h-24 w-24 text-3xl',
  }[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatares subidos por artistas, sin dominios fijos aún
      <img
        src={src}
        alt={`Foto de perfil de ${name}`}
        className={cn('shrink-0 rounded-2xl object-cover', dimensions)}
        loading="lazy"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl bg-yuca-cream font-display text-yuca-green-deep',
        dimensions,
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
