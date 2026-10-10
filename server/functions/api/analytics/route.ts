import { db } from '@/db/knex.js';

export async function POST(request: Request) {
  const { name, payload } = await request.json() as {
    name: 'product_viewed' | 'add_to_cart' | 'checkout_started' | 'purchase_completed';
    payload?: Record<string, string | number | boolean>;
  };
  const safe = JSON.stringify(payload ?? {}).slice(0, 800);
  await db('analytics_events').insert({ name, payload: safe, created_at: new Date().toISOString() });
  return new Response(null, { status: 204 });
}
