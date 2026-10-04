import Stripe from 'stripe';
import { config } from '../../config.js';
import type {
  PaymentIntentInput,
  PaymentProvider,
} from './types.js';

const stripe = config.payments.stripeSecretKey
  ? new Stripe(config.payments.stripeSecretKey)
  : null;

const NOT_CONFIGURED =
  'Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.';

export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  isLive: true,

  isConfigured() {
    return Boolean(
      config.payments.stripeSecretKey &&
      config.payments.stripeWebhookSecret
    );
  },

  async createIntent(input: PaymentIntentInput) {
    if (!stripe) {
      throw new Error(NOT_CONFIGURED);
    }

    const intent = await stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      receipt_email: input.customerEmail,

      automatic_payment_methods: {
        enabled: true,
      },

      metadata: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
      },

      description: `Luméra order ${input.orderNumber}`,
    });

    if (!intent.client_secret) {
      throw new Error(
        `Stripe PaymentIntent ${intent.id} did not return a client secret.`
      );
    }

    return {
      reference: intent.id,
      status: 'requires_client_confirmation',
      clientSecret: intent.client_secret,
      isMock: false,
    };
  },

  async verify(reference: string) {
    if (!stripe) {
      throw new Error(NOT_CONFIGURED);
    }

    const intent = await stripe.paymentIntents.retrieve(reference);

    return {
      reference: intent.id,
      paid: intent.status === 'succeeded',
      amountCents: intent.amount_received || intent.amount,
      raw: intent,
    };
  },

  async parseWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!stripe) {
      throw new Error(NOT_CONFIGURED);
    }

    if (!signature) {
      throw new Error('Missing Stripe webhook signature.');
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.payments.stripeWebhookSecret
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;

        return {
          reference: intent.id,
          paid: true,
        };
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;

        return {
          reference: intent.id,
          paid: false,
        };
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!session.payment_intent) {
          return null;
        }

        const reference =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent.id;

        return {
          reference,
          paid: session.payment_status === 'paid',
        };
      }

      default:
        return null;
    }
  },
};