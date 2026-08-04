'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarClock, Check, MapPin, Ticket, X } from 'lucide-react';
import { isSoldOut, remainingSlots, type Activity } from '@/lib/types';
import ImageFrame from '@/components/ui/ImageFrame';
import { cancelarInscripcionAction, inscribirseAction } from '@/app/evento/acciones';

const TONO: Record<Activity['kind'], 'green' | 'coral' | 'mustard' | 'rose'> = {
  'stamp-rally': 'mustard',
  pasarela: 'coral',
  taller: 'green',
  concurso: 'rose',
};

const ETIQUETA: Record<Activity['kind'], string> = {
  'stamp-rally': 'Juego',
  pasarela: 'Competencia',
  taller: 'Taller',
  concurso: 'Concurso',
};

function Cupos({ actividad }: { actividad: Activity }) {
  const restantes = remainingSlots(actividad);

  if (restantes === null) {
    return <span className="pill bg-yuca-green-mist text-yuca-green-deep">Sin límite de cupos</span>;
  }

  if (restantes === 0) {
    return <span className="pill bg-yuca-coral/15 text-yuca-coral-deep">Inscripciones agotadas</span>;
  }

  const ocupacion = Math.round((actividad.enrolled / actividad.capacity!) * 100);

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
        <span className="text-yuca-green-deep">
          {restantes} {restantes === 1 ? 'cupo' : 'cupos'} disponibles
        </span>
        <span className="text-yuca-ink-soft">
          {actividad.enrolled}/{actividad.capacity}
        </span>
      </div>
      {/* El ancho de la barra ya lo comunica el texto de arriba: es decorativa */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-yuca-cream" aria-hidden="true">
        <div className="h-full rounded-full bg-yuca-green" style={{ width: `${ocupacion}%` }} />
      </div>
    </div>
  );
}

export default function ActividadesPanel({
  actividades,
  misInscripciones,
  sePuedeInscribir,
  haySesion,
}: {
  actividades: Activity[];
  /** Ids de las actividades en las que ya tiene cupo quien está mirando. */
  misInscripciones: string[];
  /** Falso con datos de demostración: no hay dónde guardar la inscripción. */
  sePuedeInscribir: boolean;
  haySesion: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ id: string; texto: string } | null>(null);

  const correr = (id: string, accion: () => Promise<{ mensaje: string }>) =>
    startTransition(async () => {
      setAviso({ id, texto: (await accion()).mensaje });
    });

  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {actividades.map((actividad) => {
        const inscrito = misInscripciones.includes(actividad.id);
        // Quien ya tiene su cupo no ve "agotada": lo suyo está guardado.
        const agotada = isSoldOut(actividad) && !inscrito;

        return (
          <li key={actividad.id}>
            <article className="card flex h-full flex-col overflow-hidden">
              <ImageFrame
                src={actividad.banner}
                alt={`Banner de ${actividad.title}`}
                ratio="16/9"
                tone={TONO[actividad.kind]}
              >
                <span className="pill absolute left-3 top-3 bg-white/90 text-yuca-green-deep">
                  {ETIQUETA[actividad.kind]}
                </span>
              </ImageFrame>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-2 text-xl leading-tight">{actividad.title}</h3>

                <p className="mb-4 text-sm leading-relaxed text-yuca-ink-soft">
                  {actividad.description}
                </p>

                <ul className="mb-4 flex flex-col gap-1.5 text-xs font-semibold text-yuca-ink-soft">
                  <li className="flex items-center gap-2">
                    <CalendarClock size={14} className="shrink-0 text-yuca-green" aria-hidden="true" />
                    {actividad.schedule}
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin size={14} className="shrink-0 text-yuca-green" aria-hidden="true" />
                    {actividad.location}
                  </li>
                </ul>

                <div className="mb-4 rounded-2xl bg-yuca-cream/40 p-3.5">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-yuca-green-deep">
                    Condiciones
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {actividad.conditions.map((condicion) => (
                      <li key={condicion} className="flex items-start gap-2 text-sm text-yuca-ink-soft">
                        <Check size={14} className="mt-1 shrink-0 text-yuca-green" aria-hidden="true" />
                        {condicion}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  <Cupos actividad={actividad} />

                  {/*
                    Sin base detrás no se ofrece el botón, igual que no se
                    ofrece subir fotos sin almacenamiento: prometer una
                    inscripción que no se va a guardar en ningún sitio es peor
                    que decir que todavía no se puede.
                  */}
                  {!sePuedeInscribir ? (
                    <p className="text-center text-xs text-yuca-ink-soft">
                      Las inscripciones abren cuando se confirme el programa.
                    </p>
                  ) : !haySesion ? (
                    <Link href="/iniciar-sesion" className="btn-outline btn-md w-full">
                      <Ticket size={16} aria-hidden="true" />
                      Entra para inscribirte
                    </Link>
                  ) : inscrito ? (
                    <button
                      type="button"
                      onClick={() =>
                        correr(actividad.id, () => cancelarInscripcionAction(actividad.id))
                      }
                      disabled={pendiente}
                      className="btn-outline btn-md w-full"
                    >
                      <X size={16} aria-hidden="true" />
                      {pendiente ? 'Liberando…' : 'Ya tienes cupo · soltarlo'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => correr(actividad.id, () => inscribirseAction(actividad.id))}
                      disabled={agotada || pendiente}
                      className={
                        agotada ? 'btn-outline btn-md w-full' : 'btn-secondary btn-md w-full'
                      }
                    >
                      <Ticket size={16} aria-hidden="true" />
                      {agotada ? 'Sin cupos' : pendiente ? 'Apuntando…' : 'Quiero inscribirme'}
                    </button>
                  )}

                  {aviso?.id === actividad.id && (
                    <p className="text-center text-sm text-yuca-ink-soft">{aviso.texto}</p>
                  )}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
