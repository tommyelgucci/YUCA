import type { Metadata } from 'next';
import EventHero from '@/components/evento/EventHero';
import EventTabs from '@/components/evento/EventTabs';
import { FeriaProvider } from '@/components/evento/FeriaContext';
import { vistaFeria } from '@/lib/feria';
import { edicionActual } from '@/lib/data/edicion';

export const metadata: Metadata = {
  title: edicionActual.name,
  description: edicionActual.description,
};

// El mapa cambia cada vez que alguien aparta o paga una mesa: servirlo
// cacheado enseñaría mesas libres que ya no lo están.
export const dynamic = 'force-dynamic';

export default async function EventoPage() {
  const feria = await vistaFeria();

  return (
    <>
      <EventHero />
      <FeriaProvider value={feria}>
        <EventTabs />
      </FeriaProvider>
    </>
  );
}
