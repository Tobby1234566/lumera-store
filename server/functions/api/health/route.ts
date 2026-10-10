import type { NextRequest } from 'next/server';
import { db } from '@/db/knex.js';
import { config } from '@/config.js';

export async function GET(_req: NextRequest) {
  try {
    await db.raw('select 1');
    return Response.json({ ok: true, env: config.env, db: config.db.client });
  } catch {
    return Response.json({ ok: false, error: 'database unavailable' }, { status: 503 });
  }
}
