import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';
import { id } from '@/lib/ids.js';

export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as any;
  const existing = await db('discount_codes').where({ code: body.code.toUpperCase() }).first();
  if (existing) return Response.json({ error: `Discount code '${body.code}' already exists.` }, { status: 400 });

  const id_ = id('dsc');
  const nowIso = new Date().toISOString();
  await db('discount_codes').insert({
    id: id_,
    ...body,
    code: body.code.toUpperCase(),
    created_at: nowIso,
    updated_at: nowIso,
  });
  const inserted = await db('discount_codes').where({ id: id_ }).first();
  return Response.json({ discount: inserted }, { status: 201 });
}
