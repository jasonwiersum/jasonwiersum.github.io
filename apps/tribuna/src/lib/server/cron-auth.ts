import { NextResponse } from 'next/server';

/** Vercel Cron envía `Authorization: Bearer <CRON_SECRET>` en cada invocación. */
export function unauthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return null;
}
