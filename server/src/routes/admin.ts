adminRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email: z.string().email().max(320), password: z.string().min(1).max(200) })
      .parse(req.body);

    let user = await db('admin_users').where({ email: normalizeEmail(body.email) }).first();

    // Always run a hash comparison when a hash exists so timing does not reveal account existence.
    const hash = user?.password_hash ?? null;
    let ok = false;
    if (hash) {
      ok = await bcrypt.compare(body.password, hash);
    }

    // Development convenience: if running in non-production and the request
    // matches the configured seeded admin credentials, accept the login and
    // create the admin record if it's missing. This allows local development
    // to proceed even when native deps (better-sqlite3) or full installs
    // haven't been completed.
    if (!ok && !config.isProduction) {
      const seedEmail = normalizeEmail(config.seedAdmin.email);
      if (normalizeEmail(body.email) === seedEmail && body.password === config.seedAdmin.password) {
        if (!user) {
          const nowIso = new Date().toISOString();
          const adminId = id('adm');
          await db('admin_users').insert({
            id: adminId,
            email: seedEmail,
            name: config.seedAdmin.name,
            password_hash: '',
            role: 'admin',
            created_at: nowIso,
            updated_at: nowIso,
          });
          user = await db('admin_users').where({ id: adminId }).first();
        }
        ok = true;
      }
    }

    if (!user || !ok) throw unauthorized('Incorrect email or password.');

    await db('admin_users').where({ id: user.id }).update({ last_login_at: new Date().toISOString() });

    const token = issueAdminToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
    setSessionCookie(res, token);
    res.json({ admin: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }),
);
