'use client';

import { useState, useTransition } from 'react';
import { Check, Clock3, X } from 'lucide-react';
import { bs } from '@/lib/utils';
import { confirmarPagoAction, rechazarPagoAction } from './acciones';

export interface ReservaPendiente {
  reservationId: string;
  standCode: string;
  amountBob: number;
  proofReference: string | null;
  createdAt: Date;
  expiresAt: Date;
  exhibitorName: string;
  exhibitorSlug: string;
}

function tiempoRestante(expiresAt: Date): { texto: string; vencida: boolean } {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return { texto: 'Plazo vencido', vencida: true };

  const horas = Math.floor(ms / 3_600_000);
  if (horas >= 24) return { texto: `Vence en ${Math.floor(horas / 24)} d`, vencida: false };
  if (horas >= 1) return { texto: `Vence en ${horas} h`, vencida: false };
  return { texto: `Vence en ${Math.floor(ms / 60_000)} min`, vencida: false };
}

/** Una fila de la cola de pagos por revisar. */
export default function FilaReserva({ reserva }: { reserva: ReservaPendiente }) {
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');

  const plazo = tiempoRestante(reserva.expiresAt);

  const confirmar = () =>
    startTransition(async () => {
      const resultado = await confirmarPagoAction(reserva.reservationId);
      setMensaje(resultado.mensaje);
    });

  const rechazar = () =>
    startTransition(async () => {
      const resultado = await rechazarPagoAction(reserva.reservationId, motivo);
      setMensaje(resultado.mensaje);
      setRechazando(false);
    });

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="pill bg-yuca-green-deep text-white">{reserva.standCode}</span>
            <span className="font-display text-lg text-yuca-green-deep">
              {reserva.exhibitorName}
            </span>
          </p>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-yuca-ink-soft">
            <span className="font-bold text-yuca-ink">{bs(reserva.amountBob)}</span>
            <span>
              Referencia:{' '}
              {reserva.proofReference ? (
                <code className="rounded bg-yuca-cream px-1.5 py-0.5 font-bold text-yuca-ink">
                  {reserva.proofReference}
                </code>
              ) : (
                <span className="font-bold text-yuca-coral-deep">sin comprobante todavía</span>
              )}
            </span>
            <span
              className={`flex items-center gap-1 ${
                plazo.vencida ? 'font-bold text-yuca-coral-deep' : ''
              }`}
            >
              <Clock3 size={13} aria-hidden="true" />
              {plazo.texto}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={confirmar}
            disabled={pendiente || !reserva.proofReference}
            title={
              reserva.proofReference
                ? 'Dar por buena la transferencia'
                : 'Todavía no declaró la referencia de su transferencia'
            }
            className="btn-secondary btn-sm"
          >
            <Check size={15} aria-hidden="true" />
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => setRechazando((v) => !v)}
            disabled={pendiente}
            className="btn-outline btn-sm"
            aria-expanded={rechazando}
          >
            <X size={15} aria-hidden="true" />
            Rechazar
          </button>
        </div>
      </div>

      {rechazando && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-yuca-green/10 pt-3">
          <label className="min-w-[14rem] flex-1">
            <span className="label">Motivo del rechazo</span>
            <input
              type="text"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="No llegó la transferencia"
              className="field"
            />
          </label>
          <button type="button" onClick={rechazar} disabled={pendiente} className="btn-primary btn-md">
            Cancelar la reserva
          </button>
        </div>
      )}

      {mensaje && (
        <p className="mt-3 rounded-2xl bg-yuca-cream/60 p-3 text-sm text-yuca-ink" role="status">
          {mensaje}
        </p>
      )}
    </li>
  );
}
