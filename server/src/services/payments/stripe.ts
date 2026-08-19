import Stripe from 'stripe';
import { config } from '../../config.js';
import type { PaymentProvider } from './types.js';

let client: Stripe | null = null;

function stripe(): Stripe {
  if (!config.payments.stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is not configured.');
  client ??= new Stripe(config.payments.stripeSecretKey);
  return client;
}

export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  isLive: true,

  isConfigured() {
    return Boolean(config.payments.stripeSecretKey && config.payments.stripeWebhookSecret);
  },

  async createIntent(input) {
    const intent = await stripe().paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      receipt_email: input.customerEmail,
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
    });
    if (!intent.client_secret) throw new Error('Stripe did not return a client secret.');
    return {
      reference: intent.id,
      status: intent.status === 'succeeded' ? 'succeeded' : 'requires_client_confirmation',
      clientSecret: intent.client_secret,
      isMock: false,
    };
  },

  async verify(reference) {
    const intent = await stripe().paymentIntents.retrieve(reference);
    return {
      reference: intent.id,
      paid: intent.status === 'succeeded',
      amountCents: intent.amount_received || intent.amount,
      raw: intent,
    };
  },

  async parseWebhook(rawBody, signature) {
    if (!signature) return null;
    const event = stripe().webhooks.constructEvent(rawBody, signature, config.payments.stripeWebhookSecret);
    if (
      event.type !== 'payment_intent.succeeded' &&
      event.type !== 'payment_intent.payment_failed' &&
      event.type !== 'payment_intent.canceled'
    ) {
      return null;
    }
    const intent = event.data.object as Stripe.PaymentIntent;
    return {
      reference: intent.id,
      paid: event.type === 'payment_intent.succeeded',
      eventId: event.id,
      eventType: event.type,
      amountCents: intent.amount_received || intent.amount,
      currency: intent.currency.toUpperCase(),
    };
  },
};
