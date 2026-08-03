import type { Config } from 'drizzle-kit';

/*
 * drizzle-kit lee `.env`, nunca `.env.local`.
 *
 * Pero `.env.local` es el archivo que usa Next.js, el que documenta
 * `.env.example` y el que la gente crea de verdad. Sin esta línea, `db:migrate`
 * no encuentra ninguna variable, cae en la URL de localhost de más abajo y
 * falla con un error de conexión que en ningún momento insinúa que el problema
 * fue de dónde se leyó el entorno.
 *
 * Lo que ya venga del entorno manda sobre el archivo, así que en producción o
 * en CI las variables de verdad no las pisa nadie.
 */
try {
  process.loadEnvFile('.env.local');
} catch {
  // No hay `.env.local` (CI, o quien use `.env` a secas): se sigue igual.
}

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    /*
     * Sólo se usa al aplicar migraciones contra la base real (Supabase).
     *
     * Se prefiere `DIRECT_URL` porque migrar no puede ir por el pooler en modo
     * transacción (puerto 6543) que usa la aplicación: ahí cada sentencia puede
     * caer en una conexión distinta, y una migración es justamente varias
     * sentencias que tienen que compartir transacción. La app sí usa el pooler,
     * que es lo correcto para peticiones cortas y muchas conexiones.
     */
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? 'postgresql://localhost:5432/yuca',
  },
  strict: true,
  verbose: true,
} satisfies Config;
