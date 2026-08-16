import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Product } from '../types';
import { useSeo } from '../lib/seo';
import { CATEGORY_LABELS, SORT_OPTIONS } from '../lib/format';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { Reveal } from '../components/ui';

const CATEGORIES = ['all', 'cleanser', 'toner', 'serum', 'exfoliant', 'moisturizer', 'sunscreen', 'bundles'];

export function Shop() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');

  const category = params.get('category') ?? 'all';
  const sort = params.get('sort') ?? 'featured';
  const search = params.get('search') ?? '';

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  useSeo({
    title:
      category !== 'all'
        ? `${CATEGORY_LABELS[category]} — Shop | LUMÉRA`
        : 'Shop All Skincare | LUMÉRA',
    description:
      'Browse the full LUMÉRA range — fragrance-free cleansers, toners, serums, exfoliants, moisturisers, SPF and value bundles.',
  });

  useEffect(() => {
    let active = true;
    setProducts(null);
    setError('');
    api
      .products({ category, sort, search })
      .then((r) => active && setProducts(r.products))
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load products.');
        setProducts([]);
      });
    return () => {
      active = false;
    };
  }, [category, sort, search]);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === 'all' || (key === 'sort' && value === 'featured')) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const heading = useMemo(() => {
    if (search) return `Results for “${search}”`;
    if (category !== 'all') return CATEGORY_LABELS[category];
    return 'All products';
  }, [search, category]);

  return (
    <div className="shell py-12 lg:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow">Shop</p>
        <h1 className="mt-4 text-4xl leading-tight text-ink sm:text-5xl">{heading}</h1>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-muted">
          Fragrance-free formulas, made to layer. Every product is designed to work on its own or as
          part of a complete routine.
        </p>
      </header>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ search: searchInput.trim() || null });
        }}
        className="mt-10 flex gap-2.5"
        role="search"
      >
        <label htmlFor="shop-search" className="sr-only">
          Search products
        </label>
        <input
          id="shop-search"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products…"
          className="field flex-1 sm:max-w-md"
        />
        <button type="submit" className="btn-primary shrink-0 px-6">
          Search
        </button>
      </form>

      {/* Filters + sort */}
      <div className="mt-8 flex flex-col gap-5 border-y border-sand-200 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-5 overflow-x-auto px-5 no-scrollbar lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="flex gap-2 lg:flex-wrap" role="group" aria-label="Filter by category">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => update({ category: c })}
                  aria-pressed={active}
                  className={`shrink-0 whitespace-nowrap border px-4 py-2.5 text-[12px] uppercase tracking-wide2 transition-all duration-200 ${
                    active
                      ? 'border-ink bg-ink text-sand-50'
                      : 'border-sand-300 text-ink-muted hover:border-ink hover:text-ink'
                  }`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <label htmlFor="sort" className="text-[11px] uppercase tracking-wide2 text-ink-faint">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="field min-h-[44px] w-full py-2 pr-8 text-[13px] lg:w-auto"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {products !== null && (
        <p className="mt-6 text-[12.5px] text-ink-faint" aria-live="polite">
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </p>
      )}

      {error && (
        <p className="mt-8 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {products !== null && products.length === 0 && !error ? (
        <div className="py-24 text-center">
          <p className="font-display text-2xl text-ink">Nothing matches that search</p>
          <p className="mt-3 text-[14.5px] text-ink-muted">
            Try a different term, or browse the full range.
          </p>
          <button
            type="button"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
            className="btn-secondary mt-8"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
          {products === null
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((product, i) => (
                <Reveal key={product.id} delay={Math.min(i, 7) * 60}>
                  <ProductCard product={product} eager={i < 4} />
                </Reveal>
              ))}
        </div>
      )}
    </div>
  );
}
