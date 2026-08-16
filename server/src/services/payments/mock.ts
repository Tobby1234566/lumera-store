import crypto from 'node:crypto';
import type { PaymentProvider } from './types.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MOCK PAYMENT DRIVER — DEVELOPMENT ONLY
 * ─────────────────────────────────────────────────────────────────────────────
 * This driver does NOT process real payments. No card details are collected,
 * transmitted or stored anywhere in this flow. It exists so the full checkout
 * and order lifecycle can be built and tested before a real processor is
 * connected.
 *
 * Orders paid through this driver are recorded with payment_provider = 'mock'
 * and are clearly surfaced as simulated in the admin dashboard.
 *
 * The server refuses to boot in production with PAYMENT_PROVIDER=mock — see
 * src/index.ts.
 */
export const mockProvider: PaymentProvider = {
  name: 'mock',
  isLive: false,

  isConfigured() {
    return true;
  },

  async createIntent(input) {
    return {
      reference: `mock_${crypto.randomBytes(10).toString('hex')}`,
      // The simulated payment is treated as immediately successful so the
      // order lifecycle (pending -> paid -> processing) can be exercised.
      status: 'succeeded',
      isMock: true,
    };
  },

  async verify(reference) {
    return { reference, paid: reference.startsWith('mock_') };
  },

  async parseWebhook() {
    // The mock driver has no webhooks.
    return null;
  },
};
