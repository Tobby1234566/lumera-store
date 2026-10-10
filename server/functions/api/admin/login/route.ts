import { db } from '@/db/knex.js';
import bcrypt from 'bcryptjs';
import { normalizeEmail, sanitizeText } from '@/lib/sanitize.js';
import { config } from '@/config.js';
import { issueAdminToken, setSessionCookie } from '@/middleware/auth.js';
import { id } from '@/lib/ids.js';

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email: string; password: string };
  const emailNorm = normalizeEmail(email);

  let user = await db('admin_users').where({ email: emailNorm }).first();

  const hash = user?.password_hash ?? null;
  let ok = false;
  if (hash) ok = await bcrypt.compare(password, hash);

  // Dev fallback
  if (!ok && process.env.NODE_ENV !== 'production') {
    const seedEmail = normalizeEmail(config.seedAdmin.email);
    if (emailNorm === seedEmail && password === config.seedAdmin.password) {
      if (!user) {
        const nowIso = new Date().toISOString();
        const adminId = id('adm');
        await db('admin_users').insert({ id: adminId, email: seedEmail, name: config.seedAdmin.name, password_hash: '', role: 'admin', created_at: nowIso, updated_at: nowIso });
        user = await db('admin_users').where({ id: adminId }).first();
      }
      ok = true;
    }
  }

  if (!user || !ok) return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });

  await db('admin_users').where({ id: user.id }).update({ last_login_at: new Date().toISOString() });
  const token = issueAdminToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
  setSessionCookie(token);
  return Response.json({ admin: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
