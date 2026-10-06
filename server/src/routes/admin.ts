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
    const statusRows = byStatusRows as Array<{ status: string; c: number }>;
    const byStatus: Record<string, number> = {};
    for (const row of statusRows) byStatus[row.status] = Number(row.c);

    res.json({
      revenueCents,
      ordersCount,
      pendingOrders: Number(pending[0].c),
      byStatus,
    });
  }),
);

/* ── Orders ─────────────────────────────────────────────────────────────── */

adminRouter.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 200) || 100;
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const status = req.query.status as string | undefined;

    const where = status ? { status } : {};
    const [rows, total] = await Promise.all([
      db('orders')
        .where(where)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('orders').where(where).count<{ c: number }[]>({ c: '*' }),
    ]);

    res.json({
      orders: rows.map((r) => serializeOrder(r)),
      total: Number(total[0].c),
      limit,
      offset,
    });
  }),
);

adminRouter.patch(
  '/orders/:orderNumber/status',
  asyncHandler(async (req, res) => {
    const orderNumber = String(req.params.orderNumber);
    const body = z.object({ status: z.string() }).parse(req.body);

    const order = await db('orders').where({ order_number: orderNumber }).first();
    if (!order) throw notFound('Order not found.');

    const validTransitions: Record<string, string[]> = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };
    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(body.status)) {
      throw badRequest(`Cannot transition from ${order.status} → ${body.status}. Allowed: ${allowed.join(', ') || 'none'}`);
    }

    await db('orders').where({ order_number: orderNumber }).update({
      status: body.status,
      updated_at: new Date().toISOString(),
    });
    await db('order_events').insert({
      order_id: order.id,
      event: `status:${body.status}`,
      details: JSON.stringify({ from: order.status, to: body.status }),
      created_at: new Date().toISOString(),
    });

    // Fire transactional emails on key transitions
    if (body.status === 'shipped') {
      void sendEmail(orderShippedEmail(serializeOrder(order))).catch(() => {});
    } else if (body.status === 'delivered') {
      void sendEmail(orderDeliveredEmail(serializeOrder(order))).catch(() => {});
    }

    const updated = await db('orders').where({ order_number: orderNumber }).first();
    res.json({ order: serializeOrder(updated!) });
  }),
);

/* ── Customers ──────────────────────────────────────────────────────────── */

adminRouter.get(
  '/customers',
  asyncHandler(async (_req, res) => {
    const rows = await db('customers').select('*').orderBy('created_at', 'desc');
    res.json({ customers: rows });
  }),
);

/* ── Products ───────────────────────────────────────────────────────────── */

adminRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 200) || 100;
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const rows = await db('products')
      .limit(limit)
      .offset(offset)
      .orderBy('sort_order', 'asc');
    const total = await db('products').count<{ c: number }[]>({ c: '*' });
    res.json({ products: rows, total: Number(total[0].c) });
  }),
);

adminRouter.post(
  '/products',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().max(200),
        slug: z.string().max(200),
        category: z.string().max(100),
        tagline: z.string().max(300).optional(),
        short_description: z.string().max(1000),
        description: z.string(),
        price_cents: z.number().int().min(0),
        compare_at_price_cents: z.number().int().min(0).nullable().optional(),
        size: z.string().max(100),
        inventory: z.number().int().min(0),
        benefits: z.array(z.string()),
        key_ingredients: z.array(z.object({ name: z.string(), role: z.string() })),
        ingredients_list: z.string().max(2000),
        how_to_use: z.string().max(1000),
        skin_types: z.array(z.string()),
        images: z.array(z.string()),
        seo_title: z.string().max(200),
        seo_description: z.string().max(300),
        is_active: z.boolean().optional(),
        is_featured: z.boolean().optional(),
        is_best_seller: z.boolean().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(req.body);

    const existing = await db('products').where({ slug: body.slug }).first();
    if (existing) throw badRequest(`Product with slug '${body.slug}' already exists.`);

    const id_ = id('prd');
    const nowIso = new Date().toISOString();
    await db('products').insert({
      ...body,
      id: id_,
      units_sold: 0,
      created_at: nowIso,
      updated_at: nowIso,
    });
    const inserted = await db('products').where({ id: id_ }).first();
    res.status(201).json({ product: inserted });
  }),
);

adminRouter.put(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug);
    const body = z
      .object({
        name: z.string().max(200).optional(),
        category: z.string().max(100).optional(),
        tagline: z.string().max(300).optional(),
        short_description: z.string().max(1000).optional(),
        description: z.string().optional(),
        price_cents: z.number().int().min(0).optional(),
        compare_at_price_cents: z.number().int().min(0).nullable().optional(),
        size: z.string().max(100).optional(),
        inventory: z.number().int().min(0).optional(),
        benefits: z.array(z.string()).optional(),
        key_ingredients: z.array(z.object({ name: z.string(), role: z.string() })).optional(),
        ingredients_list: z.string().max(2000).optional(),
        how_to_use: z.string().max(1000).optional(),
        skin_types: z.array(z.string()).optional(),
        images: z.array(z.string()).optional(),
        seo_title: z.string().max(200).optional(),
        seo_description: z.string().max(300).optional(),
        is_active: z.boolean().optional(),
        is_featured: z.boolean().optional(),
        is_best_seller: z.boolean().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(req.body);

    const existing = await db('products').where({ slug }).first();
    if (!existing) throw notFound('Product not found.');

    await db('products').where({ slug }).update({ ...body, updated_at: new Date().toISOString() });
    const updated = await db('products').where({ slug }).first();
    res.json({ product: updated });
  }),
);

adminRouter.delete(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug);
    const row = await db('products').where({ slug }).first();
    if (!row) throw notFound('Product not found.');
    await db('products').where({ slug }).del();
    res.json({ deleted: true });
  }),
);

/* ── Reviews ────────────────────────────────────────────────────────────── */

adminRouter.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 200) || 100;
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const productId = req.query.product_id as string | undefined;
    const where = productId ? { product_id: productId } : {};
    const [rows, total] = await Promise.all([
      db('reviews')
        .where(where)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('reviews').where(where).count<{ c: number }[]>({ c: '*' }),
    ]);
    res.json({ reviews: rows, total: Number(total[0].c) });
  }),
);

adminRouter.delete(
  '/reviews/:id',
  asyncHandler(async (req, res) => {
    const row = await db('reviews').where({ id: req.params.id }).first();
    if (!row) throw notFound('Review not found.');
    await db('reviews').where({ id: req.params.id }).del();
    res.json({ deleted: true });
  }),
);

adminRouter.delete(
  '/reviews/placeholders',
  asyncHandler(async (_req, res) => {
    const removed = await db('reviews').where({ is_placeholder: true }).del();
    res.json({ removed: Number(removed) });
  }),
);

/* ── Discount codes ─────────────────────────────────────────────────────── */

adminRouter.get(
  '/discounts',
  asyncHandler(async (req, res) => {
    const rows = await db('discount_codes').select('*').orderBy('created_at', 'desc');
    res.json({ discounts: rows });
  }),
);

adminRouter.post(
  '/discounts',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        code: z.string().max(50),
        type: z.enum(['percent', 'fixed']),
        value: z.number().min(0),
        min_subtotal_cents: z.number().int().min(0).optional(),
        usage_limit: z.number().int().min(0).nullable().optional(),
        expires_at: z.string().nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(req.body);

    const existing = await db('discount_codes').where({ code: body.code.toUpperCase() }).first();
    if (existing) throw badRequest(`Discount code '${body.code}' already exists.`);

    const id_ = id('dsc');
    const nowIso = new Date().toISOString();
    await db('discount_codes').insert({
      id: id_,
      ...body,
      code: body.code.toUpperCase(),
      created_at: nowIso,
      updated_at: nowIso,
    });
    const inserted = await db('discount_codes').where({ id: id_ }).first();
    res.status(201).json({ discount: inserted });
  }),
);

adminRouter.patch(
  '/discounts/:code',
  asyncHandler(async (req, res) => {
    const code = String(req.params.code).toUpperCase();
    const body = z
      .object({
        value: z.number().min(0).optional(),
        min_subtotal_cents: z.number().int().min(0).optional(),
        usage_limit: z.number().int().min(0).nullable().optional(),
        expires_at: z.string().nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(req.body);

    const row = await db('discount_codes').where({ code }).first();
    if (!row) throw notFound('Discount code not found.');
    await db('discount_codes').where({ code }).update({ ...body, updated_at: new Date().toISOString() });
    const updated = await db('discount_codes').where({ code }).first();
    res.json({ discount: updated });
  }),
);

adminRouter.delete(
  '/discounts/:code',
  asyncHandler(async (req, res) => {
    const code = String(req.params.code).toUpperCase();
    const row = await db('discount_codes').where({ code }).first();
    if (!row) throw notFound('Discount code not found.');
    await db('discount_codes').where({ code }).del();
    res.json({ deleted: true });
  }),
);

/* ── Contact messages ───────────────────────────────────────────────────── */

adminRouter.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 200) || 100;
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const rows = await db('contact_messages')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');
    const total = await db('contact_messages').count<{ c: number }[]>({ c: '*' });
    res.json({ messages: rows, total: Number(total[0].c) });
  }),
);
