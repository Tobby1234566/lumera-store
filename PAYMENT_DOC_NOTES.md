# Payment integration notes

## Stripe

Official Stripe webhook guidance at https://docs.stripe.com/webhooks confirms that webhook signature verification requires the raw request body and the `Stripe-Signature` header. Stripe recommends official library verification, rejects manipulated request bodies, includes a signed timestamp, and expects a quick successful response. PaymentIntent status should be confirmed server-side; the browser return is not proof of payment.

## Flutterwave

Official Flutterwave webhook guidance at https://developer.flutterwave.com/docs/webhooks confirms that the webhook signature is delivered in the `flutterwave-signature` header and is an HMAC-SHA256 digest of the raw body using the configured secret hash. Before granting value, the server must re-query the transaction and verify status, amount, currency, and transaction reference. Flutterwave also recommends fast acknowledgements, retries, and idempotent event handling.
