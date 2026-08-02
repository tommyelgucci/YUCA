import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Sólo se activa Clerk si hay claves configuradas.
 *
 * Importar `clerkMiddleware` es inofensivo; lo que falla sin claves es
 * ejecutarlo. Con esta guarda, un clon recién bajado del repositorio arranca
 * sin necesidad de dar de alta Clerk.
 *
 * ⚠️ El archivo tiene que llamarse `middleware.ts`. La documentación reciente
 * de Clerk habla de `proxy.ts`, que es el nombre nuevo a partir de Next 15.6;
 * con la versión de este proyecto, renombrarlo compila igual pero deja de
 * registrarse el middleware —sin ningún error— y /admin se queda sin proteger.
 */
const authEnabled = Boolean(process.env.CLERK_SECRET_KEY);

/** Rutas que exigen sesión iniciada. */
const rutasProtegidas = createRouteMatcher(['/admin(.*)', '/mi-cuenta(.*)']);

export default authEnabled
  ? clerkMiddleware(async (auth, request) => {
      if (rutasProtegidas(request)) {
        // El rol concreto (staff) lo comprueba cada página; aquí sólo se exige
        // estar identificado.
        await auth.protect();
      }
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    // Todo menos ficheros estáticos y _next
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Ruta interna de Clerk; tiene que pasar por el middleware
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
