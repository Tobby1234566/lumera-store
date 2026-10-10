import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200) || 100;
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);
  const productId = searchParams.get('product_id') || undefined;
  const where = productId ? { product_id: productId } : {};

  const [rows, total] = await Promise.all([
    db('reviews').where(where).orderBy('created_at', 'desc').limit(limit).offset(offset),
    db('reviews').where(where).count<{ c: number }[]>({ c: '*' }),
  ]);
  return Response.json({ reviews: rows, total: Number(total[0].c) });
}
