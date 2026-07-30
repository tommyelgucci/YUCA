import { Facebook, Instagram, MessageCircle, Music2 } from 'lucide-react';

/** Nombre del icono en `src/data/site.js` -> componente de lucide-react. */
const ICONS = {
  Instagram,
  Facebook,
  Music2,
  MessageCircle,
};

const VARIANTS = {
  light: 'bg-yuca-cream text-yuca-green-deep hover:bg-yuca-cream-deep',
  dark: 'bg-white/10 text-white hover:bg-white/20',
};

/** Fila de iconos de redes sociales, reutilizada en el footer y el menú móvil. */
export default function SocialLinks({ items, variant = 'dark', onNavigate, className = '' }) {
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {items.map((social) => {
        const Icon = ICONS[social.icon] ?? MessageCircle;
        const isExternal = social.href.startsWith('http');

        return (
          <li key={social.id}>
            <a
              href={social.href}
              aria-label={social.label}
              title={social.label}
              onClick={onNavigate}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${
                VARIANTS[variant] ?? VARIANTS.dark
              }`}
            >
              <Icon size={19} aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
