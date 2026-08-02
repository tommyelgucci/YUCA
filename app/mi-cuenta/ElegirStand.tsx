'use client';

import { useMemo, useState, useTransition } from 'react';
import { MapPin } from 'lucide-react';
import { ZONAS } from '@/lib/data/feria';
import { precioActual, preventaVigente } from '@/lib/data/preventas';
import { bs } from '@/lib/utils';
import type { StandKind } from '@/lib/types';
import { reservarMesaAction } from './acciones';

export interface StandDisponible {
  code: string;
  numero: number;
  kind: StandKind;
  espacioNombre: string;
}

/** Segundo paso: con el perfil ya creado, elegir una mesa libre. */
export default function ElegirStand({ disponibles }: { disponibles: StandDisponible[] }) {
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<string | null>(null);

  const porTipo = useMemo(() => {
    const grupos = new Map<StandKind, StandDisponible[]>();
    disponibles.forEach((stand) => {
      grupos.set(stand.kind, [...(grupos.get(stand.kind) ?? []), stand]);
    });
    return grupos;
  }, [disponibles]);

  const elegir = (code: string) => {
    setEligiendo(code);
    startTransition(async () => {
      const resultado = await reservarMesaAction(code);
      setMensaje(resultado.mensaje);
      setEligiendo(null);
    });
  };

  if (disponibles.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="font-display text-lg text-yuca-green-deep">No quedan mesas libres</p>
        <p className="mt-1 text-sm text-yuca-ink-soft">
          Todas las mesas de esta edición ya están apartadas o pagadas.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-8">
      <h2 className="mb-1 text-xl">Elige tu mesa</h2>
      <p className="mb-5 text-sm text-yuca-ink-soft">
        {preventaVigente
          ? `Precio de la ${preventaVigente.label.toLowerCase()}. Se congela apenas la apartes.`
          : 'No hay una preventa abierta; el precio se confirma cuando abra la siguiente.'}
      </p>

      <div className="flex flex-col gap-5">
        {Array.from(porTipo.entries()).map(([kind, stands]) => (
          <div key={kind}>
            <p className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-yuca-ink-soft">
              <span className={`h-2.5 w-2.5 rounded-full ${ZONAS[kind].swatch.split(' ')[0]}`} />
              {ZONAS[kind].plural} · {precioActual(kind) !== null ? bs(precioActual(kind)!) : 'precio por confirmar'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stands.map((stand) => (
                <button
                  key={stand.code}
                  type="button"
                  onClick={() => elegir(stand.code)}
                  disabled={pendiente}
                  title={stand.espacioNombre}
                  className="flex items-center gap-1 rounded-xl bg-yuca-green-mist px-3 py-1.5 text-sm font-extrabold text-yuca-green-deep transition-colors hover:bg-yuca-cream disabled:opacity-50"
                >
                  <MapPin size={13} aria-hidden="true" />
                  {eligiendo === stand.code && pendiente ? 'Apartando…' : stand.numero}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {mensaje && (
        <p className="mt-5 rounded-2xl bg-yuca-cream/60 p-3 text-sm text-yuca-ink" role="status">
          {mensaje}
        </p>
      )}
    </div>
  );
}
