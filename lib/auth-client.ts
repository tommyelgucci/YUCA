/**
 * Versión de `authEnabled` utilizable desde componentes de cliente.
 *
 * `lib/auth.ts` importa de `@clerk/nextjs/server`, que no puede entrar en un
 * componente de cliente. Aquí sólo se mira la clave pública, que Next incrusta
 * en el bundle al compilar.
 *
 * Las dos claves van juntas: si sólo se define la pública, el cliente creería
 * que hay sesión disponible mientras el servidor la da por apagada.
 */
export const clerkHabilitado = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
