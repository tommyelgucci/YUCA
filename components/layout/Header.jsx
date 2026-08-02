'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { brand } from '@/lib/site';
import { useNavLinks } from '@/hooks/useNavLinks';
import { useScrolled } from '@/hooks/useScrollState';
import Mascot from './Mascot';
import AccountActions from './AccountActions';
import MobileMenu from './MobileMenu';

/**
 * Barra superior fija: navegación, accesos de cuenta y menú móvil.
 *
 * `onOpenAuth(variant)` abre el modal de sesión/registro en la variante pedida.
 */
export default function Header({ onOpenAuth }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();
  const links = useNavLinks();

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
          scrolled
            ? 'border-yuca-green/15 bg-yuca-bg/95 shadow-soft backdrop-blur-md'
            : 'border-transparent bg-yuca-bg/80 backdrop-blur'
        }`}
      >
        <div className="container-yuca flex h-16 items-center justify-between gap-4 sm:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-2xl font-display text-lg text-yuca-green-deep sm:text-xl"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yuca-cream ring-1 ring-yuca-green/15 transition-transform duration-300 ease-yuca group-hover:-rotate-6">
              <Mascot className="h-7 w-7" />
            </span>
            <span className="leading-none">{brand.name}</span>
          </Link>

          {/* Navegación de escritorio */}
          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    aria-current={link.active ? 'page' : undefined}
                    className={`inline-block rounded-2xl px-3.5 py-2 text-sm font-bold transition-colors ${
                      link.active
                        ? 'bg-yuca-cream/70 text-yuca-green-deep'
                        : 'text-yuca-ink-soft hover:bg-yuca-cream/50 hover:text-yuca-green-deep'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Acciones de cuenta */}
          <div className="hidden items-center gap-2 lg:flex">
            <AccountActions onOpenAuth={onOpenAuth} />
          </div>

          {/* Disparador del menú móvil */}
          <button
            type="button"
            className="btn-ghost -mr-2 p-2 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
          >
            <Menu size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      <MobileMenu
        id="menu-movil"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={links}
        onOpenAuth={onOpenAuth}
      />
    </>
  );
}
