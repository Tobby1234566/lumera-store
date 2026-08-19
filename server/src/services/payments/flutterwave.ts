import crypto from 'node:crypto';
import { config } from '../../config.js';
import type { PaymentProvider } from './types.js';

const API_URL = 'https://api.flutterwave.com/v3';

type FlutterwaveResponse = {
  status?: string;
  message?: string;
  data?: {
    link?: string;
    id?: number | string;
    tx_ref?: string;
    status?: string;
    amount?: number | string;
    currency?: string;
    meta?: Record<string, unknown>;
  };
};

async function request(path: string, init: RequestInit): Promise<FlutterwaveResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.payments.flutterwaveSecretKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json()) as FlutterwaveResponse;
  if (!response.ok || payload.status !== 'success') {
    throw new Error(payload.message || `Flutterwave request failed with HTTP ${response.status}.`);
  }
  return payload;
}

function amountToCents(amount: number | string | undefined): number | undefined {
  if (amount === undefined) return undefined;
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
}

function isValidSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature || !config.payments.flutterwaveSecretHash) return false;
  const expected = crypto.createHmac('sha256', config.payments.flutterwaveSecretHash).update(rawBody).digest('base64');
  const actual = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

export const flutterwaveProvider: PaymentProvider = {
  name: 'flutterwave',
  isLive: true,

  isConfigured() {
    return Boolean(config.payments.flutterwaveSecretKey && config.payments.flutterwaveSecretHash);
  },

  async createIntent(input) {
    const txRef = `LUMERA-${input.orderNumber}-${input.orderId}`;
    const payload = await request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: txRef,
        amount: (input.amountCents / 100).toFixed(2),
        currency: input.currency,
        redirect_url: input.returnUrl,
        customer: { email: input.customerEmail },
        customizations: { title: 'LUMÉRA', description: `Order ${input.orderNumber}` },
        meta: { orderId: input.orderId, orderNumber: input.orderNumber },
      }),
    });
    const link = payload.data?.link;
    if (!link) throw new Error('Flutterwave did not return a hosted payment link.');
    return { reference: txRef, status: 'requires_redirect', redirectUrl: link, isMock: false };
  },

  async verify(reference) {
    const response = await request(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, { method: 'GET' });
    const transaction = response.data;
    return {
      reference: String(transaction?.tx_ref ?? reference),
      paid: transaction?.status === 'successful',
      amountCents: amountToCents(transaction?.amount),
      raw: transaction,
    };
  },

  async parseWebhook(rawBody, signature) {
    if (!isValidSignature(rawBody, signature)) throw new Error('Invalid Flutterwave webhook signature.');
    const payload = JSON.parse(rawBody.toString('utf8')) as FlutterwaveResponse & { id?: string; event?: string };
    const transactionId = payload.data?.id ?? payload.id;
    const txRef = payload.data?.tx_ref;
    if (!transactionId && !txRef) return null;

    const verified = transactionId
      ? await this.verify(String(transactionId))
      : await this.verify(String(txRef));
    return {
      reference: verified.reference,
      paid: verified.paid,
      amountCents: verified.amountCents,
      currency: typeof verified.raw === 'object' && verified.raw !== null && 'currency' in verified.raw
        ? String((verified.raw as { currency?: string }).currency)
        : undefined,
      eventId: transactionId ? `transaction:${transactionId}` : undefined,
      eventType: payload.event ?? 'charge.completed',
    };
  },
};
