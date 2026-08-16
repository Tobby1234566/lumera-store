import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../store/cart';
import { api } from '../lib/api';
import type { Quote } from '../types';
import { useSeo } from '../lib/seo';
import { formatMoney } from '../lib/format';
import { Image, QuantityStepper, Spinner } from '../components/ui';

export function CartPage() {
  const cart = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [codeInput, setCodeInput] = useState(cart.discountCode ?? '');
  const [codeError, setCodeError] = useState('');
  const [applying, setApplying] = useState(false);

  useSeo({
    title: 'Your Cart | LUMÉRA',
    description:
      'Review the items in your LUMÉRA cart, adjust quantities, apply a discount code and see your estimated total before checkout.',
    noIndex: true,
  });

  // Re-price with the server whenever the cart or discount changes.
  useEffect(() => {
    if (cart.items.length === 0) {
      setQuote(null);
      return;
    }
    let active = true;
    api
      .quote(cart.toApiItems(), cart.discountCode)
      .then((r) => active && setQuote(r.quote))
      .catch(() => {
        if (!active) return;
        // A discount may have expired — retry without it.
        api
          .quote(cart.toApiItems(), null)
          .then((r) => {
            if (!active) return;
            setQuote(r.quote);
            cart.setDiscountCode(null);
          })
          .catch(() => active && setQuote(null));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cart.toApiItems()), cart.discountCode]);

  const applyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code) return;
    setApplying(true);
    setCodeError('');
    try {
      await api.applyDiscount(code, cart.toApiItems());
      cart.setDiscountCode(code);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'That code is not valid.');
      cart.setDiscountCode(null);
    } finally {
      setApplying(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="shell py-28 text-center lg:py-36">
        <p className="eyebrow">Cart</p>
        <h1 className="mt-4 text-4xl text-ink sm:text-5xl">Your cart is empty</h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted">
          Nothing here yet. Start with a cleanser, a serum and an SPF — the three steps that do the
          most work.
        </p>
        <Link to="/shop" className="btn-primary mt-9">
          Shop skincare
        </Link>
      </div>
    );
  }

  return (
    <div className="shell py-12 lg:py-16">
      <header>
        <p className="eyebrow">Cart</p>
        <h1 className="mt-4 text-4xl text-ink sm:text-5xl">Your cart</h1>
        <p className="mt-4 text-[14px] text-ink-muted">
          {cart.count} {cart.count === 1 ? 'item' : 'items'}
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Items */}
        <div className="lg:col-span-7">
          <ul className="divide-y divide-sand-200 border-y border-sand-200">
            {cart.items.map((item) => (
              <li key={item.slug} className="flex gap-4 py-6 sm:gap-6">
                <Link to={`/shop/${item.slug}`} className="shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    wrapperClassName="h-28 w-24 sm:h-36 sm:w-32"
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/shop/${item.slug}`}
                        className="font-display text-xl leading-tight text-ink hover:underline underline-offset-4"
                      >
                        {item.name.replace('LUMÉRA ', '')}
                      </Link>
                      <p className="mt-1.5 text-[12px] text-ink-faint">{item.size}</p>
                      <p className="mt-1 text-[13px] text-ink-muted">{formatMoney(item.priceCents)} each</p>
                    </div>
                    <span className="shrink-0 text-[15px] tabular-nums text-ink">
                      {formatMoney(item.priceCents * item.quantity)}
                    </span>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-4 pt-4">
                    <QuantityStepper value={item.quantity} onChange={(q) => cart.setQuantity(item.slug, q)} />
                    <button
                      type="button"
                      onClick={() => cart.remove(item.slug)}
                      className="text-[12px] uppercase tracking-wide2 text-ink-faint underline-offset-4 hover:text-ink hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <Link to="/shop" className="text-[12.5px] uppercase tracking-wide2 text-ink link-underline">
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={cart.clear}
              className="text-[12px] uppercase tracking-wide2 text-ink-faint hover:text-ink"
            >
              Clear cart
            </button>
          </div>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-5">
          <div className="border border-sand-200 bg-sand-100 p-6 lg:sticky lg:top-28 lg:p-8">
            <h2 className="text-[12px] uppercase tracking-luxe text-ink">Order summary</h2>

            {/* Discount */}
            <form onSubmit={applyCode} className="mt-6">
              <label htmlFor="discount" className="label">
                Discount code
              </label>
              <div className="flex gap-2.5">
                <input
                  id="discount"
                  type="text"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value);
                    setCodeError('');
                  }}
                  placeholder="Enter code"
                  className="field flex-1 uppercase"
                  autoComplete="off"
                />
                <button type="submit" disabled={applying} className="btn-quiet shrink-0 px-5">
                  {applying ? <Spinner /> : 'Apply'}
                </button>
              </div>
              {codeError && (
                <p className="mt-2 text-[12.5px] text-red-700" role="alert">
                  {codeError}
                </p>
              )}
              {cart.discountCode && !codeError && (
                <p className="mt-2 flex items-center gap-2 text-[12.5px] text-emerald-800">
                  Code {cart.discountCode.toUpperCase()} applied.
                  <button
                    type="button"
                    onClick={() => {
                      cart.setDiscountCode(null);
                      setCodeInput('');
                    }}
                    className="underline underline-offset-2"
                  >
                    Remove
                  </button>
                </p>
              )}
            </form>

            <dl className="mt-7 space-y-3 border-t border-sand-300 pt-6 text-[14.5px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums text-ink">
                  {formatMoney(quote?.subtotalCents ?? cart.subtotalCents)}
                </dd>
              </div>

              {quote && quote.discountCents > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <dt>Discount</dt>
                  <dd className="tabular-nums">−{formatMoney(quote.discountCents)}</dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-ink-muted">Estimated shipping</dt>
                <dd className="tabular-nums text-ink">
                  {quote === null ? '—' : quote.shippingCents === 0 ? 'Free' : formatMoney(quote.shippingCents)}
                </dd>
              </div>

              {quote && quote.taxCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Tax</dt>
                  <dd className="tabular-nums text-ink">{formatMoney(quote.taxCents)}</dd>
                </div>
              )}

              <div className="flex justify-between border-t border-sand-300 pt-4 text-[17px]">
                <dt className="text-ink">Total</dt>
                <dd className="tabular-nums text-ink">
                  {quote ? formatMoney(quote.totalCents) : <Spinner className="text-ink-muted" />}
                </dd>
              </div>
            </dl>

            <Link to="/checkout" className="btn-primary mt-7 w-full">
              Proceed to checkout
            </Link>

            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-faint">
              Taxes and final shipping are confirmed at checkout based on your delivery address.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
