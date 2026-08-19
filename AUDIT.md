# LUMÉRA Repository Audit

## Baseline

The repository is a custom React/Vite frontend with an Express/TypeScript backend and Knex-backed SQLite/PostgreSQL persistence. Dependencies installed successfully. The baseline `npm run typecheck`, `npm run build`, `npm run db:migrate`, and `npm run db:seed` commands completed successfully on 2026-08-19.

## Confirmed strengths

The project already has a responsive storefront, an admin dashboard, server-authoritative quote calculation, integer minor-unit money fields, Zod request validation, bcrypt password hashing for admin users, JWTs in HTTP-only cookies, Helmet, CORS, compression, rate limiting, a raw-body webhook mount, product/order/customer/discount/review CRUD, SEO routes, and a seeded local catalogue.

## Critical gaps found

| Area | Finding | Priority |
|---|---|---|
| Payments | Stripe driver is only a scaffold and throws `NOT_IMPLEMENTED`; Flutterwave is not registered or configured. | Blocker |
| Customer accounts | Registration and email verification exist, but there is no customer password, login, logout, password reset, session, profile, address, or authenticated order-history flow. | Blocker |
| Inventory | Payment settlement decrements inventory with `GREATEST(..., 0)` and does not atomically reject oversells or reserve stock before payment. | High |
| Checkout | Payment failures after order creation leave pending orders without a clear retry/cancellation path; redirect providers have no return verification endpoint. | High |
| Webhooks | The handler identifies the active provider but only passes a Stripe header name and lacks persisted webhook event idempotency. | High |
| Admin payment integrity | Admin order patching can directly alter `payment_status`, which can bypass the single settlement path. | High |
| Email | SMTP driver is still a TODO and throws when enabled. | High |
| Database evolution | Schema creation is idempotent but is not a versioned migration history; several required account/address/payment idempotency fields are absent. | High |
| Documentation | README claims live Stripe/PayPal implementations that are not present and contains duplicated dev-mock text plus inconsistent seeded passwords. | Medium |
| Testing | There is a Playwright script but no root `test` script and no automated backend test suite covering checkout/payment/auth boundaries. | High |

## Safe implementation boundary

Preserve the existing React/Express/Knex stack and route shape. Add customer authentication and account functionality as a first-class layer rather than replacing the admin session model. Keep payment providers behind the existing `PaymentProvider` interface. Introduce explicit, versioned migrations for additive schema changes, and keep local SQLite support intact while ensuring PostgreSQL-compatible queries. Do not claim live payment or email behavior without provider credentials and a verified end-to-end test.

## Ordered backlog

1. Add additive schema migrations for customer credentials/sessions, addresses, payment records, and webhook idempotency.
2. Add customer password registration/login/logout/reset and protected account endpoints using secure HTTP-only cookies.
3. Harden checkout settlement and inventory updates with atomic stock checks, idempotent payment records, and an explicit payment-failure path.
4. Implement Stripe Payment Intents and signed webhook verification using the official SDK.
5. Implement Flutterwave initialization, server-side verification, and webhook signature validation behind the same provider interface.
6. Add real SMTP delivery using a configurable mail transport while preserving the console driver for development.
7. Wire storefront account, checkout payment redirect/client confirmation, order history, and reset/verification pages to the APIs.
8. Lock admin authorization so payment settlement cannot be forged through status patches.
9. Add focused backend tests and run Playwright smoke coverage.
10. Re-run typecheck, build, migrations, security checks, and update operational documentation with exact configuration requirements.
