import { useEffect, useMemo, useRef, useState } from 'react';
import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../store/cart';
import { api, ApiError } from '../lib/api';
import type { Quote, StoreConfig } from '../types';
import { useSeo } from '../lib/seo';
import { formatMoney } from '../lib/format';
import { track } from '../lib/analytics';
import { Image, Notice, Spinner } from '../components/ui';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
  acceptsMarketing: boolean;
};

const EMPTY: FormState = {
  fullName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  notes: '',
  acceptsMarketing: false,
};

const COUNTRIES = [
  'Nigeria', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Ireland',
  'Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'South Africa', 'Kenya',
  'Ghana', 'United Arab Emirates', 'Singapore', 'New Zealand',
];

export function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const stripeRef = useRef<Stripe | null>(null);
  const stripeCardRef = useRef<StripeCardElement | null>(null);
  const stripeMountRef = useRef<HTMLDivElement>(null);

  useSeo({
    title: 'Checkout | LUMÉRA',
    description:
      'Complete your LUMÉRA order securely. Enter your shipping details and review your items, shipping and total before placing your order.',
    noIndex: true,
  });

  useEffect(() => {
    api.config().then(setStoreConfig).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (storeConfig?.payment.provider !== 'stripe' || !stripeMountRef.current) return;
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (!publishableKey) return;
    let disposed = false;
    loadStripe(publishableKey).then((stripe) => {
      if (!stripe || disposed || !stripeMountRef.current) return;
      stripeRef.current = stripe;
      const card = stripe.elements().create('card', { style: { base: { color: '#292723', fontFamily: 'system-ui, sans-serif', fontSize: '16px' } } });
      card.mount(stripeMountRef.current);
      stripeCardRef.current = card;
    });
    return () => {
      disposed = true;
      stripeCardRef.current?.unmount();
      stripeCardRef.current = null;
      stripeRef.current = null;
    };
  }, [storeConfig?.payment.provider]);

  useEffect(() => {
    if (cart.items.length > 0) {
      track('checkout_started', { itemCount: cart.count, subtotalCents: cart.subtotalCents });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cart.items.length === 0) return;
    let active = true;
    api
      .quote(cart.toApiItems(), cart.discountCode)
      .then((r) => active && setQuote(r.quote))
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cart.toApiItems()), cart.discountCode]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  /** Client-side validation for fast feedback. The server revalidates everything. */
  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Please enter a valid email address.';
    if (form.phone.replace(/\D/g, '').length < 6) next.phone = 'Please enter a valid phone number.';
    if (form.addressLine1.trim().length < 3) next.addressLine1 = 'Please enter your street address.';
    if (!form.city.trim()) next.city = 'Please enter your city.';
    if (!form.country.trim()) next.country = 'Please select your country.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return false;
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const result = await api.placeOrder({
        customer: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim(),
          notes: form.notes.trim(),
          acceptsMarketing: form.acceptsMarketing,
        },
        items: cart.toApiItems(),
        discountCode: cart.discountCode,
      });

      const { order, payment } = result;
      let completedOrder = order;

      // Hosted providers return a redirect; the order page performs server-side verification.
      if (payment.status === 'requires_redirect' && payment.redirectUrl) {
        window.location.href = payment.redirectUrl;
        return;
      }

      if (payment.status === 'requires_client_confirmation') {
        const stripe = stripeRef.current;
        const card = stripeCardRef.current;
        if (!stripe || !card || !payment.clientSecret) throw new Error('The secure card form is not ready. Please refresh and try again.');
        const confirmation = await stripe.confirmCardPayment(payment.clientSecret, {
          payment_method: { card, billing_details: { name: form.fullName, email: form.email, phone: form.phone } },
        });
        if (confirmation.error) {
          await api.paymentFail(payment.reference, confirmation.error.message ?? 'Stripe payment failed.');
          throw new Error(confirmation.error.message ?? 'Payment failed.');
        }
        const verified = await api.paymentVerify(payment.reference);
        if (!verified.paid) throw new Error('Payment is still awaiting provider confirmation.');
        completedOrder = verified.order;
      }

      track('purchase_completed', {
        orderNumber: completedOrder.orderNumber,
        totalCents: completedOrder.totalCents,
        itemCount: completedOrder.items.length,
      });

      const email = form.email.trim();
      cart.clear();
      navigate(`/order/${completedOrder.orderNumber}?email=${encodeURIComponent(email)}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        const fieldErrors: Record<string, string> = {};
        for (const detail of err.details as { path: string; message: string }[]) {
          fieldErrors[detail.path.replace('customer.', '')] = detail.message;
        }
        setErrors(fieldErrors);
      }
      setSubmitError(err instanceof Error ? err.message : 'We could not place your order. Please try again.');
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const summary = useMemo(
    () => quote ?? null,
    [quote],
  );

  if (cart.items.length === 0) {
    return (
      <div className="shell py-28 text-center lg:py-36">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-4 text-4xl text-ink sm:text-5xl">Your cart is empty</h1>
        <p className="mt-5 text-[15px] text-ink-muted">Add something to your cart to check out.</p>
        <Link to="/shop" className="btn-primary mt-9">
          Shop skincare
        </Link>
      </div>
    );
  }

  return (
    <div className="shell py-12 lg:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-4 text-4xl text-ink sm:text-5xl">Almost there</h1>
      </header>

      {/* Honest disclosure when the mock driver is active. */}
      {storeConfig?.payment.isMock && (
        <Notice tone="warn" className="mt-8">
          <strong className="font-medium">Development mode — simulated payment.</strong> This store is
          running the mock payment driver. No card details are collected and no real payment is taken.
          Orders placed here are test records only. Connect a real payment provider before accepting
          live orders.
        </Notice>
      )}

      {submitError && (
        <Notice tone="error" className="mt-6">
          {submitError}
        </Notice>
      )}

      <form onSubmit={submit} noValidate className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Form */}
        <div className="lg:col-span-7">
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="text-[12px] uppercase tracking-luxe text-ink">
              Contact
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="Full name"
                name="fullName"
                value={form.fullName}
                onChange={(v) => set('fullName', v)}
                error={errors.fullName}
                autoComplete="name"
                required
              />
              <Field
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(v) => set('email', v)}
                error={errors.email}
                autoComplete="email"
                inputMode="email"
                required
              />
              <Field
                label="Phone number"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(v) => set('phone', v)}
                error={errors.phone}
                autoComplete="tel"
                inputMode="tel"
                required
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section aria-labelledby="shipping-heading" className="mt-12">
            <h2 id="shipping-heading" className="text-[12px] uppercase tracking-luxe text-ink">
              Shipping address
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="Street address"
                name="addressLine1"
                value={form.addressLine1}
                onChange={(v) => set('addressLine1', v)}
                error={errors.addressLine1}
                autoComplete="address-line1"
                required
                className="sm:col-span-2"
              />
              <Field
                label="Apartment, suite (optional)"
                name="addressLine2"
                value={form.addressLine2}
                onChange={(v) => set('addressLine2', v)}
                autoComplete="address-line2"
                className="sm:col-span-2"
              />
              <Field
                label="City"
                name="city"
                value={form.city}
                onChange={(v) => set('city', v)}
                error={errors.city}
                autoComplete="address-level2"
                required
              />
              <Field
                label="State / Province"
                name="state"
                value={form.state}
                onChange={(v) => set('state', v)}
                autoComplete="address-level1"
              />
              <Field
                label="Postal code"
                name="postalCode"
                value={form.postalCode}
                onChange={(v) => set('postalCode', v)}
                autoComplete="postal-code"
                hint="Leave blank if your area does not use one."
              />
              <div>
                <label htmlFor="country" className="label">
                  Country <span className="text-clay-500">*</span>
                </label>
                <select
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  className={`field ${errors.country ? 'border-red-400' : ''}`}
                  autoComplete="country-name"
                  required
                >
                  <option value="">Select a country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.country && (
                  <p className="mt-1.5 text-[12.5px] text-red-700" role="alert">
                    {errors.country}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="notes" className="label">
                Delivery notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Anything our courier should know."
                className="field resize-y"
              />
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.acceptsMarketing}
                onChange={(e) => set('acceptsMarketing', e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
              />
              <span className="text-[13.5px] leading-relaxed text-ink-muted">
                Email me routine guides and new releases. You can unsubscribe at any time.
              </span>
            </label>
          </section>

          <section aria-labelledby="payment-heading" className="mt-12">
            <h2 id="payment-heading" className="text-[12px] uppercase tracking-luxe text-ink">
              Payment
            </h2>

            <div className="mt-5 border border-sand-300 bg-sand-100 p-6">
              {storeConfig?.payment.isMock ? (
                <>
                  <p className="text-[14.5px] leading-relaxed text-ink-soft">
                    Simulated checkout is active. Placing this order creates a real order record in
                    the database with a simulated payment — no card is charged and no card details
                    are requested.
                  </p>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
                    When a live provider is connected, its secure card fields render in this panel.
                    Card data goes directly to the provider and never touches the LUMÉRA server.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[14.5px] leading-relaxed text-ink-soft">
                    {storeConfig?.payment.provider === 'stripe' ? 'Pay securely with Stripe. Your card details are tokenized by Stripe and never touch the LUMÉRA server.' : `You will be taken to our payment provider (${storeConfig?.payment.provider}) to complete payment securely.`}
                  </p>
                  {storeConfig?.payment.provider === 'stripe' && <div ref={stripeMountRef} className="mt-5 border border-sand-300 bg-white p-4" aria-label="Card details" />}
                </>
              )}
            </div>
          </section>

          <button type="submit" disabled={submitting} className="btn-primary mt-9 w-full lg:hidden">
            {submitting ? <Spinner /> : `Place order · ${summary ? formatMoney(summary.totalCents) : ''}`}
          </button>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-5">
          <div className="border border-sand-200 bg-sand-100 p-6 lg:sticky lg:top-28 lg:p-8">
            <h2 className="text-[12px] uppercase tracking-luxe text-ink">Your order</h2>

            <ul className="mt-6 space-y-4">
              {cart.items.map((item) => (
                <li key={item.slug} className="flex gap-4">
                  <div className="relative shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      wrapperClassName="h-20 w-16"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute -right-2 -top-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-ink px-1.5 text-[11px] text-sand-50 tabular-nums">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-[16px] text-ink">
                        {item.name.replace('LUMÉRA ', '')}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-ink-faint">{item.size}</p>
                    </div>
                    <span className="shrink-0 text-[13.5px] tabular-nums text-ink">
                      {formatMoney(item.priceCents * item.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-7 space-y-3 border-t border-sand-300 pt-6 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums text-ink">
                  {summary ? formatMoney(summary.subtotalCents) : '—'}
                </dd>
              </div>
              {summary && summary.discountCents > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <dt>Discount {summary.discountCode && `(${summary.discountCode})`}</dt>
                  <dd className="tabular-nums">−{formatMoney(summary.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="tabular-nums text-ink">
                  {summary ? (summary.shippingCents === 0 ? 'Free' : formatMoney(summary.shippingCents)) : '—'}
                </dd>
              </div>
              {summary && summary.taxCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Tax</dt>
                  <dd className="tabular-nums text-ink">{formatMoney(summary.taxCents)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-sand-300 pt-4 text-[18px]">
                <dt className="text-ink">Total</dt>
                <dd className="tabular-nums text-ink">
                  {summary ? formatMoney(summary.totalCents) : <Spinner className="text-ink-muted" />}
                </dd>
              </div>
            </dl>

            <button type="submit" disabled={submitting} className="btn-primary mt-7 hidden w-full lg:inline-flex">
              {submitting ? <Spinner /> : 'Place order'}
            </button>

            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-faint">
              By placing this order you agree to our{' '}
              <Link to="/terms" className="underline underline-offset-2">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

/* ── Field ───────────────────────────────────────────────────────────────── */

function Field({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  required = false,
  autoComplete,
  inputMode,
  className = '',
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-clay-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={`field ${error ? 'border-red-400' : ''}`}
      />
      {error ? (
        <p id={`${name}-error`} className="mt-1.5 text-[12.5px] text-red-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="mt-1.5 text-[12px] text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
