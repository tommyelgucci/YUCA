'use client';

import { useState, useTransition } from 'react';
import { Clock3, UserPlus, X } from 'lucide-react';
import { ZONAS } from '@/lib/data/feria';
import MesaConfirmada from './MesaConfirmada';
import { bs } from '@/lib/utils';
import type { StandKind } from '@/lib/types';
import {
  agregarCompaneroAction,
  cancelarMiReservaAction,
  declararComprobanteAction,
  quitarCompaneroAction,
} from './acciones';

export interface ReservaActiva {
  id: string;
  status: 'pendiente' | 'confirmada';
  amountBob: number;
  proofReference: string | null;
  expiresAt: Date;
  standCode: string;
  standNumero: number;
  standKind: StandKind;
  maxCompaneros: number;
  espacioNombre: string;
}

export interface Companero {
  id: string;
  displayName: string;
  slug: string;
  instagram: string | null;
}

function tiempoRestante(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return 'Plazo vencido';
  const horas = Math.floor(ms / 3_600_000);
  if (horas >= 24) return `Vence en ${Math.floor(horas / 24)} d`;
  if (horas >= 1) return `Vence en ${horas} h`;
  return `Vence en ${Math.floor(ms / 60_000)} min`;
}

/** Tercer paso: mesa apartada. Declarar comprobante, cancelar o sumar acompañantes. */
export default function PanelReserva({
  reserva,
  companeros,
  slug,
  nombre,
}: {
  reserva: ReservaActiva;
  companeros: Companero[];
  slug: string;
  nombre: string;
}) {
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mostrarCompanero, setMostrarCompanero] = useState(false);

  const enviarComprobante = (formData: FormData) => {
    startTransition(async () => {
      const resultado = await declararComprobanteAction(formData);
      setMensaje(resultado.mensaje);
    });
  };

  const cancelar = () => {
    startTransition(async () => {
      const resultado = await cancelarMiReservaAction(reserva.id);
      setMensaje(resultado.mensaje);
    });
  };

  const sumarCompanero = (formData: FormData) => {
    startTransition(async () => {
      const resultado = await agregarCompaneroAction(formData);
      setMensaje(resultado.mensaje);
      if (resultado.ok) setMostrarCompanero(false);
    });
  };

  const quitarCompanero = (companionId: string) => {
    startTransition(async () => {
      const resultado = await quitarCompaneroAction(companionId);
      setMensaje(resultado.mensaje);
    });
  };

  const confirmada = reserva.status === 'confirmada';
  const cupoLibre = companeros.length < reserva.maxCompaneros;

  return (
    <div className="flex flex-col gap-5">
      {confirmada ? (
        <MesaConfirmada
          standNumero={reserva.standNumero}
          standKind={reserva.standKind}
          espacioNombre={reserva.espacioNombre}
          slug={slug}
          nombre={nombre}
        />
      ) : (
        <div className="card p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="pill bg-yuca-green-deep text-white">
              {ZONAS[reserva.standKind].label} {reserva.standNumero}
            </span>
            <span className="pill bg-yuca-cream text-yuca-ink-soft">{bs(reserva.amountBob)}</span>
            <span className="flex items-center gap-1 text-xs font-bold text-yuca-ink-soft">
              <Clock3 size={13} aria-hidden="true" />
              {tiempoRestante(reserva.expiresAt)}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-yuca-ink-soft">
              Transfiere por QR y declara aquí la referencia. El staff confirma comparando con su
              extracto; si vence el plazo sin confirmar, la mesa se libera sola.
            </p>

            <form action={enviarComprobante} className="flex flex-col gap-3">
              <input type="hidden" name="reservationId" value={reserva.id} />
              <div>
                <label htmlFor="referencia" className="label">
                  Referencia de la transferencia
                </label>
                <input
                  id="referencia"
                  name="referencia"
                  required
                  defaultValue={reserva.proofReference ?? ''}
                  placeholder="Número de operación o últimos dígitos"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="comprobante" className="label">
                  Captura del comprobante
                  <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
                </label>
                <input
                  id="comprobante"
                  name="comprobante"
                  type="file"
                  accept="image/*"
                  className="field file:mr-3 file:rounded-xl file:border-0 file:bg-yuca-green-mist file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-yuca-green-deep"
                />
              </div>
              <button type="submit" disabled={pendiente} className="btn-secondary btn-md w-full">
                {pendiente ? 'Enviando…' : 'Declarar transferencia'}
              </button>
            </form>

            <button
              type="button"
              onClick={cancelar}
              disabled={pendiente}
              className="btn-outline btn-sm self-start"
            >
              <X size={14} aria-hidden="true" />
              Cancelar y liberar la mesa
            </button>
          </div>
        </div>
      )}

      <div className="card p-6 sm:p-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">
            Acompañantes
            <span className="ml-1.5 text-sm font-normal text-yuca-ink-soft">
              {companeros.length}/{reserva.maxCompaneros}
            </span>
          </h2>
          {cupoLibre && !mostrarCompanero && (
            <button type="button" onClick={() => setMostrarCompanero(true)} className="btn-ghost btn-sm">
              <UserPlus size={15} aria-hidden="true" />
              Sumar
            </button>
          )}
        </div>

        {companeros.length > 0 && (
          <ul className="mb-3 flex flex-col gap-2">
            {companeros.map((companero) => (
              <li
                key={companero.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-yuca-cream/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-yuca-ink">{companero.displayName}</p>
                  <p className="truncate text-xs text-yuca-ink-soft">
                    /{companero.slug}
                    {companero.instagram && ` · ${companero.instagram}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitarCompanero(companero.id)}
                  disabled={pendiente}
                  aria-label={`Quitar a ${companero.displayName}`}
                  className="btn-ghost p-1.5"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {mostrarCompanero && (
          <form action={sumarCompanero} className="flex flex-col gap-2 border-t border-yuca-green/10 pt-3">
            <input type="hidden" name="reservationId" value={reserva.id} />
            <label htmlFor="slug" className="label">
              Usuario o enlace de su perfil
            </label>
            <input
              id="slug"
              name="slug"
              required
              placeholder="lunaria — o pega el enlace de su perfil"
              className="field"
            />
            <p className="text-xs leading-relaxed text-yuca-ink-soft">
              Tiene que tener cuenta en Proyecto Yuca y estar verificado por el equipo. Es lo que
              pidió la organización: quien esté detrás de una mesa tiene que ser identificable.
            </p>
            <div className="flex gap-2">
              <button type="submit" disabled={pendiente} className="btn-secondary btn-sm">
                Sumar
              </button>
              <button
                type="button"
                onClick={() => setMostrarCompanero(false)}
                className="btn-ghost btn-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {companeros.length === 0 && !mostrarCompanero && (
          <p className="text-sm text-yuca-ink-soft">Todavía no sumaste a nadie.</p>
        )}
      </div>

      {mensaje && (
        <p className="rounded-2xl bg-yuca-cream/60 p-3 text-sm text-yuca-ink" role="status">
          {mensaje}
        </p>
      )}
    </div>
  );
}
