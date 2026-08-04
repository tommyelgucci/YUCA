import { and, eq, inArray, like } from 'drizzle-orm';
import { requireDb } from './index';
import * as schema from './schema';

/*
 * Igual que en `seed.ts` y `check.ts`: tsx no carga `.env.local` solo.
 */
try {
  process.loadEnvFile('.env.local');
} catch {
  // Sin `.env.local` se sigue con lo que venga del entorno; `requireDb()` avisa.
}

/**
 * Borra los expositores de demostración, dejando en pie todo lo demás.
 *
 * `db:seed` sirve para llenar una base vacía, pero vacía las tablas enteras: en
 * una base con gente registrada de verdad ya no se puede correr —y por eso se
 * niega—. Esto es lo contrario: quirúrgico. Se lleva sólo lo sembrado y no toca
 * ni el plano, ni las ediciones, ni las actividades, ni a nadie real.
 *
 * Hace falta porque los 18 expositores de mentira (Estudio Lunaria, Papaya
 * Comics…) ocupan mesas en el mapa y saldrían impresos en las credenciales
 * junto a los de verdad en cuanto abra la convocatoria.
 *
 * La marca es la misma que usa el freno de mano de `seed.ts`: un
 * `clerk_user_id` que empieza por `seed_` no puede venir de Clerk.
 *
 * Uso:
 *   npm run db:limpiar-demo         → dice qué borraría, sin tocar nada
 *   npm run db:limpiar-demo -- --si → lo borra
 *
 * Por defecto no borra. Se corre pegando un comando en una terminal, muchas
 * veces desde el teléfono, y equivocarse de línea no debería costar la base.
 */

async function limpiar() {
  const db = requireDb();
  const deVerdad = process.argv.includes('--si');

  const demo = await db
    .select({ id: schema.exhibitors.id, displayName: schema.exhibitors.displayName })
    .from(schema.exhibitors)
    .where(like(schema.exhibitors.clerkUserId, 'seed_%'));

  if (demo.length === 0) {
    console.log('\n✅ No hay expositores de demostración. No hay nada que borrar.\n');
    return;
  }

  console.log(`\nExpositores de demostración: ${demo.length}`);
  for (const expositor of demo) console.log(`  · ${expositor.displayName}`);

  // Todo lo que cuelga de un expositor —reservas, acompañantes, productos,
  // fotos y reseñas— se va por la clave foránea, no por código. Las reservas se
  // miran aparte porque hace falta saber **qué mesas** ocupaban: ver abajo.
  const reservas = await db
    .select({ id: schema.reservations.id, standId: schema.reservations.standId })
    .from(schema.reservations)
    .where(
      inArray(
        schema.reservations.exhibitorId,
        demo.map((expositor) => expositor.id),
      ),
    );

  if (!deVerdad) {
    console.log(
      '\n⚠️  Esto es sólo una vista previa; no se borró nada.\n' +
        `   Se llevaría también sus ${reservas.length} reservas, y sus productos y\n` +
        '   reseñas si tuvieran (en cascada).\n' +
        '   Para borrarlo de verdad: npm run db:limpiar-demo -- --si\n',
    );
    return;
  }

  const borrados = await db
    .delete(schema.exhibitors)
    .where(like(schema.exhibitors.clerkUserId, 'seed_%'))
    .returning({ id: schema.exhibitors.id });

  /*
   * El estado de la mesa no lo mantiene la base, lo escribe `lib/reservas.ts`
   * al reservar, confirmar, cancelar y expirar. O sea que la cascada borra la
   * reserva pero deja la mesa marcada como ocupada para siempre: desaparecería
   * del selector de `/mi-cuenta` sin que nadie la tenga.
   *
   * Se liberan sólo las que quedaron sin ninguna reserva viva. Comprobarlo en
   * vez de darlo por hecho importa porque una misma mesa pudo pasar por varias
   * reservas —una cancelada de mentira y una real encima—, y esa no se toca.
   */
  const mesasAfectadas = [...new Set(reservas.map((reserva) => reserva.standId))];
  let liberadas = 0;

  for (const standId of mesasAfectadas) {
    const vivas = await db
      .select({ id: schema.reservations.id })
      .from(schema.reservations)
      .where(
        and(
          eq(schema.reservations.standId, standId),
          inArray(schema.reservations.status, ['pendiente', 'confirmada']),
        ),
      );

    if (vivas.length > 0) continue;

    await db
      .update(schema.stands)
      .set({ status: 'disponible' })
      .where(eq(schema.stands.id, standId));
    liberadas += 1;
  }

  console.log(
    `\n✅ Borrados ${borrados.length} expositores de demostración.\n` +
      `   Se fueron sus ${reservas.length} reservas, y ${liberadas} mesas volvieron a estar libres.\n`,
  );
}

limpiar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n⛔ No se pudo limpiar:', error instanceof Error ? error.message : error, '\n');
    process.exit(1);
  });
