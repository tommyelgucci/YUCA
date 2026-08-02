'use client';

import { useRef, useState, useTransition } from 'react';
import {
  ART_CATEGORIES,
  AUDIENCIAS,
  type ArtCategory,
  type ConvocatoriaAudience,
} from '@/lib/types';
import { actualizarPerfilAction, crearPerfilAction } from './acciones';

export interface ValoresPerfil {
  displayName: string;
  audience: ConvocatoriaAudience;
  categories: string[];
  bio: string;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  web: string | null;
}

/**
 * Campos del perfil público.
 *
 * El mismo formulario sirve para el alta y para la edición: son exactamente
 * los mismos campos, y sólo cambian la acción que reciben y el rótulo del
 * botón.
 */
export default function FormularioPerfil({
  valores,
  onListo,
}: {
  valores?: ValoresPerfil;
  onListo?: () => void;
}) {
  const editando = Boolean(valores);
  const formRef = useRef<HTMLFormElement>(null);
  const [audience, setAudience] = useState<ConvocatoriaAudience>(valores?.audience ?? 'artistas');
  const [categories, setCategories] = useState<string[]>(valores?.categories ?? []);
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const toggleCategoria = (categoria: ArtCategory) => {
    setCategories((prev) =>
      prev.includes(categoria) ? prev.filter((c) => c !== categoria) : [...prev, categoria],
    );
  };

  const enviar = (formData: FormData) => {
    startTransition(async () => {
      const resultado = editando
        ? await actualizarPerfilAction(formData)
        : await crearPerfilAction(formData);
      setMensaje(resultado.mensaje);
      if (resultado.ok) {
        if (!editando) formRef.current?.reset();
        onListo?.();
      }
    });
  };

  return (
    <form ref={formRef} action={enviar} className="flex flex-col gap-4">
      <div>
        <label htmlFor="displayName" className="label">
          Nombre o marca
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          defaultValue={valores?.displayName}
          placeholder="Yuquita Ilustra"
          className="field"
        />
        {editando && (
          <p className="mt-1 text-xs text-yuca-ink-soft">
            La dirección de tu perfil público no cambia aunque cambies de nombre, para no romper
            los enlaces que ya compartiste.
          </p>
        )}
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
          defaultValue={valores?.bio}
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
          <input
            id="instagram"
            name="instagram"
            defaultValue={valores?.instagram ?? ''}
            placeholder="https://instagram.com/..."
            className="field"
          />
        </div>
        <div>
          <label htmlFor="tiktok" className="label">
            TikTok
            <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
          </label>
          <input
            id="tiktok"
            name="tiktok"
            defaultValue={valores?.tiktok ?? ''}
            placeholder="https://tiktok.com/@..."
            className="field"
          />
        </div>
        <div>
          <label htmlFor="facebook" className="label">
            Facebook
            <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
          </label>
          <input
            id="facebook"
            name="facebook"
            defaultValue={valores?.facebook ?? ''}
            placeholder="https://facebook.com/..."
            className="field"
          />
        </div>
        <div>
          <label htmlFor="web" className="label">
            Web
            <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
          </label>
          <input
            id="web"
            name="web"
            defaultValue={valores?.web ?? ''}
            placeholder="https://..."
            className="field"
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="submit" disabled={pendiente} className="btn-primary btn-lg flex-1">
          {pendiente ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear perfil'}
        </button>
        {editando && (
          <button type="button" onClick={onListo} className="btn-ghost btn-lg">
            Cancelar
          </button>
        )}
      </div>

      {mensaje && (
        <p className="rounded-2xl bg-yuca-cream/60 p-3 text-sm text-yuca-ink" role="status">
          {mensaje}
        </p>
      )}
    </form>
  );
}
