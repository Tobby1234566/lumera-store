import { api } from './api';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ANALYTICS — provider-agnostic event layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Every commerce event in the app funnels through `track()`. Today it posts to
 * our own /api/analytics endpoint, which stores an event name plus a small,
 * non-identifying payload.
 *
 * TO ADD GOOGLE ANALYTICS 4 / PLAUSIBLE / SEGMENT:
 *   1. Add the provider snippet to index.html (or load it in main.tsx).
 *   2. Forward the event inside `track()` below — the marked TODO shows where.
 *   3. Configure the measurement id via VITE_ANALYTICS_ID.
 *
 * PRIVACY: never pass emails, names, addresses or raw payment data into an
 * event payload. Product slugs, quantities and totals only.
 */

export type AnalyticsEvent =
  | 'product_viewed'
  | 'add_to_cart'
  | 'checkout_started'
  | 'purchase_completed';

type Payload = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function track(event: AnalyticsEvent, payload: Payload = {}): void {
  // 1. First-party store (always on, no cookies, no PII).
  void api.track(event, payload);

  // 2. TODO(analytics): forward to your third-party provider, e.g.
  //
  //   window.gtag?.('event', event, payload);
  //
  // Guarded so nothing breaks when no provider is configured.
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, payload);
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, payload);
  }
}
