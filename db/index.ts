import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Tipo de base aceptado por la capa de datos.
 *
 * Deliberadamente genérico: en producción es postgres-js contra Supabase y en
 * las pruebas es PGlite (Postgres compilado a WASM, sin servidor). Al ser el
 * mismo dialecto, lo que se prueba en local es lo que corre en producción.
 */
export type YucaDb = PgDatabase<PgQueryResultHKT, typeof schema>;

let cached: YucaDb | null = null;

/**
 * Conexión a la base, o `null` si todavía no hay `DATABASE_URL` configurada.
 *
 * Devolver `null` en vez de reventar es intencional: mientras no exista la
 * base, la web sigue funcionando con los datos de `lib/data/`.
 */
export function getDb(): YucaDb | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  if (!cached) {
    // `prepare: false` es obligatorio detrás del pooler en modo transacción
    // que usa Supabase; con sentencias preparadas la conexión falla.
    const client = postgres(url, { prepare: false });
    cached = drizzle(client, { schema });
  }

  return cached;
}

/** Igual que `getDb`, pero falla claro donde la base sí es imprescindible. */
export function requireDb(): YucaDb {
  const db = getDb();
  if (!db) {
    throw new Error(
      'Falta DATABASE_URL. Copia .env.example a .env.local y apunta a tu base de Supabase.',
    );
  }
  return db;
}

export { schema };
