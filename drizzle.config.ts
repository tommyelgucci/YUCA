import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Sólo se usa al aplicar migraciones contra la base real (Supabase).
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/yuca',
  },
  strict: true,
  verbose: true,
} satisfies Config;
