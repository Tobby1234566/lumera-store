import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const admin = requireAdmin(_req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await db('products').where({ slug: params.slug }).first();
  if (!row) return Response.json({ error: 'Product not found.' }, { status: 404 });
  await db('products').where({ slug: params.slug }).del();
  return Response.json({ deleted: true });
}
