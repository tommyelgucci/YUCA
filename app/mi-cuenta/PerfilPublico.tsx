'use client';

import { useState } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { Avatar, VerifiedBadge } from '@/components/ui/Badges';
import FormularioPerfil, { type ValoresPerfil } from './FormularioPerfil';

const AUDIENCIA_LABEL: Record<string, string> = {
  artistas: 'Arte e ilustración',
  comidas: 'Comida',
  emprendimientos: 'Emprendimiento',
};

/**
 * Lo que ve cualquiera que entre al perfil.
 *
 * Se muestra en modo lectura y se edita en el sitio, para que quede claro de
 * un vistazo qué es lo publicado; los datos personales van en otra tarjeta
 * porque no los ve nadie más que el equipo.
 */
export default function PerfilPublico({
  valores,
  slug,
  verified,
  avatarUrl,
}: {
  valores: ValoresPerfil;
  slug: string;
  verified: boolean;
  avatarUrl: string | null;
}) {
  const [editando, setEditando] = useState(false);

  const redes = [
    { label: 'Instagram', valor: valores.instagram },
    { label: 'TikTok', valor: valores.tiktok },
    { label: 'Facebook', valor: valores.facebook },
    { label: 'Web', valor: valores.web },
  ].filter((red) => red.valor);

  return (
    <section className="card p-6 sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Perfil público</h2>
          <p className="text-sm text-yuca-ink-soft">
            Esto lo ve cualquiera que entre a tu página.
          </p>
        </div>
        {!editando && (
          <button type="button" onClick={() => setEditando(true)} className="btn-ghost btn-sm shrink-0">
            <Pencil size={15} aria-hidden="true" />
            Editar
          </button>
        )}
      </div>

      {editando ? (
        <FormularioPerfil valores={valores} onListo={() => setEditando(false)} />
      ) : (
        <div>
          <div className="mb-4 flex items-start gap-3">
            <Avatar src={avatarUrl} name={valores.displayName} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 font-display text-lg leading-tight text-yuca-green-deep">
                {valores.displayName}
                {verified && <VerifiedBadge />}
              </p>
              <p className="mt-0.5 text-xs text-yuca-ink-soft">
                {AUDIENCIA_LABEL[valores.audience] ?? valores.audience}
              </p>
            </div>
          </div>

          {valores.categories.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {valores.categories.map((categoria) => (
                <li key={categoria} className="pill bg-yuca-cream text-yuca-green-deep">
                  {categoria}
                </li>
              ))}
            </ul>
          )}

          <p className="mb-4 text-sm leading-relaxed text-yuca-ink-soft">
            {valores.bio || 'Todavía no escribiste tu bio.'}
          </p>

          {redes.length > 0 && (
            <dl className="mb-4 flex flex-col gap-1 text-sm">
              {redes.map((red) => (
                <div key={red.label} className="flex gap-2">
                  <dt className="w-20 shrink-0 font-bold text-yuca-ink">{red.label}</dt>
                  <dd className="min-w-0 truncate text-yuca-ink-soft">{red.valor}</dd>
                </div>
              ))}
            </dl>
          )}

          <a
            href={`/artistas/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline btn-sm"
          >
            <Eye size={15} aria-hidden="true" />
            Ver mi página pública
          </a>
        </div>
      )}
    </section>
  );
}
