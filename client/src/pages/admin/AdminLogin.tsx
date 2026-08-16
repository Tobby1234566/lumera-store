import { useState } from 'react';
import { api } from '../../lib/api';
import { useSeo } from '../../lib/seo';
import { Notice, Spinner } from '../../components/ui';

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useSeo({ title: 'Admin Sign In | LUMÉRA', description: 'LUMÉRA staff sign in.', noIndex: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.admin.login(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-100 px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-display text-3xl tracking-[0.22em] text-ink">LUMÉRA</p>
          <p className="mt-2 text-[11px] uppercase tracking-luxe text-ink-faint">Admin</p>
        </div>

        <form onSubmit={submit} className="mt-10 border border-sand-300 bg-sand-50 p-7">
          <h1 className="text-[12px] uppercase tracking-luxe text-ink">Sign in</h1>

          {error && (
            <Notice tone="error" className="mt-5">
              {error}
            </Notice>
          )}

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="admin-email" className="label">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="label">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="field"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-7 w-full">
            {loading ? <Spinner /> : 'Sign in'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <div className="mt-5 border border-sand-300 bg-sand-50 p-4">
            <p className="text-[11.5px] leading-relaxed text-ink-muted">
              <strong className="font-medium text-ink">Development seed credentials:</strong>
              <br />
              admin@lumera.test / lumera-admin
              <br />
              <span className="text-ink-faint">
                Change ADMIN_EMAIL and ADMIN_PASSWORD in your environment before deploying.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
