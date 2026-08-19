# Security and quality review

## Completed checks

The application uses Helmet security headers, a production CSP, secure cookie flags, server-side Zod validation, bcrypt password hashing, HTTP-only opaque customer sessions, signed admin JWT cookies, rate limiting on login, checkout, verification, recovery, and public writes, raw-body payment webhook parsing, webhook signature verification, payment amount/currency checks, idempotent webhook event records, and server-authoritative pricing.

The review also confirmed that no live secrets are committed. The only matched secret-looking values are documented placeholders in `.env.example`, `README.md`, `docker-compose.yml`, and development-only compatibility credentials. Production configuration rejects mock payment providers and requires provider credentials.

The production dependency audit reports zero vulnerabilities with both `npm audit --audit-level=high` and `npm audit --omit=dev --audit-level=high`. Vite is pinned to the secure 6.4.3 patch release rather than using the breaking Vite 8 migration.

The Playwright suite passed 70 checks, including SEO metadata, headings, image alt attributes, cart persistence, discount validation, mock checkout, admin authentication and CRUD, responsive layouts, touch-target sizing, overflow checks, and internal links.

## Known deployment-dependent items

Real Stripe and Flutterwave transactions still require merchant credentials, provider dashboard webhook configuration, HTTPS, and end-to-end provider test transactions. Real SMTP delivery requires SMTP credentials. Product image uploads remain URL-based; production deployments should use a persistent object-storage/CDN workflow rather than relying on local filesystem writes. Legal policy placeholders, real brand social URLs, production product imagery, and removal of seeded sample orders/reviews remain content-launch tasks.
