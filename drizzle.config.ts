import type { Config } from 'drizzle-kit';

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
