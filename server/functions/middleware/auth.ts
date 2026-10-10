import jwt from 'jsonwebtoken';
import { config } from '@/config.js';

export type AdminClaims = { sub: string; email: string; name: string; role: string };

function getCookie(name: string, cookies: string): string | undefined {
  const match = cookies.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function issueAdminToken(claims: AdminClaims): string {
  return jwt.sign(claims, config.auth.jwtSecret, {
    expiresIn: config.auth.sessionTtlSeconds,
    issuer: 'lumera',
  });
}

export function setSessionCookie(token: string): ResponseInit {
  const crossOrigin = config.appUrl.startsWith('https://');
  const headers = new Headers();
  headers.set('set-cookie', `${config.auth.cookieName}=${token}; HttpOnly; SameSite=${crossOrigin ? 'None' : 'Lax'}; Secure=${crossOrigin}; Path=/; Max-Age=${config.auth.sessionTtlSeconds}`);
  return { headers };
}

export function clearSessionCookie(): ResponseInit {
  const headers = new Headers();
  headers.set('set-cookie', `${config.auth.cookieName}=; HttpOnly; Path=/; Max-Age=0`);
  return { headers };
}

export function requireAdmin(request: Request): { admin: AdminClaims } | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getCookie(config.auth.cookieName, cookieHeader)
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) return null;

  try {
    const claims = jwt.verify(token, config.auth.jwtSecret, { issuer: 'lumera' }) as AdminClaims;
    return { admin: claims };
  } catch {
    return null;
  }
}
