import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function DELETE(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const removed = await db('reviews').where({ is_placeholder: true }).del();
  return Response.json({ removed: Number(removed) });
}
