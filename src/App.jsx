import { useCallback, useEffect, useState } from 'react';
import Categories from './components/Categories';
import CommunityCTA from './components/CommunityCTA';
import Footer from './components/Footer';
import FrutigerBanner from './components/FrutigerBanner';
import Gallery from './components/Gallery';
import Header from './components/Header';
import Hero from './components/Hero';
import RegisterModal from './components/RegisterModal';
import VineDivider from './components/VineDivider';

/** Marca en el navegador que ya se mostró el modal de bienvenida. */
const WELCOME_KEY = 'yuca:bienvenida-vista';
const WELCOME_DELAY_MS = 2500;

/** localStorage puede fallar (modo privado, cookies bloqueadas): nunca romper por eso. */
function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin persistencia: el modal volverá a aparecer en la próxima visita */
  }
}

export default function App() {
  // Un solo modal con tres variantes: bienvenida, registro e inicio de sesión.
  const [auth, setAuth] = useState({ open: false, variant: 'welcome' });

  const openAuth = useCallback((variant = 'signup') => {
    setAuth({ open: true, variant });
  }, []);

  const closeAuth = useCallback(() => {
    setAuth((prev) => ({ ...prev, open: false }));
    writeStorage(WELCOME_KEY, '1');
  }, []);

  // Bienvenida automática: sólo la primera visita y sin interrumpir la entrada.
  useEffect(() => {
    if (readStorage(WELCOME_KEY)) return undefined;

    const timer = window.setTimeout(() => {
      setAuth((prev) => (prev.open ? prev : { open: true, variant: 'welcome' }));
    }, WELCOME_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-yuca-bg font-body text-yuca-ink">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <Header onOpenAuth={openAuth} />

      <main id="contenido">
        <Hero onOpenAuth={openAuth} />

        <VineDivider />

        <FrutigerBanner />

        <Gallery />

        <VineDivider flip />

        <Categories />

        <CommunityCTA />
      </main>

      <Footer />

      <RegisterModal
        open={auth.open}
        variant={auth.variant}
        onClose={closeAuth}
        // TODO: enviar los datos al backend real cuando exista.
        onSubmit={(payload) => console.info('Registro pendiente de backend:', payload)}
      />
    </div>
  );
}
