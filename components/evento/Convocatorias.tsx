import { ArrowUpRight, PenTool, Store, UtensilsCrossed } from 'lucide-react';
import { convocatorias } from '@/lib/data/convocatorias';
import type { ConvocatoriaAudience } from '@/lib/types';

const ICONO: Record<ConvocatoriaAudience, typeof PenTool> = {
  artistas: PenTool,
  comidas: UtensilsCrossed,
  emprendimientos: Store,
};

/** Convocatorias abiertas, con enlace al formulario de postulación. */
export default function Convocatorias() {
  return (
    <section aria-labelledby="titulo-convocatorias">
      <h2 id="titulo-convocatorias" className="mb-2 text-2xl">
        Convocatorias abiertas
      </h2>
      <p className="mb-6 max-w-2xl leading-relaxed text-yuca-ink-soft">
        ¿Quieres un espacio en el festival? Postula en la convocatoria que te corresponda.
      </p>

      <ul className="grid gap-4 sm:grid-cols-3">
        {convocatorias.map((convocatoria) => {
          const Icon = ICONO[convocatoria.audience];

          return (
            <li key={convocatoria.id}>
              <article className="card flex h-full flex-col p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yuca-cream">
                    <Icon size={20} className="text-yuca-coral" aria-hidden="true" />
                  </span>
                  <span className="pill bg-yuca-green-mist text-yuca-green-deep">
                    {convocatoria.phaseLabel}
                  </span>
                </div>

                <h3 className="mb-2 text-lg leading-tight">{convocatoria.title}</h3>

                <p className="mb-5 text-sm leading-relaxed text-yuca-ink-soft">
                  {convocatoria.description}
                </p>

                <div className="mt-auto">
                  {convocatoria.open ? (
                    <a
                      href={convocatoria.formUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-md group w-full"
                    >
                      Postular
                      <ArrowUpRight
                        size={16}
                        aria-hidden="true"
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </a>
                  ) : (
                    <span className="pill bg-yuca-coral/15 text-yuca-coral-deep">
                      Convocatoria cerrada
                    </span>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
