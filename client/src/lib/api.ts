import type { AccountOrder, Customer, CustomerAddress, Order, Product, Quote, Review, StoreConfig } from '../types';

/**
 * API client.
 *
 * By default requests are same-origin ('/api/...') — in development Vite
 * proxies them to the API server, and in production the API serves the built
 * SPA from the same origin. Set VITE_API_URL only when the API lives on a
 * different domain.
 *
 * NOTE: only VITE_-prefixed variables reach the browser bundle, and nothing
 * secret is ever placed in one.
 */
// The storefront is deployed to Vercel while the API runs on Render. Keep
// VITE_API_URL configurable, but use the project API host when the production
// build does not define it so browser requests never fall through to Vercel's
// SPA index.html rewrite.
const DEFAULT_PRODUCTION_API_URL = 'https://lumera-store.onrender.com';
const BASE = (import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? DEFAULT_PRODUCTION_API_URL : '')).replace(/\/$/, '');

const IS_DEV = import.meta.env.DEV;
// Opt-in flag for development-only mocked APIs. Set `VITE_ENABLE_DEV_MOCKS=true`
// in your client environment when you want the browser-local mocks to run.
const ENABLE_DEV_MOCKS = IS_DEV && import.meta.env.VITE_ENABLE_DEV_MOCKS === 'true';
const DEV_ADMIN_KEY = '__lumera_dev_admin';

// Development product fixtures removed — enable real API or set
// `VITE_ENABLE_DEV_MOCKS=true` and provide your own fixtures if needed.
const DEV_PUBLIC_PRODUCTS: any[] = [];
function setDevAdmin(admin: unknown) {
  try {
    localStorage.setItem(DEV_ADMIN_KEY, JSON.stringify(admin));
  } catch {}
}
function getDevAdmin() {
  try {
    const v = localStorage.getItem(DEV_ADMIN_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const message = response.ok
        ? 'The server returned an unexpected response.'
        : `Request failed with status ${response.status}.`;
      throw new ApiError(response.status, message, { contentType: response.headers.get('content-type') });
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? 'Something went wrong.', data?.details);
  }
  return data as T;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export type ProductQuery = {
  category?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
  bestSellers?: boolean;
  limit?: number;
};

export const api = {
  config: () => request<StoreConfig>('/api/config'),

  products: (query: ProductQuery = {}) => {
    if (ENABLE_DEV_MOCKS) {
      let list = DEV_PUBLIC_PRODUCTS.slice();
      if (query.category && query.category !== 'all') list = list.filter((p) => p.category === query.category);
      if (query.search) list = list.filter((p) => p.name.toLowerCase().includes(query.search!.toLowerCase()) || p.slug.includes(query.search!));
      if (query.featured) list = list.filter((p) => p.isFeatured);
      if (query.bestSellers) list = list.filter((p) => p.isBestSeller);
      if (query.limit) list = list.slice(0, query.limit);
      return Promise.resolve({ products: list } as any);
    }
    const params = new URLSearchParams();
    if (query.category && query.category !== 'all') params.set('category', query.category);
    if (query.search) params.set('search', query.search);
    if (query.sort) params.set('sort', query.sort);
    if (query.featured) params.set('featured', 'true');
    if (query.bestSellers) params.set('bestSellers', 'true');
    if (query.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return request<{ products: Product[] }>(`/api/products${qs ? `?${qs}` : ''}`);
  },

  product: (slug: string) =>
    (async () => {
      if (ENABLE_DEV_MOCKS) {
        const p = DEV_PUBLIC_PRODUCTS.find((x) => x.slug === slug);
        if (!p) return Promise.reject(new Error('Product not found')) as any;
        // minimal related and reviews for dev
        const related = DEV_PUBLIC_PRODUCTS.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);
        const reviews: Review[] = [] as any;
        return Promise.resolve({ product: p as any, reviews, related } as any);
      }
      return request<{ product: Product; reviews: Review[]; related: Product[] }>(`/api/products/${encodeURIComponent(slug)}`);
    })(),

  quote: (items: { slug: string; quantity: number }[], discountCode?: string | null) =>
    post<{ quote: Quote }>('/api/checkout/quote', { items, discountCode: discountCode ?? null }),

  applyDiscount: (code: string, items: { slug: string; quantity: number }[]) =>
    post<{ code: string; discountCents: number; message: string }>('/api/checkout/discount', {
      code,
      items,
    }),

  placeOrder: (payload: {
    customer: Record<string, unknown>;
    items: { slug: string; quantity: number }[];
    discountCode?: string | null;
  }) =>
    post<{
      order: Order;
      payment: { provider: string; status: string; reference: string; redirectUrl: string | null; clientSecret: string | null; isMock: boolean };
    }>('/api/checkout/order', payload),

  order: (orderNumber: string, email?: string) =>
    request<{ order: Order }>(
      `/api/checkout/order/${encodeURIComponent(orderNumber)}${email ? `?email=${encodeURIComponent(email)}` : ''}`,
    ),

  newsletter: (email: string, source = 'footer') =>
    post<{ ok: boolean; message: string }>('/api/newsletter', { email, source }),

  contact: (payload: { name: string; email: string; subject: string; message: string }) =>
    post<{ ok: boolean; message: string }>('/api/contact', payload),

  track: (name: string, payload: Record<string, string | number | boolean> = {}) =>
    post<void>('/api/analytics', { name, payload }).catch(() => undefined),

  paymentVerify: (reference: string) => post<{ order: Order; paid: boolean }>('/api/checkout/payment/verify', { reference }),
  paymentFail: (reference: string, reason = 'Payment was not completed.') => post<{ ok: boolean }>('/api/checkout/payment/fail', { reference, reason }),

  customer: {
    me: () => request<{ customer: Customer; addresses: CustomerAddress[] }>('/api/auth/me'),
    register: (payload: { email: string; fullName: string; password: string; acceptsMarketing?: boolean }) =>
      post<{ message: string; email: string }>('/api/auth/register', payload),
    login: (email: string, password: string) => post<{ customer: Customer }>('/api/auth/login', { email, password }),
    logout: () => post<{ success: boolean }>('/api/auth/logout', {}),
    verifyEmail: (token: string) => post<{ message: string; email: string }>('/api/auth/verify-email', { token }),
    resendVerification: (email: string) => post<{ message: string }>('/api/auth/resend-verification', { email }),
    forgotPassword: (email: string) => post<{ message: string }>('/api/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) => post<{ message: string }>('/api/auth/reset-password', { token, password }),
    update: (payload: { fullName?: string; phone?: string; acceptsMarketing?: boolean }) =>
      request<{ customer: Customer }>('/api/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
    orders: () => request<{ orders: AccountOrder[] }>('/api/auth/me/orders'),
    addresses: () => request<{ addresses: CustomerAddress[] }>('/api/auth/me/addresses'),
    addAddress: (payload: Record<string, unknown>) => post<{ address: CustomerAddress }>('/api/auth/me/addresses', payload),
    deleteAddress: (id: string) => request<void>(`/api/auth/me/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  admin: (() => {
    if (!ENABLE_DEV_MOCKS) {
      return {
        login: (email: string, password: string) =>
          post<{ admin: { id: string; email: string; name: string; role: string } }>('/api/admin/login', {
            email,
            password,
          }),
        logout: () => post<{ ok: boolean }>('/api/admin/logout', {}),
        me: () => request<{ admin: { id: string; email: string; name: string; role: string } }>('/api/admin/me'),
        analytics: () => request<any>('/api/admin/analytics'),
        orders: (query: { search?: string; status?: string } = {}) => {
          const params = new URLSearchParams();
          if (query.search) params.set('search', query.search);
          if (query.status && query.status !== 'all') params.set('status', query.status);
          const qs = params.toString();
          return request<{ orders: Order[]; total: number }>(`/api/admin/orders${qs ? `?${qs}` : ''}`);
        },
        order: (id: string) => request<{ order: Order }>(`/api/admin/orders/${id}`),
        updateOrder: (id: string, patch: Record<string, unknown>) =>
          request<{ order: Order }>(`/api/admin/orders/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(patch),
          }),
        customers: (search?: string) =>
          request<{ customers: any[] }>(`/api/admin/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        products: () => request<{ products: Product[] }>('/api/admin/products'),
        createProduct: (payload: Record<string, unknown>) =>
          post<{ product: Product }>('/api/admin/products', payload),
        updateProduct: (id: string, payload: Record<string, unknown>) =>
          request<{ product: Product }>(`/api/admin/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          }),
        deleteProduct: (id: string) =>
          request<{ ok: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
        reviews: () => request<{ reviews: any[] }>('/api/admin/reviews'),
        deleteReview: (id: string) =>
          request<{ ok: boolean }>(`/api/admin/reviews/${id}`, { method: 'DELETE' }),
        deletePlaceholderReviews: () =>
          request<{ ok: boolean; deleted: number }>('/api/admin/reviews/placeholders', { method: 'DELETE' }),
        discounts: () => request<{ discounts: any[] }>('/api/admin/discounts'),
        createDiscount: (payload: Record<string, unknown>) => post<{ ok: boolean }>('/api/admin/discounts', payload),
        toggleDiscount: (id: string, isActive: boolean) =>
          request<{ ok: boolean }>(`/api/admin/discounts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive }),
          }),
        deleteDiscount: (id: string) =>
          request<{ ok: boolean }>(`/api/admin/discounts/${id}`, { method: 'DELETE' }),
        messages: () => request<{ messages: any[] }>('/api/admin/messages'),
      };
    }

    // Development-only mocked admin API backed by localStorage.
    const DEV_STATE_KEY = '__lumera_dev_state_v2';

    const nowIso = () => new Date().toISOString();
    const uuid = (prefix = '') => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

    // No initial products in the client-side dev state per request.
    const initialProducts: Product[] = [];

    const makeInitialState = () => ({
      products: initialProducts,
      orders: [],
      customers: [],
      discounts: [],
      reviews: [],
    });

    function loadState() {
      try {
        const raw = localStorage.getItem(DEV_STATE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      const s = makeInitialState();
      localStorage.setItem(DEV_STATE_KEY, JSON.stringify(s));
      return s;
    }

    function saveState(s: any) {
      try {
        localStorage.setItem(DEV_STATE_KEY, JSON.stringify(s));
      } catch {}
    }

    function analyticsFromState(s: any) {
      const totals = { revenueCents: 0, ordersCount: 0, allOrdersCount: 0, pendingCount: 0, averageOrderValueCents: 0, customersCount: s.customers.length };
      const revenueSeries = Array.from({ length: 30 }).map((_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0,10), revenueCents: 0 }));
      const bestSellers = s.products.slice(0,5).map((p: any) => ({ slug: p.slug, name: p.name, units: p.unitsSold || 0, revenueCents: (p.unitsSold || 0) * (p.priceCents || 0) }));
      const recentOrders = s.orders.slice(-8).reverse();
      const lowStock = s.products.filter((p: any) => p.inventory < 20 && p.isActive).map((p: any) => ({ name: p.name, slug: p.slug, inventory: p.inventory }));
      const byStatus: Record<string, number> = {};
      for (const o of s.orders) { byStatus[o.status] = (byStatus[o.status] || 0) + 1; totals.revenueCents += o.totalCents || 0; }
      totals.ordersCount = Object.values(byStatus).reduce((a,b)=>a+b,0);
      totals.allOrdersCount = s.orders.length;
      totals.pendingCount = byStatus['pending'] || 0;
      totals.averageOrderValueCents = totals.ordersCount ? Math.round(totals.revenueCents / totals.ordersCount) : 0;
      return { totals, revenueSeries, bestSellers, recentOrders, lowStock, byStatus };
    }

    return {
      login: (email: string, password: string) => {
        // keep client-side login behavior
        const ok = email === 'admin@lumera.test' && (password === 'lumera-admin' || password === 'Erotic_bastard');
        if (ok) {
          const admin = { id: 'adm', email: 'admin@lumera.test', name: 'LUMÉRA Admin', role: 'admin' };
          setDevAdmin(admin);
          return Promise.resolve({ admin } as any);
        }
        return Promise.reject(new Error('Incorrect email or password.')) as any;
      },
      logout: () => {
        setDevAdmin(null);
        return Promise.resolve({ ok: true });
      },
      me: () => {
        const a = getDevAdmin();
        if (a) return Promise.resolve({ admin: a });
        return Promise.reject(new Error('Not authenticated')) as any;
      },
      analytics: () => Promise.resolve(analyticsFromState(loadState())),
      orders: (query: { search?: string; status?: string } = {}) => {
        const s = loadState();
        let list = s.orders.slice().reverse();
        if (query.status && query.status !== 'all') list = list.filter((o: any) => o.status === query.status);
        if (query.search) {
          const q = query.search.toLowerCase();
          list = list.filter((o: any) => o.orderNumber.includes(q) || o.email.includes(q) || o.fullName.toLowerCase().includes(q));
        }
        return Promise.resolve({ orders: list, total: list.length });
      },
      order: (id: string) => {
        const s = loadState();
        const o = s.orders.find((x: any) => x.id === id);
        if (!o) return Promise.reject(new Error('Order not found')) as any;
        return Promise.resolve({ order: o });
      },
      updateOrder: (id: string, patch: Record<string, unknown>) => {
        const s = loadState();
        const idx = s.orders.findIndex((x: any) => x.id === id);
        if (idx === -1) return Promise.reject(new Error('Order not found')) as any;
        const now = nowIso();
        const order = { ...s.orders[idx], ...patch };
        order.updatedAt = now;
        s.orders[idx] = order;
        saveState(s);
        return Promise.resolve({ order });
      },
      customers: (search?: string) => {
        const s = loadState();
        let list = s.customers.slice().reverse();
        if (search) list = list.filter((c: any) => c.email.includes(search) || c.fullName.toLowerCase().includes(search.toLowerCase()));
        return Promise.resolve({ customers: list });
      },
      products: () => {
        const s = loadState();
        return Promise.resolve({ products: s.products });
      },
      createProduct: (payload: Record<string, unknown>) => {
        const s = loadState();
        const id = uuid('prd_');
        const now = nowIso();
        const p: any = {
          id,
          slug: (payload.slug as string) || `p-${id}`,
          name: String(payload.name ?? 'Untitled'),
          category: (payload.category as any) || 'serum',
          tagline: String(payload.tagline ?? ''),
          shortDescription: String(payload.shortDescription ?? ''),
          description: String(payload.description ?? ''),
          priceCents: Number(payload.priceCents ?? 0),
          compareAtPriceCents: payload.compareAtPriceCents ?? null,
          size: String(payload.size ?? ''),
          inventory: Number(payload.inventory ?? 0),
          isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
          isFeatured: Boolean(payload.isFeatured ?? false),
          isBestSeller: Boolean(payload.isBestSeller ?? false),
          sortOrder: Number(payload.sortOrder ?? 0),
          unitsSold: 0,
          images: (payload.images as string[]) || [],
          benefits: (payload.benefits as string[]) || [],
          keyIngredients: (payload.keyIngredients as any[]) || [],
          ingredientsList: String(payload.ingredientsList ?? ''),
          howToUse: String(payload.howToUse ?? ''),
          skinTypes: (payload.skinTypes as string[]) || [],
          seoTitle: payload.seoTitle ?? null,
          seoDescription: payload.seoDescription ?? null,
          createdAt: now,
          updatedAt: now,
          rating: 0,
          reviewCount: 0,
        };
        s.products.push(p);
        saveState(s);
        return Promise.resolve({ product: p });
      },
      updateProduct: (id: string, payload: Record<string, unknown>) => {
        const s = loadState();
        const idx = s.products.findIndex((p: any) => p.id === id);
        if (idx === -1) return Promise.reject(new Error('Product not found')) as any;
        const p = { ...s.products[idx], ...payload, updatedAt: nowIso() };
        s.products[idx] = p;
        saveState(s);
        return Promise.resolve({ product: p });
      },
      deleteProduct: (id: string) => {
        const s = loadState();
        s.products = s.products.filter((p: any) => p.id !== id);
        saveState(s);
        return Promise.resolve({ ok: true });
      },
      reviews: () => {
        const s = loadState();
        return Promise.resolve({ reviews: s.reviews });
      },
      deleteReview: (id: string) => {
        const s = loadState();
        s.reviews = s.reviews.filter((r: any) => r.id !== id);
        saveState(s);
        return Promise.resolve({ ok: true });
      },
      deletePlaceholderReviews: () => {
        const s = loadState();
        const before = s.reviews.length;
        s.reviews = s.reviews.filter((r: any) => !r.isPlaceholder);
        const deleted = before - s.reviews.length;
        saveState(s);
        return Promise.resolve({ ok: true, deleted });
      },
      discounts: () => {
        const s = loadState();
        return Promise.resolve({ discounts: s.discounts });
      },
      createDiscount: (payload: Record<string, unknown>) => {
        const s = loadState();
        const d = { id: uuid('dsc_'), code: String(payload.code ?? ''), type: String(payload.type ?? 'percent'), value: Number(payload.value ?? 0), minSubtotalCents: Number(payload.minSubtotalCents ?? 0), usageLimit: payload.usageLimit ?? null, expiresAt: payload.expiresAt ?? null, isActive: true, timesUsed: 0, createdAt: nowIso() };
        s.discounts.push(d);
        saveState(s);
        return Promise.resolve({ ok: true });
      },
      toggleDiscount: (id: string, isActive: boolean) => {
        const s = loadState();
        const idx = s.discounts.findIndex((d: any) => d.id === id);
        if (idx === -1) return Promise.reject(new Error('Discount not found')) as any;
        s.discounts[idx].isActive = isActive;
        saveState(s);
        return Promise.resolve({ ok: true });
      },
      deleteDiscount: (id: string) => {
        const s = loadState();
        s.discounts = s.discounts.filter((d: any) => d.id !== id);
        saveState(s);
        return Promise.resolve({ ok: true });
      },
      messages: () => Promise.resolve({ messages: [] }),
    } as any;
  })(),
};
