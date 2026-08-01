import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, FileText, Info } from 'lucide-react';
import { getDb } from '@/db';
import { puedeAdministrar } from '@/lib/auth';
import { COLUMNAS, filasCredenciales } from '@/lib/export/credenciales';

export const metadata: Metadata = { title: 'Exportar credenciales' };
export const dynamic = 'force-dynamic';

export default async function ExportarPage() {
  if (!(await puedeAdministrar())) {
    return (
      <div className="container-yuca py-12">
        <h1 className="mb-4 text-3xl">Exportar credenciales</h1>
        <p className="text-yuca-ink-soft">Esta zona es sólo para el equipo de organización.</p>
      </div>
    );
  }

  const filas = await filasCredenciales();
  const conBase = Boolean(getDb());
  const titulares = filas.filter((fila) => fila.rol === 'Titular').length;
  const companeros = filas.length - titulares;

  return (
    <div className="container-yuca py-12">
      <Link href="/admin" className="btn-ghost btn-sm mb-6 -ml-2">
        <ArrowLeft size={16} aria-hidden="true" />
        Volver al panel
      </Link>

      <header className="mb-8">
        <h1 className="mb-2 text-3xl">Exportar credenciales</h1>
        <p className="max-w-2xl leading-relaxed text-yuca-ink-soft">
          Una fila por persona: cada titular y cada compañero de mesa lleva su propia credencial.
          Las cabeceras son los nombres de variable que va a leer Illustrator.
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Credenciales', valor: filas.length },
          { label: 'Titulares', valor: titulares },
          { label: 'Compañeros de mesa', valor: companeros },
        ].map((dato) => (
          <div key={dato.label} className="card p-5">
            <p className="font-display text-3xl text-yuca-green-deep">{dato.valor}</p>
            <p className="text-sm text-yuca-ink-soft">{dato.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <a href="/api/admin/exportar?formato=xlsx" className="btn-primary btn-lg">
          <FileSpreadsheet size={18} aria-hidden="true" />
          Descargar Excel (.xlsx)
        </a>
        <a href="/api/admin/exportar?formato=csv" className="btn-secondary btn-lg">
          <FileText size={18} aria-hidden="true" />
          Descargar CSV
        </a>
      </div>

      <div className="card mb-8 flex gap-4 p-5">
        <Info size={20} className="mt-0.5 shrink-0 text-yuca-green" aria-hidden="true" />
        <div className="text-sm leading-relaxed text-yuca-ink-soft">
          <p className="mb-2">
            <span className="font-bold text-yuca-green-deep">Para Illustrator, usa el CSV.</span> El
            Excel es para revisar y corregir a mano; los scripts de datos variables leen CSV.
          </p>
          <p className="mb-2">
            La columna <code>foto_archivo</code> trae el nombre que debe tener cada imagen
            (<code>I20-1.png</code>). Deja todas las fotos en una carpeta con esos nombres y la
            variable de imagen las enlaza sola.
          </p>
          <p>
            <code>qr_texto</code> es el contenido del QR de cada credencial: enlaza al perfil
            público de esa persona.
          </p>
        </div>
      </div>

      {!conBase && (
        <p className="mb-6 rounded-2xl bg-yuca-cream/60 p-4 text-sm text-yuca-ink-soft">
          Sin <code>DATABASE_URL</code> configurada, esto sale de los datos de prueba de{' '}
          <code>lib/data/</code>. Los nombres reales y los compañeros que ves son de muestra, para
          que se entienda el formato.
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[64rem] text-left text-sm">
          <caption className="sr-only">Vista previa de las credenciales a exportar</caption>
          <thead>
            <tr className="border-b border-yuca-green/15 bg-yuca-cream/40">
              {COLUMNAS.map((columna) => (
                <th key={columna.clave} scope="col" className="whitespace-nowrap p-3 font-bold">
                  <code className="text-xs">{columna.titulo}</code>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.slice(0, 12).map((fila) => (
              <tr key={fila.credencial_id} className="border-b border-yuca-green/10">
                {COLUMNAS.map((columna) => (
                  <td key={columna.clave} className="whitespace-nowrap p-3 text-yuca-ink-soft">
                    {fila[columna.clave] || <span className="text-yuca-ink-soft/40">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filas.length > 12 && (
        <p className="mt-3 text-sm text-yuca-ink-soft">
          Mostrando 12 de {filas.length}. El archivo descargado las trae todas.
        </p>
      )}
    </div>
  );
}
