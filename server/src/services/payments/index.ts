import { config } from '../../config.js';
import type { PaymentProvider } from './types.js';
import { mockProvider } from './mock.js';
import { stripeProvider } from './stripe.js';
import { paypalProvider } from './paypal.js';
import { zelleProvider } from './zelle.js';
import { visaProvider } from './visa.js';

const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
  stripe: stripeProvider,
  paypal: paypalProvider,
  zelle: zelleProvider,
  visa: visaProvider,
};

/**
 * Returns the provider configured as the server default.
 *
 * PAYMENT_PROVIDER is still useful as the development/default provider,
 * but checkout can now explicitly select another registered provider.
 */
export function getPaymentProvider(): PaymentProvider {
  return getPaymentProviderByName(config.payments.provider);
}

/**
 * Returns a specific payment provider selected by checkout.
 */
export function getPaymentProviderByName(name: string): PaymentProvider {
  const normalized = name.trim().toLowerCase();

  const provider = providers[normalized];

  if (!provider) {
    throw new Error(
      `Unknown payment provider "${name}". Available: ${Object.keys(providers).join(', ')}`,
    );
  }

  return provider;
}

/**
 * Returns the providers that can currently be shown to customers.
 *
 * A provider is only exposed when it is configured. Mock is intentionally
 * excluded from customer-facing payment methods.
 */
export function getAvailablePaymentProviders(): string[] {
  return Object.entries(providers)
    .filter(([name, provider]) => name !== 'mock' && provider.isConfigured())
    .map(([name]) => name);
}

export * from './types.js';