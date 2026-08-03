import type { Metadata } from 'next';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { getDb } from '@/db';
import { tiendasAbiertas } from '@/lib/tienda';
import { bs } from '@/lib/utils';
import { Avatar } from '@/components/ui/Badges';

export const metadata: Metadata = {
  title: 'Tiendas',
  description:
    'Compra directo a ilustradores y emprendedores bolivianos, todo el año y no sólo en la feria.',
};

// El catálogo cambia cada vez que alguien publica algo.
export const dynamic = 'force-dynamic';

export default async function TiendasPage() {
  const db = getDb();
  const tiendas = db ? await tiendasAbiertas(db) : [];

  return (
    <div className="container-yuca py-10 sm:py-14">
      <header className="mb-8 max-w-2xl">
        <h1 className="mb-2 text-3xl">Tiendas</h1>
        <p className="leading-relaxed text-yuca-ink-soft">
          Compra directo a quien lo hace, todo el año y no sólo durante la feria. Cada tienda es de
          un expositor verificado por el equipo.
        </p>
      </header>

      {tiendas.length === 0 ? (
        <div className="card p-8 text-center">
          <Store size={28} className="mx-auto mb-3 text-yuca-green" aria-hidden="true" />
          <p className="font-display text-lg text-yuca-green-deep">Todavía no hay tiendas abiertas</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-yuca-ink-soft">
            Si eres expositor verificado, puedes abrir la tuya desde tu cuenta y publicar lo que
            haces. Es gratis.
          </p>
          <Link href="/mi-cuenta" className="btn-secondary btn-md mt-5 inline-flex">
            Abrir mi tienda
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiendas.map((tienda) => (
            <li key={tienda.slug}>
              <Link
                href={`/tienda/${tienda.slug}`}
                className="card flex h-full gap-4 p-5 transition-colors hover:bg-yuca-cream/30"
              >
                <Avatar src={tienda.avatarUrl} name={tienda.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="font-display text-lg leading-tight text-yuca-green-deep">
                    {tienda.displayName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-yuca-ink-soft">
                    {tienda.bio}
                  </p>
                  <p className="mt-2 text-xs font-bold text-yuca-ink-soft">
                    {tienda.productos} {tienda.productos === 1 ? 'producto' : 'productos'} · desde{' '}
                    {bs(tienda.desde)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
