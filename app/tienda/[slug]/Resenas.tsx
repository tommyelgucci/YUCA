'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { dejarResenaAction } from '../acciones';

export interface Resena {
  id: string;
  autorNombre: string;
  estrellas: number;
  comentario: string;
  createdAt: Date;
}

/** Estrellas pintadas. `size` en píxeles porque conviven en dos tamaños. */
export function Estrellas({ cuantas, size = 15 }: { cuantas: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${cuantas} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden="true"
          className={n <= cuantas ? 'fill-yuca-mustard text-yuca-mustard' : 'text-yuca-cream-deep'}
        />
      ))}
    </span>
  );
}

/**
 * Reseñas de un vendedor: las que hay y el formulario para dejar la tuya.
 *
 * Cada reseña se muestra **con el nombre de quien la escribió**, nunca anónima.
 * Mientras no existan pedidos no hay forma de comprobar que quien opina compró
 * de verdad; en una comunidad donde todos se conocen, poner la cara delante
 * sostiene la confianza mejor que un sello de "compra verificada" que todavía
 * no se puede emitir.
 */
export default function Resenas({
  slug,
  resenas,
  puedeOpinar,
}: {
  slug: string;
  resenas: Resena[];
  puedeOpinar: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [estrellas, setEstrellas] = useState(5);
  const [enviada, setEnviada] = useState(false);

  const enviar = (formData: FormData) =>
    startTransition(async () => {
      const resultado = await dejarResenaAction(formData);
      setMensaje(resultado.mensaje);
      if (resultado.ok) setEnviada(true);
    });

  return (
    <section>
      <h2 className="mb-3 text-xl">Reseñas</h2>

      {puedeOpinar && !enviada && (
        <form action={enviar} className="card mb-5 flex flex-col gap-3 p-5">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="estrellas" value={estrellas} />

          <div>
            <span className="label">Tu puntuación</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEstrellas(n)}
                  aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
                  aria-pressed={estrellas === n}
                  className="p-0.5"
                >
                  <Star
                    size={26}
                    aria-hidden="true"
                    className={
                      n <= estrellas
                        ? 'fill-yuca-mustard text-yuca-mustard'
                        : 'text-yuca-cream-deep'
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="comentario" className="label">
              Cuéntalo
              <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
            </label>
            <textarea
              id="comentario"
              name="comentario"
              rows={3}
              placeholder="Qué compraste, cómo llegó, si volverías."
              className="field"
            />
          </div>

          <p className="text-xs leading-relaxed text-yuca-ink-soft">
            Tu reseña se publica con tu nombre. No hay reseñas anónimas: es lo que hace que valgan.
          </p>

          <button type="submit" disabled={pendiente} className="btn-secondary btn-md self-start">
            {pendiente ? 'Enviando…' : 'Publicar reseña'}
          </button>
        </form>
      )}

      {mensaje && (
        <p className="mb-4 rounded-2xl bg-yuca-cream/60 p-3 text-sm text-yuca-ink" role="status">
          {mensaje}
        </p>
      )}

      {resenas.length === 0 ? (
        <p className="text-sm leading-relaxed text-yuca-ink-soft">
          Todavía nadie dejó su reseña. Si le compraste, eres quien puede estrenar esto.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {resenas.map((resena) => (
            <li key={resena.id} className="card p-4">
              <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold text-yuca-ink">{resena.autorNombre}</span>
                <Estrellas cuantas={resena.estrellas} />
                <span className="text-xs text-yuca-ink-soft">
                  {resena.createdAt.toLocaleDateString('es-BO')}
                </span>
              </div>
              {resena.comentario && (
                <p className="text-sm leading-relaxed text-yuca-ink-soft">{resena.comentario}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
