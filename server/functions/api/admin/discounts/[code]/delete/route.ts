import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function DELETE(_req: Request, { params }: { params: { code: string } }) {
  const admin = requireAdmin(_req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await db('discount_codes').where({ code: params.code.toUpperCase() }).first();
  if (!row) return Response.json({ error: 'Discount code not found.' }, { status: 404 });
  await db('discount_codes').where({ code: params.code.toUpperCase() }).del();
  return Response.json({ deleted: true });
}
