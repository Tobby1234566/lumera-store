import { db } from '@/db/knex.js';
import { id } from '@/lib/ids.js';
import { sanitizeText, normalizeEmail } from '@/lib/sanitize.js';

export async function POST(request: Request) {
  const { email, source } = await request.json() as { email: string; source?: string };
  const emailNorm = normalizeEmail(email);
  const existing = await db('subscribers').where({ email: emailNorm }).first();
  if (!existing) {
    await db('subscribers').insert({
      id: id('sub'),
      email: emailNorm,
      source: sanitizeText(source ?? 'footer', 40),
      created_at: new Date().toISOString(),
    });
  }
  return Response.json({ ok: true, message: 'You are on the list. Welcome to LUMÉRA.' });
}
