# LUMÉRA E-commerce Operating Agent

## Decision
Extend the existing Lumera application instead of migrating the current storefront to another commerce platform. The repository already provides the storefront, cart, server-authoritative checkout, product and order data, admin authentication, payment-provider abstraction, and transactional email integration. The agent will sit behind the authenticated admin area and use the existing server-side APIs and database.

## Operating model

The agent can inspect store data, identify opportunities, draft content, classify customer messages, summarize performance, and perform non-financial housekeeping automatically. Any action that changes or commits money requires an approval record and explicit owner approval before execution.

## Automatically permitted actions

- Analyze sales, inventory, product catalog completeness, customer messages, and order status.
- Create internal recommendations and activity records.
- Draft product copy, SEO copy, customer replies, campaign ideas, and replenishment suggestions.
- Tag or classify internal records when a future integration is connected.
- Send routine non-financial notifications only when a real email provider is configured.

## Approval-required actions

- Create, activate, change, or delete discounts.
- Change product prices or compare-at prices.
- Issue refunds, credits, or cancellations with financial effect.
- Place supplier or advertising orders.
- Change payment, payout, tax, or shipping settings.
- Send a campaign or message that commits spend or offers a financial incentive.

## First implementation slice

1. Add agent approvals, activities, and settings tables using the existing portable Knex schema.
2. Add authenticated admin endpoints for agent overview, audit, chat, approval, and rejection.
3. Add a store-audit engine that generates actionable opportunities from current catalog, inventory, orders, customers, and contact messages.
4. Add an optional OpenAI-compatible server-side chat adapter. It is disabled unless AI_PROVIDER, AI_MODEL, and AI_API_KEY are configured; no secret is exposed to the browser.
5. Add an Agent tab to the admin dashboard with policy display, audit trigger, opportunity cards, activity feed, and approval queue.
6. Keep money actions behind a server-side approval gate; never let a model call payment or discount code mutation routes directly.

## Deferred integrations

- Shopify sync is not used because this repository currently owns checkout and payment orchestration. A Shopify adapter can be added later if the owner chooses to migrate.
- Telegram, Gmail, Google Sheets, ad platforms, and supplier APIs require explicit account connection and credentials before enabling them.
- Production recurring execution should use the deployment host’s cron/worker or an event webhook; the initial implementation exposes the audit endpoint and does not silently create an unconfigured background process.

## Verification notes

The new Agent tab is present in the admin navigation. During local verification, a pre-existing schema mismatch prevented first login because the login route wrote `updated_at` while the admin table did not define it. The schema now includes `admin_users.updated_at` and an additive upgrade for existing databases. A second issue in the original schema guard incorrectly checked for `products` before creating `customers`; that guard was corrected. The local admin login then succeeded and the Agent tab loaded.

The authenticated Agent panel loaded successfully. It displays the guardrail banner, store metrics, opportunities, approval queue, and chat form. Running “Run store audit” created an activity entry and refreshed the panel without errors.

The Agent panel chat was tested with no AI_API_KEY configured. It returned a clear audit-only fallback message rather than failing or attempting an external call. The panel also showed that money-related actions remain locked by default.

Approval-gate verification: a local price-change request was created as `pending` with product price unchanged at 2400 cents. After an explicit approval request, the approval became `approved`, an execution timestamp and reviewer were stored, and the product price changed to 2500 cents. This test used only seeded local data with mock payments and no live transaction.

Live overview verification after seeding: the agent reported 7 products, 8 orders, 6 paid/fulfilled orders, 8 customers, $506.95 in recorded mock revenue, one pending order opportunity, and three activity entries. An unauthenticated request to `/api/admin/agent/overview` correctly returned HTTP 401.
