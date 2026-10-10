import { db } from '@/db/knex.js';

export async function POST(request: Request) {
  const { token } = await request.json() as { token: string };
  const verification = await db('email_verifications').where({ token, is_verified: false }).first();
  if (!verification) return Response.json({ error: 'Invalid or expired verification token.' }, { status: 401 });
  if (new Date(verification.expires_at) < new Date()) return Response.json({ error: 'Verification token has expired.' }, { status: 401 });

  await db('email_verifications').where({ id: verification.id }).update({ is_verified: true, verified_at: new Date().toISOString() });
  return Response.json({ message: 'Email verified successfully. Your account is now active.', email: verification.email });
}
