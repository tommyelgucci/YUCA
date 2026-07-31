import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { expositores } from '@/lib/data/expositores';
import { getStand, sectores } from '@/lib/data/feria';
import { edicionActual } from '@/lib/data/edicion';
import { Avatar, CategoryBadge, VerifiedBadge } from '@/components/ui/Badges';
import ExpositorSocials from '@/components/evento/ExpositorSocials';

/** Perfiles conocidos en build time; el resto se genera bajo demanda. */
export function generateStaticParams() {
  return expositores.map((expositor) => ({ slug: expositor.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const expositor = expositores.find((e) => e.slug === slug);
  if (!expositor) return { title: 'Artista no encontrado' };

  return { title: expositor.displayName, description: expositor.bio };
}

export default async function PerfilArtistaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const expositor = expositores.find((e) => e.slug === slug);
  if (!expositor) notFound();

  const stand = getStand(expositor.standId);
  const sector = sectores.find((s) => s.id === stand?.sectorId);

  return (
    <article className="container-yuca py-10 sm:py-14">
      <Link href="/evento?tab=participantes" className="btn-ghost btn-sm mb-6 -ml-2">
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a participantes
      </Link>

      <header className="card mb-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar src={expositor.avatar} name={expositor.displayName} size="lg" />

        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-3xl leading-tight">
            {expositor.displayName}
            {expositor.verified && <VerifiedBadge withLabel />}
          </h1>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {expositor.categories.map((category) => (
              <li key={category}>
                <CategoryBadge category={category} />
              </li>
            ))}
          </ul>
        </div>

        {stand && (
          <Link
            href={`/evento?tab=participantes&stand=${stand.id}`}
            className="btn-secondary btn-md shrink-0"
          >
            <MapPin size={16} aria-hidden="true" />
            Stand {stand.id}
          </Link>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <section>
          <h2 className="mb-2 text-xl">Sobre {expositor.displayName}</h2>
          <p className="leading-relaxed text-yuca-ink-soft">{expositor.bio}</p>
        </section>

        <aside className="card p-5">
          <h2 className="mb-3 text-lg">Dónde encontrarle</h2>
          {stand ? (
            <p className="mb-4 text-sm leading-relaxed text-yuca-ink-soft">
              Stand <span className="font-bold text-yuca-green-deep">{stand.id}</span> en{' '}
              {sector?.name}, durante {edicionActual.name}.
            </p>
          ) : (
            <p className="mb-4 text-sm leading-relaxed text-yuca-ink-soft">
              Todavía no tiene mesa asignada en esta edición.
            </p>
          )}

          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-yuca-ink-soft">
            Redes
          </h3>
          <ExpositorSocials socials={expositor.socials} name={expositor.displayName} />
        </aside>
      </div>
    </article>
  );
}
