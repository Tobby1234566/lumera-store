import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';
import { serializeOrder } from '@/lib/serialize.js';
import { sendEmail, orderShippedEmail, orderDeliveredEmail } from '@/services/email.js';

export async function PATCH(req: Request, { params }: { params: { orderNumber: string } }) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderNumber } = params;
  const body = await req.json() as { status: string };
  const validTransitions: Record<string, string[]> = {
    pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'], delivered: [], cancelled: [],
  };

  const order = await db('orders').where({ order_number: orderNumber }).first();
  if (!order) return Response.json({ error: 'Order not found.' }, { status: 404 });

  const allowed = validTransitions[order.status] ?? [];
  if (!allowed.includes(body.status)) {
    return Response.json({ error: `Cannot transition from ${order.status} → ${body.status}. Allowed: ${allowed.join(', ') || 'none'}` }, { status: 400 });
  }

  await db('orders').where({ order_number: orderNumber }).update({ status: body.status, updated_at: new Date().toISOString() });
  await db('order_events').insert({ order_id: order.id, event: `status:${body.status}`, details: JSON.stringify({ from: order.status, to: body.status }), created_at: new Date().toISOString() });

  if (body.status === 'shipped') void sendEmail(orderShippedEmail(serializeOrder(order))).catch(() => {});
  if (body.status === 'delivered') void sendEmail(orderDeliveredEmail(serializeOrder(order))).catch(() => {});

  const updated = await db('orders').where({ order_number: orderNumber }).first();
  return Response.json({ order: serializeOrder(updated!) });
}
