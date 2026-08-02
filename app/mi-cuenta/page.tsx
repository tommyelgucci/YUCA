import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';
import { getDb } from '@/db';
import { authEnabled, getNombreUsuario, getUsuarioId } from '@/lib/auth';
import { perfilPorClerkId } from '@/lib/perfiles';
import { companerosDe, reservaActivaDe, standsDisponibles } from '@/lib/reservas';
import { edicionActual } from '@/lib/data/edicion';
import FormularioPerfil from './FormularioPerfil';
import PerfilPublico from './PerfilPublico';
import DatosPrivados from './DatosPrivados';
import ElegirStand from './ElegirStand';
import PanelReserva from './PanelReserva';

export const metadata: Metadata = { title: 'Mi cuenta' };

// El estado de la reserva cambia con cada acción: nunca debe servirse cacheado.
export const dynamic = 'force-dynamic';

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

export default async function MiCuentaPage() {
  const db = getDb();

  if (!authEnabled || !db) {
    return (
      <div className="container-yuca py-12">
        <h1 className="mb-6 text-3xl">Mi cuenta</h1>
        <Aviso titulo="Falta configurar el entorno">
          <p className="mb-2">
            Esta pantalla necesita base de datos y cuentas. Copia <code>.env.example</code> a{' '}
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

  // El middleware garantiza sesión iniciada.
  const [userId, nombre] = await Promise.all([getUsuarioId(), getNombreUsuario()]);
  const perfil = userId ? await perfilPorClerkId(db, userId) : null;

  return (
    <div className="container-yuca max-w-2xl py-12">
      <header className="mb-8">
        <h1 className="mb-1 text-3xl">Mi cuenta</h1>
        {nombre && <p className="text-yuca-ink-soft">Hola, {nombre}.</p>}
      </header>

      {!perfil ? (
        <div className="card p-6 sm:p-8">
          <h2 className="mb-1 text-2xl">Crea tu perfil de expositor</h2>
          <p className="mb-6 text-sm text-yuca-ink-soft">
            Es lo que va a ver la gente en tu página pública y en la lista de participantes. Tus
            datos personales se cargan después, en su propia sección.
          </p>
          <FormularioPerfil />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <PerfilPublico
            valores={{
              displayName: perfil.displayName,
              audience: perfil.audience,
              categories: perfil.categories,
              bio: perfil.bio,
              instagram: perfil.instagram,
              tiktok: perfil.tiktok,
              facebook: perfil.facebook,
              web: perfil.web,
            }}
            slug={perfil.slug}
            verified={perfil.verified}
            avatarUrl={perfil.avatarUrl}
          />

          <DatosPrivados
            datos={{
              fullName: perfil.fullName,
              birthDate: perfil.birthDate,
              contactEmail: perfil.contactEmail,
              phone: perfil.phone,
              gender: perfil.gender,
              department: perfil.department,
            }}
          />

          <PanelDeExpositor perfilId={perfil.id} slug={perfil.slug} db={db} />
        </div>
      )}
    </div>
  );
}

/** Separado del componente de página para poder usar `await` con datos que dependen del perfil. */
async function PanelDeExpositor({
  perfilId,
  slug,
  db,
}: {
  perfilId: string;
  slug: string;
  db: NonNullable<ReturnType<typeof getDb>>;
}) {
  const reserva = await reservaActivaDe(db, perfilId);

  if (!reserva) {
    const disponibles = await standsDisponibles(db, edicionActual.id);
    return <ElegirStand disponibles={disponibles} />;
  }

  const companeros = await companerosDe(db, reserva.id);
  return <PanelReserva reserva={reserva} companeros={companeros} slug={slug} />;
}
