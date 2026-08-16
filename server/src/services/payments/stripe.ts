import { config } from '../../config.js';
import type { PaymentProvider } from './types.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STRIPE DRIVER — INTEGRATION POINT (not yet wired to the live SDK)
 * ─────────────────────────────────────────────────────────────────────────────
 * This is a complete, honest scaffold rather than a fake implementation: it
 * throws clearly instead of pretending a payment succeeded.
 *
 * TO ACTIVATE STRIPE:
 *
 *   1. npm --workspace server install stripe
 *   2. Uncomment the import and client below.
 *   3. Replace the `throw` in each method with the marked implementation.
 *   4. Set in your environment (never in source control):
 *        PAYMENT_PROVIDER=stripe
 *        STRIPE_SECRET_KEY=sk_live_...
 *        STRIPE_WEBHOOK_SECRET=whsec_...
 *   5. Point a Stripe webhook at POST /api/payments/webhook and subscribe to
 *      `payment_intent.succeeded` and `checkout.session.completed`.
 *
 * SECURITY NOTES
 *   - Card data is entered directly into Stripe's hosted fields / Checkout and
 *     never touches this server. We only ever persist the payment intent id.
 *   - The webhook route mounts a raw body parser so signature verification
 *     works. Never trust a webhook you have not verified.
 *
 * import Stripe from 'stripe';
 * const stripe = new Stripe(config.payments.stripeSecretKey, { apiVersion: '2024-11-20.acacia' });
 */

const NOT_IMPLEMENTED =
  'The Stripe driver is scaffolded but not yet implemented. Install the `stripe` package and complete server/src/services/payments/stripe.ts, or set PAYMENT_PROVIDER=mock for development.';

export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  isLive: true,

  isConfigured() {
    return Boolean(config.payments.stripeSecretKey && config.payments.stripeWebhookSecret);
  },

  async createIntent(_input) {
    // TODO(stripe): replace with a real PaymentIntent, e.g.
    //
    //   const intent = await stripe.paymentIntents.create({
    //     amount: _input.amountCents,
    //     currency: _input.currency.toLowerCase(),
    //     receipt_email: _input.customerEmail,
    //     automatic_payment_methods: { enabled: true },
    //     metadata: { orderId: _input.orderId, orderNumber: _input.orderNumber },
    //   });
    //   return {
    //     reference: intent.id,
    //     status: 'requires_client_confirmation',
    //     clientSecret: intent.client_secret!,
    //     isMock: false,
    //   };
    throw new Error(NOT_IMPLEMENTED);
  },

  async verify(_reference) {
    // TODO(stripe): const intent = await stripe.paymentIntents.retrieve(_reference);
    //   return { reference: _reference, paid: intent.status === 'succeeded', amountCents: intent.amount_received };
    throw new Error(NOT_IMPLEMENTED);
  },

  async parseWebhook(_rawBody, _signature) {
    // TODO(stripe): verify the signature before trusting anything:
    //
    //   const event = stripe.webhooks.constructEvent(
    //     _rawBody, _signature!, config.payments.stripeWebhookSecret,
    //   );
    //   if (event.type === 'payment_intent.succeeded') {
    //     const intent = event.data.object as Stripe.PaymentIntent;
    //     return { reference: intent.id, paid: true };
    //   }
    //   return null;
    throw new Error(NOT_IMPLEMENTED);
  },
};
