'use client';

import { usePathname } from 'next/navigation';
import { navLinks, sectionIds } from '@/lib/site';
import { useActiveSection } from './useScrollState';

/**
 * Enlaces del menú resueltos según la página actual.
 *
 * El menú mezcla dos tipos de destino:
 * - anclas de la portada (`#ediciones`), que fuera de la portada tienen que
 *   apuntar a `/#ediciones` para volver a ella;
 * - rutas propias (`/evento`), que se marcan activas por pathname.
 *
 * El scroll-spy sólo manda en la portada; en el resto de páginas el estado
 * activo lo decide la ruta.
 */
export function useNavLinks() {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const activeSection = useActiveSection(sectionIds);

  return navLinks.map((link) => {
    if (link.route) {
      return { ...link, active: pathname.startsWith(link.href) };
    }

    return {
      ...link,
      href: isLanding ? link.href : `/${link.href}`,
      active: isLanding && activeSection === link.href.replace('#', ''),
    };
  });
}
