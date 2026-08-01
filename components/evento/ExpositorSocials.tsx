import { Facebook, Globe, Instagram, Music2 } from 'lucide-react';
import type { SocialLinks } from '@/lib/types';

const REDES = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'tiktok', label: 'TikTok', Icon: Music2 },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'web', label: 'Sitio web', Icon: Globe },
] as const;

/** Redes del expositor. No renderiza nada si no cargó ninguna. */
export default function ExpositorSocials({
  socials,
  name,
  size = 'md',
}: {
  socials: SocialLinks;
  name: string;
  size?: 'sm' | 'md';
}) {
  const disponibles = REDES.filter(({ key }) => socials[key]);
  if (disponibles.length === 0) return null;

  const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <ul className="flex gap-2">
      {disponibles.map(({ key, label, Icon }) => (
        <li key={key}>
          <a
            href={socials[key]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} de ${name}`}
            className={`${box} flex items-center justify-center rounded-xl bg-yuca-cream text-yuca-green-deep transition-colors hover:bg-yuca-cream-deep`}
          >
            <Icon size={size === 'sm' ? 15 : 17} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
