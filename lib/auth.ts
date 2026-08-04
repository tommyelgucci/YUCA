import { auth, currentUser } from '@clerk/nextjs/server';
import type { UserRole } from '@/lib/types';

/**
 * Autenticación con Clerk.
 *
 * Todo pasa por `authEnabled`: mientras no haya claves configuradas la web
 * funciona igual, sólo que sin cuentas ni panel de administración. Así el
 * proyecto se puede clonar y levantar sin dar de alta nada.
 */
export const authEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

/**
 * Rol de la persona conectada.
 *
 * El rol vive en `publicMetadata.role` de Clerk y se asigna desde su panel.
 * Nunca se lee del cliente para decidir permisos: sólo en el servidor.
 *
 * Se busca en dos sitios, y el orden importa:
 *
 * 1. **En el token de sesión**, que no cuesta ninguna llamada de red. Pero ahí
 *    sólo aparece si en el panel de Clerk se personalizó el token de sesión
 *    con `{"metadata": "{{user.public_metadata}}"}`, que es un ajuste que no
 *    viene puesto y que nada recuerda que exista.
 * 2. **Preguntándole a Clerk** por el perfil completo. Es más lento, pero
 *    funciona sin configurar nada.
 *
 * Depender sólo de lo primero significa que alguien marca a una persona como
 * staff, lo ve bien guardado en el panel, y la web la sigue rechazando sin
 * decir por qué. Ya pasó una vez; por eso hay respaldo.
 */
export async function getRol(): Promise<UserRole | null> {
  if (!authEnabled) return null;

  const { sessionClaims, userId } = await auth();
  if (!userId) return null;

  const enElToken = (sessionClaims?.metadata as { role?: UserRole } | undefined)?.role;
  if (enElToken) return enElToken;

  const user = await currentUser();
  const enElPerfil = (user?.publicMetadata as { role?: UserRole } | undefined)?.role;

  return enElPerfil ?? 'asistente';
}

export async function getUsuarioId(): Promise<string | null> {
  if (!authEnabled) return null;
  const { userId } = await auth();
  return userId;
}

/**
 * Exige sesión iniciada para ver una página; si no la hay, manda a entrar.
 *
 * Esto lo hacía el middleware por coincidencia de rutas (`createRouteMatcher`),
 * que Clerk deprecó. El problema de aquel enfoque no era que fallara, sino
 * **cómo iba a fallar**: la lista de rutas protegidas vivía lejos de las páginas
 * que protegía, así que una página nueva bajo `/mi-cuenta` quedaba cubierta sin
 * pedirlo, y el día que Clerk retire la función esas rutas se quedan abiertas
 * sin que nada dé error. Preguntarlo aquí, donde se leen los datos, no se puede
 * olvidar: si no se llama, no hay `userId` con el que consultar.
 *
 * Devuelve `null` sin redirigir cuando no hay claves de Clerk: sin cuentas
 * configuradas no hay a dónde mandar a nadie, y esas pantallas ya avisan por su
 * cuenta de que falta configurar el entorno.
 *
 * Ojo con `/nueva-contrasena`: **no** puede usar esto. Una sesión a medio
 * recuperar cuenta como no identificada, así que se mandaría a entrar y Clerk
 * la devolvería allí — el bucle que se arregló el 2026-08-04.
 */
export async function exigirSesionOEntrar(): Promise<string | null> {
  if (!authEnabled) return null;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();

  return userId;
}

export async function esStaff(): Promise<boolean> {
  return (await getRol()) === 'staff';
}

/**
 * ¿Puede esta petición entrar al panel de administración?
 *
 * Con Clerk configurado manda el rol. Sin configurar sólo se abre fuera de
 * producción, para poder desarrollar el panel antes de dar de alta las cuentas;
 * un despliegue real sin claves queda cerrado, no abierto de par en par.
 */
export async function puedeAdministrar(): Promise<boolean> {
  if (authEnabled) return esStaff();
  return process.env.NODE_ENV !== 'production';
}

/** Nombre para mostrar de quien está conectado, si lo hay. */
export async function getNombreUsuario(): Promise<string | null> {
  if (!authEnabled) return null;
  const user = await currentUser();
  if (!user) return null;
  return user.fullName ?? user.username ?? user.emailAddresses[0]?.emailAddress ?? null;
}
