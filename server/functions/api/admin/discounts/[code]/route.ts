import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function PATCH(req: Request, { params }: { params: { code: string } }) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const code = params.code.toUpperCase();
  const body = await req.json() as any;
  const row = await db('discount_codes').where({ code }).first();
  if (!row) return Response.json({ error: 'Discount code not found.' }, { status: 404 });

  await db('discount_codes').where({ code }).update({ ...body, updated_at: new Date().toISOString() });
  const updated = await db('discount_codes').where({ code }).first();
  return Response.json({ discount: updated });
}
