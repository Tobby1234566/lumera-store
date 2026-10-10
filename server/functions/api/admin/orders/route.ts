import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';
import { serializeOrder } from '@/lib/serialize.js';

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200) || 100;
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);
  const status = searchParams.get('status') || undefined;

  const where = status ? { status } : {};
  const [rows, total] = await Promise.all([
    db('orders').where(where).orderBy('created_at', 'desc').limit(limit).offset(offset),
    db('orders').where(where).count<{ c: number }[]>({ c: '*' }),
  ]);

  return Response.json({ orders: rows.map((r) => serializeOrder(r)), total: Number(total[0].c), limit, offset });
}
