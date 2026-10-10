import { db } from '@/db/knex.js';

export async function GET() {
  const rows = await db('products').where({ is_active: true }).select('slug', 'updated_at');
  return Response.json({ slugs: rows });
}
