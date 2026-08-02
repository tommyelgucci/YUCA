'use client';

import Link from 'next/link';
import { Show, UserButton } from '@clerk/nextjs';
import { clerkHabilitado } from '@/lib/auth-client';
import type { AuthVariant } from './AuthModalContext';

/**
 * Accesos de cuenta del header y del menú móvil.
 *
 * Con Clerk configurado son sesión real: enlaces a las páginas de Clerk y el
 * botón de usuario al estar dentro. Sin configurar caen al modal de siempre,
 * que sólo explica que las cuentas aún no están activas — así la web sigue
 * teniendo sentido antes de dar de alta el servicio.
 */
export default function AccountActions({
  onOpenAuth,
  onNavigate,
  layout = 'fila',
}: {
  onOpenAuth: (variant: AuthVariant) => void;
  onNavigate?: () => void;
  layout?: 'fila' | 'columna';
}) {
  const enColumna = layout === 'columna';
  const claseEntrar = enColumna ? 'btn-outline btn-lg w-full' : 'btn-ghost btn-sm';
  const claseCrear = enColumna ? 'btn-primary btn-lg w-full' : 'btn-primary btn-sm';

  if (!clerkHabilitado) {
    return (
      <>
        <button type="button" onClick={() => onOpenAuth('login')} className={claseEntrar}>
          Iniciar sesión
        </button>
        <button type="button" onClick={() => onOpenAuth('signup')} className={claseCrear}>
          Crear cuenta
        </button>
      </>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <Link href="/iniciar-sesion" onClick={onNavigate} className={claseEntrar}>
          Iniciar sesión
        </Link>
        <Link href="/crear-cuenta" onClick={onNavigate} className={claseCrear}>
          Crear cuenta
        </Link>
      </Show>

      <Show when="signed-in">
        <Link
          href="/mi-cuenta"
          onClick={onNavigate}
          className={enColumna ? 'btn-outline btn-lg w-full' : 'btn-ghost btn-sm'}
        >
          Mi cuenta
        </Link>
        <UserButton />
      </Show>
    </>
  );
}
