import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '../types';
import { track } from '../lib/analytics';

/**
 * Cart state.
 *
 * Persisted to localStorage so it survives refreshes and browser restarts.
 * Only the slug + quantity + a lightweight display snapshot are stored —
 * authoritative prices are always recalculated server-side at checkout, so a
 * tampered localStorage cannot change what a customer is charged.
 */

export type CartItem = {
  slug: string;
  quantity: number;
  // Display snapshot (revalidated by the server before payment).
  name: string;
  priceCents: number;
  image: string | null;
  size: string;
};

const STORAGE_KEY = 'lumera.cart.v1';

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  discountCode: string | null;
  add: (product: Product, quantity?: number) => void;
  remove: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  setDiscountCode: (code: string | null) => void;
  /** Payload shape the checkout API expects. */
  toApiItems: () => { slug: string; quantity: number }[];
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): { items: CartItem[]; discountCode: string | null } {
  if (typeof window === 'undefined') return { items: [], discountCode: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], discountCode: null };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items)
      ? parsed.items.filter(
          (i: unknown): i is CartItem =>
            !!i &&
            typeof (i as CartItem).slug === 'string' &&
            Number.isFinite((i as CartItem).quantity) &&
            (i as CartItem).quantity > 0,
        )
      : [];
    return { items, discountCode: typeof parsed?.discountCode === 'string' ? parsed.discountCode : null };
  } catch {
    return { items: [], discountCode: null };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const initial = readStorage();
  const [items, setItems] = useState<CartItem[]>(initial.items);
  const [discountCode, setDiscountCode] = useState<string | null>(initial.discountCode);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, discountCode }));
    } catch {
      // Storage can be unavailable (private mode / quota). The cart still works
      // for the current session, so this is intentionally non-fatal.
    }
  }, [items, discountCode]);

  // Keep the cart in sync across multiple open tabs.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readStorage();
      setItems(next.items);
      setDiscountCode(next.discountCode);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Lock body scroll while the cart drawer is open (mobile UX).
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const add = useCallback((product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.slug === product.slug);
      if (existing) {
        return current.map((i) =>
          i.slug === product.slug
            ? { ...i, quantity: Math.min(99, i.quantity + quantity) }
            : i,
        );
      }
      return [
        ...current,
        {
          slug: product.slug,
          quantity: Math.min(99, quantity),
          name: product.name,
          priceCents: product.priceCents,
          image: product.images[0] ?? null,
          size: product.size,
        },
      ];
    });
    track('add_to_cart', { slug: product.slug, quantity, priceCents: product.priceCents });
    setIsOpen(true);
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((current) => current.filter((i) => i.slug !== slug));
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    setItems((current) =>
      quantity < 1
        ? current.filter((i) => i.slug !== slug)
        : current.map((i) => (i.slug === slug ? { ...i, quantity: Math.min(99, quantity) } : i)),
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setDiscountCode(null);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    return {
      items,
      count,
      subtotalCents,
      isOpen,
      discountCode,
      add,
      remove,
      setQuantity,
      clear,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      setDiscountCode,
      toApiItems: () => items.map((i) => ({ slug: i.slug, quantity: i.quantity })),
    };
  }, [items, isOpen, discountCode, add, remove, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within <CartProvider>');
  return context;
}
