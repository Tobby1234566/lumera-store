import { Link } from 'react-router-dom';
import { useCart } from '../store/cart';
import { formatMoney } from '../lib/format';
import { Image, QuantityStepper } from './ui';

const FREE_SHIPPING_THRESHOLD = 6000;

export function CartDrawer() {
  const cart = useCart();
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cart.subtotalCents);
  const progress = Math.min(100, (cart.subtotalCents / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className={`fixed inset-0 z-50 ${cart.isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!cart.isOpen}>
      <div
        onClick={cart.closeCart}
        className={`absolute inset-0 bg-ink/25 backdrop-blur-[2px] transition-opacity duration-300 ${
          cart.isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-sand-50 shadow-2xl transition-transform duration-[350ms] ease-luxe ${
          cart.isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-sand-200 px-5">
          <h2 className="text-[12px] uppercase tracking-luxe text-ink">
            Cart {cart.count > 0 && <span className="text-ink-faint">({cart.count})</span>}
          </h2>
          <button
            type="button"
            onClick={cart.closeCart}
            aria-label="Close cart"
            className="-mr-2 flex h-11 w-11 items-center justify-center text-2xl font-light text-ink-soft hover:text-ink"
          >
            ×
          </button>
        </header>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <p className="font-display text-2xl text-ink">Your cart is empty</p>
            <p className="text-[14px] leading-relaxed text-ink-muted">
              Start with a cleanser, a serum and an SPF — the three steps that do the most.
            </p>
            <Link to="/shop" onClick={cart.closeCart} className="btn-primary mt-2">
              Shop skincare
            </Link>
          </div>
        ) : (
          <>
            {/* Free shipping progress — factual, based on a real threshold. */}
            <div className="shrink-0 border-b border-sand-200 px-5 py-4">
              <p className="text-[12.5px] text-ink-soft">
                {remaining > 0 ? (
                  <>
                    You are <strong className="font-medium">{formatMoney(remaining)}</strong> away from free shipping.
                  </>
                ) : (
                  <>Your order qualifies for complimentary shipping.</>
                )}
              </p>
              <div className="mt-2.5 h-[3px] w-full bg-sand-200">
                <div
                  className="h-full bg-ink transition-all duration-500 ease-luxe"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ul className="flex-1 divide-y divide-sand-200 overflow-y-auto px-5">
              {cart.items.map((item) => (
                <li key={item.slug} className="flex gap-4 py-5">
                  <Link to={`/shop/${item.slug}`} onClick={cart.closeCart} className="shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      wrapperClassName="h-24 w-20"
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/shop/${item.slug}`}
                          onClick={cart.closeCart}
                          className="block truncate font-display text-[17px] leading-tight text-ink"
                        >
                          {item.name.replace('LUMÉRA ', '')}
                        </Link>
                        <p className="mt-1 text-[11.5px] text-ink-faint">{item.size}</p>
                      </div>
                      <span className="shrink-0 text-[14px] tabular-nums text-ink">
                        {formatMoney(item.priceCents * item.quantity)}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <QuantityStepper
                        value={item.quantity}
                        onChange={(q) => cart.setQuantity(item.slug, q)}
                        compact
                      />
                      <button
                        type="button"
                        onClick={() => cart.remove(item.slug)}
                        className="text-[11.5px] uppercase tracking-wide2 text-ink-faint underline-offset-4 hover:text-ink hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="shrink-0 space-y-4 border-t border-sand-200 bg-sand-100 px-5 py-5">
              <div className="flex items-center justify-between text-[15px]">
                <span className="text-ink-soft">Subtotal</span>
                <span className="tabular-nums text-ink">{formatMoney(cart.subtotalCents)}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-ink-muted">
                Shipping, discounts and any applicable taxes are calculated at checkout.
              </p>
              <Link to="/checkout" onClick={cart.closeCart} className="btn-primary w-full">
                Checkout
              </Link>
              <Link to="/cart" onClick={cart.closeCart} className="btn-secondary w-full">
                View cart
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
