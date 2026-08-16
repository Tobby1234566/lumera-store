import { useEffect, useRef, useState, type ReactNode } from 'react';

/* ── Scroll reveal ───────────────────────────────────────────────────────── */

/**
 * Reveals children with a subtle fade-up as they enter the viewport.
 * Uses IntersectionObserver (no animation library) and respects
 * prefers-reduced-motion via the global CSS override.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[900ms] ease-luxe ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/* ── Stars ───────────────────────────────────────────────────────────────── */

export function Stars({
  rating,
  size = 14,
  className = '',
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[2px] ${className}`}
      role="img"
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
            <defs>
              <linearGradient id={`star-${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#1C1917" />
                <stop offset={`${fill * 100}%`} stopColor="#DDD3C5" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.6l2.47 5.2 5.53.78-4 4.03.95 5.79L10 14.66 5.05 17.4l.95-5.79-4-4.03 5.53-.78z"
              fill={`url(#star-${i}-${Math.round(fill * 100)})`}
            />
          </svg>
        );
      })}
    </span>
  );
}

/* ── Lazy image with graceful fade-in ────────────────────────────────────── */

export function Image({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  eager = false,
  sizes,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  /** Set true only for above-the-fold hero imagery. */
  eager?: boolean;
  sizes?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={`bg-sand-200 flex items-center justify-center ${wrapperClassName}`}>
        <span className="font-display text-2xl text-ink-faint">LUMÉRA</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-sand-200 ${wrapperClassName}`}>
      {!loaded && <div className="absolute inset-0 skeleton" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        // @ts-expect-error fetchpriority is valid HTML, typing lags behind.
        fetchpriority={eager ? 'high' : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`${className} transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

/* ── Notice / banner ─────────────────────────────────────────────────────── */

export function Notice({
  tone = 'info',
  children,
  className = '',
}: {
  tone?: 'info' | 'warn' | 'success' | 'error';
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'bg-sand-100 border-sand-300 text-ink-soft',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900',
  } as const;
  return (
    <div className={`border px-4 py-3 text-sm leading-relaxed ${tones[tone]} ${className}`} role="status">
      {children}
    </div>
  );
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

/* ── Quantity stepper (48px touch targets) ───────────────────────────────── */

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  compact = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
}) {
  const size = compact ? 'h-10 w-10' : 'h-12 w-12';
  return (
    <div className="inline-flex items-stretch border border-sand-300 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={`${size} flex items-center justify-center text-lg text-ink-soft transition-colors hover:bg-sand-100 disabled:opacity-30`}
      >
        −
      </button>
      <span
        className={`${compact ? 'w-10' : 'w-12'} flex items-center justify-center text-sm font-medium tabular-nums`}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={`${size} flex items-center justify-center text-lg text-ink-soft transition-colors hover:bg-sand-100 disabled:opacity-30`}
      >
        +
      </button>
    </div>
  );
}

/* ── Accordion ───────────────────────────────────────────────────────────── */

export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-sand-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left min-h-[56px]"
      >
        <span className="text-[15px] font-medium text-ink">{title}</span>
        <span
          className={`shrink-0 text-xl font-light text-ink-muted transition-transform duration-300 ${
            open ? 'rotate-45' : ''
          }`}
          aria-hidden="true"
        >
          +
        </span>
      </button>
      <div
        className={`grid transition-all duration-500 ease-luxe ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-6 text-[15px] leading-relaxed text-ink-soft">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
  className = '',
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={`${align === 'center' ? 'text-center mx-auto max-w-2xl' : 'max-w-2xl'} ${className}`}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.15] text-ink">{title}</h2>
      {intro && <p className="mt-5 text-[15px] sm:text-base leading-relaxed text-ink-muted">{intro}</p>}
    </div>
  );
}
