import { eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { exhibitors, reservations, standCompanions, stands, espacios as espaciosTabla } from '@/db/schema';
import { ZONAS, espaciosPorId, getStand } from '@/lib/data/feria';
import { expositores } from '@/lib/data/expositores';
import { edicionActual } from '@/lib/data/edicion';
import { precioActual, preventaVigente } from '@/lib/data/preventas';

/**
 * Exportación de credenciales.
 *
 * El destino es la impresión automática con variables de Illustrator, así que
 * el archivo se arma pensando en eso:
 *
 * 1. **Una fila por persona, no por mesa.** Quien comparte mesa también lleva
 *    credencial, así que el titular y cada acompañante salen en filas propias.
 *    Exportar por reserva dejaría a la mitad de la gente sin gafete.
 * 2. **Cabeceras sin espacios ni tildes**, porque cada cabecera se convierte en
 *    el nombre de una variable dentro de Illustrator.
 * 3. **Columna con el nombre del archivo de foto**, para poder enlazar la
 *    imagen como variable y no pegarlas a mano.
 */

/** Una fila = una credencial a imprimir. */
export interface FilaCredencial {
  credencial_id: string;
  nombre_artistico: string;
  nombre_real: string;
  rol: 'Titular' | 'Compañero';
  tipo: string;
  mesa: string;
  mesa_codigo: string;
  espacio: string;
  categorias: string;
  instagram: string;
  tiktok: string;
  estado_pago: string;
  preventa: string;
  monto_bs: string;
  foto_archivo: string;
  qr_texto: string;
}

/**
 * Orden y nombre de las columnas.
 *
 * Cambiar esta lista cambia el Excel y el CSV a la vez; el orden es el que verá
 * Illustrator al enlazar variables.
 */
export const COLUMNAS: { clave: keyof FilaCredencial; titulo: string; ancho: number }[] = [
  { clave: 'credencial_id', titulo: 'credencial_id', ancho: 14 },
  { clave: 'nombre_artistico', titulo: 'nombre_artistico', ancho: 26 },
  { clave: 'nombre_real', titulo: 'nombre_real', ancho: 26 },
  { clave: 'rol', titulo: 'rol', ancho: 12 },
  { clave: 'tipo', titulo: 'tipo', ancho: 16 },
  { clave: 'mesa', titulo: 'mesa', ancho: 8 },
  { clave: 'mesa_codigo', titulo: 'mesa_codigo', ancho: 12 },
  { clave: 'espacio', titulo: 'espacio', ancho: 18 },
  { clave: 'categorias', titulo: 'categorias', ancho: 30 },
  { clave: 'instagram', titulo: 'instagram', ancho: 22 },
  { clave: 'tiktok', titulo: 'tiktok', ancho: 22 },
  { clave: 'estado_pago', titulo: 'estado_pago', ancho: 14 },
  { clave: 'preventa', titulo: 'preventa', ancho: 18 },
  { clave: 'monto_bs', titulo: 'monto_bs', ancho: 10 },
  { clave: 'foto_archivo', titulo: 'foto_archivo', ancho: 24 },
  { clave: 'qr_texto', titulo: 'qr_texto', ancho: 40 },
];

const ESTADO_LEGIBLE: Record<string, string> = {
  ocupado: 'Pagada',
  reservado: 'Reservada',
  disponible: 'Libre',
  confirmada: 'Pagada',
  pendiente: 'Reservada',
};

const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://proyectoyuca.com';

/** Nombre de archivo de la foto: previsible y sin acentos, para enlazar en Illustrator. */
function nombreFoto(credencialId: string): string {
  return `${credencialId}.png`;
}

/**
 * ⚠️ Sólo para la vista previa sin base de datos: los perfiles de prueba no
 * tienen nombre real ni acompañantes, y sin ellos no se entiende para qué sirve
 * el archivo. Con `DATABASE_URL` configurada nada de esto se usa.
 */
const DEMO_NOMBRES_REALES: Record<string, string> = {
  lunaria: 'Ana Gabriela Ríos',
  papaya: 'Marco Antonio Suárez',
  tornillo: 'Camila Vargas Peña',
};
const DEMO_COMPANEROS: Record<string, string[]> = {
  I20: ['Guamancita'],
  I13: ['Sol Mendoza'],
};

/** Filas a partir de los datos de `lib/data/` (sin base configurada). */
function filasDesdeMocks(): FilaCredencial[] {
  const filas: FilaCredencial[] = [];

  for (const expositor of expositores) {
    const stand = getStand(expositor.standId);
    if (!stand) continue;

    const espacio = espaciosPorId.get(stand.espacioId);
    const zona = ZONAS[stand.kind];
    const precio = precioActual(stand.kind);

    const comun = {
      tipo: zona.label,
      mesa: String(stand.numero),
      mesa_codigo: stand.id,
      espacio: espacio?.name ?? '',
      estado_pago: ESTADO_LEGIBLE[stand.status] ?? stand.status,
      preventa: preventaVigente?.label ?? '',
      monto_bs: precio !== null ? String(precio) : '',
    };

    filas.push({
      ...comun,
      credencial_id: `${stand.id}-1`,
      nombre_artistico: expositor.displayName,
      nombre_real: DEMO_NOMBRES_REALES[expositor.id] ?? '',
      rol: 'Titular',
      categorias: expositor.categories.join(', '),
      instagram: expositor.socials.instagram ?? '',
      tiktok: expositor.socials.tiktok ?? '',
      foto_archivo: nombreFoto(`${stand.id}-1`),
      qr_texto: `${sitio}/artistas/${expositor.slug}`,
    });

    (DEMO_COMPANEROS[stand.id] ?? []).forEach((nombre, i) => {
      filas.push({
        ...comun,
        credencial_id: `${stand.id}-${i + 2}`,
        nombre_artistico: nombre,
        nombre_real: '',
        rol: 'Compañero',
        categorias: '',
        instagram: '',
        tiktok: '',
        foto_archivo: nombreFoto(`${stand.id}-${i + 2}`),
        qr_texto: `${sitio}/artistas/${expositor.slug}`,
      });
    });
  }

  return filas;
}

/** Filas a partir de la base de datos. */
async function filasDesdeBase(db: NonNullable<ReturnType<typeof getDb>>): Promise<FilaCredencial[]> {
  // Sólo entran las mesas con reserva viva: quien no pagó ni apartó no imprime.
  const reservas = await db
    .select({
      reservationId: reservations.id,
      estado: reservations.status,
      preventaId: reservations.preventaId,
      amountBob: reservations.amountBob,
      standCode: stands.code,
      numero: stands.numero,
      kind: stands.kind,
      espacio: espaciosTabla.name,
      nombreArtistico: exhibitors.displayName,
      slug: exhibitors.slug,
      categorias: exhibitors.categories,
      instagram: exhibitors.instagram,
      tiktok: exhibitors.tiktok,
    })
    .from(reservations)
    .innerJoin(stands, eq(reservations.standId, stands.id))
    .innerJoin(espaciosTabla, eq(stands.espacioId, espaciosTabla.id))
    .innerJoin(exhibitors, eq(reservations.exhibitorId, exhibitors.id))
    .where(
      eq(stands.editionId, edicionActual.id) &&
        inArray(reservations.status, ['pendiente', 'confirmada']),
    );

  // El acompañante es un expositor registrado, así que su credencial sale
  // igual de completa que la del titular: sus categorías, sus redes y un QR a
  // su propio perfil, no al de quien le invitó.
  const ids = reservas.map((r) => r.reservationId);
  const acompanantes = ids.length
    ? await db
        .select({
          reservationId: standCompanions.reservationId,
          displayName: standCompanions.displayName,
          slug: exhibitors.slug,
          categorias: exhibitors.categories,
          instagram: exhibitors.instagram,
          tiktok: exhibitors.tiktok,
        })
        .from(standCompanions)
        .innerJoin(exhibitors, eq(standCompanions.exhibitorId, exhibitors.id))
        .where(inArray(standCompanions.reservationId, ids))
    : [];

  const filas: FilaCredencial[] = [];

  for (const reserva of reservas) {
    const zona = ZONAS[reserva.kind];
    const comun = {
      tipo: zona.label,
      mesa: String(reserva.numero),
      mesa_codigo: reserva.standCode,
      espacio: reserva.espacio,
      estado_pago: ESTADO_LEGIBLE[reserva.estado] ?? reserva.estado,
      preventa: reserva.preventaId ?? '',
      monto_bs: String(reserva.amountBob),
    };

    filas.push({
      ...comun,
      credencial_id: `${reserva.standCode}-1`,
      nombre_artistico: reserva.nombreArtistico,
      nombre_real: '', // TODO: columna de datos privados, pendiente de definir
      rol: 'Titular',
      categorias: (reserva.categorias ?? []).join(', '),
      instagram: reserva.instagram ?? '',
      tiktok: reserva.tiktok ?? '',
      foto_archivo: nombreFoto(`${reserva.standCode}-1`),
      qr_texto: `${sitio}/artistas/${reserva.slug}`,
    });

    acompanantes
      .filter((c) => c.reservationId === reserva.reservationId)
      .forEach((companero, i) => {
        filas.push({
          ...comun,
          credencial_id: `${reserva.standCode}-${i + 2}`,
          nombre_artistico: companero.displayName,
          nombre_real: '',
          rol: 'Compañero',
          categorias: (companero.categorias ?? []).join(', '),
          instagram: companero.instagram ?? '',
          tiktok: companero.tiktok ?? '',
          foto_archivo: nombreFoto(`${reserva.standCode}-${i + 2}`),
          qr_texto: `${sitio}/artistas/${companero.slug}`,
        });
      });
  }

  return filas;
}

/**
 * Todas las credenciales a imprimir, ordenadas por espacio, tipo y número
 * —el mismo orden en que se recorre la feria, para que el taco de gafetes
 * salga ya clasificado.
 */
export async function filasCredenciales(): Promise<FilaCredencial[]> {
  const db = getDb();
  const filas = db ? await filasDesdeBase(db) : filasDesdeMocks();

  return filas.sort(
    (a, b) =>
      a.espacio.localeCompare(b.espacio) ||
      a.tipo.localeCompare(b.tipo) ||
      Number(a.mesa) - Number(b.mesa) ||
      a.credencial_id.localeCompare(b.credencial_id),
  );
}
