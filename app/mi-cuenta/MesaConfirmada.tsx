'use client';

import { CalendarDays, DoorOpen, MapPin, PartyPopper, Backpack } from 'lucide-react';
import { ZONAS } from '@/lib/data/feria';
import { edicionActual } from '@/lib/data/edicion';
import { hayHorarios, instruccionesIngreso } from '@/lib/data/ingreso';
import type { StandKind } from '@/lib/types';

/**
 * Pantalla de "¡Felicidades!": la mesa está pagada y confirmada.
 *
 * La pidió la organización como cierre del circuito. No es decoración: es el
 * único momento en que se tiene toda la atención de quien acaba de pagar, y es
 * donde hay que decirle a qué hora entrar y qué llevar. Si no está aquí, lo va
 * a preguntar por Instagram de uno en uno.
 *
 * Los horarios salen de `lib/data/ingreso.ts` y hoy están vacíos porque
 * dependen de la sede. Lo que falta no se muestra en vez de inventarse; lo que
 * sí se sabe —qué llevar— se muestra igual.
 */
export default function MesaConfirmada({
  standNumero,
  standKind,
  espacioNombre,
  slug,
  nombre,
}: {
  standNumero: number;
  standKind: StandKind;
  espacioNombre: string;
  slug: string;
  nombre: string;
}) {
  const zona = ZONAS[standKind];

  return (
    <div className="card overflow-hidden">
      <div className="bg-yuca-green-mist px-6 py-8 text-center sm:px-8">
        <PartyPopper
          size={34}
          className="mx-auto mb-3 text-yuca-green-deep"
          aria-hidden="true"
        />
        <h2 className="font-display text-3xl text-yuca-green-deep">¡Felicidades, {nombre}!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-yuca-ink-soft">
          Tu pago está confirmado y la mesa es tuya. Nos vemos en{' '}
          <strong className="text-yuca-ink">{edicionActual.name}</strong>.
        </p>

        <div className="mt-5 inline-flex flex-col items-center rounded-2xl bg-white/70 px-6 py-4">
          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-yuca-ink-soft">
            {zona.label}
          </span>
          <span className="font-display text-5xl leading-none text-yuca-green-deep">
            {standNumero}
          </span>
          <span className="mt-1 flex items-center gap-1 text-sm text-yuca-ink-soft">
            <MapPin size={13} aria-hidden="true" />
            {espacioNombre}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex gap-3">
          <CalendarDays size={18} className="mt-0.5 shrink-0 text-yuca-green" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-yuca-ink">{edicionActual.dateLabel}</p>
            <p className="text-sm text-yuca-ink-soft">
              {edicionActual.venue}
              {edicionActual.city && ` · ${edicionActual.city}`}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <DoorOpen size={18} className="mt-0.5 shrink-0 text-yuca-green" aria-hidden="true" />
          <div>
            <p className="mb-1 text-sm font-bold text-yuca-ink">Cómo se entra</p>
            {hayHorarios() ? (
              <ul className="flex flex-col gap-1 text-sm text-yuca-ink-soft">
                {instruccionesIngreso.armado && <li>Armado: {instruccionesIngreso.armado}</li>}
                {instruccionesIngreso.apertura && (
                  <li>Apertura al público: {instruccionesIngreso.apertura}</li>
                )}
                {instruccionesIngreso.cierre && <li>Cierre: {instruccionesIngreso.cierre}</li>}
                {instruccionesIngreso.acceso && <li>Acceso: {instruccionesIngreso.acceso}</li>}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-yuca-ink-soft">
                Los horarios de armado y apertura se confirman cuando se cierre la sede. Te
                avisamos por aquí y por Instagram; no hace falta que hagas nada.
              </p>
            )}
          </div>
        </div>

        {instruccionesIngreso.llevar.length > 0 && (
          <div className="flex gap-3">
            <Backpack size={18} className="mt-0.5 shrink-0 text-yuca-green" aria-hidden="true" />
            <div>
              <p className="mb-1 text-sm font-bold text-yuca-ink">Qué llevar</p>
              <ul className="ml-4 flex list-disc flex-col gap-1 text-sm leading-relaxed text-yuca-ink-soft">
                {instruccionesIngreso.llevar.map((cosa) => (
                  <li key={cosa}>{cosa}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <a
          href={`/artistas/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn-md self-start"
        >
          Ver tu perfil público
        </a>
      </div>
    </div>
  );
}
