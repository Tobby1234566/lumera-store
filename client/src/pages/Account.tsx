import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { AccountOrder, Customer } from '../types';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

export function Account() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(resetToken ? 'reset' : 'login');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', password: '', phone: '' });

  useEffect(() => {
    api.customer.me().then(({ customer }) => {
      setCustomer(customer);
      return api.customer.orders();
    }).then(({ orders: accountOrders }) => setOrders(accountOrders)).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [name]: event.target.value })),
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const result = await api.customer.login(form.email, form.password);
        setCustomer(result.customer);
        const accountOrders = await api.customer.orders();
        setOrders(accountOrders.orders);
      } else if (mode === 'register') {
        const result = await api.customer.register({ email: form.email, fullName: form.fullName, password: form.password });
        setMessage(result.message);
        setMode('login');
      } else if (mode === 'forgot') {
        const result = await api.customer.forgotPassword(form.email);
        setMessage(result.message);
      } else {
        if (!resetToken) throw new Error('This password reset link is incomplete.');
        const result = await api.customer.resetPassword(resetToken, form.password);
        setMessage(result.message);
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api.customer.logout();
    setCustomer(null);
    setOrders([]);
    setMessage('You have been signed out.');
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.customer.update({ fullName: form.fullName, phone: form.phone });
      setCustomer(result.customer);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update your profile.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="shell py-32 text-center text-ink-muted">Loading your account…</div>;

  if (!customer) {
    const title = mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Welcome back';
    return (
      <section className="shell grid min-h-[70vh] max-w-5xl items-center gap-12 py-20 lg:grid-cols-[.8fr_1fr]">
        <div>
          <p className="eyebrow">LUMÉRA account</p>
          <h1 className="mt-4 max-w-md text-5xl text-ink">Care that remembers you.</h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-muted">Keep your details, saved addresses and order history in one quiet, considered place.</p>
        </div>
        <div className="border border-sand-200 bg-white p-7 sm:p-10">
          <h2 className="font-display text-3xl text-ink">{title}</h2>
          {error && <p role="alert" className="mt-5 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          {message && <p role="status" className="mt-5 bg-sage-50 px-4 py-3 text-sm text-sage-900">{message}</p>}
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'register' && <label className="block text-sm text-ink">Full name<input className="field mt-2 w-full" required {...field('fullName')} /></label>}
            {mode !== 'reset' && <label className="block text-sm text-ink">Email<input className="field mt-2 w-full" type="email" required {...field('email')} /></label>}
            {mode !== 'forgot' && <label className="block text-sm text-ink">Password<input className="field mt-2 w-full" type="password" minLength={8} required {...field('password')} /></label>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Reset password' : 'Sign in'}</button>
          </form>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
            {mode !== 'login' && <button className="underline underline-offset-4" onClick={() => { setMode('login'); setError(''); }}>Sign in</button>}
            {mode === 'login' && <button className="underline underline-offset-4" onClick={() => setMode('register')}>Create an account</button>}
            {(mode === 'login' || mode === 'register') && <button className="underline underline-offset-4" onClick={() => setMode('forgot')}>Forgot password?</button>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="shell max-w-6xl py-16 sm:py-24">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-sand-200 pb-8">
        <div><p className="eyebrow">Your account</p><h1 className="mt-3 text-5xl text-ink">Hello, {customer.fullName.split(/\s+/)[0]}.</h1></div>
        <button className="btn-secondary" onClick={logout}>Sign out</button>
      </div>
      {error && <p role="alert" className="mt-6 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="mt-6 bg-sage-50 px-4 py-3 text-sm text-sage-900">{message}</p>}
      <div className="mt-10 grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
        <form onSubmit={saveProfile} className="border border-sand-200 bg-white p-7">
          <h2 className="font-display text-2xl text-ink">Profile</h2>
          <label className="mt-6 block text-sm text-ink">Email<input className="field mt-2 w-full bg-sand-100" value={customer.email} readOnly /></label>
          <label className="mt-4 block text-sm text-ink">Full name<input className="field mt-2 w-full" required {...field('fullName')} value={form.fullName || customer.fullName} /></label>
          <label className="mt-4 block text-sm text-ink">Phone<input className="field mt-2 w-full" {...field('phone')} value={form.phone || customer.phone || ''} /></label>
          <button className="btn-primary mt-6" disabled={busy}>Save profile</button>
        </form>
        <div>
          <h2 className="font-display text-3xl text-ink">Order history</h2>
          {orders.length === 0 ? <p className="mt-5 text-ink-muted">Your completed orders will appear here. <Link className="underline" to="/shop">Explore the collection</Link>.</p> : <div className="mt-5 space-y-4">{orders.map((order) => <article key={order.id} className="border border-sand-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-medium text-ink">Order {order.orderNumber}</p><p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">{order.status}</p></div><p className="text-sm text-ink">{formatMoney(order.totalCents, order.currency)}</p></div><div className="mt-4 flex flex-wrap gap-3 text-sm text-ink-muted">{order.items.map((item) => <span key={`${order.id}-${item.slug}`}>{item.quantity} × {item.name}</span>)}</div></article>)}</div>}
        </div>
      </div>
    </section>
  );
}
