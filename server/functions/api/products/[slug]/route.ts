import type { NextRequest } from 'next/server';
import { db } from '@/db/knex.js';
import { serializeProduct, serializeReview } from '@/lib/serialize.js';

async function ratingsFor(productIds: string[]) {
  const map = new Map<string, { rating: number; reviewCount: number }>();
  if (!productIds.length) return map;
  const rows = await db('reviews')
    .whereIn('product_id', productIds)
    .andWhere({ is_published: true })
    .groupBy('product_id')
    .select('product_id')
    .avg({ avg: 'rating' })
    .count({ count: '*' });
  for (const r of rows as any[]) {
    map.set(r.product_id, {
      rating: Math.round(Number(r.avg) * 10) / 10,
      reviewCount: Number(r.count),
    });
  }
  return map;
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const row = await db('products').where({ slug: params.slug, is_active: true }).first();
  if (!row) return Response.json({ error: 'That product could not be found.' }, { status: 404 });

  const stats = await ratingsFor([row.id]);
  const reviews = await db('reviews')
    .where({ product_id: row.id, is_published: true })
    .orderBy('created_at', 'desc')
    .limit(20)
    .select('*');

  const related = await db('products')
    .where({ is_active: true })
    .andWhereNot({ id: row.id })
    .andWhere((b) => b.where({ category: row.category }).orWhere({ is_best_seller: true }))
    .orderBy('units_sold', 'desc')
    .limit(4)
    .select('*');
  const relatedStats = await ratingsFor(related.map((r: any) => r.id));

  return Response.json({
    product: serializeProduct(row, stats.get(row.id)),
    reviews: reviews.map(serializeReview),
    related: related.map((r: any) => serializeProduct(r, relatedStats.get(r.id))),
  });
}
