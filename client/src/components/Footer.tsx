import { Link } from 'react-router-dom';
import { NewsletterForm } from './NewsletterForm';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { to: '/shop', label: 'All products' },
      { to: '/shop?category=cleanser', label: 'Cleansers' },
      { to: '/shop?category=serum', label: 'Serums' },
      { to: '/shop?category=moisturizer', label: 'Moisturizers' },
      { to: '/shop?category=sunscreen', label: 'Sunscreen' },
      { to: '/shop?category=bundles', label: 'Bundles' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
      { to: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/shipping-policy', label: 'Shipping' },
      { to: '/returns-policy', label: 'Returns' },
      { to: '/privacy-policy', label: 'Privacy' },
      { to: '/terms', label: 'Terms' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-sand-200 bg-sand-100">
      <div className="shell py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand + newsletter */}
          <div className="lg:col-span-5">
            <p className="font-display text-[28px] tracking-[0.22em] text-ink">LUMÉRA</p>
            <p className="mt-3 font-display text-lg italic text-ink-muted">
              Simple skincare. Beautifully made.
            </p>

            <div className="mt-8 max-w-sm">
              <p className="text-[13px] font-medium text-ink">Join the LUMÉRA glow list.</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                Routine guides and new releases. No noise, and you can leave any time.
              </p>
              <NewsletterForm source="footer" className="mt-4" />
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="eyebrow mb-4">{column.title}</h2>
                <ul className="-my-1 space-y-0.5 sm:space-y-1">
                  {column.links.map((link) => (
                    <li key={link.to + link.label}>
                      <Link
                        to={link.to}
                        className="inline-flex min-h-[40px] items-center text-[13.5px] text-ink-muted transition-colors hover:text-ink lg:min-h-0 lg:py-1"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-sand-300 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            {/* TODO: replace '#' with the brand's real social profile URLs. */}
            <a
              href="#"
              aria-label="LUMÉRA on Instagram"
              className="flex min-h-[44px] items-center gap-2 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
              </svg>
              Instagram
            </a>
            <a
              href="#"
              aria-label="LUMÉRA on TikTok"
              className="flex min-h-[44px] items-center gap-2 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14.5 3v10.6a3.1 3.1 0 11-2.6-3.06"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path d="M14.5 3.5c.5 2.3 2 3.8 4.5 4.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              TikTok
            </a>
          </div>

          <p className="text-[12px] text-ink-faint">
            © {new Date().getFullYear()} LUMÉRA. All rights reserved.
          </p>
        </div>

        <p className="mt-6 max-w-3xl text-[11.5px] leading-relaxed text-ink-faint">
          LUMÉRA products are cosmetics intended to improve the appearance and feel of skin. They are
          not intended to diagnose, treat, cure or prevent any disease or medical condition. If you
          have a skin concern, please speak to a qualified healthcare professional.
        </p>
      </div>
    </footer>
  );
}
