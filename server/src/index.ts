import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { db } from './db/knex.js';
import { createSchema } from './db/schema.js';
import { errorHandler } from './lib/http.js';
import { productsRouter } from './routes/products.js';
import { checkoutRouter, webhookHandler } from './routes/checkout.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { getPaymentProvider } from './services/payments/index.js';

const app = express();

// Behind a reverse proxy (Render, Fly, Railway, Nginx) so rate limiting and
// secure cookies see the real client protocol/IP.
app.set('trust proxy', 1);

app.use(
  helmet({
    // The SPA is served from the same origin in production; relax CSP for the
    // Vite dev client and inline structured-data scripts.
    contentSecurityPolicy: config.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'"],
            frameAncestors: ["'self'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(compression());
app.use(cookieParser());

const allowedOrigins = config.corsOrigins.length ? config.corsOrigins : [config.appUrl];
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Same-origin/server-to-server requests have no Origin header.
      if (!origin) return callback(null, true);
      if (!config.isProduction) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // E2B / preview hosts.
      if (/^https:\/\/[\w-]+\.e2b\.app$/.test(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  }),
);

// The payment webhook needs the RAW body for signature verification, so it is
// registered before the JSON body parser.
app.post('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }), webhookHandler);

app.use(express.json({ limit: '512kb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await db.raw('select 1');
    res.json({ ok: true, env: config.env, db: config.db.client });
  } catch {
    res.status(503).json({ ok: false, error: 'database unavailable' });
  }
});

app.use('/api/products', productsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', publicRouter);

// robots.txt and sitemap.xml are also exposed at the site root.
app.get('/robots.txt', (req, res, next) => {
  req.url = '/api/robots.txt';
  app._router.handle(req, res, next);
});
app.get('/sitemap.xml', (req, res, next) => {
  req.url = '/api/sitemap.xml';
  app._router.handle(req, res, next);
});

/**
 * Production: serve the built SPA from the same origin. In development Vite
 * serves the client on :5173 and proxies /api here.
 */
const clientDist = path.resolve(process.cwd(), '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      // Hashed asset filenames can be cached aggressively; index.html cannot.
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (/\.(js|css|woff2?|jpg|jpeg|png|svg|webp|avif)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

async function start() {
  // Fail fast on unsafe production configuration.
  if (config.isProduction) {
    const provider = getPaymentProvider();
    if (!provider.isLive) {
      throw new Error(
        'Refusing to start in production with PAYMENT_PROVIDER=mock. Configure a real payment provider before going live.',
      );
    }
    if (!provider.isConfigured()) {
      throw new Error(`Payment provider "${provider.name}" is missing required credentials.`);
    }
  }

  // Ensure the schema exists (idempotent). In a larger team you would run
  // `npm run db:migrate` as an explicit deploy step instead.
  await createSchema(db);

  app.listen(config.port, '0.0.0.0', () => {
    const provider = getPaymentProvider();
    console.log(`\n  LUMÉRA API`);
    console.log(`  ▸ listening   http://0.0.0.0:${config.port}`);
    console.log(`  ▸ environment ${config.env}`);
    console.log(`  ▸ database    ${config.db.client}`);
    console.log(`  ▸ payments    ${provider.name}${provider.isLive ? '' : '  (SIMULATED — no real money moves)'}`);
    console.log(`  ▸ email       ${config.email.driver}${config.email.driver === 'console' ? '  (logged, not sent)' : ''}\n`);
  });
}

start().catch((err) => {
  console.error('[startup] failed:', err);
  process.exit(1);
});
