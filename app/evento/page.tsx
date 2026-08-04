import type { Metadata } from 'next';
import EventHero from '@/components/evento/EventHero';
import EventTabs from '@/components/evento/EventTabs';
import { FeriaProvider } from '@/components/evento/FeriaContext';
import { getDb } from '@/db';
import { getUsuarioId } from '@/lib/auth';
import { vistaFeria } from '@/lib/feria';
import { inscripcionesDe, vistaActividades } from '@/lib/actividades';
import { edicionActual } from '@/lib/data/edicion';

export const metadata: Metadata = {
  title: edicionActual.name,
  description: edicionActual.description,
};

// El mapa cambia cada vez que alguien aparta o paga una mesa: servirlo
// cacheado enseñaría mesas libres que ya no lo están.
export const dynamic = 'force-dynamic';

export default async function EventoPage() {
  const [feria, programa, clerkUserId] = await Promise.all([
    vistaFeria(),
    vistaActividades(),
    getUsuarioId(),
  ]);

  // Qué cupos tiene ya quien está mirando, para no ofrecerle inscribirse dos
  // veces. Sin base o sin sesión no hay nada que preguntar.
  const db = getDb();
  const misInscripciones =
    db && clerkUserId
      ? await inscripcionesDe(db, { clerkUserId, editionId: edicionActual.id })
      : [];

  return (
    <>
      <EventHero />
      <FeriaProvider value={feria}>
        <EventTabs
          actividades={{
            actividades: programa.actividades,
            misInscripciones,
            sePuedeInscribir: programa.origen === 'base',
            haySesion: Boolean(clerkUserId),
          }}
        />
      </FeriaProvider>
    </>
  );
}
