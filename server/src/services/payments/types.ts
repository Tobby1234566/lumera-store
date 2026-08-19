/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PAYMENT PROVIDER INTERFACE
 * ─────────────────────────────────────────────────────────────────────────────
 * Every payment provider must implement this interface. The provider pattern
 * allows the system to support multiple payment processors (Stripe, Paystack,
 * PayPal, Zelle, Visa Direct, etc.) without changing any checkout or order logic.
 *
 * Providers are registered in services/payments/index.ts and selected at
 * runtime via the PAYMENT_PROVIDER environment variable.
 *
 * ── PROVIDER IMPLEMENTATIONS ────────────────────────────────────────────────
 *
 * STRIPE (stripe.ts)
 *   - Live: Yes (real payments)
 *   - Status: Fully implemented
 *   - Notes: Uses Stripe Payment Intents API with hosted checkout
 *   - Config: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY
 *
 * PAYSTACK (paystack.ts)
 *   - Live: Yes (real payments)
 *   - Status: Fully implemented
 *   - Notes: Uses Paystack hosted checkout with HMAC-SHA512 webhook validation
 *   - Config: PAYSTACK_SECRET_KEY
 *
 * PAYPAL (paypal.ts)
 *   - Live: Yes (real payments)
 *   - Status: Fully implemented
 *   - Notes: Uses PayPal Commerce Platform for checkout flows
 *   - Config: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE (sandbox|live)
 *   - Webhooks: Requires PAYPAL_WEBHOOK_ID for payment status updates
 *
 * ZELLE (zelle.ts)
 *   - Live: Development mock only (real Zelle uses bank integration)
 *   - Status: Mock provider with webhook simulation for testing
 *   - Notes: Zelle is a real-time bank transfer system operated by Early Warning Services.
 *            Production requires direct bank partnership and ACH integration.
 *            This driver simulates successful transfers for testing. For production,
 *            integrate with your bank's ACH processor or use Plaid/Stripe's bank transfer API.
 *   - Config: None (mock only). Production needs BANK_ACH_ENDPOINT, BANK_ACH_KEY
 *
 * VISA DIRECT (visa.ts)
 *   - Live: Stripe fallback for dev; Visa DPS API for production
 *   - Status: Production ready with Stripe fallback
 *   - Notes: Visa Direct enables push payments to consumer cards. In development,
 *            this uses Stripe Payouts API. For production, requires Visa DPS credentials
 *            and merchant bank partnership.
 *   - Config: VISA_DPS_USER_ID, VISA_DPS_PASSWORD (production) or uses STRIPE_*
 *
 * MOCK (mock.ts)
 *   - Live: No (for testing)
 *   - Status: Fully implemented (default for development)
 *   - Notes: All payments succeed instantly, no credentials needed
 *   - Config: None
 */

/** Shared contract every payment driver must satisfy. */

export type PaymentIntentInput = {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  /** Where the provider should send the customer after a hosted checkout. */
  returnUrl: string;
};

export type PaymentIntentResult = {
  /** Provider-side reference (payment intent id, transaction ref, etc). */
  reference: string;
  /**
   * 'requires_redirect' — send the browser to `redirectUrl`.
   * 'requires_client_confirmation' — hand `clientSecret` to the provider's SDK.
   * 'succeeded' — payment already complete (mock/offline flows).
   */
  status: 'requires_redirect' | 'requires_client_confirmation' | 'succeeded';
  redirectUrl?: string;
  clientSecret?: string;
  /** True for development drivers that never move real money. */
  isMock: boolean;
};

export type PaymentVerification = {
  reference: string;
  paid: boolean;
  amountCents?: number;
  raw?: unknown;
};

export interface PaymentProvider {
  /** Machine name, also the PAYMENT_PROVIDER value. */
  readonly name: string;
  /** False for drivers that do not process real money. */
  readonly isLive: boolean;
  /** Whether the driver has the credentials it needs. */
  isConfigured(): boolean;
  /** Begin a payment for an order. */
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  /** Confirm with the provider that a payment truly succeeded. */
  verify(reference: string): Promise<PaymentVerification>;
  /**
   * Validate and parse an inbound webhook. Returning null means "ignore".
   * `rawBody` must be the unparsed request body for signature verification.
   */
  parseWebhook(rawBody: Buffer, signature: string | undefined): Promise<{
    reference: string;
    paid: boolean;
    eventId?: string;
    eventType?: string;
    amountCents?: number;
    currency?: string;
  } | null>;
}

