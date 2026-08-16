# LUMÉRA

A complete, production-oriented e-commerce application for a skincare brand: customer storefront, REST API, order system and a protected admin dashboard.

> **Simple skincare. Beautifully made.**

Built with standard, portable technologies. There are **no platform-specific dependencies** — it runs identically on your laptop, Render, Railway, Fly.io, a VPS, or any Node host.

---

## Table of contents

- [What is included](#what-is-included)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Database setup and migrations](#database-setup-and-migrations)
- [Building for production](#building-for-production)
- [Deployment](#deployment)
- [Connecting real services](#connecting-real-services)
- [Pre-launch checklist](#pre-launch-checklist)
- [API reference](#api-reference)
- [Testing](#testing)

---

## What is included

**Storefront** — Home, Shop (filter/sort/search), Product detail, Cart, Checkout, Order confirmation, About, Contact, FAQ, and four policy pages.

**Commerce** — Persistent cart, server-authoritative pricing, discount codes, inventory tracking, full order lifecycle, and a swappable payment provider layer.

**Admin dashboard** (`/admin`) — Sales analytics, order management with status transitions, product CRUD, inventory, customers, discount codes and review moderation.

**Production-ready foundations** — SEO metadata and structured data, dynamic sitemap, security headers, rate limiting, input validation and sanitisation, self-hosted fonts, code splitting, and lazy-loaded imagery.

### Honesty about what is real

This project deliberately does **not** fake functionality. Where a real external service is not yet connected, you get a clearly-labelled development driver plus a `TODO` marking the exact integration point:

| Area | Development state | Where to connect the real thing |
| --- | --- | --- |
| Payments | `mock` driver — **no card data collected, no money moves**. Server refuses to boot in production with it. | `server/src/services/payments/stripe.ts` |
| Email | `console` driver — messages are printed to the server log. | `server/src/services/email.ts` |
| Reviews | 13 seeded reviews flagged `is_placeholder`, labelled "Sample" in the UI and removable in one click. | Admin → Reviews |
| Orders | 8 seeded fixture orders, plus any mock-paid orders, marked "simulated" in the admin. | `npm run db:reset` |
| Analytics | First-party event store, no PII. | `client/src/lib/analytics.ts` |
| Instagram feed | Links to products. | `client/src/pages/Home.tsx` |
| Legal policies | Good-faith templates with `[BRACKETED]` placeholders. | `client/src/pages/Legal.tsx` |

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 18 + TypeScript + Vite | Fast builds, standard tooling |
| Styling | Tailwind CSS | No runtime CSS-in-JS cost |
| Routing | React Router 6 | Clean, SEO-friendly URLs |
| Backend | Node.js + Express + TypeScript | Ubiquitous and portable |
| Database | Knex query builder → **SQLite** (dev) / **PostgreSQL** (prod) | One codebase, both engines |
| Auth | JWT in an httpOnly cookie + bcrypt | Not readable by JavaScript |
| Validation | Zod | Same schemas describe and enforce |

Total client payload: **~33 kB gzipped** for the storefront; the admin bundle is code-split and never downloaded by customers.

---

## Project structure

```
lumera/
├── client/                      # React storefront + admin SPA
│   ├── public/
│   │   ├── images/              # Product & hero imagery
│   │   └── fonts/               # Self-hosted variable fonts
│   └── src/
│       ├── components/          # Header, Footer, CartDrawer, ProductCard, ui
│       ├── pages/               # One file per route
│       │   └── admin/           # Dashboard + panels (code-split)
│       ├── store/cart.tsx       # Cart state, persisted to localStorage
│       ├── lib/                 # api client, seo, analytics, formatting
│       └── types.ts             # Shared API types
│
├── server/                      # Express API
│   └── src/
│       ├── config.ts            # ALL env access happens here, once
│       ├── db/                  # knex setup, schema, migrate, seed, reset
│       ├── routes/              # products, checkout, public, admin
│       ├── services/
│       │   ├── payments/        # Swappable provider drivers
│       │   ├── email.ts         # Swappable email drivers
│       │   └── pricing.ts       # Server-authoritative money maths
│       ├── middleware/auth.ts   # Admin JWT guard
│       ├── data/catalog.ts      # ← Edit products here
│       └── index.ts             # App entry; serves the SPA in production
│
├── .env.example                 # Every variable, documented
└── package.json                 # npm workspaces root
```

---

## Quick start

**Requirements:** Node.js 18.18+ and npm 9+. No database server needed for local development.

```bash
# 1. Install all dependencies (root + both workspaces)
npm install

# 2. Create your environment file
cp .env.example .env
cp .env.example server/.env

# 3. Create the database schema and load the demo catalogue
npm run db:migrate
npm run db:seed

# 4. Start the API (:4000) and the storefront (:5173) together
npm run dev
```

Open **http://localhost:5173**.

| What | Where |
| --- | --- |
| Storefront | http://localhost:5173 |
| Admin dashboard | http://localhost:5173/admin |
| Admin login | `admin@lumera.test` / `lumera-admin` |
| API health | http://localhost:4000/api/health |
| Demo discount codes | `GLOW10`, `WELCOME15` (min $50), `FIVEOFF` (min $30) |

> The dev credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in your `.env`. **Change them before deploying.**

## Development admin dashboard (dev-only)

- **Local dev mocks enabled:** when running the client in development (`import.meta.env.DEV`), the admin dashboard uses an in-browser mock API backed by `localStorage`. This lets you use the full admin UI without a running server (safe for local testing).
 - **Local dev mocks enabled:** when running the client in development (`import.meta.env.DEV`), the admin dashboard uses an in-browser mock API backed by `localStorage`. This lets you use the full admin UI without a running server (safe for local testing).
 - **Opt-in mocks:** Dev mocks are now opt-in. To enable them set `VITE_ENABLE_DEV_MOCKS=true` in your client environment (e.g. `client/.env`) while running the Vite dev server. When this flag is not set the client will call the real API endpoints even in development — remove the mocks before deploying to production.
- **Dev login:** `admin@lumera.test` / `Erotic_bastard` (the seeded password). The client mock also accepts the original `lumera-admin` password for compatibility.
- **To run the real API server on Windows:** the `server` package depends on a native SQLite binding that requires the Visual Studio "Desktop development with C++" build tools. Install that workload, then run:

```powershell
cd lumera/server
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- If you prefer to keep using the client-side dev mocks (no server required), the admin UI is fully functional at `http://localhost:5173/admin`. Remove the mocks before deploying to production.

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | API + client with hot reload |
| `npm run dev:server` / `npm run dev:client` | Run one side only |
| `npm run build` | Type-check and build both for production |
| `npm start` | Run the production server (serves API + built SPA) |
| `npm run db:migrate` | Apply the schema (idempotent) |
| `npm run db:seed` | Load catalogue, admin user, demo data |
| `npm run db:reset` | **Drop everything** and recreate empty tables |
| `npm run typecheck` | Type-check without emitting |

---

## Environment variables

All configuration is read from the environment — never hardcoded. `server/src/config.ts` is the single place `process.env` is touched.

Copy `.env.example` to `.env` and edit. **Never commit `.env`** (it is git-ignored).

### Core

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` enables strict checks |
| `PORT` | `4000` | API port |
| `APP_URL` | `http://localhost:5173` | Public storefront URL; used for CORS, canonicals and the sitemap |
| `CORS_ORIGINS` | — | Extra allowed origins, comma separated (production only) |

### Database

| Variable | Default | Notes |
| --- | --- | --- |
| `DB_CLIENT` | `sqlite` | `sqlite` or `pg` |
| `SQLITE_FILE` | `./data/lumera.sqlite` | Used when `DB_CLIENT=sqlite` |
| `DATABASE_URL` | — | **Required** when `DB_CLIENT=pg` |
| `DATABASE_SSL` | `false` | Set `true` for most managed Postgres hosts |

### Authentication

| Variable | Default | Notes |
| --- | --- | --- |
| `JWT_SECRET` | dev fallback | **Required in production.** Generate: `openssl rand -base64 48` |
| `SESSION_TTL_SECONDS` | `28800` | Admin session lifetime (8h) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `admin@lumera.test` / `lumera-admin` | Used only by `db:seed` |

### Payments

| Variable | Default | Notes |
| --- | --- | --- |
| `PAYMENT_PROVIDER` | `mock` | `mock` or `stripe`. **Production refuses to start on `mock`.** |
| `CURRENCY` | `USD` | ISO 4217 code |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | — | Required when `PAYMENT_PROVIDER=stripe` |

### Store, email, client

| Variable | Default | Notes |
| --- | --- | --- |
| `SHIPPING_FLAT_RATE_CENTS` | `695` | Flat rate in minor units |
| `FREE_SHIPPING_THRESHOLD_CENTS` | `6000` | Free shipping at/above this subtotal |
| `TAX_RATE` | `0` | Decimal, e.g. `0.075` |
| `EMAIL_DRIVER` | `console` | `console` logs; `smtp` sends |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | — | SMTP credentials |
| `VITE_API_URL` | — | Only if the API is on a different domain |
| `VITE_ANALYTICS_ID` | — | For a third-party analytics provider |

> ⚠️ **Anything prefixed `VITE_` is compiled into the public browser bundle.** Never put a secret there.

---

## Database setup and migrations

Every query uses the Knex query builder rather than dialect-specific SQL, so the same code runs on both engines. Money is stored as **integer minor units (cents)** throughout — no floating-point rounding errors.

### SQLite (default, local development)

Zero configuration. `npm run db:migrate` creates `server/data/lumera.sqlite`.

### PostgreSQL (recommended for production)

```bash
createdb lumera        # or provision one with your host
```

```bash
DB_CLIENT=pg
DATABASE_URL=postgresql://user:password@host:5432/lumera
DATABASE_SSL=true      # most managed providers require this
```

Then run the same commands — no code changes:

```bash
npm run db:migrate
npm run db:seed        # optional: loads the demo catalogue
```

### Migration strategy

`db:migrate` is **idempotent** — each table is created only if absent, so it is safe to run on every deploy. The server also calls the same routine at startup as a safety net.

For evolving a live schema, add a Knex migration file and run it as an explicit deploy step:

```bash
npx knex migrate:make add_gift_notes --knexfile server/knexfile.cjs
npx knex migrate:latest --knexfile server/knexfile.cjs
```

### Schema

`admin_users`, `products`, `reviews`, `discount_codes`, `customers`, `orders`, `order_items`, `order_events`, `subscribers`, `contact_messages`, `analytics_events`.

Order items **denormalise** product name, slug, image, size and unit price, so historical orders stay accurate even after a product is renamed, repriced or deleted.

---

## Building for production

```bash
npm run build     # type-checks, builds client → client/dist, server → server/dist
npm start         # serves API + SPA from one origin on $PORT
```

When `client/dist` exists, the Express server serves it automatically with correct caching (hashed assets `immutable` for a year; `index.html` `no-cache`) and SPA history fallback. **One process, one port, one origin** — no CORS configuration needed.

Alternatively, deploy the client as static files to a CDN and point `VITE_API_URL` at a separately-hosted API.

---

## Deployment

### Requirements

- Node.js 18.18+
- A PostgreSQL database (SQLite is not appropriate for multi-instance or ephemeral-disk hosting)
- HTTPS (secure cookies and HSTS are enabled automatically when `NODE_ENV=production`)

### Any Node host (Render, Railway, Fly.io, Heroku, VPS)

| Setting | Value |
| --- | --- |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check | `/api/health` |

Set at minimum:

```bash
NODE_ENV=production
APP_URL=https://yourdomain.com
DB_CLIENT=pg
DATABASE_URL=postgresql://...
DATABASE_SSL=true
JWT_SECRET=<openssl rand -base64 48>
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
EMAIL_DRIVER=smtp
EMAIL_FROM="LUMÉRA <hello@yourdomain.com>"
SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASSWORD=...
```

Then run `npm run db:migrate` once against the production database.

### Docker

A `Dockerfile` and `docker-compose.yml` are included. `docker compose up` starts the app with PostgreSQL:

```bash
docker compose up --build
```

### Split hosting (static CDN + API)

1. Build the client with `VITE_API_URL=https://api.yourdomain.com`.
2. Deploy `client/dist` to Vercel, Netlify, Cloudflare Pages, S3+CloudFront…
3. Deploy the server anywhere Node runs.
4. Set `CORS_ORIGINS=https://yourdomain.com` on the API.

### Portability notes

- No proprietary SDKs, no vendor lock-in, no platform-specific config files required.
- The server binds `0.0.0.0` and honours `$PORT`.
- `app.set('trust proxy', 1)` is configured for reverse proxies.
- Payment and email providers are interface-based and swappable.

---

## Connecting real services

### Payments

Every provider implements the `PaymentProvider` interface in `server/src/services/payments/types.ts`. To enable Stripe:

```bash
npm --workspace server install stripe
```

Complete the marked `TODO`s in `server/src/services/payments/stripe.ts` (`createIntent`, `verify`, `parseWebhook`), then set `PAYMENT_PROVIDER=stripe` and point a webhook at `POST /api/payments/webhook`. That route already receives a **raw body** so signature verification works.

To add Paystack, Flutterwave or another processor: create a new driver implementing the same interface, register it in `payments/index.ts`, and set `PAYMENT_PROVIDER` accordingly. **No route, controller or database code changes.**

> **Card data never touches this server.** Only the provider's reference ID is stored.

### Email

Implement `smtpDriver` in `server/src/services/email.ts` (nodemailer or a provider SDK) and set `EMAIL_DRIVER=smtp`. Templates for order confirmation, payment confirmation, shipped and delivered are already written and wired to the order lifecycle.

### Analytics

Events (`product_viewed`, `add_to_cart`, `checkout_started`, `purchase_completed`) already flow through `track()` in `client/src/lib/analytics.ts`. Add your provider snippet and forward the event at the marked `TODO`.

### Products

Edit `server/src/data/catalog.ts` and re-seed, or manage products through the admin dashboard after launch.

> **Copy policy:** use cosmetic language only ("helps improve the appearance of…", "helps hydrate…"). Never medical claims ("cures acne", "treats eczema", "guaranteed results"). The existing copy follows this rule.

### Product images

Drop files into `client/public/images/` and reference them as `/images/name.jpg`, or paste a full CDN URL in the admin product editor. For direct uploads, add an S3/Cloudinary handler — the admin editor accepts any URL, so no schema change is needed.

---

## Pre-launch checklist

**Security**
- [ ] Set a strong `JWT_SECRET` (`openssl rand -base64 48`)
- [ ] Change `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the defaults
- [ ] Confirm `.env` is not committed
- [ ] Serve over HTTPS
- [ ] Set `CORS_ORIGINS` to your real domains

**Payments & email**
- [ ] Implement and configure a real payment provider
- [ ] Verify the webhook signature path end to end
- [ ] Connect SMTP and send a live test of each template

**Content & compliance**
- [ ] Remove placeholder reviews (Admin → Reviews → *Remove all samples*)
- [ ] `npm run db:reset` to clear fixture orders, then re-seed products only
- [ ] Replace every `[BRACKETED]` placeholder in `client/src/pages/Legal.tsx`
- [ ] **Have a lawyer review all four policy pages**
- [ ] Replace real product imagery, copy and ingredient lists
- [ ] Update social links in `Footer.tsx` (currently `#`)
- [ ] Confirm no medical claims anywhere in your copy

**Infrastructure**
- [ ] Switch to PostgreSQL and run `db:migrate`
- [ ] Configure automated database backups
- [ ] Submit `/sitemap.xml` to Google Search Console

---

## API reference

### Public

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/config` | Currency, shipping rules, payment mode |
| `GET` | `/api/products` | List — `category`, `search`, `sort`, `featured`, `bestSellers`, `limit` |
| `GET` | `/api/products/:slug` | Product + reviews + related |
| `POST` | `/api/checkout/quote` | Server-authoritative totals |
| `POST` | `/api/checkout/discount` | Validate a discount code |
| `POST` | `/api/checkout/order` | Place an order (rate limited) |
| `GET` | `/api/checkout/order/:orderNumber` | Order lookup (redacted without `?email=`) |
| `POST` | `/api/newsletter` · `/api/contact` · `/api/analytics` | Rate-limited submissions |
| `POST` | `/api/payments/webhook` | Provider webhook (raw body) |
| `GET` | `/sitemap.xml` · `/robots.txt` | SEO |

### Admin — all require a valid session cookie

`POST /api/admin/login` · `POST /api/admin/logout` · `GET /api/admin/me` · `GET /api/admin/analytics` · `GET|PATCH /api/admin/orders` · `GET /api/admin/customers` · `GET|POST|PUT|DELETE /api/admin/products` · `GET|DELETE /api/admin/reviews` · `DELETE /api/admin/reviews/placeholders` · `GET|POST|PATCH|DELETE /api/admin/discounts` · `GET /api/admin/messages`

### Security measures

Server-authoritative pricing (client totals are never trusted) · Zod validation on every input · HTML tag stripping on user content · bcrypt (cost 12) password hashing · httpOnly + SameSite + Secure session cookies · rate limiting on login, checkout and public forms · Helmet security headers with CSP and HSTS · parameterised queries throughout · no raw card data stored, ever.

---

## Testing

An end-to-end Playwright suite covering **66 assertions** lives in `.qa/e2e.mjs`:

```bash
npx playwright install chromium
npm run dev          # in another terminal
node .qa/e2e.mjs
```

It verifies every page's metadata and heading hierarchy, filtering/sorting/search, the full cart lifecycle including persistence and discounts, checkout through to order creation, admin authentication and product CRUD, seven viewports from iPhone SE to 1920px desktop, touch-target sizing, console errors and broken links.

---

## License

Proprietary — all rights reserved. The LUMÉRA name, copy and visual identity in this repository are original and were created for this project.
