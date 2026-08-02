/** Código de Postgres para violación de restricción única. */
const UNIQUE_VIOLATION = '23505';

type ErrorPg = {
  code?: string;
  constraint?: string;
  constraint_name?: string;
  detail?: string;
  message?: string;
  cause?: unknown;
};

/**
 * Busca el error real de Postgres dentro de la cadena de causas.
 *
 * Drizzle envuelve el error del driver en uno propio ("Failed query: …"), así
 * que el `code` no está en el error que se recibe sino en su `cause`.
 */
function errorPostgres(error: unknown): ErrorPg | null {
  let actual: unknown = error;

  for (let salto = 0; salto < 5 && actual; salto += 1) {
    const candidato = actual as ErrorPg;
    if (candidato.code === UNIQUE_VIOLATION) return candidato;
    actual = candidato.cause;
  }

  return null;
}

/** `true` si el error es la violación de un índice único concreto. */
export function esViolacionUnica(error: unknown, indice: string): boolean {
  const pg = errorPostgres(error);
  if (!pg) return false;

  // Según el driver el nombre del índice viaja en un campo u otro.
  const pistas = [pg.constraint_name, pg.constraint, pg.detail, pg.message];
  return pistas.some((pista) => typeof pista === 'string' && pista.includes(indice));
}
