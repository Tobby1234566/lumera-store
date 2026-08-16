import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { formatMoney, CATEGORY_LABELS } from '../lib/format';
import { useCart } from '../store/cart';
import { Image, Stars } from './ui';

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const cart = useCart();
  const onSale = product.compareAtPriceCents !== null && product.compareAtPriceCents > product.priceCents;
  const soldOut = product.inventory <= 0;

  return (
    <article className="group flex flex-col">
      <Link
        to={`/shop/${product.slug}`}
        className="block focus-visible:outline-offset-4"
        aria-label={`View ${product.name}`}
      >
        <div className="relative overflow-hidden bg-sand-100">
          <Image
            src={product.images[0]}
            alt={`${product.name} — ${product.size}`}
            eager={eager}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            wrapperClassName="aspect-square"
            className="h-full w-full object-cover card-hover-media"
          />

          <div className="absolute left-0 top-0 flex flex-col items-start gap-1.5 p-3">
            {onSale && !soldOut && (
              <span className="bg-ink px-2.5 py-1 text-[10px] uppercase tracking-luxe text-sand-50">Sale</span>
            )}
            {product.isBestSeller && !onSale && !soldOut && (
              <span className="bg-white/90 px-2.5 py-1 text-[10px] uppercase tracking-luxe text-ink backdrop-blur">
                Best seller
              </span>
            )}
            {soldOut && (
              <span className="bg-ink-muted px-2.5 py-1 text-[10px] uppercase tracking-luxe text-white">
                Sold out
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <p className="text-[10px] uppercase tracking-luxe text-ink-faint">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </p>

        <h3 className="mt-1.5 font-display text-[19px] leading-snug text-ink">
          <Link to={`/shop/${product.slug}`} className="link-underline inline-block py-2 lg:py-0">
            {product.name.replace('LUMÉRA ', '')}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-muted">
          {product.tagline || product.shortDescription}
        </p>

        {product.reviewCount > 0 && (
          <div className="mt-2.5 flex items-center gap-2">
            <Stars rating={product.rating} size={12} />
            <span className="text-[11px] text-ink-faint">({product.reviewCount})</span>
          </div>
        )}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[15px] text-ink">{formatMoney(product.priceCents)}</span>
          {onSale && (
            <span className="text-[13px] text-ink-faint line-through">
              {formatMoney(product.compareAtPriceCents!)}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={soldOut}
          onClick={() => cart.add(product)}
          className="btn-secondary mt-4 w-full"
        >
          {soldOut ? 'Sold out' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="aspect-square skeleton" />
      <div className="mt-4 h-2.5 w-16 skeleton" />
      <div className="mt-3 h-4 w-3/4 skeleton" />
      <div className="mt-2.5 h-3 w-full skeleton" />
      <div className="mt-3 h-3.5 w-14 skeleton" />
      <div className="mt-4 h-12 w-full skeleton" />
    </div>
  );
}
