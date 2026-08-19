import { config } from '../../config.js';
import type { PaymentProvider } from './types.js';
import { mockProvider } from './mock.js';
import { stripeProvider } from './stripe.js';
import { flutterwaveProvider } from './flutterwave.js';
import { paypalProvider } from './paypal.js';
import { zelleProvider } from './zelle.js';
import { visaProvider } from './visa.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PAYMENT PROVIDER REGISTRY
 * ─────────────────────────────────────────────────────────────────────────────
 * The application is deliberately NOT locked to a single payment processor.
 * Every provider implements the same `PaymentProvider` interface, and the
 * active one is chosen at runtime via the PAYMENT_PROVIDER environment
 * variable. To add Paystack, Flutterwave, Adyen, etc:
 *
 *   1. Create ./paystack.ts implementing `PaymentProvider`.
 *   2. Register it in the map below.
 *   3. Set PAYMENT_PROVIDER=paystack in your environment.
 *
 * No route, controller or database code needs to change.
 *
 * AVAILABLE PROVIDERS:
 *   - mock: Development-only, all payments succeed instantly
 *   - stripe: Stripe Payment Intents API
 *   - flutterwave: Flutterwave Standard hosted checkout
 *   - paypal: PayPal Commerce Platform
 *   - zelle: Bank transfer integration (mock in dev, requires bank API in prod)
 *   - visa: Visa Direct card push payments (production ready)
 */
const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
  stripe: stripeProvider,
  flutterwave: flutterwaveProvider,
  paypal: paypalProvider,
  zelle: zelleProvider,
  visa: visaProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const provider = providers[config.payments.provider];
  if (!provider) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${config.payments.provider}". Available: ${Object.keys(providers).join(', ')}`,
    );
  }
  return provider;
}

export * from './types.js';
