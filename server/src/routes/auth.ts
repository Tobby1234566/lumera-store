import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { db } from '../db/knex.js';
import { config } from '../config.js';
import { asyncHandler, badRequest, unauthorized } from '../lib/http.js';
import { id } from '../lib/ids.js';
import { normalizeEmail, sanitizeText } from '../lib/sanitize.js';
import { sendEmail } from '../services/email.js';
import crypto from 'crypto';

export const authRouter = Router();

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CUSTOMER AUTHENTICATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes for customer sign-up, email verification, and authentication.
 * Unlike admin routes which use JWTs in cookies, customer auth is stateless:
 * the customer email is used as the identifier and orders are linked by email.
 */

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please wait 15 minutes.' },
});

const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please wait 5 minutes.' },
});

/**
 * Generate a secure verification token.
 * Returns a URL-safe random string of 32 bytes (256 bits).
 */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * POST /api/auth/register
 * Create a customer account and send email verification.
 */
authRouter.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
	const body = z
	  .object({
		email: z.string().email().max(320),
		fullName: z.string().min(2).max(120),
		acceptsMarketing: z.boolean().optional(),
	  })
	  .parse(req.body);

	const email = normalizeEmail(body.email);
	const fullName = sanitizeText(body.fullName);

	// Check if customer already exists
	const existing = await db('customers').where({ email }).first();
	if (existing) {
	  throw badRequest('An account with this email already exists. Please sign in instead.');
	}

	// Check if there's an active verification for this email
	const activeVerification = await db('email_verifications')
	  .where({ email, is_verified: false })
	  .where('expires_at', '>', new Date())
	  .first();

	if (activeVerification) {
	  throw badRequest(
		'A verification email has already been sent. Please check your inbox or request a new one.',
	  );
	}

	// Create customer record
	const customerId = id('cust');
	const now = new Date().toISOString();

	await db('customers').insert({
	  id: customerId,
	  email,
	  full_name: fullName,
	  accepts_marketing: body.acceptsMarketing ?? false,
	  created_at: now,
	  updated_at: now,
	});

	// Generate verification token with 24-hour expiry
	const verificationId = id('ver');
	const token = generateVerificationToken();
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

	await db('email_verifications').insert({
	  id: verificationId,
	  email,
	  token,
	  is_verified: false,
	  expires_at: expiresAt.toISOString(),
	  created_at: now,
	});

	// Send verification email
	const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;
	await sendEmail({
	  to: email,
	  event: 'email_verification',
	  subject: 'Verify your LUMÉRA account',
	  text: [
		`Hi ${fullName.split(/\s+/)[0]},`,
		'',
		'Welcome to LUMÉRA! Please verify your email address to activate your account.',
		'',
		`Verification link: ${verificationUrl}`,
		'',
		'This link will expire in 24 hours.',
		'',
		'If you did not create this account, you can safely ignore this email.',
		'',
		'LUMÉRA — Simple skincare. Beautifully made.',
	  ].join('\n'),
	});

	res.status(201).json({
	  message: 'Account created. Please check your email to verify your address.',
	  email,
	});
  }),
);

/**
 * POST /api/auth/verify-email
 * Verify an email address using a token.
 */
authRouter.post(
  '/verify-email',
  verificationLimiter,
  asyncHandler(async (req, res) => {
	const body = z.object({ token: z.string().min(1).max(200) }).parse(req.body);

	const verification = await db('email_verifications')
	  .where({ token: body.token, is_verified: false })
	  .first();

	if (!verification) {
	  throw unauthorized('Invalid or expired verification token.');
	}

	if (new Date(verification.expires_at) < new Date()) {
	  throw unauthorized('Verification token has expired. Please request a new one.');
	}

	// Mark as verified and record the timestamp
	const now = new Date().toISOString();
	await db('email_verifications')
	  .where({ id: verification.id })
	  .update({ is_verified: true, verified_at: now });

	res.json({
	  message: 'Email verified successfully. Your account is now active.',
	  email: verification.email,
	});
  }),
);

/**
 * POST /api/auth/resend-verification
 * Send a new verification email for an unverified account.
 */
authRouter.post(
  '/resend-verification',
  verificationLimiter,
  asyncHandler(async (req, res) => {
	const body = z.object({ email: z.string().email().max(320) }).parse(req.body);

	const email = normalizeEmail(body.email);

	// Find customer
	const customer = await db('customers').where({ email }).first();
	if (!customer) {
	  // Don't reveal if account exists (security)
	  res.json({
		message: 'If an account exists, a verification email has been sent.',
	  });
	  return;
	}

	// Clean up old unverified tokens
	await db('email_verifications')
	  .where({ email, is_verified: false })
	  .del();

	// Generate new token
	const verificationId = id('ver');
	const token = generateVerificationToken();
	const now = new Date().toISOString();
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

	await db('email_verifications').insert({
	  id: verificationId,
	  email,
	  token,
	  is_verified: false,
	  expires_at: expiresAt.toISOString(),
	  created_at: now,
	});

	// Send verification email
	const firstName = customer.full_name.split(/\s+/)[0];
	const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;

	await sendEmail({
	  to: email,
	  event: 'email_verification',
	  subject: 'Verify your LUMÉRA account',
	  text: [
		`Hi ${firstName},`,
		'',
		'Here is your new verification link. This link will expire in 24 hours.',
		'',
		`Verification link: ${verificationUrl}`,
		'',
		'If you did not request this email, you can safely ignore it.',
		'',
		'LUMÉRA — Simple skincare. Beautifully made.',
	  ].join('\n'),
	});

	res.json({
	  message: 'A new verification email has been sent.',
	});
  }),
);

/**
 * GET /api/auth/verify-status/:email
 * Check if an email has been verified (public endpoint for UI feedback).
 */
authRouter.get(
  '/verify-status/:email',
  asyncHandler(async (req, res) => {
	const email = normalizeEmail(req.params.email);

	const verification = await db('email_verifications')
	  .where({ email })
	  .orderBy('created_at', 'desc')
	  .first();

	if (!verification) {
	  res.json({ verified: false, message: 'No verification record found.' });
	  return;
	}

	const isExpired = new Date(verification.expires_at) < new Date();

	res.json({
	  verified: verification.is_verified,
	  expired: isExpired && !verification.is_verified,
	  message: verification.is_verified
		? 'Email verified'
		: isExpired
		  ? 'Verification expired. Please request a new one.'
		  : 'Awaiting verification.',
	});
  }),
);
