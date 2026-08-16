import { config } from '../../config.js';
import type { PaymentProvider, PaymentIntentInput, PaymentIntentResult } from './types.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ZELLE DRIVER — MOCK & PRODUCTION NOTES
 * ─────────────────────────────────────────────────────────────────────────────
 * Zelle is a real-time bank transfer system operated by Early Warning Services LLC.
 * It's integrated directly into most US banks' apps and web platforms.
 *
 * PRODUCTION INTEGRATION:
 *   Zelle itself does NOT provide a direct merchant API. Instead:
 *
 *   Option A (Recommended): Integrate via your bank's payment processor
 *     - Contact your merchant bank (Chase, Bank of America, etc.)
 *     - Request ACH/RTP (Real-Time Payments) capabilities
 *     - They provide credentials and API endpoints
 *
 *   Option B: Use Stripe's ACH transfer API
 *     - Already have Stripe configured? Use Stripe Payouts with ACH
 *     - Lower friction, but fees apply
 *     - Set PAYMENT_PROVIDER=stripe and enable ACH in Stripe Dashboard
 *
 *   Option C: Use Plaid + bank integration
 *     - Plaid authenticates customer bank account
 *     - Initiate ACH transfer via your bank's processor
 *
 * FOR DEVELOPMENT:
 *   This mock driver simulates Zelle transfers succeeding after a brief delay.
 *   Useful for testing checkout and order flows without real bank integration.
 *
 * TO USE IN DEVELOPMENT:
 *   Set in your environment:
 *     PAYMENT_PROVIDER=zelle
 *   No other configuration needed for the mock.
 */

/**
 * For local development, simulate a pending→completed Zelle transfer.
 * In production, replace this with real bank ACH/RTP API calls.
 */
const pendingTransfers: Record<
  string,
  {
	amountCents: number;
	completeAt: Date;
  }
> = {};

export const zelleProvider: PaymentProvider = {
  name: 'zelle',
  isLive: false, // This is a development mock; production uses your bank's API

  isConfigured() {
	// Mock driver needs no configuration
	return true;
  },

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
	// In production, this would:
	// 1. Query the customer's bank account (via Plaid or KYC data)
	// 2. Initiate an ACH or RTP transfer to the merchant account
	// 3. Return a reference and potentially a redirect (for bank auth)
	//
	// For development, we simulate success after a short delay:
	const referenceId = `zelle_${input.orderId}_${Date.now()}`;
	const completeAfterMs = 3000; // Simulate 3-second processing

	pendingTransfers[referenceId] = {
	  amountCents: input.amountCents,
	  completeAt: new Date(Date.now() + completeAfterMs),
	};

	return {
	  reference: referenceId,
	  status: 'requires_redirect',
	  redirectUrl: `${input.returnUrl}?payment_reference=${referenceId}`,
	  isMock: true,
	};
  },

  async verify(reference: string) {
	// In production, query your bank's ACH status API
	// For development, check if the simulated transfer is complete:
	const transfer = pendingTransfers[reference];

	if (!transfer) {
	  return { reference, paid: false };
	}

	const isPaid = new Date() >= transfer.completeAt;

	if (isPaid) {
	  delete pendingTransfers[reference]; // Clean up
	}

	return {
	  reference,
	  paid: isPaid,
	  amountCents: transfer.amountCents,
	};
  },

  async parseWebhook(rawBody: Buffer, _signature?: string) {
	// In production, parse bank webhooks for ACH status updates.
	// Zelle transfers typically complete within minutes via FASTER:
	// https://www.ebasingcorp.com/FasterPayments/
	//
	// For development, we don't expect real webhooks. Return null to ignore.

	try {
	  const event = JSON.parse(rawBody.toString());

	  // Example production webhook structure (varies by bank):
	  // {
	  //   "event": "ach.completed",
	  //   "reference": "zelle_...",
	  //   "status": "settled",
	  //   "amount": 12345,
	  // }

	  if (event.event === 'ach.completed' && event.reference) {
		return {
		  reference: event.reference,
		  paid: event.status === 'settled',
		};
	  }
	} catch (_e) {
	  // Ignore parse errors
	}

	return null;
  },
};
