import { useEffect, useState } from 'react';

/** `true` cuando la página bajó más de `threshold` px (header compacto). */
export function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll(); // estado correcto si se recarga a media página
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}

/**
 * Scroll-spy: devuelve el id de la sección visible para marcar el enlace activo
 * del menú. Los márgenes recortan el viewport a su franja central, así la
 * sección "activa" es la que el usuario está mirando de verdad.
 */
export function useActiveSection(ids, rootMargin = '-45% 0px -50% 0px') {
  const [active, setActive] = useState(ids[0] ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin, threshold: [0, 0.2, 0.6, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids, rootMargin]);

  return active;
}
