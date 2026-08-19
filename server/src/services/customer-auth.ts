import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db, now } from '../db/knex.js';
import { config } from '../config.js';
import { id } from '../lib/ids.js';
import { unauthorized } from '../lib/http.js';

export type CustomerSessionIdentity = {
  id: string;
  email: string;
  name: string;
  verified: boolean;
};

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieOptions() {
  const secure = config.appUrl.startsWith('https://');
  return {
    httpOnly: true,
    sameSite: secure ? ('none' as const) : ('lax' as const),
    secure,
    maxAge: config.auth.sessionTtlSeconds * 1000,
    path: '/',
  };
}

export async function issueCustomerSession(customerId: string, res: Response): Promise<void> {
  const token = crypto.randomBytes(32).toString('base64url');
  const timestamp = now();
  const expiresAt = new Date(Date.now() + config.auth.sessionTtlSeconds * 1000).toISOString();

  await db('customer_sessions').where('expires_at', '<=', timestamp).del();
  await db('customer_sessions').insert({
    id: id('csess'),
    customer_id: customerId,
    token_hash: hashToken(token),
    expires_at: expiresAt,
    created_at: timestamp,
    last_used_at: timestamp,
  });

  res.cookie(config.auth.customerCookieName, token, cookieOptions());
}

export function clearCustomerSession(res: Response): void {
  res.clearCookie(config.auth.customerCookieName, { ...cookieOptions(), maxAge: undefined });
}

export async function resolveCustomerSession(req: Request): Promise<CustomerSessionIdentity | null> {
  const token = req.cookies?.[config.auth.customerCookieName];
  if (!token || typeof token !== 'string') return null;

  const session = await db('customer_sessions')
    .join('customers', 'customers.id', 'customer_sessions.customer_id')
    .where({ 'customer_sessions.token_hash': hashToken(token) })
    .where('customer_sessions.expires_at', '>', now())
    .select(
      'customer_sessions.id as session_id',
      'customers.id',
      'customers.email',
      'customers.full_name',
      'customers.email_verified_at',
    )
    .first();

  if (!session) return null;

  await db('customer_sessions').where({ id: session.session_id }).update({ last_used_at: now() });
  return {
    id: String(session.id),
    email: String(session.email),
    name: String(session.full_name),
    verified: Boolean(session.email_verified_at),
  };
}

export async function withCustomerSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    req.customer = (await resolveCustomerSession(req)) ?? undefined;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireCustomer(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const customer = await resolveCustomerSession(req);
    if (!customer) {
      next(unauthorized('Please sign in to continue.'));
      return;
    }
    req.customer = customer;
    next();
  } catch (error) {
    next(error);
  }
}

export function digestResetToken(token: string): string {
  return hashToken(token);
}

export function createResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
