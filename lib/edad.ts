/**
 * Control de edad para ser expositor.
 *
 * La regla la puso la organización y es dura:
 *
 * - menos de 17 años: no puede tener mesa;
 * - 17 y 18: puede, con permiso de su padre, madre o tutor legal;
 * - más de 18: sin condiciones.
 *
 * Vive aparte y sin tocar la base a propósito: es la clase de cosa que hay que
 * poder probar con fechas de borde (cumpleaños de hoy, 29 de febrero) sin
 * levantar Postgres.
 */

export const EDAD_MINIMA = 17;
/** Hasta esta edad inclusive hace falta el permiso del tutor. */
export const EDAD_CON_PERMISO = 18;

export type SituacionEdad =
  /** No llega a la edad mínima: no puede ser expositor. */
  | 'menor'
  /** Puede, pero necesita el permiso de su tutor declarado. */
  | 'requiere-permiso'
  /** Mayor de edad, sin condiciones. */
  | 'libre'
  /** No cargó su fecha de nacimiento todavía. */
  | 'sin-fecha';

/**
 * Edad cumplida a día de hoy.
 *
 * Se compara mes y día, no sólo el año: quien cumple mañana todavía no los
 * tiene, y esa diferencia es justo la que decide si entra o no.
 */
export function calcularEdad(nacimiento: string, hoy: Date = new Date()): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nacimiento);
  if (!partes) return null;

  const [, ano, mes, dia] = partes.map(Number);

  // Rechaza fechas que no existen (31 de febrero) y que el Date normalizaría
  // en silencio al mes siguiente.
  const fecha = new Date(ano, mes - 1, dia);
  if (fecha.getFullYear() !== ano || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return null;
  }
  if (fecha > hoy) return null;

  let edad = hoy.getFullYear() - ano;
  const cumpleEsteAno =
    hoy.getMonth() > mes - 1 || (hoy.getMonth() === mes - 1 && hoy.getDate() >= dia);
  if (!cumpleEsteAno) edad -= 1;

  return edad;
}

export function situacionEdad(
  nacimiento: string | null | undefined,
  hoy: Date = new Date(),
): SituacionEdad {
  if (!nacimiento) return 'sin-fecha';

  const edad = calcularEdad(nacimiento, hoy);
  if (edad === null) return 'sin-fecha';

  if (edad < EDAD_MINIMA) return 'menor';
  if (edad <= EDAD_CON_PERMISO) return 'requiere-permiso';
  return 'libre';
}

/**
 * ¿Puede esta persona apartar una mesa?
 *
 * Se resuelve con los datos del perfil, no con lo que mande el formulario, y
 * devuelve el motivo para poder explicárselo en vez de sólo negarlo.
 */
export function puedeSerExpositor(
  perfil: { birthDate: string | null; guardianConsentAt: Date | null },
  hoy: Date = new Date(),
): { ok: true } | { ok: false; motivo: SituacionEdad | 'sin-permiso' } {
  const situacion = situacionEdad(perfil.birthDate, hoy);

  if (situacion === 'sin-fecha') return { ok: false, motivo: 'sin-fecha' };
  if (situacion === 'menor') return { ok: false, motivo: 'menor' };
  if (situacion === 'requiere-permiso' && !perfil.guardianConsentAt) {
    return { ok: false, motivo: 'sin-permiso' };
  }

  return { ok: true };
}
