import { NextResponse } from 'next/server';
import { puedeAdministrar } from '@/lib/auth';
import { filasCredenciales } from '@/lib/export/credenciales';
import { aCsv, aXlsx, nombreArchivo } from '@/lib/export/serializar';
import { edicionActual } from '@/lib/data/edicion';

/** El listado cambia con cada pago confirmado: nunca se sirve cacheado. */
export const dynamic = 'force-dynamic';

/**
 * Descarga del listado de credenciales.
 *
 * `?formato=csv` para el flujo de Illustrator/InDesign, `?formato=xlsx` para
 * revisarlo a mano. Sólo staff: lleva nombres y datos de contacto.
 */
export async function GET(request: Request) {
  if (!(await puedeAdministrar())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const formato = new URL(request.url).searchParams.get('formato') === 'csv' ? 'csv' : 'xlsx';
  const filas = await filasCredenciales();
  const nombre = nombreArchivo(formato, edicionActual.name);

  if (formato === 'csv') {
    return new NextResponse(aCsv(filas), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nombre}"`,
      },
    });
  }

  const buffer = await aXlsx(filas);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
    },
  });
}
