import { config } from '../../config.js';
import type { PaymentProvider, PaymentIntentInput, PaymentIntentResult } from './types.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PAYPAL DRIVER — INTEGRATION POINT
 * ─────────────────────────────────────────────────────────────────────────────
 * PayPal Commerce Platform integration for checkout flows.
 *
 * TO ACTIVATE PAYPAL:
 *
 *   1. npm --workspace server install paypalrestsdk
 *   2. Get your credentials from https://developer.paypal.com/dashboard
 *   3. Set in your environment (never in source control):
 *        PAYMENT_PROVIDER=paypal
 *        PAYPAL_CLIENT_ID=...
 *        PAYPAL_CLIENT_SECRET=...
 *        PAYPAL_MODE=sandbox  (or 'live' for production)
 *   4. Point a PayPal webhook at POST /api/payments/webhook and subscribe to
 *      CHECKOUT.ORDER.COMPLETED, PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.REFUNDED
 *
 * SECURITY NOTES
 *   - Sensitive payment data is processed entirely server-to-server with PayPal
 *   - The browser is redirected to PayPal's hosted checkout and back
 *   - We verify all webhooks by querying PayPal directly instead of trusting signatures
 */

const NOT_IMPLEMENTED =
  'The PayPal driver is scaffolded but not yet implemented. Install the PayPal SDK and complete server/src/services/payments/paypal.ts, or set PAYMENT_PROVIDER=mock for development.';

// import paypal from 'paypalrestsdk';

// paypal.configure({
//   mode: config.payments.paypalMode as 'sandbox' | 'live',
//   client_id: config.payments.paypalClientId,
//   client_secret: config.payments.paypalClientSecret,
// });

export const paypalProvider: PaymentProvider = {
  name: 'paypal',
  isLive: true,

  isConfigured() {
	return Boolean(
	  config.payments.paypalClientId &&
		config.payments.paypalClientSecret &&
		config.payments.paypalMode,
	);
  },

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
	// TODO(paypal): Create an order via PayPal Orders API
	//
	// Example (using paypalrestsdk):
	//
	//   const order = paypal.Order.create({
	//     intent: 'CAPTURE',
	//     payer: {
	//       email_address: input.customerEmail,
	//     },
	//     purchase_units: [
	//       {
	//         reference_id: input.orderNumber,
	//         amount: {
	//           currency_code: input.currency,
	//           value: (input.amountCents / 100).toString(),
	//         },
	//       },
	//     ],
	//     application_context: {
	//       return_url: input.returnUrl,
	//       cancel_url: input.returnUrl,
	//       landing_page: 'LOGIN',
	//       user_action: 'PAY_NOW',
	//     },
	//   });
	//
	//   if (order.success()) {
	//     const approvalUrl = order.links.find((link: any) => link.rel === 'approve')?.href;
	//     return {
	//       reference: order.id,
	//       status: 'requires_redirect',
	//       redirectUrl: approvalUrl,
	//       isMock: false,
	//     };
	//   } else {
	//     throw new Error(`PayPal order creation failed: ${order.error.message}`);
	//   }

	throw new Error(NOT_IMPLEMENTED);
  },

  async verify(reference: string) {
	// TODO(paypal): Query the order status directly from PayPal
	//
	// Example:
	//
	//   const order = paypal.Order.find(reference);
	//   if (order.success()) {
	//     const isPaid = order.status === 'APPROVED' || order.status === 'COMPLETED';
	//     const amountCents = order.purchase_units[0]?.amount?.value
	//       ? Math.round(parseFloat(order.purchase_units[0].amount.value) * 100)
	//       : undefined;
	//     return { reference, paid: isPaid, amountCents };
	//   } else {
	//     throw new Error(`PayPal verification failed: ${order.error.message}`);
	//   }

	throw new Error(NOT_IMPLEMENTED);
  },

  async parseWebhook(rawBody: Buffer, signature?: string) {
	// TODO(paypal): Validate webhook signature and parse event
	//
	// Example:
	//
	//   const body = JSON.parse(rawBody.toString());
	//   
	//   // For production, verify the webhook signature with PayPal
	//   // See: https://developer.paypal.com/docs/api-basics/notifications/webhooks/rest-webhooks/
	//
	//   if (body.event_type === 'CHECKOUT.ORDER.COMPLETED') {
	//     const resourceId = body.resource?.id;
	//     return {
	//       reference: resourceId,
	//       paid: true,
	//     };
	//   }
	//
	//   if (body.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
	//     const resourceId = body.resource?.supplementary_data?.related_ids?.order_id;
	//     return {
	//       reference: resourceId,
	//       paid: true,
	//     };
	//   }
	//
	//   return null; // Ignore unrecognized events

	throw new Error(NOT_IMPLEMENTED);
  },
};
