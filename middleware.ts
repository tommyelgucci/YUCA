import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Sólo se activa Clerk si hay claves configuradas.
 *
 * Importar `clerkMiddleware` es inofensivo; lo que falla sin claves es
 * ejecutarlo. Con esta guarda, un clon recién bajado del repositorio arranca
 * sin necesidad de dar de alta Clerk.
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
    '/(api|trpc)(.*)',
  ],
};
