# LUMÉRA customer-data security audit

Reference date: August 21, 2026.

## Scope

This audit reviewed customer account sessions, public order lookup, payment verification and failure routes, order serialization, checkout redirect behavior, admin route protection, and production route wiring.

## Findings

### Critical: public order lookup returns private order data without an email

`GET /api/checkout/order/:orderNumber` loads an order by order number. If the `email` query parameter is omitted, the route still serializes and returns the order, then only redacts the email and phone. The serialized payload still includes the customer name, full shipping address, delivery notes, totals, payment reference, tracking fields, line items, and order events. The order number is not an authentication factor and should not be sufficient to retrieve private fulfillment data.

### Critical: payment verification returns the full order using only a reference

`POST /api/checkout/payment/verify` accepts only a payment reference, calls the payment provider, loads the associated order, and returns `loadOrder(order.id)` without checking the customer’s authenticated session or an ownership proof. With Paystack, the integration initializes the transaction reference from the human-facing order number, so a reference can be correlated with an order URL.

### High: payment failure can mutate an order using only a reference

`POST /api/checkout/payment/fail` accepts only a payment reference and can invoke `failOrderPayment` for the associated order. A leaked or guessed reference could therefore cancel another customer’s pending order and release its reserved inventory.

### Positive finding: authenticated customer-account routes are session-bound

Customer login issues a random opaque token stored as a SHA-256 hash in `customer_sessions` and an httpOnly cookie. `/api/auth/me`, `/api/auth/me/orders`, and address routes use `requireCustomer` and scope database queries to `req.customer.id`. Admin routes are mounted behind `requireAdmin` after the public login/logout endpoints.

### Privacy issue: email verification status is enumerable

`GET /api/auth/verify-status/:email` reveals whether an arbitrary email is verified or has an expired verification request. This is not a cross-order data leak, but it allows account-status enumeration and should be removed or changed to a non-enumerating response.

## Required remediation

Use a server-issued short-lived order-access token or require an authenticated customer session plus ownership matching for private order reads and payment verification/failure. Do not return private order data from a public order-number-only lookup. Preserve only the minimum redacted confirmation data needed for an unauthenticated post-checkout page. Add tests for missing, wrong, and correct ownership proofs and for payment-reference misuse.
