'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import RegisterModal from '@/components/landing/RegisterModal';
import { AuthModalProvider, type AuthVariant } from './AuthModalContext';

/** Marca en el navegador que ya se mostró el modal de bienvenida. */
const WELCOME_KEY = 'yuca:bienvenida-vista';
const WELCOME_DELAY_MS = 2500;

/** localStorage puede fallar (modo privado, cookies bloqueadas): nunca romper por eso. */
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin persistencia: el modal volverá a aparecer en la próxima visita */
  }
}

/**
 * Envoltorio común de todas las páginas: header, footer y el modal de cuenta.
 *
 * Vive aquí y no en el layout raíz porque necesita estado de cliente; así el
 * resto del árbol puede seguir siendo Server Components.
 */
export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [auth, setAuth] = useState<{ open: boolean; variant: AuthVariant }>({
    open: false,
    variant: 'welcome',
  });

  const openAuth = useCallback((variant: AuthVariant = 'signup') => {
    setAuth({ open: true, variant });
  }, []);

  const closeAuth = useCallback(() => {
    setAuth((prev) => ({ ...prev, open: false }));
    writeStorage(WELCOME_KEY, '1');
  }, []);

  // Bienvenida automática: sólo en la portada, sólo la primera visita.
  useEffect(() => {
    if (pathname !== '/') return undefined;
    if (readStorage(WELCOME_KEY)) return undefined;

    const timer = window.setTimeout(() => {
      setAuth((prev) => (prev.open ? prev : { open: true, variant: 'welcome' }));
    }, WELCOME_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <AuthModalProvider value={openAuth}>
        <Header onOpenAuth={openAuth} />

        <main id="contenido">{children}</main>

        <Footer />
      </AuthModalProvider>

      <RegisterModal
        open={auth.open}
        variant={auth.variant}
        onClose={closeAuth}
        // TODO: enviar los datos al backend real cuando exista.
        onSubmit={(payload: unknown) => console.info('Registro pendiente de backend:', payload)}
      />
    </>
  );
}
