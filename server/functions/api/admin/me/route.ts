import { requireAdmin } from '@/middleware/auth.js';

// This route is protected by requireAdmin middleware
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const admin = (req as any).admin;
  if (!admin) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  return Response.json({ admin });
}
