import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = requireAdmin(_req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await db('reviews').where({ id: params.id }).first();
  if (!row) return Response.json({ error: 'Review not found.' }, { status: 404 });
  await db('reviews').where({ id: params.id }).del();
  return Response.json({ deleted: true });
}
