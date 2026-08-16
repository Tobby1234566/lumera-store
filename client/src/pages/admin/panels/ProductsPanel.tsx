import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import type { Product } from '../../../types';
import { formatMoney } from '../../../lib/format';
import { Image, Notice, Spinner } from '../../../components/ui';

const CATEGORIES = ['cleanser', 'toner', 'serum', 'exfoliant', 'moisturizer', 'sunscreen', 'bundles'];

type Draft = {
  name: string;
  slug: string;
  category: string;
  tagline: string;
  shortDescription: string;
  description: string;
  price: string;
  compareAtPrice: string;
  size: string;
  inventory: string;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  sortOrder: string;
  images: string;
  benefits: string;
  ingredientsList: string;
  howToUse: string;
  skinTypes: string;
  seoTitle: string;
  seoDescription: string;
};

const EMPTY_DRAFT: Draft = {
  name: '', slug: '', category: 'serum', tagline: '', shortDescription: '', description: '',
  price: '', compareAtPrice: '', size: '', inventory: '0', isActive: true, isFeatured: false,
  isBestSeller: false, sortOrder: '0', images: '', benefits: '', ingredientsList: '',
  howToUse: '', skinTypes: '', seoTitle: '', seoDescription: '',
};

function toDraft(p: Product): Draft {
  return {
    name: p.name,
    slug: p.slug,
    category: p.category,
    tagline: p.tagline,
    shortDescription: p.shortDescription,
    description: p.description,
    price: (p.priceCents / 100).toFixed(2),
    compareAtPrice: p.compareAtPriceCents ? (p.compareAtPriceCents / 100).toFixed(2) : '',
    size: p.size,
    inventory: String(p.inventory),
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isBestSeller: p.isBestSeller,
    sortOrder: String(p.sortOrder),
    images: p.images.join('\n'),
    benefits: p.benefits.join('\n'),
    ingredientsList: p.ingredientsList,
    howToUse: p.howToUse,
    skinTypes: p.skinTypes.join(', '),
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
  };
}

function toPayload(d: Draft) {
  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  return {
    name: d.name,
    slug: d.slug || undefined,
    category: d.category,
    tagline: d.tagline,
    shortDescription: d.shortDescription,
    description: d.description,
    priceCents: Math.round(parseFloat(d.price || '0') * 100),
    compareAtPriceCents: d.compareAtPrice ? Math.round(parseFloat(d.compareAtPrice) * 100) : null,
    size: d.size,
    inventory: parseInt(d.inventory || '0', 10),
    isActive: d.isActive,
    isFeatured: d.isFeatured,
    isBestSeller: d.isBestSeller,
    sortOrder: parseInt(d.sortOrder || '0', 10),
    images: lines(d.images),
    benefits: lines(d.benefits),
    ingredientsList: d.ingredientsList,
    howToUse: d.howToUse,
    skinTypes: d.skinTypes.split(',').map((s) => s.trim()).filter(Boolean),
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
  };
}

export function ProductsPanel() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    api.admin
      .products()
      .then((r: any) => setProducts(r.products))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load products.'));
  };

  useEffect(load, []);

  const save = async () => {
    if (!editing) return;
    setError('');
    try {
      const payload = toPayload(editing.draft);
      if (editing.id) await api.admin.updateProduct(editing.id, payload);
      else await api.admin.createProduct(payload);
      setNotice(editing.id ? 'Product updated.' : 'Product created.');
      setEditing(null);
      load();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.');
    }
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`Delete “${product.name}”? Past orders keep their own copy of this product, so order history is unaffected.`)) return;
    try {
      await api.admin.deleteProduct(product.id);
      setNotice('Product deleted.');
      load();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the product.');
    }
  };

  const quickUpdate = async (product: Product, patch: Record<string, unknown>) => {
    try {
      const r = await api.admin.updateProduct(product.id, patch);
      setProducts((cur) => cur?.map((p) => (p.id === product.id ? r.product : p)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the product.');
    }
  };

  if (products === null && !error) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6 text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">{products?.length ?? 0} products</p>
        <button
          type="button"
          onClick={() => setEditing({ id: null, draft: { ...EMPTY_DRAFT } })}
          className="btn-primary px-6"
        >
          Add product
        </button>
      </div>

      <div className="overflow-x-auto border border-sand-300 bg-sand-50">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead>
            <tr className="border-b border-sand-300 bg-sand-100 text-left text-[10.5px] uppercase tracking-wide2 text-ink-faint">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Flags</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {products?.map((product) => (
              <tr key={product.id} className="hover:bg-sand-100/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={product.images[0]}
                      alt=""
                      wrapperClassName="h-12 w-12 shrink-0"
                      className="h-full w-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-ink">{product.name.replace('LUMÉRA ', '')}</p>
                      <p className="text-[11px] text-ink-faint">/shop/{product.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-ink-soft">{product.category}</td>
                <td className="px-4 py-3">
                  <span className="text-ink">{formatMoney(product.priceCents)}</span>
                  {product.compareAtPriceCents && (
                    <span className="block text-[11px] text-ink-faint line-through">
                      {formatMoney(product.compareAtPriceCents)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    defaultValue={product.inventory}
                    onBlur={(e) => {
                      const next = parseInt(e.target.value, 10);
                      if (!Number.isNaN(next) && next !== product.inventory) {
                        quickUpdate(product, { inventory: next });
                      }
                    }}
                    aria-label={`Inventory for ${product.name}`}
                    className={`w-20 border px-2 py-1.5 text-[12.5px] tabular-nums ${
                      product.inventory < 20 ? 'border-amber-400 bg-amber-50' : 'border-sand-300 bg-white'
                    }`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 text-[11px]">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={product.isActive}
                        onChange={(e) => quickUpdate(product, { isActive: e.target.checked })}
                        className="h-3.5 w-3.5 accent-ink"
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={product.isFeatured}
                        onChange={(e) => quickUpdate(product, { isFeatured: e.target.checked })}
                        className="h-3.5 w-3.5 accent-ink"
                      />
                      Featured
                    </label>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing({ id: product.id, draft: toDraft(product) })}
                      className="text-[12px] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(product)}
                      className="text-[12px] text-red-700 underline-offset-4 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductEditor
          draft={editing.draft}
          isNew={!editing.id}
          onChange={(draft) => setEditing({ ...editing, draft })}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function ProductEditor({
  draft,
  isNew,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Draft;
  isNew: boolean;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onCancel} className="absolute inset-0 bg-ink/30" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-sand-50 shadow-2xl animate-slide-in-right">
        <header className="flex shrink-0 items-center justify-between border-b border-sand-300 px-6 py-4">
          <h2 className="font-display text-xl text-ink">{isNew ? 'Add product' : 'Edit product'}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center text-2xl font-light text-ink-soft"
          >
            ×
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Name" value={draft.name} onChange={(v) => set('name', v)} required />
            <Text
              label="URL slug"
              value={draft.slug}
              onChange={(v) => set('slug', v)}
              hint="Leave blank to generate from the name."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Category</label>
              <select
                value={draft.category}
                onChange={(e) => set('category', e.target.value)}
                className="field capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Text label="Price" value={draft.price} onChange={(v) => set('price', v)} required hint="e.g. 38.00" />
            <Text
              label="Compare-at price"
              value={draft.compareAtPrice}
              onChange={(v) => set('compareAtPrice', v)}
              hint="Optional — shows a sale badge."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Text label="Size" value={draft.size} onChange={(v) => set('size', v)} hint="e.g. 30 ml / 1.0 fl oz" />
            <Text label="Inventory" value={draft.inventory} onChange={(v) => set('inventory', v)} />
            <Text label="Sort order" value={draft.sortOrder} onChange={(v) => set('sortOrder', v)} />
          </div>

          <Text label="Tagline" value={draft.tagline} onChange={(v) => set('tagline', v)} />
          <Area
            label="Short description"
            value={draft.shortDescription}
            onChange={(v) => set('shortDescription', v)}
            rows={2}
            hint="Shown on product cards and in search results."
          />
          <Area label="Full description" value={draft.description} onChange={(v) => set('description', v)} rows={5} />

          <Area
            label="Image paths"
            value={draft.images}
            onChange={(v) => set('images', v)}
            rows={3}
            hint="One per line, e.g. /images/glow-serum.jpg. Place files in client/public/images/, or paste a full CDN URL. TODO: wire up direct file upload to your storage provider (S3, Cloudinary…)."
          />

          <Area
            label="Benefits"
            value={draft.benefits}
            onChange={(v) => set('benefits', v)}
            rows={4}
            hint="One per line. Use cosmetic language — “helps improve the appearance of…”, never medical claims."
          />
          <Area label="How to use" value={draft.howToUse} onChange={(v) => set('howToUse', v)} rows={3} />
          <Area label="Full ingredients (INCI)" value={draft.ingredientsList} onChange={(v) => set('ingredientsList', v)} rows={3} />
          <Text
            label="Skin types"
            value={draft.skinTypes}
            onChange={(v) => set('skinTypes', v)}
            hint="Comma separated, e.g. Dry, Normal, Combination"
          />

          <div className="border-t border-sand-300 pt-5">
            <p className="eyebrow mb-4">SEO</p>
            <div className="space-y-4">
              <Text label="SEO title" value={draft.seoTitle} onChange={(v) => set('seoTitle', v)} />
              <Area label="Meta description" value={draft.seoDescription} onChange={(v) => set('seoDescription', v)} rows={2} />
            </div>
          </div>

          <div className="flex flex-wrap gap-5 border-t border-sand-300 pt-5">
            {([
              ['isActive', 'Active'],
              ['isFeatured', 'Featured'],
              ['isBestSeller', 'Best seller'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[13px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="h-4 w-4 accent-ink"
                />
                {label}
              </label>
            ))}
          </div>
        </form>

        <footer className="flex shrink-0 gap-3 border-t border-sand-300 px-6 py-4">
          <button type="button" onClick={onSave} className="btn-primary flex-1">
            {isNew ? 'Create product' : 'Save changes'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary px-6">
            Cancel
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Text({
  label, value, onChange, required, hint,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; hint?: string }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-clay-500">*</span>}
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="field" />
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  );
}

function Area({
  label, value, onChange, rows = 3, hint,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="field resize-y" />
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  );
}
