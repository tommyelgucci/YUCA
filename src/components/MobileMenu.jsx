import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { brand, navLinks, socials } from '../data/site';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useMotionPresets } from '../hooks/useMotionPresets';
import Mascot from './Mascot';
import SocialLinks from './SocialLinks';

/**
 * Panel de navegación móvil.
 *
 * Se cierra con Escape, tocando fuera, con el botón de cerrar o al elegir un
 * enlace. Mientras está abierto atrapa el foco y bloquea el scroll del fondo.
 */
export default function MobileMenu({ id, open, onClose, activeSection, onOpenAuth }) {
  const panelRef = useRef(null);
  const { reduce, overlay } = useMotionPresets();

  useBodyScrollLock(open);
  useFocusTrap(open, panelRef, onClose);

  const handleAuth = (variant) => {
    onClose();
    onOpenAuth(variant);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Capa de fondo: cerrar tocando fuera */}
          <motion.div
            className="absolute inset-0 bg-yuca-ink/45 backdrop-blur-sm"
            variants={overlay}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            id={id}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-yuca-bg shadow-lift"
            initial={{ x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-yuca-green/10 px-5 py-4">
              <span className="flex items-center gap-2.5 font-display text-lg text-yuca-green-deep">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-yuca-cream">
                  <Mascot className="h-6 w-6" />
                </span>
                {brand.name}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost p-2"
                aria-label="Cerrar menú"
                data-autofocus
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Principal (móvil)" className="px-5 py-6">
              <ul className="flex flex-col gap-1">
                {navLinks.map((link) => {
                  const isActive = activeSection === link.href.replace('#', '');
                  return (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        onClick={onClose}
                        aria-current={isActive ? 'true' : undefined}
                        className={`block rounded-2xl px-4 py-3 font-bold transition-colors ${
                          isActive
                            ? 'bg-yuca-cream text-yuca-green-deep'
                            : 'text-yuca-ink-soft hover:bg-yuca-cream/60 hover:text-yuca-green-deep'
                        }`}
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-yuca-green/10 px-5 py-6">
              <button
                type="button"
                onClick={() => handleAuth('signup')}
                className="btn-primary btn-lg w-full"
              >
                Crear cuenta
              </button>
              <button
                type="button"
                onClick={() => handleAuth('login')}
                className="btn-outline btn-lg w-full"
              >
                Iniciar sesión
              </button>

              <div className="pt-3">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-yuca-ink-soft">
                  Síguenos
                </p>
                <SocialLinks items={socials} variant="light" onNavigate={onClose} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
