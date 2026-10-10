import type { NextRequest } from 'next/server';
import { db } from '@/db/knex.js';
import { serializeProduct, serializeReview } from '@/lib/serialize.js';

const CATEGORIES = ['cleanser', 'moisturizer', 'serum', 'toner', 'exfoliant', 'sunscreen', 'bundles'] as const;

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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') as string | null;
  const search = searchParams.get('search') as string | null;
  const sort = searchParams.get('sort') ?? 'featured';
  const featured = searchParams.get('featured');
  const bestSellers = searchParams.get('bestSellers');
  const limit = parseInt(searchParams.get('limit') ?? '0', 10);

  let query = db('products').where({ is_active: true });

  if (category && CATEGORIES.includes(category as any)) {
    query = query.andWhere({ category });
  }
  if (featured === 'true') query = query.andWhere({ is_featured: true });
  if (bestSellers === 'true') query = query.andWhere({ is_best_seller: true });

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query = query.andWhere((b) =>
      b
        .whereRaw('LOWER(name) LIKE ?', [term])
        .orWhereRaw('LOWER(short_description) LIKE ?', [term])
        .orWhereRaw('LOWER(tagline) LIKE ?', [term])
        .orWhereRaw('LOWER(category) LIKE ?', [term]),
    );
  }

  switch (sort) {
    case 'price-asc':
      query = query.orderBy('price_cents', 'asc');
      break;
    case 'price-desc':
      query = query.orderBy('price_cents', 'desc');
      break;
    case 'best-selling':
      query = query.orderBy('units_sold', 'desc');
      break;
    case 'newest':
      query = query.orderBy('created_at', 'desc').orderBy('sort_order', 'asc');
      break;
    default:
      query = query.orderBy('is_featured', 'desc').orderBy('sort_order', 'asc');
  }

  if (limit && limit > 0) query = query.limit(limit);

  const rows = await query.select('*');
  const stats = await ratingsFor(rows.map((r: any) => r.id));
  return Response.json({ products: rows.map((r: any) => serializeProduct(r, stats.get(r.id))) });
}
