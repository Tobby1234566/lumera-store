import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';
import { serializeOrder } from '@/lib/serialize.js';

export async function GET(_req: Request, { params }: { params: { orderNumber: string } }) {
  const admin = requireAdmin(_req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await db('orders').where({ order_number: params.orderNumber }).first();
  if (!row) return Response.json({ error: 'Order not found.' }, { status: 404 });
  const items = await db('order_items').where({ order_id: row.id }).select('*');
  const events = await db('order_events').where({ order_id: row.id }).orderBy('created_at', 'asc').select('*');
  return Response.json({ order: serializeOrder(row, items, events) });
}
