import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { db } from '../db/knex.js';
import { config } from '../config.js';
import { asyncHandler } from '../lib/http.js';
import { id } from '../lib/ids.js';
import { sanitizeText, normalizeEmail } from '../lib/sanitize.js';
import { getPaymentProvider } from '../services/payments/index.js';

export const publicRouter = Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
});

/** Storefront configuration the client needs at runtime. */
publicRouter.get(
  '/config',
  asyncHandler(async (_req, res) => {
    const provider = getPaymentProvider();
    res.json({
      currency: config.store.currency,
      shippingFlatRateCents: config.store.shippingFlatRateCents,
      freeShippingThresholdCents: config.store.freeShippingThresholdCents,
      payment: {
        provider: provider.name,
        /** Surfaced in the UI so simulated checkouts are never misrepresented. */
        isMock: !provider.isLive,
      },
    });
  }),
);

publicRouter.post(
  '/newsletter',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email: z.string().email().max(320), source: z.string().max(40).optional() })
      .parse(req.body);

    const email = normalizeEmail(body.email);
    const existing = await db('subscribers').where({ email }).first();
    if (!existing) {
      await db('subscribers').insert({
        id: id('sub'),
        email,
        source: sanitizeText(body.source ?? 'footer', 40),
        created_at: new Date().toISOString(),
      });
    }
    // Same response either way — do not leak whether an address is subscribed.
    res.json({ ok: true, message: 'You are on the list. Welcome to LUMÉRA.' });
  }),
);

publicRouter.post(
  '/contact',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2).max(120),
        email: z.string().email().max(320),
        subject: z.string().min(2).max(160),
        message: z.string().min(10).max(4000),
      })
      .parse(req.body);

    await db('contact_messages').insert({
      id: id('msg'),
      name: sanitizeText(body.name, 120),
      email: normalizeEmail(body.email),
      subject: sanitizeText(body.subject, 160),
      message: sanitizeText(body.message, 4000),
      is_handled: false,
      created_at: new Date().toISOString(),
    });

    res.json({ ok: true, message: 'Thank you — we will reply within 1–2 business days.' });
  }),
);

/**
 * Analytics collection endpoint.
 *
 * Deliberately minimal: it accepts an event name and a small non-identifying
 * payload only. No IP addresses, cookies, emails or user identifiers are
 * stored. This is the integration point for Google Analytics, Plausible, etc —
 * see client/src/lib/analytics.ts.
 */
publicRouter.post(
  '/analytics',
  rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.enum(['product_viewed', 'add_to_cart', 'checkout_started', 'purchase_completed']),
        payload: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      })
      .parse(req.body);

    const safe = JSON.stringify(body.payload ?? {}).slice(0, 800);
    await db('analytics_events').insert({
      name: body.name,
      payload: safe,
      created_at: new Date().toISOString(),
    });
    res.status(204).end();
  }),
);

/** robots.txt */
publicRouter.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /checkout', 'Disallow: /cart', '', `Sitemap: ${config.appUrl}/sitemap.xml`, ''].join('\n'),
  );
});

/** Dynamic sitemap.xml including a URL for every active product. */
publicRouter.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const base = config.appUrl.replace(/\/$/, '');
    const staticPaths = ['/', '/shop', '/about', '/contact', '/faq', '/shipping-policy', '/returns-policy', '/privacy-policy', '/terms'];
    const products = await db('products').where({ is_active: true }).select('slug', 'updated_at');

    const urls = [
      ...staticPaths.map((p) => ({ loc: `${base}${p}`, lastmod: null as string | null, priority: p === '/' ? '1.0' : '0.7' })),
      ...products.map((p: any) => ({
        loc: `${base}/shop/${p.slug}`,
        lastmod: new Date(p.updated_at).toISOString().slice(0, 10),
        priority: '0.9',
      })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) =>
        ['  <url>', `    <loc>${u.loc}</loc>`, u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : '', `    <priority>${u.priority}</priority>`, '  </url>']
          .filter(Boolean)
          .join('\n'),
      ),
      '</urlset>',
      '',
    ].join('\n');

    res.type('application/xml').send(xml);
  }),
);
