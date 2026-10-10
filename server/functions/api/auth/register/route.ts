import { db } from '@/db/knex.js';
import { id } from '@/lib/ids.js';
import { normalizeEmail, sanitizeText } from '@/lib/sanitize.js';
import { sendEmail } from '@/services/email.js';
import { config } from '@/config.js';
import crypto from 'node:crypto';

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: Request) {
  const { email, fullName, acceptsMarketing } = await request.json() as {
    email: string; fullName: string; acceptsMarketing?: boolean;
  };
  const emailNorm = normalizeEmail(email);
  const existing = await db('customers').where({ email: emailNorm }).first();
  if (existing) return Response.json({ error: 'An account with this email already exists.' }, { status: 400 });

  const activeVerif = await db('email_verifications')
    .where({ email: emailNorm, is_verified: false })
    .where('expires_at', '>', new Date().toISOString())
    .first();
  if (activeVerif) return Response.json({ error: 'A verification email has already been sent.' }, { status: 400 });

  const customerId = id('cust');
  const now = new Date().toISOString();
  await db('customers').insert({ id: customerId, email: emailNorm, full_name: sanitizeText(fullName), accepts_marketing: acceptsMarketing ?? false, created_at: now, updated_at: now });

  const verificationId = id('ver');
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await db('email_verifications').insert({ id: verificationId, email: emailNorm, token, is_verified: false, expires_at: expiresAt, created_at: now });

  const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;
  void sendEmail({ to: emailNorm, event: 'email_verification', subject: 'Verify your LUMÉRA account', text: [`Hi ${sanitizeText(fullName).split(/\s+/)[0]},`, '', 'Welcome to LUMÉRA! Please verify your email address to activate your account.', '', `Verification link: ${verificationUrl}`, '', 'This link will expire in 24 hours.', '', 'LUMÉRA — Simple skincare. Beautifully made.',].join('\n') });

  return Response.json({ message: 'Account created. Please check your email to verify your address.', email: emailNorm }, { status: 201 });
}
