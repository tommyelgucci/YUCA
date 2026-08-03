'use client';

import { useMemo, useState, useTransition } from 'react';
import { MapPin, ScrollText } from 'lucide-react';
import { ZONAS } from '@/lib/data/feria';
import { precioActual, preventaVigente } from '@/lib/data/preventas';
import { REGLAMENTO } from '@/lib/data/reglamento';
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
  const [acepta, setAcepta] = useState(false);

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
      const resultado = await reservarMesaAction(code, REGLAMENTO.version);
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

      <div className="mb-5 rounded-2xl bg-yuca-cream/60 p-4">
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 font-display text-base text-yuca-green-deep">
            <ScrollText size={16} aria-hidden="true" />
            {REGLAMENTO.titulo}
            <span className="text-xs font-normal text-yuca-ink-soft">
              · {REGLAMENTO.actualizado} · léelas antes de apartar
            </span>
          </summary>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed text-yuca-ink-soft">
            {REGLAMENTO.reglas.map((regla) => (
              <li key={regla.titulo}>
                <span className="font-bold text-yuca-ink">{regla.titulo}.</span> {regla.detalle}
              </li>
            ))}
          </ul>
        </details>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5 border-t border-yuca-green/10 pt-3 text-sm text-yuca-ink">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(event) => setAcepta(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-yuca-green-deep"
          />
          <span>
            Leí y acepto las reglas para expositores. Sé que apartar la mesa no la paga y que el
            plazo corre desde ya.
          </span>
        </label>
      </div>

      {/* Se atenúan pero no se ocultan: quien no aceptó igual quiere ver qué
          mesas quedan y a qué precio antes de decidirse. */}
      <div className={`flex flex-col gap-5 transition-opacity ${acepta ? '' : 'opacity-60'}`}>
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
                  disabled={pendiente || !acepta}
                  title={acepta ? stand.espacioNombre : 'Acepta primero las reglas'}
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
