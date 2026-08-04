import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import SiteChrome from '@/components/layout/SiteChrome';
import { authEnabled } from '@/lib/auth';
import { OG_IMAGE } from '@/lib/imagenes';
import './globals.css';

export const metadata: Metadata = {
  // TODO: definir NEXT_PUBLIC_SITE_URL con el dominio real al desplegar;
  // sin esto las miniaturas de Open Graph apuntan a localhost.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Proyecto Yuca — Un mundo donde los artistas conviven',
    template: '%s · Proyecto Yuca',
  },
  description:
    'Comunidad y productora de eventos artísticos en Bolivia. Casa del YukaWaii Fest: ilustración, cómics, pines, stickers y webcomics.',
  openGraph: {
    type: 'website',
    locale: 'es_BO',
    siteName: 'Proyecto Yuca',
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  themeColor: '#faf8f5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Tipografías de marca: Baloo 2 (display) + Nunito (cuerpo).
            Se cargan por <link> y no con next/font para que el build no dependa
            de tener red hacia Google Fonts. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-yuca-bg font-body text-yuca-ink">
        {/*
          Sin claves de Clerk la web funciona igual, sólo que sin cuentas.

          `afterSignOutUrl` manda a la portada, que es pública. Sin eso Clerk
          deja a la persona donde estaba, y si estaba en `/mi-cuenta` o
          `/admin` —que el middleware protege— cerrar sesión parece no hacer
          nada: la página rebota contra la protección y vuelve a pedir
          identificarse.

          `taskUrls` dice dónde vive cada pantalla de "tarea pendiente". Clerk
          las usa cuando la sesión queda a medias: al recuperar la contraseña,
          verificar el código no termina de entrar, deja la sesión en estado
          pendiente con la tarea de poner la contraseña nueva. Sin esta opción
          Clerk no sabe a dónde llevar a esa persona y se queda cargando para
          siempre — su propio código lo avisa por consola: *"Session has pending
          tasks but no handling is configured […] users may get stuck on
          incomplete flows"*.
        */}
        {authEnabled ? (
          <ClerkProvider
            afterSignOutUrl="/"
            taskUrls={{ 'reset-password': '/nueva-contrasena' }}
          >
            <SiteChrome>{children}</SiteChrome>
          </ClerkProvider>
        ) : (
          <SiteChrome>{children}</SiteChrome>
        )}
      </body>
    </html>
  );
}
