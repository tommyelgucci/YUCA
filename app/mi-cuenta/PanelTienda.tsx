'use client';

import { useState, useTransition } from 'react';
import { Eye, EyeOff, ImagePlus, PackagePlus, Store, Trash2, X } from 'lucide-react';
import { bs } from '@/lib/utils';
import {
  borrarProductoAction,
  cambiarEstadoProductoAction,
  cambiarTiendaAction,
  publicarProductoAction,
  quitarFotoAction,
  subirFotoAction,
} from './acciones-tienda';

export interface ProductoDelPanel {
  id: string;
  nombre: string;
  precioBob: number;
  stock: number | null;
  estado: 'borrador' | 'publicado' | 'agotado';
  fotos: { id: string; url: string }[];
}

const ETIQUETA_ESTADO = {
  borrador: { texto: 'Borrador', clase: 'bg-yuca-cream text-yuca-ink-soft' },
  publicado: { texto: 'En tienda', clase: 'bg-yuca-green-mist text-yuca-green-deep' },
  agotado: { texto: 'Agotado', clase: 'bg-yuca-coral-soft text-yuca-coral-deep' },
} as const;

/**
 * La tienda del vendedor dentro de "mi cuenta".
 *
 * Vender todo el año es opcional: mucha gente sólo quiere su mesa en noviembre.
 * Por eso la tienda se abre a propósito y no viene encendida, y por eso esta
 * tarjeta empieza cerrada explicando para qué sirve en vez de soltar un
 * formulario de productos a quien no pidió ninguno.
 */
export default function PanelTienda({
  abierta,
  verificado,
  slug,
  productos,
  puedeSubirFotos,
}: {
  abierta: boolean;
  verificado: boolean;
  slug: string;
  productos: ProductoDelPanel[];
  /** Falso mientras no haya almacenamiento configurado; entonces no se ofrece. */
  puedeSubirFotos: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [anadiendo, setAnadiendo] = useState(false);

  const correr = (accion: () => Promise<{ ok: boolean; mensaje: string }>, alTerminar?: () => void) =>
    startTransition(async () => {
      const resultado = await accion();
      setMensaje(resultado.mensaje);
      if (resultado.ok) alTerminar?.();
    });

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl">
          <Store size={18} aria-hidden="true" className="text-yuca-green" />
          Mi tienda
        </h2>
        {abierta && (
          <a
            href={`/tienda/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost btn-sm shrink-0"
          >
            Ver mi tienda
          </a>
        )}
      </div>

      <p className="mb-5 text-sm leading-relaxed text-yuca-ink-soft">
        Un catálogo abierto todo el año, no sólo durante la feria. Publicas lo que haces, la gente
        lo ve y te escribe. Es gratis.
      </p>

      {!verificado ? (
        <p className="rounded-2xl bg-yuca-cream/60 p-4 text-sm leading-relaxed text-yuca-ink-soft">
          Para vender hace falta que el equipo verifique tu perfil. Es el mismo paso que ya usamos
          para las mesas: sirve para que quien compra sepa que detrás hay alguien real.
        </p>
      ) : !abierta ? (
        <button
          type="button"
          onClick={() => correr(() => cambiarTiendaAction(true))}
          disabled={pendiente}
          className="btn-secondary btn-md"
        >
          {pendiente ? 'Abriendo…' : 'Abrir mi tienda'}
        </button>
      ) : (
        <>
          {productos.length > 0 && (
            <ul className="mb-4 flex flex-col gap-2">
              {productos.map((producto) => {
                const etiqueta = ETIQUETA_ESTADO[producto.estado];
                return (
                  <li
                    key={producto.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-yuca-cream/40 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {producto.fotos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- fotos subidas por vendedores
                        <img
                          src={producto.fotos[0].url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yuca-cream text-yuca-ink-soft">
                          <ImagePlus size={16} aria-hidden="true" />
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-yuca-ink">{producto.nombre}</p>
                        <p className="text-xs text-yuca-ink-soft">
                          {bs(producto.precioBob)}
                          {producto.stock === null
                            ? ' · por encargo'
                            : ` · ${producto.stock} en stock`}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`pill ${etiqueta.clase}`}>{etiqueta.texto}</span>

                      <button
                        type="button"
                        onClick={() =>
                          correr(() =>
                            cambiarEstadoProductoAction(
                              producto.id,
                              producto.estado === 'publicado' ? 'borrador' : 'publicado',
                            ),
                          )
                        }
                        disabled={pendiente}
                        aria-label={
                          producto.estado === 'publicado'
                            ? `Ocultar ${producto.nombre} de la tienda`
                            : `Publicar ${producto.nombre} en la tienda`
                        }
                        className="btn-ghost p-1.5"
                      >
                        {producto.estado === 'publicado' ? (
                          <EyeOff size={15} aria-hidden="true" />
                        ) : (
                          <Eye size={15} aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => correr(() => borrarProductoAction(producto.id))}
                        disabled={pendiente}
                        aria-label={`Borrar ${producto.nombre}`}
                        className="btn-ghost p-1.5 text-yuca-coral-deep"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>

                    {puedeSubirFotos && (
                      <div className="flex w-full flex-wrap items-center gap-2 border-t border-yuca-green/10 pt-2.5">
                        {producto.fotos.map((foto) => (
                          <span key={foto.id} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element -- fotos subidas por vendedores */}
                            <img
                              src={foto.url}
                              alt=""
                              className="h-14 w-14 rounded-xl object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => correr(() => quitarFotoAction(foto.id))}
                              disabled={pendiente}
                              aria-label="Quitar esta foto"
                              className="absolute -right-1.5 -top-1.5 rounded-full bg-yuca-coral p-1 text-white"
                            >
                              <X size={11} aria-hidden="true" />
                            </button>
                          </span>
                        ))}

                        <form
                          action={(formData) => correr(() => subirFotoAction(formData))}
                          className="contents"
                        >
                          <input type="hidden" name="productoId" value={producto.id} />
                          <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-yuca-green/30 text-yuca-green-deep hover:bg-yuca-cream/60">
                            <ImagePlus size={17} aria-hidden="true" />
                            <span className="sr-only">Añadir foto a {producto.nombre}</span>
                            <input
                              type="file"
                              name="foto"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(event) => event.currentTarget.form?.requestSubmit()}
                            />
                          </label>
                        </form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {anadiendo ? (
            <form
              action={(formData) =>
                correr(() => publicarProductoAction(formData), () => setAnadiendo(false))
              }
              className="flex flex-col gap-3 border-t border-yuca-green/10 pt-4"
            >
              <div>
                <label htmlFor="nombre" className="label">
                  Qué vendes
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  required
                  placeholder="Llavero de acrílico — gato"
                  className="field"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="precioBob" className="label">
                    Precio en Bs
                  </label>
                  <input
                    id="precioBob"
                    name="precioBob"
                    type="number"
                    min={1}
                    step={1}
                    required
                    placeholder="25"
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="stock" className="label">
                    Cuántos tienes
                    <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
                  </label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Vacío = por encargo"
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="descripcion" className="label">
                  Descripción
                  <span className="ml-1 font-normal text-yuca-ink-soft">(opcional)</span>
                </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  rows={3}
                  placeholder="Material, tamaño, cuánto tardas en hacerlo…"
                  className="field"
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm text-yuca-ink">
                <input
                  type="checkbox"
                  name="publicar"
                  defaultChecked
                  className="h-4 w-4 accent-yuca-green-deep"
                />
                Publicarlo ya. Si lo desmarcas queda de borrador, sólo para ti.
              </label>

              <div className="flex gap-2">
                <button type="submit" disabled={pendiente} className="btn-secondary btn-sm">
                  {pendiente ? 'Guardando…' : 'Añadir'}
                </button>
                <button
                  type="button"
                  onClick={() => setAnadiendo(false)}
                  className="btn-ghost btn-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAnadiendo(true)}
                className="btn-secondary btn-sm"
              >
                <PackagePlus size={15} aria-hidden="true" />
                Añadir producto
              </button>
              <button
                type="button"
                onClick={() => correr(() => cambiarTiendaAction(false))}
                disabled={pendiente}
                className="btn-outline btn-sm"
              >
                Cerrar mi tienda
              </button>
            </div>
          )}

          {productos.length === 0 && !anadiendo && (
            <p className="mt-3 text-sm text-yuca-ink-soft">
              Tu tienda está abierta pero vacía; todavía no aparece en el listado.
            </p>
          )}
        </>
      )}

      {mensaje && (
        <p className="mt-4 rounded-2xl bg-yuca-cream/60 p-3 text-sm text-yuca-ink" role="status">
          {mensaje}
        </p>
      )}
    </div>
  );
}
