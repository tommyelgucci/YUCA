import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { authEnabled } from '@/lib/auth';
import AuthDeshabilitado from '@/components/layout/AuthDeshabilitado';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function CrearCuentaPage() {
  if (!authEnabled) return <AuthDeshabilitado />;

  return (
    <div className="container-yuca flex justify-center py-14">
      <SignUp signInUrl="/iniciar-sesion" />
    </div>
  );
}
