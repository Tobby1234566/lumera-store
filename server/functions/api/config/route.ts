import { getPaymentProvider } from '@/services/payments/index.js';
import { config } from '@/config.js';

export async function GET() {
  const provider = getPaymentProvider();
  return Response.json({
    currency: config.store.currency,
    shippingFlatRateCents: config.store.shippingFlatRateCents,
    freeShippingThresholdCents: config.store.freeShippingThresholdCents,
    payment: {
      provider: provider.name,
      isMock: !provider.isLive,
    },
  });
}
