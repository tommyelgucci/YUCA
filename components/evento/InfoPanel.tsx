import { ArrowUpRight, CalendarDays, MapPin, QrCode, Store } from 'lucide-react';
import { edicionActual } from '@/lib/data/edicion';
import { stands } from '@/lib/data/feria';
import { ctaMesa } from '@/lib/data/convocatorias';
import { bs } from '@/lib/utils';
import type { PaymentMethod } from '@/lib/types';
import Convocatorias from './Convocatorias';

const METODOS: Record<PaymentMethod, { label: string; help: string; Icon: typeof QrCode }> = {
  qr: {
    label: 'Transferencia por QR',
    help: 'Escaneas el QR desde la app de tu banco',
    Icon: QrCode,
  },
};

export default function InfoPanel() {
  const disponibles = stands.filter((s) => s.status === 'disponible').length;
  const mesa = ctaMesa();

  const datos = [
    { Icon: CalendarDays, label: 'Cuándo', value: edicionActual.dateLabel },
    { Icon: MapPin, label: 'Dónde', value: `${edicionActual.venue}, ${edicionActual.city}` },
    { Icon: Store, label: 'Mesas libres', value: `${disponibles} de ${stands.length}` },
  ];

  return (
    <div className="flex flex-col gap-14">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <h2 className="mb-3 text-2xl">Sobre esta edición</h2>
          <p className="mb-6 leading-relaxed text-yuca-ink-soft">{edicionActual.description}</p>

          <dl className="grid gap-3 sm:grid-cols-3">
            {datos.map(({ Icon, label, value }) => (
              <div key={label} className="card p-4">
                <dt className="mb-1.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-yuca-ink-soft">
                  <Icon size={14} className="text-yuca-green" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="font-display text-lg leading-tight text-yuca-green-deep">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="card p-5">
          <h3 className="mb-1 text-xl">¿Quieres una mesa?</h3>
          <p className="mb-4 text-sm leading-relaxed text-yuca-ink-soft">
            {mesa.nota} Cuando la organización confirme tu lugar, eliges mesa y la aseguras con el
            pago; tu perfil aparece entonces en la lista de participantes.
          </p>

          <p className="mb-4 font-display text-2xl text-yuca-green-deep">
            Desde {bs(edicionActual.standPriceBob)}
            <span className="ml-1 font-body text-xs font-bold text-yuca-ink-soft">
              por la edición completa
            </span>
          </p>

          <a
            href={mesa.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-md group mb-5 w-full"
          >
            {mesa.label}
            <ArrowUpRight
              size={16}
              aria-hidden="true"
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>

          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-yuca-ink-soft">
            Formas de pago
          </p>
          <ul className="flex flex-col gap-2">
            {edicionActual.ticket.methods.map((method) => {
              const { label, help, Icon } = METODOS[method];
              return (
                <li key={method} className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yuca-cream">
                    <Icon size={17} className="text-yuca-green-deep" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="font-bold text-yuca-green-deep">{label}</span>
                    <span className="block text-xs text-yuca-ink-soft">{help}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 rounded-2xl bg-yuca-cream/50 p-3 text-xs leading-relaxed text-yuca-ink-soft">
            El pago se confirma a mano: escaneas el QR, transfieres y subes tu comprobante para que
            la organización lo valide. Mientras tanto tu mesa queda apartada; si vence el plazo sin
            confirmar, vuelve a quedar libre.
          </p>
        </aside>
      </div>

      <Convocatorias />
    </div>
  );
}
