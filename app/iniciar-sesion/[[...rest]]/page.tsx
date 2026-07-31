import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { authEnabled } from '@/lib/auth';
import AuthDeshabilitado from '@/components/layout/AuthDeshabilitado';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function IniciarSesionPage() {
  if (!authEnabled) return <AuthDeshabilitado />;

  return (
    <div className="container-yuca flex justify-center py-14">
      <SignIn signUpUrl="/crear-cuenta" />
    </div>
  );
}
