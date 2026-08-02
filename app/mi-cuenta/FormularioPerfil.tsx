'use client';

import { useRef, useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { ART_CATEGORIES, type ArtCategory, type ConvocatoriaAudience } from '@/lib/types';
import { crearPerfilAction } from './acciones';

const AUDIENCIAS: { id: ConvocatoriaAudience; label: string }[] = [
  { id: 'artistas', label: 'Arte e ilustración' },
  { id: 'comidas', label: 'Comida' },
  { id: 'emprendimientos', label: 'Emprendimiento' },
];

/** Primer paso en "mi cuenta": crear el perfil público de expositor. */
export default function FormularioPerfil() {
  const formRef = useRef<HTMLFormElement>(null);
  const [audience, setAudience] = useState<ConvocatoriaAudience>('artistas');
  const [categories, setCategories] = useState<ArtCategory[]>([]);
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const toggleCategoria = (categoria: ArtCategory) => {
    setCategories((prev) =>
      prev.includes(categoria) ? prev.filter((c) => c !== categoria) : [...prev, categoria],
    );
  };

  const enviar = (formData: FormData) => {
    startTransition(async () => {
      const resultado = await crearPerfilAction(formData);
      setMensaje(resultado.mensaje);
      if (resultado.ok) formRef.current?.reset();
    });
  };

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yuca-cream">
          <Sparkles size={20} className="text-yuca-coral" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl">Crea tu perfil de expositor</h1>
          <p className="text-sm text-yuca-ink-soft">
            Es lo que va a ver la gente en tu página pública y en la lista de participantes.
          </p>
        </div>
      </div>

      <form ref={formRef} action={enviar} className="flex flex-col gap-4">
        <div>
          <label htmlFor="displayName" className="label">
            Nombre o marca
          </label>
          <input
            id="displayName"
            name="displayName"
            required
            placeholder="Yuquita Ilustra"
            className="field"
          />
        </div>

        <div>
          <p className="label">¿A qué público perteneces?</p>
          <div className="flex flex-wrap gap-1.5">
            {AUDIENCIAS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAudience(item.id)}
                aria-pressed={audience === item.id}
                className={`pill transition-colors ${
                  audience === item.id
                    ? 'bg-yuca-green text-white'
                    : 'bg-yuca-cream/70 text-yuca-green-deep hover:bg-yuca-cream'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="audience" value={audience} />
        </div>

        {audience === 'artistas' && (
          <div>
            <p className="label">Categorías de tu arte</p>
            <div className="flex flex-wrap gap-1.5">
              {ART_CATEGORIES.map((categoria) => (
                <button
                  key={categoria}
                  type="button"
                  onClick={() => toggleCategoria(categoria)}
                  aria-pressed={categories.includes(categoria)}
                  className={`pill transition-colors ${
                    categories.includes(categoria)
                      ? 'bg-yuca-green text-white'
                      : 'bg-yuca-cream/70 text-yuca-green-deep hover:bg-yuca-cream'
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>
            {categories.map((categoria) => (
              <input key={categoria} type="hidden" name="categories" value={categoria} />
            ))}
          </div>
        )}

        <div>
          <label htmlFor="bio" className="label">
            Bio
            <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            placeholder="Contá qué hacés y qué vas a llevar a tu mesa."
            className="field"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="instagram" className="label">
              Instagram
              <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
            </label>
            <input id="instagram" name="instagram" placeholder="https://instagram.com/..." className="field" />
          </div>
          <div>
            <label htmlFor="tiktok" className="label">
              TikTok
              <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
            </label>
            <input id="tiktok" name="tiktok" placeholder="https://tiktok.com/@..." className="field" />
          </div>
          <div>
            <label htmlFor="facebook" className="label">
              Facebook
              <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
            </label>
            <input id="facebook" name="facebook" placeholder="https://facebook.com/..." className="field" />
          </div>
          <div>
            <label htmlFor="web" className="label">
              Web
              <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
            </label>
            <input id="web" name="web" placeholder="https://..." className="field" />
          </div>
        </div>

        <button type="submit" disabled={pendiente} className="btn-primary btn-lg mt-2 w-full">
          {pendiente ? 'Creando…' : 'Crear perfil'}
        </button>

        {mensaje && (
          <p className="rounded-2xl bg-yuca-cream/60 p-3 text-sm text-yuca-ink" role="status">
            {mensaje}
          </p>
        )}
      </form>
    </div>
  );
}
