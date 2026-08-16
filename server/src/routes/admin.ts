import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { db } from '../db/knex.js';
import { config } from '../config.js';
import { asyncHandler, badRequest, notFound, unauthorized } from '../lib/http.js';
import { id, slugify } from '../lib/ids.js';
import { serializeOrder, serializeProduct } from '../lib/serialize.js';
import { sanitizeText, normalizeEmail } from '../lib/sanitize.js';
import {
  issueAdminToken,
  setSessionCookie,
  clearSessionCookie,
  requireAdmin,
} from '../middleware/auth.js';
import { sendEmail, orderShippedEmail, orderDeliveredEmail } from '../services/email.js';

export const adminRouter = Router();

/* ── Authentication ─────────────────────────────────────────────────────── */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many sign-in attempts. Please wait 15 minutes.' },
});

adminRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email: z.string().email().max(320), password: z.string().min(1).max(200) })
      .parse(req.body);

    let user = await db('admin_users').where({ email: normalizeEmail(body.email) }).first();

    // Always run a hash comparison when a hash exists so timing does not reveal account existence.
    const hash = user?.password_hash ?? null;
    let ok = false;
    if (hash) {
      ok = await bcrypt.compare(body.password, hash);
    }

    // Development convenience: if running in non-production and the request
    // matches the configured seeded admin credentials, accept the login and
    // create the admin record if it's missing. This allows local development
    // to proceed even when native deps (better-sqlite3) or full installs
    // haven't been completed.
    if (!ok && !config.isProduction) {
      const seedEmail = normalizeEmail(config.seedAdmin.email);
      if (normalizeEmail(body.email) === seedEmail && body.password === config.seedAdmin.password) {
        if (!user) {
          const nowIso = new Date().toISOString();
          const adminId = id('adm');
          await db('admin_users').insert({
            id: adminId,
            email: seedEmail,
            name: config.seedAdmin.name,
            password_hash: '',
            role: 'admin',
            created_at: nowIso,
            updated_at: nowIso,
          });
          user = await db('admin_users').where({ id: adminId }).first();
        }
        ok = true;
      }
    }

    if (!user || !ok) throw unauthorized('Incorrect email or password.');

    await db('admin_users').where({ id: user.id }).update({ last_login_at: new Date().toISOString() });

    const token = issueAdminToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
    setSessionCookie(res, token);
    res.json({ admin: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }),
);

adminRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ── Everything below this line requires a valid admin session ──────────────
adminRouter.use(requireAdmin);

adminRouter.get('/me', (req, res) => {
  res.json({ admin: req.admin });
});

/* ── Analytics ──────────────────────────────────────────────────────────── */

adminRouter.get(
  '/analytics',
  asyncHandler(async (_req, res) => {
    const paidStatuses = ['paid', 'processing', 'shipped', 'delivered'];

    const totals = await db('orders')
      .whereIn('status', paidStatuses)
      .select(db.raw('COALESCE(SUM(total_cents), 0) as revenue'), db.raw('COUNT(*) as orders'));
    const revenueCents = Number((totals as any)[0].revenue);
    const ordersCount = Number((totals as any)[0].orders);

    const allOrders = await db('orders').count<{ c: number }[]>({ c: '*' });
    const pending = await db('orders').where({ status: 'pending' }).count<{ c: number }[]>({ c: '*' });

    const byStatusRows = await db('orders').groupBy('status').select('status').count({ c: '*' });
    const byStatus: Record<string, number> = {};
    for (const r of byStatusRows as any[]) byStatus[r.status] = Number(r.c);

    // Revenue for the last 30 days, bucketed by day (dialect-agnostic: we
    // aggregate in JS so this works identically on SQLite and PostgreSQL).
    const since = new Date(Date.now() - 29 * 86_400_000);
    since.setHours(0, 0, 0, 0);
    const recentPaid = await db('orders')
      .whereIn('status', paidStatuses)
      .andWhere('created_at', '>=', since.toISOString())
      .select('created_at', 'total_cents');

    const buckets = new Map<string, { revenueCents: number; orders: number }>();
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      buckets.set(d, { revenueCents: 0, orders: 0 });
    }
    for (const o of recentPaid as any[]) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const b = buckets.get(key);
      if (b) {
        b.revenueCents += Number(o.total_cents);
        b.orders += 1;
      }
    }

    const bestSellers = await db('order_items')
      .join('orders', 'orders.id', 'order_items.order_id')
      .whereIn('orders.status', paidStatuses)
      .groupBy('order_items.product_slug', 'order_items.product_name')
      .select('order_items.product_slug as slug', 'order_items.product_name as name')
      .sum({ units: 'order_items.quantity' })
      .sum({ revenueCents: 'order_items.line_total_cents' })
      .orderBy('units', 'desc')
      .limit(5);

    const recentOrders = await db('orders').orderBy('created_at', 'desc').limit(8).select('*');
    const customers = await db('customers').count<{ c: number }[]>({ c: '*' });
    const lowStock = await db('products').where('inventory', '<', 20).andWhere({ is_active: true }).select('name', 'slug', 'inventory');

    res.json({
      totals: {
        revenueCents,
        ordersCount,
        allOrdersCount: Number(allOrders[0].c),
        pendingCount: Number(pending[0].c),
        averageOrderValueCents: ordersCount ? Math.round(revenueCents / ordersCount) : 0,
        customersCount: Number(customers[0].c),
      },
      byStatus,
      revenueSeries: [...buckets.entries()].map(([date, v]) => ({ date, ...v })),
      bestSellers: (bestSellers as any[]).map((b) => ({
        slug: b.slug,
        name: b.name,
        units: Number(b.units),
        revenueCents: Number(b.revenueCents),
      })),
      recentOrders: recentOrders.map((o: any) => serializeOrder(o)),
      lowStock,
    });
  }),
);

/* ── Orders ─────────────────────────────────────────────────────────────── */

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

adminRouter.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        search: z.string().max(160).optional(),
        status: z.enum(ORDER_STATUSES).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(req.query);

    let query = db('orders');
    if (q.status) query = query.where({ status: q.status });
    if (q.search) {
      const term = `%${q.search.toLowerCase()}%`;
      query = query.andWhere((b) =>
        b
          .whereRaw('LOWER(order_number) LIKE ?', [term])
          .orWhereRaw('LOWER(email) LIKE ?', [term])
          .orWhereRaw('LOWER(full_name) LIKE ?', [term])
          .orWhereRaw('LOWER(city) LIKE ?', [term]),
      );
    }

    const countRows = await query.clone().clearSelect().clearOrder().count<{ c: number }[]>({ c: '*' });
    const rows = await query.orderBy('created_at', 'desc').limit(q.limit).offset(q.offset).select('*');

    const ids = rows.map((r: any) => r.id);
    const items = ids.length ? await db('order_items').whereIn('order_id', ids).select('*') : [];

    res.json({
      total: Number(countRows[0].c),
      orders: rows.map((r: any) =>
        serializeOrder(r, items.filter((i: any) => i.order_id === r.id)),
      ),
    });
  }),
);

adminRouter.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const row = await db('orders').where({ id: req.params.id }).first();
    if (!row) throw notFound('Order not found.');
    const items = await db('order_items').where({ order_id: row.id }).select('*');
    const events = await db('order_events').where({ order_id: row.id }).orderBy('created_at', 'asc').select('*');
    res.json({ order: serializeOrder(row, items, events) });
  }),
);

adminRouter.patch(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        status: z.enum(ORDER_STATUSES).optional(),
        trackingNumber: z.string().max(120).nullable().optional(),
        shippingCarrier: z.string().max(120).nullable().optional(),
      })
      .parse(req.body);

    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) throw notFound('Order not found.');

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: nowIso };

    if (body.trackingNumber !== undefined) patch.tracking_number = body.trackingNumber ? sanitizeText(body.trackingNumber, 120) : null;
    if (body.shippingCarrier !== undefined) patch.shipping_carrier = body.shippingCarrier ? sanitizeText(body.shippingCarrier, 120) : null;

    if (body.status && body.status !== order.status) {
      patch.status = body.status;
      if (body.status === 'shipped') patch.shipped_at = nowIso;
      if (body.status === 'delivered') patch.delivered_at = nowIso;
      if (body.status === 'refunded') patch.payment_status = 'refunded';
      if (body.status === 'paid') {
        patch.payment_status = 'paid';
        if (!order.paid_at) patch.paid_at = nowIso;
      }
    }

    await db('orders').where({ id: order.id }).update(patch);

    if (body.status && body.status !== order.status) {
      await db('order_events').insert({
        order_id: order.id,
        type: 'status',
        message: `Status changed from ${order.status} to ${body.status} by ${req.admin?.email}.`,
        created_at: nowIso,
      });

      const updated = await db('orders').where({ id: order.id }).first();
      if (body.status === 'shipped') await sendEmail(orderShippedEmail(updated));
      if (body.status === 'delivered') await sendEmail(orderDeliveredEmail(updated));
    }

    const row = await db('orders').where({ id: order.id }).first();
    const items = await db('order_items').where({ order_id: order.id }).select('*');
    const events = await db('order_events').where({ order_id: order.id }).orderBy('created_at', 'asc').select('*');
    res.json({ order: serializeOrder(row, items, events) });
  }),
);

/* ── Customers ──────────────────────────────────────────────────────────── */

adminRouter.get(
  '/customers',
  asyncHandler(async (req, res) => {
    const q = z.object({ search: z.string().max(160).optional() }).parse(req.query);
    let query = db('customers');
    if (q.search) {
      const term = `%${q.search.toLowerCase()}%`;
      query = query.where((b) =>
        b.whereRaw('LOWER(email) LIKE ?', [term]).orWhereRaw('LOWER(full_name) LIKE ?', [term]),
      );
    }
    const rows = await query.orderBy('total_spent_cents', 'desc').limit(200).select('*');
    res.json({
      customers: rows.map((c: any) => ({
        id: c.id,
        email: c.email,
        fullName: c.full_name,
        phone: c.phone,
        ordersCount: Number(c.orders_count),
        totalSpentCents: Number(c.total_spent_cents),
        acceptsMarketing: c.accepts_marketing === true || c.accepts_marketing === 1,
        createdAt: c.created_at,
      })),
    });
  }),
);

/* ── Products ───────────────────────────────────────────────────────────── */

const productSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().max(120).optional(),
  category: z.enum(['cleanser', 'moisturizer', 'serum', 'toner', 'exfoliant', 'sunscreen', 'bundles']),
  tagline: z.string().max(200).default(''),
  shortDescription: z.string().max(400).default(''),
  description: z.string().max(6000).default(''),
  priceCents: z.number().int().min(0).max(10_000_000),
  compareAtPriceCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  size: z.string().max(120).default(''),
  inventory: z.number().int().min(0).max(1_000_000).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  images: z.array(z.string().max(500)).max(8).default([]),
  benefits: z.array(z.string().max(300)).max(12).default([]),
  keyIngredients: z.array(z.object({ name: z.string().max(120), role: z.string().max(400) })).max(12).default([]),
  ingredientsList: z.string().max(4000).default(''),
  howToUse: z.string().max(2000).default(''),
  skinTypes: z.array(z.string().max(60)).max(10).default([]),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(400).nullable().optional(),
});

adminRouter.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const rows = await db('products').orderBy('sort_order', 'asc').select('*');
    res.json({ products: rows.map((r: any) => serializeProduct(r)) });
  }),
);

adminRouter.post(
  '/products',
  asyncHandler(async (req, res) => {
    const body = productSchema.parse(req.body);
    const slug = slugify(body.slug || body.name);
    if (!slug) throw badRequest('A valid slug could not be generated from that name.');

    const clash = await db('products').where({ slug }).first();
    if (clash) throw badRequest('A product with that URL slug already exists.');

    const nowIso = new Date().toISOString();
    const productId = id('prd');
    await db('products').insert({
      id: productId,
      slug,
      name: sanitizeText(body.name, 160),
      category: body.category,
      tagline: sanitizeText(body.tagline, 200),
      short_description: sanitizeText(body.shortDescription, 400),
      description: sanitizeText(body.description, 6000),
      price_cents: body.priceCents,
      compare_at_price_cents: body.compareAtPriceCents ?? null,
      size: sanitizeText(body.size, 120),
      inventory: body.inventory,
      is_active: body.isActive,
      is_featured: body.isFeatured,
      is_best_seller: body.isBestSeller,
      sort_order: body.sortOrder,
      units_sold: 0,
      images: JSON.stringify(body.images),
      benefits: JSON.stringify(body.benefits),
      key_ingredients: JSON.stringify(body.keyIngredients),
      ingredients_list: sanitizeText(body.ingredientsList, 4000),
      how_to_use: sanitizeText(body.howToUse, 2000),
      skin_types: JSON.stringify(body.skinTypes),
      seo_title: body.seoTitle ?? null,
      seo_description: body.seoDescription ?? null,
      created_at: nowIso,
      updated_at: nowIso,
    });

    const row = await db('products').where({ id: productId }).first();
    res.status(201).json({ product: serializeProduct(row) });
  }),
);

adminRouter.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const existing = await db('products').where({ id: req.params.id }).first();
    if (!existing) throw notFound('Product not found.');

    const body = productSchema.partial().parse(req.body);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.slug !== undefined || body.name !== undefined) {
      const slug = slugify(body.slug || body.name || existing.slug);
      if (slug && slug !== existing.slug) {
        const clash = await db('products').where({ slug }).andWhereNot({ id: existing.id }).first();
        if (clash) throw badRequest('A product with that URL slug already exists.');
        patch.slug = slug;
      }
    }

    const map: Record<string, string> = {
      name: 'name',
      category: 'category',
      tagline: 'tagline',
      shortDescription: 'short_description',
      description: 'description',
      priceCents: 'price_cents',
      compareAtPriceCents: 'compare_at_price_cents',
      size: 'size',
      inventory: 'inventory',
      isActive: 'is_active',
      isFeatured: 'is_featured',
      isBestSeller: 'is_best_seller',
      sortOrder: 'sort_order',
      ingredientsList: 'ingredients_list',
      howToUse: 'how_to_use',
      seoTitle: 'seo_title',
      seoDescription: 'seo_description',
    };
    for (const [key, column] of Object.entries(map)) {
      const value = (body as any)[key];
      if (value === undefined) continue;
      patch[column] = typeof value === 'string' ? sanitizeText(value, 6000) : value;
    }
    for (const key of ['images', 'benefits', 'keyIngredients', 'skinTypes'] as const) {
      const value = (body as any)[key];
      if (value === undefined) continue;
      const column = key === 'keyIngredients' ? 'key_ingredients' : key === 'skinTypes' ? 'skin_types' : key;
      patch[column] = JSON.stringify(value);
    }

    await db('products').where({ id: existing.id }).update(patch);
    const row = await db('products').where({ id: existing.id }).first();
    res.json({ product: serializeProduct(row) });
  }),
);

adminRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const existing = await db('products').where({ id: req.params.id }).first();
    if (!existing) throw notFound('Product not found.');
    // Historical order_items keep denormalised copies, so deleting is safe.
    await db('products').where({ id: existing.id }).del();
    res.json({ ok: true });
  }),
);

/* ── Reviews ────────────────────────────────────────────────────────────── */

adminRouter.get(
  '/reviews',
  asyncHandler(async (_req, res) => {
    const rows = await db('reviews')
      .leftJoin('products', 'products.id', 'reviews.product_id')
      .orderBy('reviews.created_at', 'desc')
      .select('reviews.*', 'products.name as product_name');
    res.json({
      reviews: rows.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        productName: r.product_name,
        authorName: r.author_name,
        rating: Number(r.rating),
        title: r.title,
        body: r.body,
        isPlaceholder: r.is_placeholder === true || r.is_placeholder === 1,
        isPublished: r.is_published === true || r.is_published === 1,
        createdAt: r.created_at,
      })),
    });
  }),
);

/** Bulk-removes every review flagged as development sample content. */
adminRouter.delete(
  '/reviews/placeholders',
  asyncHandler(async (_req, res) => {
    const deleted = await db('reviews').where({ is_placeholder: true }).del();
    res.json({ ok: true, deleted });
  }),
);

adminRouter.delete(
  '/reviews/:id',
  asyncHandler(async (req, res) => {
    await db('reviews').where({ id: req.params.id }).del();
    res.json({ ok: true });
  }),
);

/* ── Discount codes ─────────────────────────────────────────────────────── */

adminRouter.get(
  '/discounts',
  asyncHandler(async (_req, res) => {
    const rows = await db('discount_codes').orderBy('created_at', 'desc').select('*');
    res.json({
      discounts: rows.map((d: any) => ({
        id: d.id,
        code: d.code,
        type: d.type,
        value: Number(d.value),
        minSubtotalCents: Number(d.min_subtotal_cents),
        isActive: d.is_active === true || d.is_active === 1,
        usageLimit: d.usage_limit === null ? null : Number(d.usage_limit),
        timesUsed: Number(d.times_used),
        expiresAt: d.expires_at,
        createdAt: d.created_at,
      })),
    });
  }),
);

adminRouter.post(
  '/discounts',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        code: z.string().min(3).max(40),
        type: z.enum(['percent', 'fixed']),
        value: z.number().int().min(1).max(1_000_000),
        minSubtotalCents: z.number().int().min(0).default(0),
        usageLimit: z.number().int().min(1).nullable().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
      })
      .parse(req.body);

    if (body.type === 'percent' && body.value > 100) throw badRequest('A percentage discount cannot exceed 100.');

    const code = body.code.trim().toUpperCase().replace(/\s+/g, '');
    const clash = await db('discount_codes').whereRaw('LOWER(code) = ?', [code.toLowerCase()]).first();
    if (clash) throw badRequest('That code already exists.');

    await db('discount_codes').insert({
      id: id('dsc'),
      code,
      type: body.type,
      value: body.value,
      min_subtotal_cents: body.minSubtotalCents,
      usage_limit: body.usageLimit ?? null,
      expires_at: body.expiresAt ?? null,
      is_active: true,
      times_used: 0,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ ok: true });
  }),
);

adminRouter.patch(
  '/discounts/:id',
  asyncHandler(async (req, res) => {
    const body = z.object({ isActive: z.boolean() }).parse(req.body);
    const existing = await db('discount_codes').where({ id: req.params.id }).first();
    if (!existing) throw notFound('Discount code not found.');
    await db('discount_codes').where({ id: existing.id }).update({ is_active: body.isActive });
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  '/discounts/:id',
  asyncHandler(async (req, res) => {
    await db('discount_codes').where({ id: req.params.id }).del();
    res.json({ ok: true });
  }),
);

/* ── Contact messages ───────────────────────────────────────────────────── */

adminRouter.get(
  '/messages',
  asyncHandler(async (_req, res) => {
    const rows = await db('contact_messages').orderBy('created_at', 'desc').limit(200).select('*');
    res.json({
      messages: rows.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        subject: m.subject,
        message: m.message,
        isHandled: m.is_handled === true || m.is_handled === 1,
        createdAt: m.created_at,
      })),
    });
  }),
);
