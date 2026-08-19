import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '../db/knex.js';
import { config } from '../config.js';
import { asyncHandler, badRequest, unauthorized } from '../lib/http.js';
import { id } from '../lib/ids.js';
import { normalizeEmail, sanitizeText } from '../lib/sanitize.js';
import { sendEmail, emailVerificationEmail } from '../services/email.js';
import {
  clearCustomerSession,
  createResetToken,
  digestResetToken,
  issueCustomerSession,
  requireCustomer,
} from '../services/customer-auth.js';

export const authRouter = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please wait 15 minutes.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait 15 minutes.' },
});

const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many account recovery attempts. Please wait 15 minutes.' },
});

const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please wait 5 minutes.' },
});

const passwordSchema = z.string().min(8).max(128);
const addressSchema = z.object({
  label: z.string().min(1).max(40).default('Shipping'),
  fullName: z.string().min(2).max(120),
  phone: z.string().min(6).max(32).optional().or(z.literal('')),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1).max(120),
  state: z.string().max(120).optional().or(z.literal('')),
  postalCode: z.string().max(32).optional().or(z.literal('')),
  country: z.string().min(2).max(120),
  isDefault: z.boolean().optional(),
});

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function customerView(customer: Record<string, unknown>) {
  return {
    id: String(customer.id),
    email: String(customer.email),
    fullName: String(customer.full_name),
    phone: customer.phone ?? null,
    acceptsMarketing: Boolean(customer.accepts_marketing),
    emailVerified: Boolean(customer.email_verified_at),
    createdAt: customer.created_at,
  };
}

async function sendVerification(customer: { email: string; full_name: string }): Promise<void> {
  const email = normalizeEmail(customer.email);
  await db('email_verifications').where({ email, is_verified: false }).del();
  const token = generateVerificationToken();
  const now = new Date().toISOString();
  await db('email_verifications').insert({
    id: id('ver'),
    email,
    token,
    is_verified: false,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: now,
  });
  const firstName = customer.full_name.split(/\s+/)[0] || 'there';
  await sendEmail(emailVerificationEmail(email, firstName, `${config.appUrl}/verify-email?token=${token}`));
}

/** Create a customer account and send a verification email. */
authRouter.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email().max(320),
        fullName: z.string().min(2).max(120),
        password: passwordSchema,
        acceptsMarketing: z.boolean().optional(),
      })
      .parse(req.body);

    const email = normalizeEmail(body.email);
    const fullName = sanitizeText(body.fullName, 120);
    const existing = await db('customers').where({ email }).first();
    const passwordHash = await bcrypt.hash(body.password, 12);

    if (existing?.password_hash) {
      throw badRequest('An account with this email already exists. Please sign in instead.');
    }

    const now = new Date().toISOString();
    if (existing) {
      await db('customers').where({ id: existing.id }).update({
        full_name: fullName,
        password_hash: passwordHash,
        accepts_marketing: body.acceptsMarketing ?? existing.accepts_marketing,
        updated_at: now,
      });
    } else {
      await db('customers').insert({
        id: id('cus'),
        email,
        full_name: fullName,
        password_hash: passwordHash,
        email_verified_at: null,
        accepts_marketing: body.acceptsMarketing ?? false,
        orders_count: 0,
        total_spent_cents: 0,
        created_at: now,
        updated_at: now,
      });
    }

    const customer = await db('customers').where({ email }).first();
    if (!customer) throw new Error('Customer was not created.');
    await sendVerification(customer);
    res.status(201).json({ message: 'Account created. Please verify your email address.', email });
  }),
);

/** Sign in a verified customer and issue an opaque, server-side session. */
authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ email: z.string().email().max(320), password: passwordSchema }).parse(req.body);
    const customer = await db('customers').where({ email: normalizeEmail(body.email) }).first();
    if (!customer?.password_hash || !(await bcrypt.compare(body.password, customer.password_hash))) {
      throw unauthorized('Invalid email or password.');
    }
    if (!customer.email_verified_at) {
      throw unauthorized('Please verify your email address before signing in.');
    }

    await issueCustomerSession(customer.id, res);
    res.json({ customer: customerView(customer) });
  }),
);

authRouter.post('/logout', asyncHandler(async (_req, res) => {
  clearCustomerSession(res);
  res.json({ success: true });
}));

authRouter.get('/me', requireCustomer, asyncHandler(async (req, res) => {
  const customer = await db('customers').where({ id: req.customer!.id }).first();
  if (!customer) throw unauthorized('Your session has expired.');
  const addresses = await db('customer_addresses').where({ customer_id: customer.id }).orderBy('is_default', 'desc').orderBy('created_at', 'desc');
  res.json({ customer: customerView(customer), addresses });
}));

authRouter.patch('/me', requireCustomer, asyncHandler(async (req, res) => {
  const body = z.object({
    fullName: z.string().min(2).max(120).optional(),
    phone: z.string().min(6).max(32).optional().or(z.literal('')),
    acceptsMarketing: z.boolean().optional(),
  }).parse(req.body);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.fullName !== undefined) updates.full_name = sanitizeText(body.fullName, 120);
  if (body.phone !== undefined) updates.phone = sanitizeText(body.phone, 32);
  if (body.acceptsMarketing !== undefined) updates.accepts_marketing = body.acceptsMarketing;
  await db('customers').where({ id: req.customer!.id }).update(updates);
  const customer = await db('customers').where({ id: req.customer!.id }).first();
  res.json({ customer: customerView(customer) });
}));

authRouter.get('/me/orders', requireCustomer, asyncHandler(async (req, res) => {
  const orders = await db('orders').where({ customer_id: req.customer!.id }).orderBy('created_at', 'desc');
  const result = [];
  for (const order of orders) {
    const items = await db('order_items').where({ order_id: order.id }).select('*');
    result.push({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      totalCents: order.total_cents,
      currency: order.currency,
      createdAt: order.created_at,
      items: items.map((item) => ({
        name: item.product_name,
        slug: item.product_slug,
        image: item.product_image,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        lineTotalCents: item.line_total_cents,
      })),
    });
  }
  res.json({ orders: result });
}));

authRouter.get('/me/addresses', requireCustomer, asyncHandler(async (req, res) => {
  const addresses = await db('customer_addresses').where({ customer_id: req.customer!.id }).orderBy('is_default', 'desc').orderBy('created_at', 'desc');
  res.json({ addresses });
}));

authRouter.post('/me/addresses', requireCustomer, asyncHandler(async (req, res) => {
  const body = addressSchema.parse(req.body);
  const addressId = id('addr');
  const timestamp = new Date().toISOString();
  await db.transaction(async (trx) => {
    if (body.isDefault) await trx('customer_addresses').where({ customer_id: req.customer!.id }).update({ is_default: false });
    await trx('customer_addresses').insert({
      id: addressId,
      customer_id: req.customer!.id,
      label: sanitizeText(body.label, 40),
      full_name: sanitizeText(body.fullName, 120),
      phone: body.phone ? sanitizeText(body.phone, 32) : null,
      address_line1: sanitizeText(body.addressLine1, 200),
      address_line2: body.addressLine2 ? sanitizeText(body.addressLine2, 200) : null,
      city: sanitizeText(body.city, 120),
      state: body.state ? sanitizeText(body.state, 120) : null,
      postal_code: body.postalCode ? sanitizeText(body.postalCode, 32) : null,
      country: sanitizeText(body.country, 120),
      is_default: Boolean(body.isDefault),
      created_at: timestamp,
      updated_at: timestamp,
    });
  });
  const address = await db('customer_addresses').where({ id: addressId }).first();
  res.status(201).json({ address });
}));

authRouter.patch('/me/addresses/:id', requireCustomer, asyncHandler(async (req, res) => {
  const body = addressSchema.partial().parse(req.body);
  const existing = await db('customer_addresses').where({ id: req.params.id, customer_id: req.customer!.id }).first();
  if (!existing) throw badRequest('Address not found.');
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields: Array<[keyof typeof body, string]> = [
    ['label', 'label'], ['fullName', 'full_name'], ['phone', 'phone'], ['addressLine1', 'address_line1'],
    ['addressLine2', 'address_line2'], ['city', 'city'], ['state', 'state'], ['postalCode', 'postal_code'], ['country', 'country'],
  ];
  for (const [source, target] of fields) {
    const value = body[source];
    if (value !== undefined) updates[target] = typeof value === 'string' ? sanitizeText(value, 200) : value;
  }
  await db.transaction(async (trx) => {
    if (body.isDefault) await trx('customer_addresses').where({ customer_id: req.customer!.id }).update({ is_default: false });
    if (Object.keys(updates).length > 1 || body.isDefault !== undefined) {
      if (body.isDefault !== undefined) updates.is_default = body.isDefault;
      await trx('customer_addresses').where({ id: existing.id }).update(updates);
    }
  });
  const address = await db('customer_addresses').where({ id: existing.id }).first();
  res.json({ address });
}));

authRouter.delete('/me/addresses/:id', requireCustomer, asyncHandler(async (req, res) => {
  const deleted = await db('customer_addresses').where({ id: req.params.id, customer_id: req.customer!.id }).del();
  if (!deleted) throw badRequest('Address not found.');
  res.status(204).send();
}));

/** Verify an email address and activate the account. */
authRouter.post('/verify-email', verificationLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ token: z.string().min(1).max(200) }).parse(req.body);
  const verification = await db('email_verifications').where({ token: body.token, is_verified: false }).first();
  if (!verification || new Date(verification.expires_at) < new Date()) {
    throw unauthorized('Invalid or expired verification token.');
  }
  const now = new Date().toISOString();
  await db.transaction(async (trx) => {
    await trx('email_verifications').where({ id: verification.id }).update({ is_verified: true, verified_at: now });
    await trx('customers').where({ email: verification.email }).update({ email_verified_at: now, updated_at: now });
  });
  res.json({ message: 'Email verified successfully.', email: verification.email });
}));

authRouter.post('/resend-verification', verificationLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ email: z.string().email().max(320) }).parse(req.body);
  const customer = await db('customers').where({ email: normalizeEmail(body.email) }).first();
  if (customer && !customer.email_verified_at) await sendVerification(customer);
  res.json({ message: 'If an account exists, a verification email has been sent.' });
}));

authRouter.post('/forgot-password', recoveryLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ email: z.string().email().max(320) }).parse(req.body);
  const customer = await db('customers').where({ email: normalizeEmail(body.email) }).first();
  if (customer?.password_hash) {
    const token = createResetToken();
    const timestamp = new Date().toISOString();
    await db('customer_password_resets').where({ customer_id: customer.id }).del();
    await db('customer_password_resets').insert({
      id: id('reset'),
      customer_id: customer.id,
      token_hash: digestResetToken(token),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      created_at: timestamp,
    });
    await sendEmail({
      to: customer.email,
      event: 'password_reset',
      subject: 'Reset your LUMÉRA password',
      text: `Reset your password within one hour: ${config.appUrl}/account?token=${token}`,
    });
  }
  res.json({ message: 'If an account exists, password reset instructions have been sent.' });
}));

authRouter.post('/reset-password', recoveryLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ token: z.string().min(1).max(200), password: passwordSchema }).parse(req.body);
  const reset = await db('customer_password_resets').where({ token_hash: digestResetToken(body.token) }).whereNull('used_at').first();
  if (!reset || new Date(reset.expires_at) < new Date()) throw unauthorized('Invalid or expired reset token.');
  const passwordHash = await bcrypt.hash(body.password, 12);
  await db.transaction(async (trx) => {
    await trx('customers').where({ id: reset.customer_id }).update({ password_hash: passwordHash, updated_at: new Date().toISOString() });
    await trx('customer_password_resets').where({ id: reset.id }).update({ used_at: new Date().toISOString() });
    await trx('customer_sessions').where({ customer_id: reset.customer_id }).del();
  });
  res.json({ message: 'Password reset successfully. Please sign in.' });
}));

authRouter.get('/verify-status/:email', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.params.email);
  const customer = await db('customers').where({ email }).first();
  const verification = await db('email_verifications').where({ email }).orderBy('created_at', 'desc').first();
  const expired = Boolean(verification && !verification.is_verified && new Date(verification.expires_at) < new Date());
  res.json({
    verified: Boolean(customer?.email_verified_at),
    expired,
    message: customer?.email_verified_at ? 'Email verified' : expired ? 'Verification expired.' : 'Awaiting verification.',
  });
}));
