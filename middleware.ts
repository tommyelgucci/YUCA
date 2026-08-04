import { NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Sólo se activa Clerk si hay claves configuradas.
 *
 * Importar `clerkMiddleware` es inofensivo; lo que falla sin claves es
 * ejecutarlo. Con esta guarda, un clon recién bajado del repositorio arranca
 * sin necesidad de dar de alta Clerk.
 *
 * **Aquí ya no se decide quién entra a dónde.** Antes había un
 * `createRouteMatcher(['/admin(.*)', '/mi-cuenta(.*)'])` con `auth.protect()`;
 * Clerk lo deprecó y recomienda comprobar la sesión donde se leen los datos.
 * Ahora eso lo hace `exigirSesionOEntrar()` en cada página (`lib/auth.ts`).
 *
 * El cambio no es sólo seguir la recomendación. Una lista de rutas aquí es una
 * lista que hay que acordarse de actualizar, y vive lejos de las páginas que
 * protege: cubre de más lo que cuelgue de esas direcciones, de menos cualquier
 * pantalla nueva fuera de ellas, y el día que Clerk retire la función deja de
 * proteger **sin que nada falle a la vista**. La comprobación pegada a la
 * consulta no se puede olvidar: sin ella no hay identificador con el que
 * consultar.
 *
 * Sigue haciendo falta ejecutar `clerkMiddleware()`: es lo que deja disponible
 * `auth()` en páginas, rutas de API y Server Actions.
 *
 * ⚠️ El archivo tiene que llamarse `middleware.ts`. La documentación reciente
 * de Clerk habla de `proxy.ts`, que es el nombre nuevo a partir de Next 15.6;
 * con la versión de este proyecto, renombrarlo compila igual pero deja de
 * registrarse el middleware —sin ningún error— y `auth()` deja de ver la sesión.
 */
const authEnabled = Boolean(process.env.CLERK_SECRET_KEY);

export default authEnabled ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    // Todo menos ficheros estáticos y _next
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Ruta interna de Clerk; tiene que pasar por el middleware
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
