import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../store/cart';

const NAV = [
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const cart = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close overlays on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop');
    setSearchOpen(false);
    setTerm('');
  };

  return (
    <>
      {/* Announcement bar — factual, no fake urgency. */}
      <div className="bg-ink text-sand-50">
        <p className="shell py-2.5 text-center text-[11px] tracking-wide2 sm:text-[12px]">
          Complimentary shipping on orders over $60
        </p>
      </div>

      <header
        className={`sticky top-0 z-40 border-b transition-all duration-300 ${
          scrolled ? 'border-sand-200 bg-sand-50/95 backdrop-blur-md' : 'border-transparent bg-sand-50'
        }`}
      >
        <div className="shell flex h-16 items-center justify-between gap-4 lg:h-20">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="-ml-2 flex h-11 w-11 items-center justify-center lg:hidden"
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block h-px w-5 bg-ink" />
              <span className="block h-px w-5 bg-ink" />
              <span className="block h-px w-5 bg-ink" />
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-[12px] uppercase tracking-wide2 transition-colors link-underline ${
                    isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Link
            to="/"
            className="absolute left-1/2 flex min-h-[44px] -translate-x-1/2 items-center font-display text-[26px] tracking-[0.22em] text-ink lg:text-[30px]"
            aria-label="LUMÉRA home"
          >
            LUMÉRA
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-label="Search products"
              aria-expanded={searchOpen}
              className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.3" />
                <path d="M13.6 13.6L17.5 17.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={cart.openCart}
              aria-label={`Open cart, ${cart.count} item${cart.count === 1 ? '' : 's'}`}
              className="relative -mr-2 flex h-11 w-11 items-center justify-center text-ink-soft transition-colors hover:text-ink"
            >
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M3.6 6.2h12.8l-1 10.2a1.4 1.4 0 01-1.4 1.3H6a1.4 1.4 0 01-1.4-1.3L3.6 6.2z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path d="M7.2 8V5.4a2.8 2.8 0 015.6 0V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {cart.count > 0 && (
                <span className="absolute right-0.5 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-medium text-sand-50 tabular-nums">
                  {cart.count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search drawer */}
        <div
          className={`overflow-hidden border-sand-200 transition-all duration-300 ease-luxe ${
            searchOpen ? 'max-h-24 border-t' : 'max-h-0'
          }`}
        >
          <form onSubmit={submitSearch} className="shell flex items-center gap-3 py-4" role="search">
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search cleansers, serums, SPF…"
              aria-label="Search products"
              className="field flex-1"
              autoFocus={searchOpen}
            />
            <button type="submit" className="btn-primary shrink-0 px-6">
              Search
            </button>
          </form>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!menuOpen}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-ink/25 backdrop-blur-[2px] transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <nav
          aria-label="Mobile"
          className={`absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-sand-50 transition-transform duration-[350ms] ease-luxe ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-sand-200 px-5">
            <span className="font-display text-xl tracking-[0.2em]">LUMÉRA</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="-mr-2 flex h-11 w-11 items-center justify-center text-2xl font-light text-ink-soft"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="block py-3.5 font-display text-2xl text-ink"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="eyebrow mt-8 mb-3">Shop by category</p>
            <ul className="space-y-0.5">
              {['cleanser', 'toner', 'serum', 'exfoliant', 'moisturizer', 'sunscreen', 'bundles'].map((c) => (
                <li key={c}>
                  <Link
                    to={`/shop?category=${c}`}
                    className="block py-2.5 text-[15px] capitalize text-ink-soft"
                    onClick={() => setMenuOpen(false)}
                  >
                    {c === 'bundles' ? 'Bundles' : c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-sand-200 p-5">
            <Link to="/shop" className="btn-primary w-full" onClick={() => setMenuOpen(false)}>
              Shop skincare
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
