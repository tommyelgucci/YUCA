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
 */
export async function getRol(): Promise<UserRole | null> {
  if (!authEnabled) return null;

  const { sessionClaims, userId } = await auth();
  if (!userId) return null;

  const metadata = sessionClaims?.metadata as { role?: UserRole } | undefined;
  return metadata?.role ?? 'asistente';
}

export async function getUsuarioId(): Promise<string | null> {
  if (!authEnabled) return null;
  const { userId } = await auth();
  return userId;
}

export async function esStaff(): Promise<boolean> {
  return (await getRol()) === 'staff';
}

/** Nombre para mostrar de quien está conectado, si lo hay. */
export async function getNombreUsuario(): Promise<string | null> {
  if (!authEnabled) return null;
  const user = await currentUser();
  if (!user) return null;
  return user.fullName ?? user.username ?? user.emailAddresses[0]?.emailAddress ?? null;
}
