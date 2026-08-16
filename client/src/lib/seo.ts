import { useEffect } from 'react';

/**
 * Lightweight SEO head manager.
 *
 * Rather than pulling in react-helmet (extra bundle weight for a small job),
 * this directly manages the handful of tags we care about: title, description,
 * canonical, Open Graph and JSON-LD structured data.
 *
 * NOTE ON SSR: this is a client-rendered SPA, so metadata is applied after
 * hydration. Modern Googlebot executes JavaScript and indexes this correctly.
 * If you later need guaranteed metadata in the raw HTML response (for social
 * scrapers that do not run JS), migrate to Next.js/Remix or add prerendering —
 * the API and data layer are already framework-independent.
 */

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export type SeoOptions = {
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  /** JSON-LD structured data object. */
  structuredData?: Record<string, unknown> | null;
  noIndex?: boolean;
};

const STRUCTURED_DATA_ID = 'lumera-structured-data';

export function useSeo({
  title,
  description,
  image = '/images/hero.jpg',
  type = 'website',
  structuredData = null,
  noIndex = false,
}: SeoOptions): void {
  useEffect(() => {
    const fullTitle = title.includes('LUMÉRA') ? title : `${title} | LUMÉRA`;
    document.title = fullTitle;

    const url = window.location.origin + window.location.pathname;
    const absoluteImage = image.startsWith('http') ? image : window.location.origin + image;

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: absoluteImage });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'LUMÉRA' });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: absoluteImage });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noIndex ? 'noindex, nofollow' : 'index, follow',
    });

    upsertLink('canonical', url);

    // Structured data (JSON-LD).
    document.getElementById(STRUCTURED_DATA_ID)?.remove();
    if (structuredData) {
      const script = document.createElement('script');
      script.id = STRUCTURED_DATA_ID;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [title, description, image, type, noIndex, JSON.stringify(structuredData)]);
}

/** Product JSON-LD (schema.org/Product) for rich results. */
export function productStructuredData(p: {
  name: string;
  description: string;
  images: string[];
  slug: string;
  priceCents: number;
  currency: string;
  inventory: number;
  rating: number;
  reviewCount: number;
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.images.map((i) => (i.startsWith('http') ? i : origin + i)),
    brand: { '@type': 'Brand', name: 'LUMÉRA' },
    sku: p.slug,
    offers: {
      '@type': 'Offer',
      url: `${origin}/shop/${p.slug}`,
      priceCurrency: p.currency,
      price: (p.priceCents / 100).toFixed(2),
      availability: p.inventory > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    // Only emit aggregateRating when genuine published reviews exist.
    ...(p.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.rating,
            reviewCount: p.reviewCount,
          },
        }
      : {}),
  };
}
