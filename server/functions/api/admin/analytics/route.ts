import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const paidStatuses = ['paid', 'processing', 'shipped', 'delivered'];
  const totals = await db('orders').whereIn('status', paidStatuses).select(db.raw('COALESCE(SUM(total_cents), 0) as revenue'), db.raw('COUNT(*) as orders'));
  const revenueCents = Number((totals as any)[0].revenue);
  const ordersCount = Number((totals as any)[0].orders);

  const allOrders = await db('orders').count<{ c: number }[]>({ c: '*' });
  const pending = await db('orders').where({ status: 'pending' }).count<{ c: number }[]>({ c: '*' });

  const byStatusRows = await db('orders').groupBy('status').select('status').count({ c: '*' });
  const statusRows = byStatusRows as Array<{ status: string; c: number }>;
  const byStatus: Record<string, number> = {};
  for (const row of statusRows) byStatus[row.status] = Number(row.c);

  return Response.json({
    revenueCents, ordersCount, pendingOrders: Number(pending[0].c), byStatus,
  });
}
