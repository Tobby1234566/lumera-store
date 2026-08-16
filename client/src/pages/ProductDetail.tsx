import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Product, Review } from '../types';
import { useSeo, productStructuredData } from '../lib/seo';
import { formatMoney, formatDate, CATEGORY_LABELS } from '../lib/format';
import { useCart } from '../store/cart';
import { track } from '../lib/analytics';
import { Accordion, Image, QuantityStepper, Reveal, Stars, Notice } from '../components/ui';
import { ProductCard } from '../components/ProductCard';

export function ProductDetail() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const cart = useCart();

  const [data, setData] = useState<{ product: Product; reviews: Review[]; related: Product[] } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setNotFound(false);
    setQuantity(1);
    setActiveImage(0);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    api
      .product(slug)
      .then((r) => {
        if (!active) return;
        setData(r);
        track('product_viewed', { slug: r.product.slug, priceCents: r.product.priceCents });
      })
      .catch(() => active && setNotFound(true));

    return () => {
      active = false;
    };
  }, [slug]);

  const product = data?.product;

  useSeo({
    title: product?.seoTitle ?? product?.name ?? 'Product',
    description:
      product?.seoDescription ?? product?.shortDescription ?? 'Simple skincare. Beautifully made.',
    image: product?.images[0],
    type: 'product',
    structuredData: product
      ? productStructuredData({
          name: product.name,
          description: product.shortDescription,
          images: product.images,
          slug: product.slug,
          priceCents: product.priceCents,
          currency: 'USD',
          inventory: product.inventory,
          rating: product.rating,
          reviewCount: product.reviewCount,
        })
      : null,
  });

  if (notFound) {
    return (
      <div className="shell py-32 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 text-4xl text-ink">We could not find that product</h1>
        <p className="mt-4 text-[15px] text-ink-muted">It may have been renamed or discontinued.</p>
        <Link to="/shop" className="btn-primary mt-9">
          Browse the shop
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="shell py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="aspect-square skeleton" />
          <div className="space-y-4">
            <div className="h-3 w-24 skeleton" />
            <div className="h-10 w-3/4 skeleton" />
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-5/6 skeleton" />
            <div className="h-12 w-32 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  const onSale = product.compareAtPriceCents !== null && product.compareAtPriceCents > product.priceCents;
  const soldOut = product.inventory <= 0;
  const placeholderReviews = data.reviews.filter((r) => r.isPlaceholder).length;

  const addToCart = () => {
    cart.add(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const buyNow = () => {
    cart.add(product, quantity);
    cart.closeCart();
    navigate('/checkout');
  };

  return (
    <div className="pb-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="shell pt-6">
        <ol className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-faint">
          <li>
            <Link to="/" className="hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/shop" className="hover:text-ink">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={`/shop?category=${product.category}`} className="hover:text-ink">
              {CATEGORY_LABELS[product.category]}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink-soft" aria-current="page">
            {product.name.replace('LUMÉRA ', '')}
          </li>
        </ol>
      </nav>

      <div className="shell mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        {/* Gallery */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Image
            src={product.images[activeImage]}
            alt={`${product.name} — ${product.size}`}
            eager
            sizes="(max-width: 1024px) 100vw, 50vw"
            wrapperClassName="aspect-square w-full bg-sand-100"
            className="h-full w-full object-cover"
          />

          {product.images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar">
              {product.images.map((image, i) => (
                <button
                  key={image + i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={activeImage === i}
                  className={`shrink-0 border transition-colors ${
                    activeImage === i ? 'border-ink' : 'border-sand-200 hover:border-sand-400'
                  }`}
                >
                  <Image
                    src={image}
                    alt=""
                    wrapperClassName="h-20 w-20"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="eyebrow">{CATEGORY_LABELS[product.category]}</p>
          <h1 className="mt-3 text-3xl leading-tight text-ink sm:text-4xl lg:text-[2.6rem]">
            {product.name}
          </h1>
          <p className="mt-3 font-display text-lg italic text-ink-muted">{product.tagline}</p>

          {product.reviewCount > 0 && (
            <a href="#reviews" className="mt-4 inline-flex items-center gap-2.5">
              <Stars rating={product.rating} size={15} />
              <span className="text-[12.5px] text-ink-muted underline-offset-4 hover:underline">
                {product.rating.toFixed(1)} · {product.reviewCount}{' '}
                {product.reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </a>
          )}

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-2xl text-ink">{formatMoney(product.priceCents)}</span>
            {onSale && (
              <>
                <span className="text-lg text-ink-faint line-through">
                  {formatMoney(product.compareAtPriceCents!)}
                </span>
                <span className="bg-ink px-2 py-1 text-[10px] uppercase tracking-luxe text-sand-50">
                  Save {formatMoney(product.compareAtPriceCents! - product.priceCents)}
                </span>
              </>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] text-ink-faint">{product.size}</p>

          <p className="mt-7 text-[15.5px] leading-relaxed text-ink-soft">{product.shortDescription}</p>

          {/* Stock — factual, not manufactured urgency. */}
          {!soldOut && product.inventory < 20 && (
            <p className="mt-5 text-[12.5px] text-ink-muted">
              {product.inventory} left in stock
            </p>
          )}

          {/* Purchase */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-[11px] uppercase tracking-wide2 text-ink-faint">Quantity</span>
              <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, Math.min(99, product.inventory))} />
            </div>

            <button type="button" onClick={addToCart} disabled={soldOut} className="btn-primary w-full">
              {soldOut ? 'Sold out' : added ? 'Added to cart ✓' : 'Add to cart'}
            </button>
            <button type="button" onClick={buyNow} disabled={soldOut} className="btn-secondary w-full">
              Buy now
            </button>
          </div>

          {/* Trust row */}
          <ul className="mt-8 grid grid-cols-2 gap-4 border-y border-sand-200 py-6 text-[12.5px] text-ink-muted sm:grid-cols-3">
            <li>Free shipping over $60</li>
            <li>30-day returns</li>
            <li>Fragrance-free</li>
          </ul>

          {/* Benefits */}
          {product.benefits.length > 0 && (
            <div className="mt-8">
              <h2 className="eyebrow mb-4">Benefits</h2>
              <ul className="space-y-2.5">
                {product.benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-soft">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-clay-500" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Accordions */}
          <div className="mt-10 border-t border-sand-200">
            <Accordion title="Description" defaultOpen>
              <p>{product.description}</p>
            </Accordion>

            {product.keyIngredients.length > 0 && (
              <Accordion title="Key ingredients">
                <dl className="space-y-4">
                  {product.keyIngredients.map((ingredient) => (
                    <div key={ingredient.name}>
                      <dt className="text-[14px] font-medium text-ink">{ingredient.name}</dt>
                      <dd className="mt-1 text-[14px] leading-relaxed text-ink-muted">{ingredient.role}</dd>
                    </div>
                  ))}
                </dl>
              </Accordion>
            )}

            <Accordion title="How to use">
              <p>{product.howToUse}</p>
            </Accordion>

            {product.skinTypes.length > 0 && (
              <Accordion title="Suitable for">
                <div className="flex flex-wrap gap-2">
                  {product.skinTypes.map((type) => (
                    <span key={type} className="border border-sand-300 px-3 py-1.5 text-[12.5px] text-ink-soft">
                      {type}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-ink-faint">
                  If you have sensitive or reactive skin, we recommend patch testing any new product
                  on a small area first.
                </p>
              </Accordion>
            )}

            <Accordion title="Full ingredients">
              <p className="text-[13.5px] leading-relaxed">{product.ingredientsList}</p>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
                Ingredient lists are reviewed at every production run and may be updated. Always
                check the packaging you receive.
              </p>
            </Accordion>

            <Accordion title="Shipping">
              <p>
                Orders are dispatched within 1–2 business days. Standard delivery is $6.95 and
                arrives in 3–7 business days; orders over $60 ship free. Express options are shown
                at checkout where available.
              </p>
              <Link to="/shipping-policy" className="mt-3 inline-block text-[13px] text-ink link-underline">
                Read the full shipping policy
              </Link>
            </Accordion>

            <Accordion title="Returns">
              <p>
                If a product is not right for you, return it within 30 days of delivery for a refund
                — opened or unopened. We only ask that you contact us first so we can help.
              </p>
              <Link to="/returns-policy" className="mt-3 inline-block text-[13px] text-ink link-underline">
                Read the full returns policy
              </Link>
            </Accordion>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="shell mt-24 scroll-mt-28">
        <div className="border-t border-sand-200 pt-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Reviews</p>
              <h2 className="mt-3 text-3xl text-ink">
                {product.reviewCount > 0
                  ? `${product.rating.toFixed(1)} out of 5`
                  : 'No reviews yet'}
              </h2>
              {product.reviewCount > 0 && (
                <div className="mt-3 flex items-center gap-2.5">
                  <Stars rating={product.rating} size={16} />
                  <span className="text-[13px] text-ink-muted">
                    Based on {product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {placeholderReviews > 0 && (
            <Notice tone="warn" className="mt-7">
              <strong className="font-medium">Development notice:</strong> {placeholderReviews} of the
              reviews shown are placeholder sample content created for testing. They are not genuine
              customer reviews and will be removed before this store goes live.
            </Notice>
          )}

          {data.reviews.length === 0 ? (
            <p className="mt-8 text-[14.5px] leading-relaxed text-ink-muted">
              This product has not been reviewed yet. Verified reviews from customers who have
              purchased it will appear here.
            </p>
          ) : (
            <ul className="mt-10 grid gap-6 lg:grid-cols-2">
              {data.reviews.map((review, i) => (
                <Reveal key={review.id} delay={Math.min(i, 5) * 60} as="li">
                  <article className="h-full border border-sand-200 bg-white p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Stars rating={review.rating} size={13} />
                        {review.title && (
                          <h3 className="mt-2.5 font-display text-lg text-ink">{review.title}</h3>
                        )}
                      </div>
                      {review.isPlaceholder && (
                        <span className="shrink-0 border border-amber-300 bg-amber-50 px-2 py-1 text-[9.5px] uppercase tracking-wide2 text-amber-800">
                          Sample
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">{review.body}</p>

                    <footer className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-sand-200 pt-4 text-[12px] text-ink-faint">
                      <span className="font-medium text-ink-muted">{review.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
                      {review.isVerifiedPurchase && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Verified purchase</span>
                        </>
                      )}
                    </footer>
                  </article>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Related */}
      {data.related.length > 0 && (
        <section className="shell mt-24">
          <div className="border-t border-sand-200 pt-14">
            <p className="eyebrow">You may also like</p>
            <h2 className="mt-3 text-3xl text-ink">Pairs well with</h2>

            <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
              {data.related.map((related, i) => (
                <Reveal key={related.id} delay={i * 70}>
                  <ProductCard product={related} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
