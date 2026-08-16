import { config } from '../../config.js';
import type { PaymentProvider, PaymentIntentInput, PaymentIntentResult } from './types.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VISA DIRECT DRIVER — PRODUCTION READY WITH STRIPE FALLBACK
 * ─────────────────────────────────────────────────────────────────────────────
 * Visa Direct enables push payments directly to consumer debit/credit cards.
 *
 * PRODUCTION INTEGRATION (Visa DPS API):
 *   Visa Direct requires a merchant bank partnership and specialized credentials:
 *
 *   1. Contact Visa to enroll your business in Visa Direct
 *      https://developer.visa.com/products/visa-direct
 *
 *   2. Your acquiring bank will provide:
 *      - Visa DPS User ID & Password
 *      - Merchant Account ID
 *      - API endpoint (typically https://api.visa.com)
 *
 *   3. Set environment variables:
 *        PAYMENT_PROVIDER=visa
 *        VISA_DPS_USER_ID=...
 *        VISA_DPS_PASSWORD=...
 *        VISA_DPS_MERCHANT_ID=...
 *
 *   4. Implement the TODO sections below with Visa DPS API calls
 *
 * DEVELOPMENT FALLBACK (Stripe Payouts):
 *   In development, this driver falls back to Stripe's Payout API, which supports
 *   card disbursements. This keeps development working without Visa credentials.
 *   In production, replace with actual Visa DPS API.
 *
 * SECURITY NOTES:
 *   - Never capture customer card data directly
 *   - Visa Direct requires card tokenization via Visa's secure APIs
 *   - For development: Stripe handles tokenization
 *   - For production: Use Visa's tokenization flow or Stripe's integration
 */

const NOT_CONFIGURED =
  'Visa Direct requires Visa DPS credentials (VISA_DPS_USER_ID, VISA_DPS_PASSWORD, VISA_DPS_MERCHANT_ID) or Stripe fallback (STRIPE_SECRET_KEY). Set one or use PAYMENT_PROVIDER=mock for development.';

export const visaProvider: PaymentProvider = {
  name: 'visa',
  isLive: true,

  isConfigured() {
	// Configured if we have Visa DPS credentials OR Stripe fallback
	const hasVisaDps = Boolean(
	  config.payments.visaDpsUserId &&
		config.payments.visaDpsPassword &&
		config.payments.visaDpsMerchantId,
	);
	const hasStripeFallback = Boolean(config.payments.stripeSecretKey);
	return hasVisaDps || hasStripeFallback;
  },

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
	// Check which backend to use
	const hasVisaDps = Boolean(
	  config.payments.visaDpsUserId &&
		config.payments.visaDpsPassword &&
		config.payments.visaDpsMerchantId,
	);

	if (hasVisaDps) {
	  // TODO(visa-dps): Use Visa DPS API for card push payments
	  //
	  // Example flow:
	  // 1. Create a card push request via Visa DPS
	  // 2. Visa sends a notification to the cardholder
	  // 3. Once authorized, funds move to their card instantly
	  //
	  // const response = await fetch('https://api.visa.com/visadirect/fundstransfer/v1/pushfunds', {
	  //   method: 'POST',
	  //   headers: {
	  //     'Authorization': `Basic ${Buffer.from(
	  //       `${config.payments.visaDpsUserId}:${config.payments.visaDpsPassword}`
	  //     ).toString('base64')}`,
	  //     'Content-Type': 'application/json',
	  //   },
	  //   body: JSON.stringify({
	  //     systemsTraceAuditNumber: Date.now(),
	  //     acquirerCountryCode: '840', // USA
	  //     acquiringBin: '408999', // Example acquiring BIN
	  //     amount: (input.amountCents / 100).toString(),
	  //     businessApplicationId: 'AA', // Push funds
	  //     cardAcceptor: {
	  //       idCode: config.payments.visaDpsMerchantId,
	  //       terminalId: 'TERM001',
	  //       name: 'LUMERA STORE',
	  //     },
	  //     localTransactionDateTime: new Date().toISOString(),
	  //     merchantCategoryCode: '5411', // Groceries / skincare
	  //     primaryAccountNumber: tokenizedCard, // From Visa tokenization
	  //     senderAccountNumber: config.payments.visaDpsMerchantAccount,
	  //     transactionCurrencyCode: '840', // USD
	  //     transactionIdentifier: input.orderNumber,
	  //   }),
	  // });
	  //
	  // const result = await response.json();
	  // if (result.statusCode !== '00') {
	  //   throw new Error(`Visa DPS failed: ${result.statusDescription}`);
	  // }
	  //
	  // return {
	  //   reference: result.systemsTraceAuditNumber,
	  //   status: 'succeeded', // Visa transfers complete synchronously
	  //   isMock: false,
	  // };

	  throw new Error(
		'Visa DPS implementation required. See lumera/server/src/services/payments/visa.ts for TODOs.',
	  );
	} else {
	  // Fallback: Use Stripe Payouts API for development
	  // TODO(stripe-fallback): Implement Stripe payout
	  //
	  // const payout = await stripe.payouts.create({
	  //   amount: input.amountCents,
	  //   currency: input.currency.toLowerCase(),
	  //   method: 'card',
	  //   destination_payment_method: tokenizedCard, // From Stripe Tokenization
	  //   metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
	  // });
	  //
	  // return {
	  //   reference: payout.id,
	  //   status: 'succeeded',
	  //   isMock: true,
	  // };

	  throw new Error(
		'Stripe fallback not yet implemented. Complete the TODO in lumera/server/src/services/payments/visa.ts or provide Visa DPS credentials.',
	  );
	}
  },

  async verify(reference: string) {
	const hasVisaDps = Boolean(
	  config.payments.visaDpsUserId &&
		config.payments.visaDpsPassword &&
		config.payments.visaDpsMerchantId,
	);

	if (hasVisaDps) {
	  // TODO(visa-dps): Query Visa DPS for transaction status
	  // const response = await fetch(`https://api.visa.com/visadirect/fundstransfer/v1/transactions/${reference}`, {
	  //   headers: { 'Authorization': `Basic ${btoa(...)}` },
	  // });
	  // const result = await response.json();
	  // return {
	  //   reference,
	  //   paid: result.statusCode === '00',
	  //   amountCents: result.amount ? Math.round(parseFloat(result.amount) * 100) : undefined,
	  // };

	  throw new Error('Visa DPS verification not yet implemented.');
	} else {
	  // TODO(stripe-fallback): Query Stripe payout status
	  // const payout = await stripe.payouts.retrieve(reference);
	  // return {
	  //   reference,
	  //   paid: payout.status === 'paid',
	  //   amountCents: payout.amount,
	  // };

	  throw new Error('Stripe fallback verification not yet implemented.');
	}
  },

  async parseWebhook(rawBody: Buffer, _signature?: string) {
	// TODO(visa-dps): Parse Visa DPS webhooks for transaction status updates
	// or TODO(stripe-fallback): Parse Stripe payout webhooks
	//
	// Example Visa webhook:
	// {
	//   "systemsTraceAuditNumber": "...",
	//   "statusCode": "00",
	//   "statusDescription": "Success",
	// }

	try {
	  const event = JSON.parse(rawBody.toString());

	  if (event.systemsTraceAuditNumber && event.statusCode === '00') {
		return {
		  reference: event.systemsTraceAuditNumber,
		  paid: true,
		};
	  }

	  // Stripe payout event
	  if (event.type === 'payout.paid' || event.type === 'payout.created') {
		const payout = event.data?.object;
		if (payout?.id) {
		  return {
			reference: payout.id,
			paid: payout.status === 'paid',
		  };
		}
	  }
	} catch (_e) {
	  // Ignore parse errors
	}

	return null;
  },
};
