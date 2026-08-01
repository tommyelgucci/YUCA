import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, FileSpreadsheet, Inbox } from 'lucide-react';
import { getDb } from '@/db';
import { authEnabled, puedeAdministrar } from '@/lib/auth';
import { reservasPendientes } from '@/lib/reservas';
import { edicionActual } from '@/lib/data/edicion';
import FilaReserva from './FilaReserva';

export const metadata: Metadata = { title: 'Administración' };

// La cola cambia con cada confirmación: nunca debe servirse cacheada.
export const dynamic = 'force-dynamic';

/** Aviso de configuración pendiente, en vez de una pantalla rota. */
function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card flex gap-4 p-6">
      <AlertTriangle size={22} className="mt-0.5 shrink-0 text-yuca-mustard" aria-hidden="true" />
      <div>
        <h2 className="mb-1 text-lg">{titulo}</h2>
        <div className="text-sm leading-relaxed text-yuca-ink-soft">{children}</div>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const db = getDb();

  if (!authEnabled || !db) {
    return (
      <div className="container-yuca py-12">
        <h1 className="mb-6 text-3xl">Administración</h1>
        <Aviso titulo="Falta configurar el entorno">
          <p className="mb-2">
            El panel necesita base de datos y cuentas. Copia <code>.env.example</code> a{' '}
            <code>.env.local</code> y rellena:
          </p>
          <ul className="ml-4 list-disc">
            {!db && (
              <li>
                <code>DATABASE_URL</code> — base de Supabase, con las migraciones aplicadas
                (<code>npm run db:migrate</code>).
              </li>
            )}
            {!authEnabled && (
              <li>
                <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> y <code>CLERK_SECRET_KEY</code>.
              </li>
            )}
          </ul>
        </Aviso>
      </div>
    );
  }

  // El middleware garantiza que hay sesión; el permiso se comprueba aquí.
  if (!(await puedeAdministrar())) {
    return (
      <div className="container-yuca py-12">
        <h1 className="mb-6 text-3xl">Administración</h1>
        <Aviso titulo="No tienes permiso para ver esta página">
          Esta zona es sólo para el equipo de organización. Si deberías tener acceso, pide que te
          asignen el rol <code>staff</code> en Clerk.
        </Aviso>
      </div>
    );
  }

  const pendientes = await reservasPendientes(db, edicionActual.id);

  return (
    <div className="container-yuca py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl">Pagos por revisar</h1>
          <p className="text-yuca-ink-soft">
            {edicionActual.name} · {pendientes.length}{' '}
            {pendientes.length === 1 ? 'reserva pendiente' : 'reservas pendientes'}. Compara la
            referencia con tu extracto y confirma o rechaza.
          </p>
        </div>

        <Link href="/admin/exportar" className="btn-outline btn-md shrink-0">
          <FileSpreadsheet size={17} aria-hidden="true" />
          Exportar credenciales
        </Link>
      </header>

      {pendientes.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <Inbox size={32} className="text-yuca-green" aria-hidden="true" />
          <p className="font-display text-xl text-yuca-green-deep">No hay nada pendiente</p>
          <p className="max-w-sm text-sm text-yuca-ink-soft">
            Cuando alguien aparte una mesa y declare su transferencia, aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {pendientes.map((reserva) => (
            <FilaReserva key={reserva.reservationId} reserva={reserva} />
          ))}
        </ul>
      )}
    </div>
  );
}
