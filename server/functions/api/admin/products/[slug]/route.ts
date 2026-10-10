import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const slug = params.slug;
  const body = await req.json() as any;
  const existing = await db('products').where({ slug }).first();
  if (!existing) return Response.json({ error: 'Product not found.' }, { status: 404 });

  await db('products').where({ slug }).update({ ...body, updated_at: new Date().toISOString() });
  const updated = await db('products').where({ slug }).first();
  return Response.json({ product: updated });
}
