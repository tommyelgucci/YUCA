'use client';

import { useState, useTransition } from 'react';
import { BadgeCheck } from 'lucide-react';
import { verificarPerfilAction } from './acciones';

export interface PerfilPorVerificar {
  id: string;
  slug: string;
  displayName: string;
  audience: string;
  bio: string;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  web: string | null;
  createdAt: Date;
}

const AUDIENCIA_LABEL: Record<string, string> = {
  artistas: 'Arte e ilustración',
  comidas: 'Comida',
  emprendimientos: 'Emprendimiento',
};

/** Una fila de la cola de perfiles por verificar. */
export default function FilaPerfil({ perfil }: { perfil: PerfilPorVerificar }) {
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const redes = [perfil.instagram, perfil.tiktok, perfil.facebook, perfil.web].filter(Boolean);

  const verificar = () =>
    startTransition(async () => {
      const resultado = await verificarPerfilAction(perfil.id);
      setMensaje(resultado.mensaje);
    });

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg text-yuca-green-deep">{perfil.displayName}</span>
            <span className="pill bg-yuca-cream text-yuca-ink-soft">
              {AUDIENCIA_LABEL[perfil.audience] ?? perfil.audience}
            </span>
          </p>
          {perfil.bio && <p className="mt-1.5 text-sm text-yuca-ink-soft">{perfil.bio}</p>}
          {redes.length > 0 && (
            <p className="mt-1 truncate text-xs text-yuca-ink-soft">{redes.join(' · ')}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <a href={`/artistas/${perfil.slug}`} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
            Ver perfil
          </a>
          <button type="button" onClick={verificar} disabled={pendiente} className="btn-secondary btn-sm">
            <BadgeCheck size={15} aria-hidden="true" />
            Verificar
          </button>
        </div>
      </div>

      {mensaje && (
        <p className="mt-3 rounded-2xl bg-yuca-cream/60 p-3 text-sm text-yuca-ink" role="status">
          {mensaje}
        </p>
      )}
    </li>
  );
}
