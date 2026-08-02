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
  fullName: string | null;
  birthDate: string | null;
  contactEmail: string | null;
  phone: string | null;
  gender: string | null;
  department: string | null;
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

  // Verificar es cotejar que detrás del nombre artístico hay alguien
  // identificable, así que estos datos son el motivo de la pantalla.
  const personales = [
    { label: 'Nombre', valor: perfil.fullName },
    { label: 'Nacimiento', valor: perfil.birthDate },
    { label: 'Correo', valor: perfil.contactEmail },
    { label: 'Teléfono', valor: perfil.phone },
    { label: 'Género', valor: perfil.gender },
    { label: 'Depto.', valor: perfil.department },
  ].filter((campo) => campo.valor);

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

          {personales.length > 0 ? (
            <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-yuca-cream/50 px-3 py-2 text-xs">
              {personales.map((campo) => (
                <div key={campo.label} className="flex gap-1.5">
                  <dt className="font-bold text-yuca-ink">{campo.label}</dt>
                  <dd className="text-yuca-ink-soft">{campo.valor}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2.5 text-xs font-bold text-yuca-coral-deep">
              Todavía no cargó sus datos personales.
            </p>
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
