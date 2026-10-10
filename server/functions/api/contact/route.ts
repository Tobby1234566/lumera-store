import { db } from '@/db/knex.js';
import { id } from '@/lib/ids.js';
import { sanitizeText, normalizeEmail } from '@/lib/sanitize.js';

export async function POST(request: Request) {
  const { name, email, subject, message } = await request.json() as {
    name: string; email: string; subject: string; message: string;
  };
  await db('contact_messages').insert({
    id: id('msg'),
    name: sanitizeText(name, 120),
    email: normalizeEmail(email),
    subject: sanitizeText(subject, 160),
    message: sanitizeText(message, 4000),
    is_handled: false,
    created_at: new Date().toISOString(),
  });
  return Response.json({ ok: true, message: 'Thank you — we will reply within 1–2 business days.' });
}
