import { clearSessionCookie } from '@/middleware/auth.js';

export async function POST() {
  clearSessionCookie();
  return Response.json({ ok: true });
}
