import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Product } from '../types';
import { useSeo } from '../lib/seo';
import { Reveal, SectionHeading, Image, Stars } from '../components/ui';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { NewsletterForm } from '../components/NewsletterForm';

const CATEGORIES = [
  { slug: 'cleanser', label: 'Cleansers', note: 'Start clean' },
  { slug: 'toner', label: 'Toners', note: 'Prep and hydrate' },
  { slug: 'serum', label: 'Serums', note: 'Target and treat' },
  { slug: 'moisturizer', label: 'Moisturizers', note: 'Seal it in' },
  { slug: 'exfoliant', label: 'Exfoliants', note: 'Smooth weekly' },
  { slug: 'sunscreen', label: 'Sunscreen', note: 'Every morning' },
];

const PILLARS = [
  {
    title: 'Considered formulas',
    body: 'Short ingredient lists built around well-studied actives at sensible concentrations. Nothing added for the sake of a label claim.',
  },
  {
    title: 'Honest pricing',
    body: 'We keep packaging restrained and sell directly, so the money goes into what is inside the bottle rather than the box it arrives in.',
  },
  {
    title: 'Fragrance-free',
    body: 'Every LUMÉRA formula is made without added fragrance or essential oils, so it suits sensitive skin and layers cleanly.',
  },
  {
    title: 'Cruelty-free',
    body: 'We do not test on animals, and we do not work with suppliers who do. Our full range is formulated without animal-derived ingredients.',
  },
];

const ROUTINE = [
  {
    step: '01',
    time: 'Morning',
    title: 'Cleanse',
    body: 'A gentle wash to reset the skin after sleep, without stripping the moisture your barrier needs.',
    slug: 'hydrating-cleanser',
  },
  {
    step: '02',
    time: 'Morning',
    title: 'Treat',
    body: 'Vitamin C and niacinamide on clean, dry skin to help improve the look of dullness and uneven tone.',
    slug: 'glow-serum',
  },
  {
    step: '03',
    time: 'Morning & night',
    title: 'Moisturise',
    body: 'A ceramide cream to help hydrate and keep the skin barrier feeling comfortable through the day.',
    slug: 'barrier-moisturizer',
  },
  {
    step: '04',
    time: 'Every morning',
    title: 'Protect',
    body: 'Broad spectrum SPF 50, applied generously. The single most valuable step in any routine.',
    slug: 'daily-sunscreen',
  },
];

export function Home() {
  const [featured, setFeatured] = useState<Product[] | null>(null);
  const [bestSellers, setBestSellers] = useState<Product[] | null>(null);

  useSeo({
    title: 'LUMÉRA — Simple skincare. Beautifully made.',
    description:
      'Simple skincare designed to help you build a routine that feels as good as it looks. Fragrance-free cleansers, serums, moisturisers and SPF at honest prices.',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'LUMÉRA',
      description: 'Simple skincare. Beautifully made.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
      slogan: 'Your skin. Your glow.',
    },
  });

  useEffect(() => {
    let active = true;
    api
      .products({ featured: true, limit: 4 })
      .then((r) => active && setFeatured(r.products))
      .catch(() => active && setFeatured([]));
    api
      .products({ bestSellers: true, sort: 'best-selling', limit: 4 })
      .then((r) => active && setBestSellers(r.products))
      .catch(() => active && setBestSellers([]));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          <div className="order-2 flex items-center bg-sand-50 px-5 py-16 sm:px-8 lg:order-1 lg:px-16 lg:py-28 xl:pl-24">
            <div className="mx-auto w-full max-w-lg animate-fade-up">
              <p className="eyebrow">Skincare, simplified</p>
              <h1 className="mt-6 text-[2.75rem] leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
                Your skin.
                <br />
                Your glow.
              </h1>
              <p className="mt-7 max-w-md text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">
                Simple skincare designed to help you build a routine that feels as good as it looks.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link to="/shop" className="btn-primary sm:px-9">
                  Shop skincare
                </Link>
                <Link to="/shop?sort=best-selling" className="btn-secondary sm:px-9">
                  Explore best sellers
                </Link>
              </div>

              <dl className="mt-14 grid grid-cols-3 gap-4 border-t border-sand-200 pt-8">
                {[
                  ['Fragrance', 'Free'],
                  ['Cruelty', 'Free'],
                  ['Shipping', 'Over $60'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] uppercase tracking-luxe text-ink-faint">{label}</dt>
                    <dd className="mt-1.5 font-display text-lg text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Image
              src="/images/hero.jpg"
              alt="Two frosted glass LUMÉRA skincare bottles resting on a travertine ledge in soft morning light"
              eager
              sizes="(max-width: 1024px) 100vw, 50vw"
              wrapperClassName="h-[52vh] min-h-[320px] w-full lg:h-full lg:min-h-[640px]"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Featured ──────────────────────────────────────────────────── */}
      <section className="shell py-20 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Featured"
            title="The essentials"
            intro="Four products that cover a complete routine. Start with one, or take the whole set."
          />
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {featured === null
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.map((product, i) => (
                <Reveal key={product.id} delay={i * 80}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────── */}
      <section className="border-y border-sand-200 bg-sand-100 py-20 lg:py-28">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Shop by step"
              title="Build your routine"
              intro="Every LUMÉRA product is designed to work on its own — and to layer cleanly with the rest."
            />
          </Reveal>

          <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
            {CATEGORIES.map((category, i) => (
              <Reveal key={category.slug} delay={i * 60}>
                <Link
                  to={`/shop?category=${category.slug}`}
                  className="group flex h-full flex-col justify-between border border-sand-300 bg-sand-50 p-5 transition-all duration-300 hover:border-ink hover:bg-white lg:p-6"
                >
                  <span className="font-display text-xl leading-tight text-ink lg:text-[1.35rem]">
                    {category.label}
                  </span>
                  <span className="mt-6 text-[11px] uppercase tracking-wide2 text-ink-faint transition-colors group-hover:text-ink-soft">
                    {category.note}
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Best sellers ──────────────────────────────────────────────── */}
      <section className="shell py-20 lg:py-28">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Loved most"
              title="Best sellers"
              intro="The products our customers reorder."
              align="left"
            />
            <Link
              to="/shop?sort=best-selling"
              className="shrink-0 text-[12px] uppercase tracking-wide2 text-ink link-underline"
            >
              View all
            </Link>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {bestSellers === null
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : bestSellers.map((product, i) => (
                <Reveal key={product.id} delay={i * 80}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
        </div>
      </section>

      {/* ── Why LUMÉRA ────────────────────────────────────────────────── */}
      <section className="bg-ink py-20 text-sand-50 lg:py-28">
        <div className="shell">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-luxe text-sand-400">Why LUMÉRA</p>
              <h2 className="mt-5 text-3xl leading-[1.15] sm:text-4xl lg:text-[2.75rem]">
                Luxury skincare without the intimidating price tag.
              </h2>
              <p className="mt-6 text-[15px] leading-relaxed text-sand-300 sm:text-base">
                We started LUMÉRA because good skincare had become either needlessly expensive or
                needlessly complicated. Ours is neither.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-8">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 90}>
                <div className="border-t border-sand-50/20 pt-6">
                  <h3 className="font-display text-xl text-sand-50">{pillar.title}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-sand-300">{pillar.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Routine guide ─────────────────────────────────────────────── */}
      <section className="shell py-20 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="The guide"
            title="A routine in four steps"
            intro="You do not need ten products. You need a few good ones, used consistently."
          />
        </Reveal>

        <ol className="mt-14 grid gap-px overflow-hidden border border-sand-200 bg-sand-200 sm:grid-cols-2 lg:grid-cols-4">
          {ROUTINE.map((item, i) => (
            <Reveal key={item.step} delay={i * 80} as="li">
              <div className="flex h-full flex-col bg-sand-50 p-7 lg:p-8">
                <span className="font-display text-3xl text-clay-500">{item.step}</span>
                <span className="mt-5 text-[10px] uppercase tracking-luxe text-ink-faint">{item.time}</span>
                <h3 className="mt-2 font-display text-2xl text-ink">{item.title}</h3>
                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-muted">{item.body}</p>
                <Link
                  to={`/shop/${item.slug}`}
                  className="mt-6 text-[11.5px] uppercase tracking-wide2 text-ink link-underline"
                >
                  Shop this step
                </Link>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ── Reviews ───────────────────────────────────────────────────── */}
      <ReviewsStrip />

      {/* ── Results / substantiation ──────────────────────────────────── */}
      <section className="shell py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <Image
              src="/images/glow-routine-bundle.jpg"
              alt="The four-product LUMÉRA Glow Routine Bundle arranged together"
              sizes="(max-width: 1024px) 100vw, 50vw"
              wrapperClassName="aspect-[4/3] w-full"
              className="h-full w-full object-cover"
            />
          </Reveal>

          <Reveal delay={100}>
            <div>
              <p className="eyebrow">On results</p>
              <h2 className="mt-5 text-3xl leading-[1.15] text-ink sm:text-4xl">
                We would rather be honest than dramatic.
              </h2>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-soft">
                <p>
                  You will not find before-and-after photographs on this site. We think they are easy
                  to stage and hard to verify, and we are not willing to imply a result we cannot
                  substantiate.
                </p>
                <p>
                  What we can tell you is what is in each formula, at what concentration, and what it
                  is designed to help with — so you can decide for yourself.
                </p>
              </div>

              <div className="mt-8 border-l-2 border-clay-300 pl-5">
                <p className="text-[13.5px] leading-relaxed text-ink-muted">
                  Skincare is cosmetic. It can help improve the appearance and feel of skin. It cannot
                  treat medical conditions — and anyone telling you otherwise is selling something.
                  For persistent concerns, please see a qualified professional.
                </p>
              </div>

              <Link to="/about" className="btn-secondary mt-9">
                Read our approach
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Social ────────────────────────────────────────────────────── */}
      <section className="border-t border-sand-200 bg-sand-100 py-20 lg:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading eyebrow="@lumeraskin" title="Follow along" intro="Routine notes, restocks and the occasional shelfie." />
          </Reveal>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            {[
              'hydrating-cleanser',
              'glow-serum',
              'barrier-moisturizer',
              'balancing-toner',
              'gentle-exfoliant',
              'daily-sunscreen',
            ].map((slug, i) => (
              <Reveal key={slug} delay={i * 50}>
                {/* TODO: connect to a real Instagram feed (Basic Display API or a
                    cached server-side fetch). These link to products for now. */}
                <Link to={`/shop/${slug}`} className="group block overflow-hidden">
                  <Image
                    src={`/images/${slug}.jpg`}
                    alt={`LUMÉRA ${slug.replace(/-/g, ' ')}`}
                    sizes="(max-width: 640px) 50vw, 16vw"
                    wrapperClassName="aspect-square"
                    className="h-full w-full object-cover card-hover-media"
                  />
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="mt-10 flex justify-center gap-4">
            <a href="#" className="btn-secondary">
              Instagram
            </a>
            <a href="#" className="btn-secondary">
              TikTok
            </a>
          </div>
        </div>
      </section>

      {/* ── Newsletter ────────────────────────────────────────────────── */}
      <section className="bg-ink py-20 text-sand-50 lg:py-24">
        <div className="shell">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <p className="text-[11px] uppercase tracking-luxe text-sand-400">Newsletter</p>
              <h2 className="mt-5 text-3xl sm:text-4xl">Join the LUMÉRA glow list.</h2>
              <p className="mt-5 text-[15px] leading-relaxed text-sand-300">
                Routine guides, ingredient explainers and first access to new releases. Roughly twice
                a month — never more.
              </p>
              <NewsletterForm source="homepage" variant="light" className="mt-8 text-left" />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ── Reviews strip ─────────────────────────────────────────────────────── */

function ReviewsStrip() {
  const [reviews, setReviews] = useState<
    { id: string; authorName: string; rating: number; body: string; isPlaceholder: boolean; product: string }[] | null
  >(null);

  useEffect(() => {
    let active = true;
    // Pull a few published reviews across best-selling products.
    Promise.all([api.product('glow-serum'), api.product('daily-sunscreen'), api.product('barrier-moisturizer')])
      .then((results) => {
        if (!active) return;
        const collected = results.flatMap((r) =>
          r.reviews.slice(0, 1).map((review: any) => ({
            id: review.id,
            authorName: review.authorName,
            rating: review.rating,
            body: review.body,
            isPlaceholder: review.isPlaceholder,
            product: r.product.name.replace('LUMÉRA ', ''),
          })),
        );
        setReviews(collected);
      })
      .catch(() => active && setReviews([]));
    return () => {
      active = false;
    };
  }, []);

  if (reviews !== null && reviews.length === 0) return null;

  const hasPlaceholders = reviews?.some((r) => r.isPlaceholder);

  return (
    <section className="border-y border-sand-200 bg-sand-100 py-20 lg:py-28">
      <div className="shell">
        <Reveal>
          <SectionHeading eyebrow="Reviews" title="What people say" />
        </Reveal>

        {hasPlaceholders && (
          <Reveal>
            <p className="mx-auto mt-6 max-w-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-[12.5px] leading-relaxed text-amber-900">
              <strong className="font-medium">Development notice:</strong> the reviews below are
              placeholder sample content used while building the site. They are not genuine customer
              reviews and are removed before launch.
            </p>
          </Reveal>
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {reviews === null
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-52 skeleton" />)
            : reviews.map((review, i) => (
                <Reveal key={review.id} delay={i * 90}>
                  <figure className="flex h-full flex-col border border-sand-300 bg-sand-50 p-7">
                    <Stars rating={review.rating} />
                    <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-ink-soft">
                      “{review.body}”
                    </blockquote>
                    <figcaption className="mt-6 border-t border-sand-200 pt-4">
                      <span className="block text-[13px] font-medium text-ink">{review.authorName}</span>
                      <span className="mt-0.5 block text-[11.5px] text-ink-faint">on {review.product}</span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
