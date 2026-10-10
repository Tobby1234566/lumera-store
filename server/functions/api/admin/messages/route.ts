import { db } from '@/db/knex.js';
import { requireAdmin } from '@/middleware/auth.js';

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200) || 100;
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);
  const rows = await db('contact_messages').limit(limit).offset(offset).orderBy('created_at', 'desc');
  const total = await db('contact_messages').count<{ c: number }[]>({ c: '*' });
  return Response.json({ messages: rows, total: Number(total[0].c) });
}
