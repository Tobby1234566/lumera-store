import 'dotenv/config';

/**
 * Central configuration. Every externally-configurable value is read from the
 * environment exactly once, here, so the rest of the codebase never touches
 * `process.env` directly. This keeps secrets out of source and makes the app
 * portable across hosting providers.
 */

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProduction = NODE_ENV === 'production';

// In production a real secret MUST be supplied. In development we fall back to
// a well-known throwaway value so the project runs with zero configuration.
const devJwtSecret = 'lumera-development-secret-do-not-use-in-production';

export const config = {
  env: NODE_ENV,
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  /** Public origin of the storefront, used for CORS + canonical/sitemap URLs. */
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    /** 'sqlite' (zero-config local dev) or 'pg' (PostgreSQL, recommended in production). */
    client: (process.env.DB_CLIENT ?? 'sqlite') as 'sqlite' | 'pg',
    connectionString: process.env.DATABASE_URL ?? '',
    sqliteFile: process.env.SQLITE_FILE ?? './data/lumera.sqlite',
    ssl: process.env.DATABASE_SSL === 'true',
  },

  auth: {
    jwtSecret: isProduction ? required('JWT_SECRET') : (process.env.JWT_SECRET ?? devJwtSecret),
    /** Admin session lifetime. */
    sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 8),
    cookieName: 'lumera_admin_session',
  },

  /** Seed credentials for the first admin user (used by `npm run db:seed`). */
  seedAdmin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@lumera.test',
    password: process.env.ADMIN_PASSWORD ?? 'Erotic_bastard',
    name: process.env.ADMIN_NAME ?? 'LUMÉRA Admin',
  },

  payments: {
    /**
     * Active payment provider. 'mock' is a development-only driver that never
     * touches real money. Choose from: 'mock', 'stripe', 'paypal', 'zelle', 'visa'
     * See server/src/services/payments/ for implementation details.
     */
    provider: (process.env.PAYMENT_PROVIDER ?? 'mock') as 'mock' | 'stripe' | 'paypal' | 'zelle' | 'visa',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    paypalClientId: process.env.PAYPAL_CLIENT_ID ?? '',
    paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET ?? '',
    paypalMode: (process.env.PAYPAL_MODE ?? 'sandbox') as 'sandbox' | 'live',
    paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID ?? '',
    visaDpsUserId: process.env.VISA_DPS_USER_ID ?? '',
    visaDpsPassword: process.env.VISA_DPS_PASSWORD ?? '',
    visaDpsMerchantId: process.env.VISA_DPS_MERCHANT_ID ?? '',
    currency: process.env.CURRENCY ?? 'USD',
  },

  email: {
    /** 'console' logs emails to stdout in development; 'smtp' sends for real. */
    driver: (process.env.EMAIL_DRIVER ?? 'console') as 'console' | 'smtp',
    from: process.env.EMAIL_FROM ?? 'LUMÉRA <hello@lumera.example>',
    smtpHost: process.env.SMTP_HOST ?? '',
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPassword: process.env.SMTP_PASSWORD ?? '',
  },

  store: {
    currency: process.env.CURRENCY ?? 'USD',
    /** Flat shipping rate in minor units (cents). */
    shippingFlatRateCents: Number(process.env.SHIPPING_FLAT_RATE_CENTS ?? 695),
    /** Orders at or above this subtotal ship free. */
    freeShippingThresholdCents: Number(process.env.FREE_SHIPPING_THRESHOLD_CENTS ?? 6000),
    taxRate: Number(process.env.TAX_RATE ?? 0),
  },
};

export type AppConfig = typeof config;
