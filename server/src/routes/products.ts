import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/knex.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { serializeProduct, serializeReview } from '../lib/serialize.js';

export const productsRouter = Router();

const CATEGORIES = ['cleanser', 'moisturizer', 'serum', 'toner', 'exfoliant', 'sunscreen', 'bundles'] as const;

const listQuery = z.object({
  category: z.enum(CATEGORIES).optional(),
  search: z.string().max(120).optional(),
  sort: z.enum(['featured', 'best-selling', 'price-asc', 'price-desc', 'newest']).default('featured'),
  featured: z.enum(['true', 'false']).optional(),
  bestSellers: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
});

/** Aggregate published review stats for a set of product ids. */
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

productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    let query = db('products').where({ is_active: true });

    if (q.category) query = query.andWhere({ category: q.category });
    if (q.featured === 'true') query = query.andWhere({ is_featured: true });
    if (q.bestSellers === 'true') query = query.andWhere({ is_best_seller: true });

    if (q.search) {
      const term = `%${q.search.toLowerCase()}%`;
      query = query.andWhere((b) =>
        b
          .whereRaw('LOWER(name) LIKE ?', [term])
          .orWhereRaw('LOWER(short_description) LIKE ?', [term])
          .orWhereRaw('LOWER(tagline) LIKE ?', [term])
          .orWhereRaw('LOWER(category) LIKE ?', [term]),
      );
    }

    switch (q.sort) {
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

    if (q.limit) query = query.limit(q.limit);

    const rows = await query.select('*');
    const stats = await ratingsFor(rows.map((r: any) => r.id));
    res.json({ products: rows.map((r: any) => serializeProduct(r, stats.get(r.id))) });
  }),
);

/** Lightweight list used to build the sitemap and prefetch routes. */
productsRouter.get(
  '/slugs',
  asyncHandler(async (_req, res) => {
    const rows = await db('products').where({ is_active: true }).select('slug', 'updated_at');
    res.json({ slugs: rows });
  }),
);

productsRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const row = await db('products').where({ slug: req.params.slug, is_active: true }).first();
    if (!row) throw notFound('That product could not be found.');

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

    res.json({
      product: serializeProduct(row, stats.get(row.id)),
      reviews: reviews.map(serializeReview),
      related: related.map((r: any) => serializeProduct(r, relatedStats.get(r.id))),
    });
  }),
);
