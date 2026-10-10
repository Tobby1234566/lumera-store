import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as any;
  const existing = await db('products').where({ slug: body.slug }).first();
  if (existing) return Response.json({ error: `Product with slug '${body.slug}' already exists.` }, { status: 400 });

  const id_ = `prd_${Math.random().toString(36).slice(2, 9)}`;
  const nowIso = new Date().toISOString();
  await db('products').insert({ ...body, id: id_, units_sold: 0, created_at: nowIso, updated_at: nowIso });
  const inserted = await db('products').where({ id: id_ }).first();
  return Response.json({ product: inserted }, { status: 201 });
}
