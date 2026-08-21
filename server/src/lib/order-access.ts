import crypto from 'node:crypto';

export const ORDER_ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type OrderAccessRecord = {
  order_access_token_hash?: string | null;
  order_access_token_expires_at?: string | Date | null;
};

export function createOrderAccessToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashOrderAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hasOrderAccess(row: OrderAccessRecord, token: string | undefined): boolean {
  if (!token || !row.order_access_token_hash || !row.order_access_token_expires_at) return false;
  if (new Date(row.order_access_token_expires_at).getTime() <= Date.now()) return false;
  const expected = Buffer.from(String(row.order_access_token_hash), 'utf8');
  const provided = Buffer.from(hashOrderAccessToken(token), 'utf8');
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}
