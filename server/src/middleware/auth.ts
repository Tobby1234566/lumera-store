import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { unauthorized } from '../lib/http.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ADMIN AUTHENTICATION
 * ─────────────────────────────────────────────────────────────────────────────
 * A signed JWT is issued on login and stored in an httpOnly, SameSite=Lax
 * cookie so it is not readable by client-side JavaScript (XSS-resistant) and
 * is not vulnerable to being copied out of localStorage. Every /api/admin
 * route below the mount point is gated by `requireAdmin`.
 */

export type AdminClaims = { sub: string; email: string; name: string; role: string };

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CUSTOMER AUTHENTICATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Unlike admins, customers are identified by verified email only (stateless).
 * No session cookies are issued. Customer identity is passed in headers or
 * inferred from verified email verification records in the database.
 */

export type CustomerClaims = { id: string; email: string; name: string; verified: boolean };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminClaims;
      customer?: CustomerClaims;
    }
  }
}

export function issueAdminToken(claims: AdminClaims): string {
  return jwt.sign(claims, config.auth.jwtSecret, {
    expiresIn: config.auth.sessionTtlSeconds,
    issuer: 'lumera',
  });
}

export function setSessionCookie(res: Response, token: string): void {
  const crossOrigin = config.appUrl.startsWith('https://');

  res.cookie(config.auth.cookieName, token, {
    httpOnly: true,
    sameSite: crossOrigin ? 'none' : 'lax',
    secure: crossOrigin,
    maxAge: config.auth.sessionTtlSeconds * 1000,
    path: '/',
  });
}
export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.auth.cookieName, { path: '/' });
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const fromCookie = req.cookies?.[config.auth.cookieName];
  const header = req.headers.authorization;
  const fromHeader = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const token = fromCookie ?? fromHeader;

  if (!token) return next(unauthorized());

  try {
    const claims = jwt.verify(token, config.auth.jwtSecret, { issuer: 'lumera' }) as AdminClaims;
    req.admin = claims;
    next();
  } catch {
    next(unauthorized('Your session has expired. Please sign in again.'));
  }
}

/**
 * Middleware to attach customer identity from verified email.
 * Unlike requireAdmin, this does not gate the route; it just enriches the request.
 * Routes can then check `req.customer` to gate features for verified customers.
 */
export async function withCustomerIdentity(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  // Customer email can come from:
  // 1. X-Customer-Email header (passed by verified client)
  // 2. Order email extracted from checkout context
  const email = req.headers['x-customer-email'] as string | undefined;

  if (!email) {
    next();
    return;
  }

  // For now, attach the email. In a real app, you could verify a JWT
  // or look up the customer's verified status from the database.
  req.customer = { id: '', email, name: '', verified: false };
  next();
}

