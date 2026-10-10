import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db('customers').select('*').orderBy('created_at', 'desc');
  return Response.json({ customers: rows });
}
