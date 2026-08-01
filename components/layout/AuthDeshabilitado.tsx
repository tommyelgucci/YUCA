import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { convocatoriaArtistas } from '@/lib/data/convocatorias';

/**
 * Pantalla que se muestra en las rutas de cuenta mientras Clerk no esté
 * configurado. En vez de un error, apunta a la vía que sí funciona hoy.
 */
export default function AuthDeshabilitado() {
  return (
    <div className="container-yuca py-16">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-yuca-cream">
          <KeyRound size={26} className="text-yuca-green-deep" aria-hidden="true" />
        </span>

        <h1 className="mb-2 text-2xl">Las cuentas todavía no están activas</h1>

        <p className="mb-6 leading-relaxed text-yuca-ink-soft">
          Estamos terminando el registro de expositores. Mientras tanto, la postulación sigue
          siendo por la convocatoria.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href={convocatoriaArtistas.formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-lg w-full"
          >
            Ir a la convocatoria
          </a>
          <Link href="/evento" className="btn-outline btn-lg w-full">
            Ver el evento
          </Link>
        </div>
      </div>
    </div>
  );
}
