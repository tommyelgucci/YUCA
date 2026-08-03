import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { getDb } from '@/db';
import { getUsuarioId } from '@/lib/auth';
import { perfilPorClerkId, perfilPublicoPorSlug } from '@/lib/perfiles';
import { catalogoDe, reputacionDe, resenasDe } from '@/lib/tienda';
import { bs } from '@/lib/utils';
import { Avatar, VerifiedBadge } from '@/components/ui/Badges';
import ExpositorSocials from '@/components/evento/ExpositorSocials';
import Resenas, { Estrellas } from './Resenas';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const vendedor = db ? await perfilPublicoPorSlug(db, slug) : null;

  if (!vendedor) return { title: 'Tienda no encontrada' };

  return {
    title: `Tienda de ${vendedor.displayName}`,
    description: vendedor.bio || `Compra directo a ${vendedor.displayName}.`,
  };
}

export default async function TiendaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  if (!db) notFound();

  const vendedor = await perfilPublicoPorSlug(db, slug);
  if (!vendedor) notFound();

  const [productos, resenas, reputacion, clerkUserId] = await Promise.all([
    catalogoDe(db, slug),
    resenasDe(db, vendedor.id),
    reputacionDe(db, vendedor.id),
    getUsuarioId(),
  ]);

  // Quien no entró no puede opinar, y el vendedor tampoco de su propia tienda.
  // Hay que resolver su perfil para saberlo: `perfilPublicoPorSlug` no trae el
  // `clerkUserId` a propósito, y comparar contra él sería comparar peras con
  // manzanas. La acción lo vuelve a comprobar igual; esto sólo evita enseñar
  // un formulario que iba a fallar.
  const visitante = clerkUserId ? await perfilPorClerkId(db, clerkUserId) : null;
  const puedeOpinar = Boolean(clerkUserId) && visitante?.id !== vendedor.id;

  return (
    <div className="container-yuca max-w-4xl py-10 sm:py-14">
      <Link href="/tienda" className="btn-ghost btn-sm mb-6 -ml-2">
        <ArrowLeft size={16} aria-hidden="true" />
        Todas las tiendas
      </Link>

      <header className="card mb-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar src={vendedor.avatarUrl} name={vendedor.displayName} size="lg" />

        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-3xl leading-tight">
            {vendedor.displayName}
            {vendedor.verified && <VerifiedBadge withLabel />}
          </h1>

          {reputacion.total > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-yuca-ink-soft">
              <Estrellas cuantas={Math.round(reputacion.promedio ?? 0)} />
              <span className="font-bold text-yuca-ink">{reputacion.promedio}</span>
              <span>
                · {reputacion.total} {reputacion.total === 1 ? 'reseña' : 'reseñas'}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-yuca-ink-soft">Todavía sin reseñas</p>
          )}

          {vendedor.bio && (
            <p className="mt-3 text-sm leading-relaxed text-yuca-ink-soft">{vendedor.bio}</p>
          )}

          <div className="mt-3">
            <ExpositorSocials
              socials={{
                instagram: vendedor.instagram ?? undefined,
                tiktok: vendedor.tiktok ?? undefined,
                facebook: vendedor.facebook ?? undefined,
                web: vendedor.web ?? undefined,
              }}
              name={vendedor.displayName}
              size="sm"
            />
          </div>
        </div>

        <Link href={`/artistas/${slug}`} className="btn-outline btn-sm shrink-0">
          Ver su perfil
        </Link>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-xl">
          Catálogo
          <span className="ml-1.5 text-sm font-normal text-yuca-ink-soft">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
          </span>
        </h2>

        {productos.length === 0 ? (
          <p className="card p-6 text-center text-sm text-yuca-ink-soft">
            Esta tienda todavía no tiene nada publicado.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {productos.map((producto) => (
              <li key={producto.id} className="card overflow-hidden">
                {/*
                  Marco de la foto. Hoy siempre sale el hueco: falta decidir
                  dónde se guardan las imágenes (ver COSTOS.md y CHECKPOINT.md).
                  Se deja el espacio dibujado para que el día que existan no
                  haya que recolocar nada.
                */}
                <div className="flex aspect-square items-center justify-center bg-yuca-cream/50">
                  <ImageOff size={26} className="text-yuca-cream-deep" aria-hidden="true" />
                  <span className="sr-only">Este producto todavía no tiene foto</span>
                </div>

                <div className="p-4">
                  <p className="font-display text-base leading-tight text-yuca-green-deep">
                    {producto.nombre}
                  </p>
                  {producto.descripcion && (
                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-yuca-ink-soft">
                      {producto.descripcion}
                    </p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-yuca-ink">{bs(producto.precioBob)}</span>
                    {producto.stock === null ? (
                      <span className="pill bg-yuca-cream text-yuca-ink-soft">Por encargo</span>
                    ) : producto.stock === 0 ? (
                      <span className="pill bg-yuca-coral-soft text-yuca-coral-deep">Agotado</span>
                    ) : (
                      <span className="pill bg-yuca-green-mist text-yuca-green-deep">
                        {producto.stock} disponibles
                      </span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/*
          Todavía no hay pedidos ni pagos por la plataforma: eso es la etapa 3
          del plan. Mientras tanto, se dice en voz alta cómo se compra en vez de
          poner un botón de "comprar" que no lleva a ninguna parte.
        */}
        {productos.length > 0 && (
          <p className="mt-4 rounded-2xl bg-yuca-cream/60 p-4 text-sm leading-relaxed text-yuca-ink-soft">
            Para comprar, escríbele por sus redes. Los pedidos y el pago desde la web llegan más
            adelante.
          </p>
        )}
      </section>

      <Resenas slug={slug} resenas={resenas} puedeOpinar={puedeOpinar} />
    </div>
  );
}
