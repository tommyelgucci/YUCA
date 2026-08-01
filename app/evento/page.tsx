import type { Metadata } from 'next';
import EventHero from '@/components/evento/EventHero';
import EventTabs from '@/components/evento/EventTabs';
import { edicionActual } from '@/lib/data/edicion';

export const metadata: Metadata = {
  title: edicionActual.name,
  description: edicionActual.description,
};

export default function EventoPage() {
  return (
    <>
      <EventHero />
      <EventTabs />
    </>
  );
}
