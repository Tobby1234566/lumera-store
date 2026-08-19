import crypto from 'node:crypto';
import { config } from '../../config.js';
import type { PaymentProvider } from './types.js';

const PAYSTACK_API = 'https://api.paystack.co';

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

type PaystackInitializeData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

type PaystackVerifyData = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  fees?: number | null;
  metadata?: unknown;
};

type PaystackWebhook = {
  event?: string;
  data?: {
    id?: number | string;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
  };
};

function secretKey(): string {
  if (!config.payments.paystackSecretKey) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  return config.payments.paystackSecretKey;
}

async function paystackRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json()) as PaystackResponse<T>;
  if (!response.ok || !body.status) {
    throw new Error(`Paystack request failed: ${body.message || response.statusText}`);
  }
  return body.data;
}

function signaturesMatch(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha512', secretKey()).update(rawBody).digest('hex');
  const provided = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer);
}

export const paystackProvider: PaymentProvider = {
  name: 'paystack',
  isLive: true,

  isConfigured() {
    return Boolean(config.payments.paystackSecretKey);
  },

  async createIntent(input) {
    const data = await paystackRequest<PaystackInitializeData>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: input.customerEmail,
        amount: input.amountCents,
        currency: input.currency.toUpperCase(),
        reference: input.orderNumber,
        callback_url: input.returnUrl,
        metadata: {
          orderId: input.orderId,
          orderNumber: input.orderNumber,
        },
      }),
    });
    if (!data.authorization_url || !data.reference) throw new Error('Paystack did not return a checkout URL.');
    return {
      reference: data.reference,
      status: 'requires_redirect',
      redirectUrl: data.authorization_url,
      isMock: false,
    };
  },

  async verify(reference) {
    const data = await paystackRequest<PaystackVerifyData>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: 'GET' },
    );
    return {
      reference: data.reference,
      paid: data.status === 'success',
      amountCents: Number(data.amount),
      raw: data,
    };
  },

  async parseWebhook(rawBody, signature) {
    if (!signaturesMatch(rawBody, signature)) throw new Error('Invalid Paystack webhook signature.');
    const event = JSON.parse(rawBody.toString('utf8')) as PaystackWebhook;
    if (event.event !== 'charge.success' || !event.data?.reference) return null;
    const eventId = `${event.event}:${String(event.data.id ?? event.data.reference)}`;
    return {
      reference: event.data.reference,
      paid: event.data.status === 'success',
      eventId,
      eventType: event.event,
      amountCents: event.data.amount === undefined ? undefined : Number(event.data.amount),
      currency: event.data.currency?.toUpperCase(),
    };
  },
};
