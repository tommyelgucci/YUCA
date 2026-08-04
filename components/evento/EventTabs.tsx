'use client';

import { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { CalendarHeart, Info, Users } from 'lucide-react';
import InfoPanel from './InfoPanel';
import ParticipantesPanel from './ParticipantesPanel';
import ActividadesPanel from './ActividadesPanel';
import type { ComponentProps } from 'react';

const PESTANAS = [
  { value: 'info', label: 'Info', Icon: Info },
  { value: 'participantes', label: 'Participantes', Icon: Users },
  { value: 'actividades', label: 'Actividades', Icon: CalendarHeart },
] as const;

type Pestana = (typeof PESTANAS)[number]['value'];

type PropsActividades = ComponentProps<typeof ActividadesPanel>;

/**
 * Pestañas de la vista de evento.
 *
 * Radix aporta el patrón ARIA completo (roles, flechas del teclado, foco).
 * La pestaña activa se refleja en la URL para poder enlazar directo a
 * `/evento?tab=participantes&stand=C20`.
 *
 * Las actividades bajan por props y no por contexto —al revés que la feria—
 * porque las consume un solo panel. Un contexto tiene sentido cuando el dato
 * cruza varios niveles; aquí sólo tendría que atravesar éste.
 */
export default function EventTabs({ actividades }: { actividades: PropsActividades }) {
  const [tab, setTab] = useState<Pestana>('info');

  /*
   * Qué pestaña abrir según el enlace por el que se llegó.
   *
   * Va en un efecto por lo mismo que `useStandSelection`: `window` no existe en
   * el servidor, y calcularlo en el valor inicial haría que servidor y
   * navegador pintaran pestañas distintas —un desajuste de hidratación—.
   */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- ver arriba */
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('tab') as Pestana | null;
    // Un enlace a un stand concreto abre directamente la pestaña del mapa.
    if (fromUrl && PESTANAS.some((p) => p.value === fromUrl)) setTab(fromUrl);
    else if (params.get('stand')) setTab('participantes');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const handleChange = (value: string) => {
    setTab(value as Pestana);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.replaceState(null, '', url);
  };

  return (
    <Tabs.Root value={tab} onValueChange={handleChange} className="container-yuca py-10 sm:py-12">
      <Tabs.List
        aria-label="Secciones del evento"
        className="mb-8 flex gap-1.5 overflow-x-auto rounded-3xl bg-yuca-cream/50 p-1.5"
      >
        {PESTANAS.map(({ value, label, Icon }) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold text-yuca-ink-soft transition-colors hover:text-yuca-green-deep data-[state=active]:bg-white data-[state=active]:text-yuca-green-deep data-[state=active]:shadow-soft"
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="info" className="outline-none">
        <InfoPanel />
      </Tabs.Content>

      <Tabs.Content value="participantes" className="outline-none">
        <ParticipantesPanel />
      </Tabs.Content>

      <Tabs.Content value="actividades" className="outline-none">
        <ActividadesPanel {...actividades} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
