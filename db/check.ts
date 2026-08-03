import postgres from 'postgres';

/**
 * Diagnóstico de la conexión a la base.
 *
 * Existe porque `drizzle-kit migrate` falla **en silencio**: devuelve código 1
 * sin decir por qué, y quien lo sufre se queda sin saber si el problema es la
 * contraseña, el puerto, el archivo de entorno o la red. Esto responde a esas
 * cuatro preguntas por separado.
 *
 * Se corre con `npm run db:check`. No escribe nada, sólo mira.
 */

try {
  process.loadEnvFile('.env.local');
} catch {
  console.log('⚠️  No hay .env.local en esta carpeta.\n');
}

/** Oculta la contraseña pero deja ver el resto, que es lo que suele fallar. */
function sinContrasena(url: string): string {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:••••••@');
}

const directUrl = process.env.DIRECT_URL;
const databaseUrl = process.env.DATABASE_URL;

console.log('Variables de entorno');
console.log('────────────────────');
for (const [nombre, valor] of [
  ['DIRECT_URL', directUrl],
  ['DATABASE_URL', databaseUrl],
  ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY],
  ['CLERK_SECRET_KEY', process.env.CLERK_SECRET_KEY],
] as const) {
  if (!valor) {
    console.log(`  ✗ ${nombre} — sin definir`);
    continue;
  }
  // Los huecos de `.env.example` que la gente olvida reemplazar.
  const hueco = /CONTRASENA|REGION|PROYECTO|_xxx|\[|\]/.test(valor);
  const mostrado = valor.startsWith('postgresql://') ? sinContrasena(valor) : `${valor.slice(0, 12)}…`;
  console.log(`  ${hueco ? '✗' : '✓'} ${nombre} — ${mostrado}${hueco ? '  ← sigue con el texto de ejemplo' : ''}`);
}

const url = directUrl ?? databaseUrl;

if (!url) {
  console.log('\nSin DIRECT_URL ni DATABASE_URL no hay nada que comprobar.');
  process.exit(1);
}

const puerto = url.match(/:(\d+)\//)?.[1];
if (directUrl && puerto === '6543') {
  console.log(
    '\n⚠️  DIRECT_URL apunta al puerto 6543 (el pooler de transacciones).\n' +
      '   Para migrar hace falta el 5432: por el 6543 cada sentencia puede caer\n' +
      '   en una conexión distinta y una migración necesita una sola.',
  );
}

console.log('\nConexión');
console.log('────────');

const conexion: string = url;
const sql = postgres(conexion, { prepare: false, connect_timeout: 15 });

async function comprobar() {
  try {
    const tablas = await sql<{ nombre: string }[]>`
      select tablename as nombre from pg_tables
      where schemaname = 'public' order by tablename
    `;

    console.log(`  ✓ Conecta bien a ${sinContrasena(conexion)}`);

    if (tablas.length === 0) {
      console.log('\n  La base está VACÍA: no hay ninguna tabla.');
      console.log('  Falta correr `npm run db:migrate`.');
    } else {
      console.log(`\nTablas (${tablas.length})`);
      console.log('────────────');
      tablas.forEach((t) => console.log(`  · ${t.nombre}`));

      const [aplicadas] = await sql<{ total: number }[]>`
        select count(*)::int as total from drizzle.__drizzle_migrations
      `.catch(() => [{ total: 0 }]);

      console.log(`\n  Migraciones aplicadas: ${aplicadas?.total ?? 0} de 6`);
    }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.log(`  ✗ No conecta: ${mensaje}`);

    // Los tres tropiezos que se repiten, traducidos.
    if (/password authentication failed|SASL/i.test(mensaje)) {
      console.log('\n  → La contraseña no es la correcta. Es la de la BASE de Supabase');
      console.log('    (Settings → Database → Reset database password), no la de tu cuenta.');
    } else if (/ENOTFOUND|getaddrinfo/i.test(mensaje)) {
      console.log('\n  → Ese servidor no existe. Revisa que copiaste el host entero y que');
      console.log('    no quedó la palabra REGION o PROYECTO del ejemplo.');
    } else if (/ENETUNREACH|ETIMEDOUT|ECONNREFUSED/i.test(mensaje)) {
      console.log('\n  → No se llega al servidor. Si estás usando la conexión directa');
      console.log('    (db.XXXX.supabase.co) cámbiala por el session pooler, que va por IPv4.');
    }
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

comprobar();
