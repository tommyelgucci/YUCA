import type { Metadata } from 'next';
import { TaskResetPassword } from '@clerk/nextjs';
import { authEnabled } from '@/lib/auth';
import AuthDeshabilitado from '@/components/layout/AuthDeshabilitado';

export const metadata: Metadata = { title: 'Elegir contraseña nueva' };

/**
 * El último paso de "olvidé mi contraseña".
 *
 * Verificar el código que llega al correo **no termina de entrar**: deja la
 * sesión en estado pendiente, con la tarea de elegir contraseña nueva. Clerk
 * lleva a esa persona a la dirección que se le indique en `taskUrls`
 * (`app/layout.tsx`); si no se le indica ninguna, se queda cargando sin fin.
 *
 * La ruta es comodín (`[[...rest]]`) por lo mismo que las de entrar y crear
 * cuenta: Clerk cuelga sus propios pasos debajo de la dirección que le des, y
 * una ruta fija devolvería 404 en mitad del proceso.
 *
 * Ojo: el middleware **no** puede proteger esta ruta. Una sesión pendiente
 * cuenta como no identificada para Clerk, así que `auth.protect()` la mandaría
 * a iniciar sesión, y desde ahí Clerk la devolvería aquí — que es exactamente
 * el bucle que se quiere evitar.
 */
export default function NuevaContrasenaPage() {
  if (!authEnabled) return <AuthDeshabilitado />;

  return (
    <div className="container-yuca flex justify-center py-14">
      {/*
        Al terminar, la sesión ya está completa: se va a "mi cuenta", que es
        donde quería llegar quien estaba tratando de entrar. Es obligatorio
        decirlo — sin destino, la tarea se completa y nadie se mueve de aquí.
      */}
      <TaskResetPassword redirectUrlComplete="/mi-cuenta" />
    </div>
  );
}
