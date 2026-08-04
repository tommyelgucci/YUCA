import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, BadgeCheck, FileSpreadsheet, Inbox } from 'lucide-react';
import { getDb } from '@/db';
import { authEnabled, exigirSesionOEntrar, puedeAdministrar } from '@/lib/auth';
import { perfilesPorVerificar } from '@/lib/perfiles';
import { reservasPendientes } from '@/lib/reservas';
import { edicionActual } from '@/lib/data/edicion';
import FilaReserva from './FilaReserva';
import FilaPerfil from './FilaPerfil';

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

  // Dos preguntas distintas, y el orden importa: quien no entró se manda a
  // entrar, y sólo a quien ya está identificado se le puede decir que no tiene
  // permiso. Al revés, alguien sin sesión leería "no tienes permiso" y no
  // sabría que le basta con iniciar sesión.
  await exigirSesionOEntrar();

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

  const [pendientes, perfiles] = await Promise.all([
    reservasPendientes(db, edicionActual.id),
    perfilesPorVerificar(db),
  ]);

  return (
    <div className="container-yuca flex flex-col gap-12 py-12">
      <section>
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
      </section>

      <section>
        <header className="mb-8">
          <h2 className="mb-2 text-3xl">Perfiles por verificar</h2>
          <p className="text-yuca-ink-soft">
            {perfiles.length} {perfiles.length === 1 ? 'perfil nuevo' : 'perfiles nuevos'}. Revisa
            que no sea spam antes de darle la insignia de verificado.
          </p>
        </header>

        {perfiles.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-12 text-center">
            <BadgeCheck size={32} className="text-yuca-green" aria-hidden="true" />
            <p className="font-display text-xl text-yuca-green-deep">No hay nada por revisar</p>
            <p className="max-w-sm text-sm text-yuca-ink-soft">
              Cuando alguien cree su perfil de expositor, aparecerá aquí.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {perfiles.map((perfil) => (
              <FilaPerfil key={perfil.id} perfil={perfil} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
