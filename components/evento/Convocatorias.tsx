import { ArrowUpRight, Lock, PenTool, Store, UtensilsCrossed } from 'lucide-react';
import { convocatorias, hayConvocatoriaAbierta, proximaFase } from '@/lib/data/convocatorias';
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
        Convocatorias
      </h2>
      <p className="mb-6 max-w-2xl leading-relaxed text-yuca-ink-soft">
        {hayConvocatoriaAbierta
          ? '¿Quieres un espacio en el festival? Postula en la convocatoria que te corresponda.'
          : `${proximaFase.aviso} Súmate al Discord y te avisamos apenas se abran.`}
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
                  <span
                    className={`pill ${
                      convocatoria.estado === 'abierta'
                        ? 'bg-yuca-green-mist text-yuca-green-deep'
                        : 'bg-yuca-cream text-yuca-ink-soft'
                    }`}
                  >
                    {convocatoria.estado === 'abierta'
                      ? convocatoria.phaseLabel
                      : `${convocatoria.phaseLabel} cerrada`}
                  </span>
                </div>

                <h3 className="mb-2 text-lg leading-tight">{convocatoria.title}</h3>

                <p className="mb-5 text-sm leading-relaxed text-yuca-ink-soft">
                  {convocatoria.description}
                </p>

                <div className="mt-auto">
                  {convocatoria.estado === 'abierta' ? (
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
                    /* Cerrada: no se enlaza el formulario de la fase anterior. */
                    <p className="flex items-center gap-2 text-sm font-bold text-yuca-ink-soft">
                      <Lock size={14} className="shrink-0 text-yuca-mustard" aria-hidden="true" />
                      {convocatoria.phaseLabel} cerrada · vuelve en la {proximaFase.label}
                    </p>
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
