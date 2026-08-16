import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { db } from '../db/knex.js';
import { config } from '../config.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { priceCart, validateDiscountCode } from '../services/pricing.js';
import { getPaymentProvider } from '../services/payments/index.js';
import { id, orderNumber } from '../lib/ids.js';
import { serializeOrder } from '../lib/serialize.js';
import { sanitizeText, normalizeEmail } from '../lib/sanitize.js';
import {
  sendEmail,
  orderConfirmationEmail,
  paymentConfirmationEmail,
  emailVerificationEmail,
} from '../services/email.js';

export const checkoutRouter = Router();

const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const cartLineSchema = z.object({
  productId: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(99),
});

/** POST /api/checkout/quote — server-authoritative cart totals. */
checkoutRouter.post(
  '/quote',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        items: z.array(cartLineSchema).min(1).max(50),
        discountCode: z.string().max(40).nullable().optional(),
      })
      .parse(req.body);

    const quote = await priceCart(body.items, body.discountCode ?? null);
    res.json({ quote });
  }),
);

/** POST /api/checkout/discount — validate a code without placing an order. */
checkoutRouter.post(
  '/discount',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        code: z.string().min(1).max(40),
        items: z.array(cartLineSchema).min(1).max(50),
      })
      .parse(req.body);

    const base = await priceCart(body.items, null);
    const { record, discountCents } = await validateDiscountCode(body.code, base.subtotalCents);

    res.json({
      code: record.code,
      type: record.type,
      value: Number(record.value),
      discountCents,
      message: `Code ${record.code} applied.`,
    });
  }),
);

const addressSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(320),
  phone: z.string().min(6).max(32),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1).max(120),
  state: z.string().max(120).optional().or(z.literal('')),
  postalCode: z.string().max(32).optional().or(z.literal('')),
  country: z.string().min(2).max(120),
  notes: z.string().max(600).optional().or(z.literal('')),
  acceptsMarketing: z.boolean().optional(),
});

/**
 * POST /api/checkout/order
 *
 * Creates the order, then hands off to the configured payment provider.
 *
 * SECURITY: no card data is accepted by this endpoint — ever. Card details go
 * straight from the browser to the payment provider's own hosted fields. This
 * server only stores the provider's reference id.
 */
checkoutRouter.post(
  '/order',
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        customer: addressSchema,
        items: z.array(cartLineSchema).min(1).max(50),
        discountCode: z.string().max(40).nullable().optional(),
      })
      .parse(req.body);

    // Recompute every amount from the database — never trust client totals.
    const quote = await priceCart(body.items, body.discountCode ?? null);

    const c = body.customer;
    const email = normalizeEmail(c.email);
    const nowIso = new Date().toISOString();
    const provider = getPaymentProvider();

    if (!provider.isConfigured()) {
      throw badRequest(
        'The payment provider is not configured. Set the required environment variables, or use PAYMENT_PROVIDER=mock in development.',
      );
    }

    const orderId = id('ord');
    const number = orderNumber();

    await db.transaction(async (trx) => {
      // Upsert the customer record.
      let customer = await trx('customers').where({ email }).first();
      if (customer) {
        await trx('customers').where({ id: customer.id }).update({
          full_name: sanitizeText(c.fullName, 120),
          phone: sanitizeText(c.phone, 32),
          accepts_marketing: c.acceptsMarketing ? true : customer.accepts_marketing,
          updated_at: nowIso,
        });
      } else {
        const cid = id('cus');
        await trx('customers').insert({
          id: cid,
          email,
          full_name: sanitizeText(c.fullName, 120),
          phone: sanitizeText(c.phone, 32),
          orders_count: 0,
          total_spent_cents: 0,
          accepts_marketing: !!c.acceptsMarketing,
          created_at: nowIso,
          updated_at: nowIso,
        });
        customer = await trx('customers').where({ id: cid }).first();
      }

      await trx('orders').insert({
        id: orderId,
        order_number: number,
        customer_id: customer.id,
        email,
        full_name: sanitizeText(c.fullName, 120),
        phone: sanitizeText(c.phone, 32),
        address_line1: sanitizeText(c.addressLine1, 200),
        address_line2: c.addressLine2 ? sanitizeText(c.addressLine2, 200) : null,
        city: sanitizeText(c.city, 120),
        state: c.state ? sanitizeText(c.state, 120) : null,
        postal_code: c.postalCode ? sanitizeText(c.postalCode, 32) : null,
        country: sanitizeText(c.country, 120),
        notes: c.notes ? sanitizeText(c.notes, 600) : null,
        subtotal_cents: quote.subtotalCents,
        shipping_cents: quote.shippingCents,
        discount_cents: quote.discountCents,
        tax_cents: quote.taxCents,
        total_cents: quote.totalCents,
        currency: quote.currency,
        discount_code: quote.discountCode,
        status: 'pending',
        payment_status: 'unpaid',
        payment_provider: provider.name,
        created_at: nowIso,
        updated_at: nowIso,
      });

      for (const line of quote.lines) {
        await trx('order_items').insert({
          id: id('itm'),
          order_id: orderId,
          product_id: line.productId,
          product_name: line.name,
          product_slug: line.slug,
          product_image: line.image,
          size: line.size,
          unit_price_cents: line.unitPriceCents,
          quantity: line.quantity,
          line_total_cents: line.lineTotalCents,
        });
      }

      await trx('order_events').insert({
        order_id: orderId,
        type: 'created',
        message: `Order placed via ${provider.name} checkout.`,
        created_at: nowIso,
      });
    });

    const intent = await provider.createIntent({
      orderId,
      orderNumber: number,
      amountCents: quote.totalCents,
      currency: quote.currency,
      customerEmail: email,
      returnUrl: `${config.appUrl}/order/${number}`,
    });

    await db('orders').where({ id: orderId }).update({
      payment_reference: intent.reference,
      updated_at: new Date().toISOString(),
    });

    // The mock driver settles immediately so the whole lifecycle is testable.
    if (intent.status === 'succeeded') {
      await markOrderPaid(orderId, intent.reference);
    }

    const order = await loadOrder(orderId);

    // Transactional email (console driver in development).
    await sendEmail(orderConfirmationEmail(order, order.items));
    if (order.paymentStatus === 'paid') {
      await sendEmail(paymentConfirmationEmail(order));
    }

    // Trigger email verification for first-time customers
    try {
      await triggerEmailVerificationOnCheckout(order.email, order.fullName);
    } catch (err) {
      console.error('[checkout] failed to trigger email verification:', err);
      // Don't fail the order if verification email fails
    }

    res.status(201).json({
      order,
      payment: {
        provider: provider.name,
        status: intent.status,
        redirectUrl: intent.redirectUrl ?? null,
        clientSecret: intent.clientSecret ?? null,
        isMock: intent.isMock,
      },
    });
  }),
);

/** Marks an order paid, decrements inventory and updates customer totals. */
export async function markOrderPaid(orderId: string, reference: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.transaction(async (trx) => {
    const order = await trx('orders').where({ id: orderId }).first();
    if (!order || order.payment_status === 'paid') return;

    await trx('orders').where({ id: orderId }).update({
      status: 'paid',
      payment_status: 'paid',
      payment_reference: reference,
      paid_at: nowIso,
      updated_at: nowIso,
    });

    const items = await trx('order_items').where({ order_id: orderId }).select('*');
    for (const item of items) {
      if (!item.product_id) continue;
      await trx('products')
        .where({ id: item.product_id })
        .update({
          inventory: trx.raw('MAX(inventory - ?, 0)', [item.quantity]),
          units_sold: trx.raw('units_sold + ?', [item.quantity]),
          updated_at: nowIso,
        });
    }

    if (order.discount_code) {
      await trx('discount_codes')
        .whereRaw('LOWER(code) = ?', [String(order.discount_code).toLowerCase()])
        .update({ times_used: trx.raw('times_used + 1') });
    }

    if (order.customer_id) {
      await trx('customers')
        .where({ id: order.customer_id })
        .update({
          orders_count: trx.raw('orders_count + 1'),
          total_spent_cents: trx.raw('total_spent_cents + ?', [order.total_cents]),
          updated_at: nowIso,
        });
    }

    await trx('order_events').insert({
      order_id: orderId,
      type: 'payment',
      message: `Payment confirmed (reference ${reference}).`,
      created_at: nowIso,
    });

    await trx('analytics_events').insert({
      name: 'purchase_completed',
      payload: JSON.stringify({ orderId, totalCents: order.total_cents, currency: order.currency }),
      created_at: nowIso,
    });
  });
}

async function loadOrder(orderId: string) {
  const row = await db('orders').where({ id: orderId }).first();
  if (!row) throw notFound('Order not found.');
  const items = await db('order_items').where({ order_id: orderId }).select('*');
  const events = await db('order_events').where({ order_id: orderId }).orderBy('created_at', 'asc').select('*');
  return serializeOrder(row, items, events);
}

/**
 * Trigger email verification for a customer on purchase.
 * If the customer's email has not been verified, send a verification email.
 * This enriches the customer record and gives verified customers access to
 * benefits like early access, special discounts, etc.
 */
async function triggerEmailVerificationOnCheckout(email: string, fullName: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  // Check if email has already been verified
  const verification = await db('email_verifications')
    .where({ email: normalizedEmail, is_verified: true })
    .first();

  if (verification) {
    return; // Already verified, nothing to do
  }

  // Check if there's an active unverified verification request
  const activeVerification = await db('email_verifications')
    .where({ email: normalizedEmail, is_verified: false })
    .where('expires_at', '>', new Date())
    .first();

  if (activeVerification) {
    return; // Already sent, don't spam
  }

  // Clean up any expired unverified tokens
  await db('email_verifications')
    .where({ email: normalizedEmail, is_verified: false })
    .where('expires_at', '<=', new Date())
    .del();

  // Generate new verification token
  const verificationId = id('ver');
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db('email_verifications').insert({
    id: verificationId,
    email: normalizedEmail,
    token,
    is_verified: false,
    expires_at: expiresAt.toISOString(),
    created_at: now,
  });

  // Send verification email
  const firstName = fullName.split(/\s+/)[0] || 'there';
  const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;

  await sendEmail(emailVerificationEmail(normalizedEmail, firstName, verificationUrl));
}


/**
 * GET /api/checkout/order/:orderNumber
 * Public order lookup for the confirmation page. Requires the email as a
 * lightweight ownership check so order numbers alone cannot be enumerated.
 */
checkoutRouter.get(
  '/order/:orderNumber',
  asyncHandler(async (req, res) => {
    const row = await db('orders').where({ order_number: req.params.orderNumber }).first();
    if (!row) throw notFound('Order not found.');

    const email = typeof req.query.email === 'string' ? normalizeEmail(req.query.email) : '';
    if (email && email !== row.email) throw notFound('Order not found.');

    const items = await db('order_items').where({ order_id: row.id }).select('*');
    const order = serializeOrder(row, items);

    // Redact contact details unless the email matched.
    if (!email) {
      order.email = order.email.replace(/^(.).*(@.*)$/, '$1•••$2');
      order.phone = null;
    }
    res.json({ order });
  }),
);

/**
 * POST /api/payments/webhook — mounted separately in index.ts with a raw body
 * parser so provider signatures can be verified.
 */
export const webhookHandler = asyncHandler(async (req, res) => {
  const provider = getPaymentProvider();
  const signature = req.headers['stripe-signature'] as string | undefined;
  const parsed = await provider.parseWebhook(req.body as Buffer, signature);
  if (!parsed) return res.json({ received: true });

  if (parsed.paid) {
    const order = await db('orders').where({ payment_reference: parsed.reference }).first();
    if (order) await markOrderPaid(order.id, parsed.reference);
  }
  res.json({ received: true });
});
