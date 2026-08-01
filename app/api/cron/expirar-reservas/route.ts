import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { expirarReservasVencidas } from '@/lib/reservas';

/**
 * Libera las mesas cuya reserva venció sin confirmarse.
 *
 * Pensado para un cron (Vercel Cron o `pg_cron` de Supabase) cada hora. Es
 * idempotente: si no hay nada vencido no hace nada, y correrlo de más es
 * inofensivo.
 *
 * Se protege con `CRON_SECRET` porque es una ruta pública que escribe.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET sin configurar' }, { status: 503 });
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Sin base de datos configurada' }, { status: 503 });
  }

  const liberadas = await expirarReservasVencidas(db);

  return NextResponse.json({ liberadas });
}
