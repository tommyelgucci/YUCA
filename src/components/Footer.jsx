import { Heart } from 'lucide-react';
import { brand, navLinks, participateLinks, socials } from '../data/site';
import Mascot from './Mascot';
import SocialLinks from './SocialLinks';

export default function Footer() {
  const year = new Date().getFullYear();

  const columns = [
    { title: 'Navegación', links: navLinks },
    { title: 'Participa', links: participateLinks },
  ];

  return (
    <footer className="bg-yuca-green-deep text-white">
      <div className="container-yuca grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <span className="mb-3 flex items-center gap-2.5 font-display text-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Mascot className="h-7 w-7" />
            </span>
            {brand.name}
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            {brand.tagline}. Comunidad para y por artistas en Bolivia.
          </p>
          <p className="mt-3 text-sm font-bold text-yuca-mustard">{brand.domain}</p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[0.14em] text-yuca-mustard">
              {column.title}
            </h2>
            <ul className="flex flex-col gap-2.5 text-sm text-white/80">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  <a href={link.href} className="link-underline hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[0.14em] text-yuca-mustard">
            Síguenos
          </h2>
          <SocialLinks items={socials} variant="dark" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            Las convocatorias para expositores se anuncian primero en nuestras redes y en el
            Discord.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-yuca flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>
            © {year} {brand.name}. Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1.5">
            Hecho con <Heart size={13} className="text-yuca-coral" aria-hidden="true" /> en Bolivia
          </p>
        </div>
      </div>
    </footer>
  );
}
