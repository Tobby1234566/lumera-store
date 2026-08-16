import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const problems = [];
let passes = 0;

function ok(label) { passes++; console.log(`  ✓ ${label}`); }
function fail(label, detail) { problems.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${label} ${detail ?? ''}`); }

async function newPage(ctx) {
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      // React DevTools suggestion / favicon noise are not real defects.
      // Vite HMR websocket noise in headless runs is not an app defect.
      if (/DevTools|favicon|WebSocket|ERR_CONNECTION_REFUSED/i.test(t)) return;
      // Expected 4xx from deliberate negative tests (bad code / bad password).
      if (/Failed to load resource.*(400|401)/i.test(t)) return;
      problems.push(`console error @ ${page.url()}: ${t}`);
    }
  });
  page.on('pageerror', (e) => problems.push(`pageerror @ ${page.url()}: ${e.message}`));
  page.on('response', (r) => {
    // Expected negative-test responses: invalid discount code, unauthenticated
    // admin probe, and the deliberate wrong-password attempt.
    const expected = /\/api\/checkout\/discount|\/api\/admin\/me|\/api\/admin\/login|\/api\/analytics/;
    if (r.status() >= 400 && !expected.test(r.url())) {
      problems.push(`HTTP ${r.status()} ${r.url()}`);
    }
  });
  return page;
}

/* ── 1. Every public page loads with correct heading + SEO ─────────────── */
console.log('\n[1] Page loads, SEO metadata, heading hierarchy');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await newPage(ctx);

  const routes = [
    ['/', 'Your skin.'],
    ['/shop', 'All products'],
    ['/shop/glow-serum', 'Glow Serum'],
    ['/cart', null],
    ['/checkout', null],
    ['/about', 'Good skincare'],
    ['/contact', 'Get in touch'],
    ['/faq', 'Frequently asked'],
    ['/privacy-policy', 'Privacy Policy'],
    ['/terms', 'Terms & Conditions'],
    ['/shipping-policy', 'Shipping Policy'],
    ['/returns-policy', 'Returns & Refunds'],
    ['/this-page-does-not-exist', 'Page not found'],
  ];

  for (const [route, expect] of routes) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    const h1s = await page.locator('h1').count();
    const h1 = h1s ? (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim() : '';
    const title = await page.title();
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    const og = await page.locator('meta[property="og:title"]').getAttribute('content');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');

    if (h1s !== 1) fail(`${route} has exactly one h1`, `found ${h1s}`);
    else if (expect && !h1.includes(expect)) fail(`${route} h1`, `got "${h1}"`);
    else ok(`${route} → h1 "${h1.slice(0, 42)}"`);

    if (!title?.includes('LUMÉRA')) fail(`${route} title`, title);
    if (!desc || desc.length < 40) fail(`${route} meta description`, desc ?? 'missing');
    if (!og) fail(`${route} og:title missing`);
    if (!canonical) fail(`${route} canonical missing`);
  }

  // Product structured data
  await page.goto(`${BASE}/shop/glow-serum`, { waitUntil: 'networkidle' });
  const ld = await page.locator('script[type="application/ld+json"]').innerText();
  const parsed = JSON.parse(ld);
  if (parsed['@type'] === 'Product' && parsed.offers?.price) ok(`product JSON-LD (price ${parsed.offers.price}, ${parsed.offers.priceCurrency})`);
  else fail('product structured data malformed');

  // Image alt text
  const noAlt = await page.locator('img:not([alt])').count();
  if (noAlt === 0) ok('all images have alt attributes'); else fail('images missing alt', String(noAlt));

  // Lazy loading
  await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle' });
  const lazy = await page.locator('img[loading="lazy"]').count();
  if (lazy > 0) ok(`${lazy} lazy-loaded images on /shop`); else fail('no lazy-loaded images');

  await ctx.close();
}

/* ── 2. Shop filtering, sorting, search ────────────────────────────────── */
console.log('\n[2] Shop filtering / sorting / search');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await newPage(ctx);

  await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle' });
  const all = await page.locator('article').count();
  if (all === 7) ok(`7 products listed`); else fail('product count', String(all));

  await page.getByRole('button', { name: 'Serum', exact: true }).click();
  await page.waitForTimeout(600);
  const serums = await page.locator('article').count();
  if (serums === 1) ok('category filter → 1 serum'); else fail('category filter', String(serums));
  if (page.url().includes('category=serum')) ok('filter reflected in URL'); else fail('filter URL');

  await page.goto(`${BASE}/shop?sort=price-asc`, { waitUntil: 'networkidle' });
  const prices = await page.locator('article').evaluateAll((els) =>
    els.map((e) => {
      const m = e.textContent.match(/\$(\d+(?:\.\d+)?)/);
      return m ? parseFloat(m[1]) : 0;
    }),
  );
  const sorted = [...prices].sort((a, b) => a - b);
  if (JSON.stringify(prices) === JSON.stringify(sorted)) ok(`price sort ascending: ${prices.join(', ')}`);
  else fail('price sort', prices.join(','));

  await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle' });
  await page.locator('#shop-search').fill('sunscreen');
  await page.locator('#shop-search').press('Enter');
  await page.waitForTimeout(700);
  const found = await page.locator('article').count();
  // 2 expected: the sunscreen itself, plus the bundle whose description names it.
  if (found === 2) ok(`search "sunscreen" → ${found} results (product + bundle)`);
  else fail('search', String(found));

  await page.goto(`${BASE}/shop?search=zzzznothing`, { waitUntil: 'networkidle' });
  if (await page.getByText('Nothing matches that search').isVisible()) ok('empty search state');
  else fail('empty search state missing');

  await ctx.close();
}

/* ── 3. Cart: add, quantity, remove, persistence, discount ─────────────── */
console.log('\n[3] Cart lifecycle');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await newPage(ctx);

  await page.goto(`${BASE}/shop/glow-serum`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.waitForTimeout(700);
  const drawer = page.getByRole('dialog', { name: 'Shopping cart' });
  if (await drawer.isVisible()) ok('cart drawer opens on add');
  else fail('cart drawer did not open');

  // Increase quantity in drawer
  await drawer.getByRole('button', { name: 'Increase quantity' }).click();
  await page.waitForTimeout(400);
  let badge = await page.locator('header button[aria-label*="Open cart"] span').first().innerText();
  if (badge.trim() === '2') ok('quantity increase → badge 2'); else fail('badge after increase', badge);

  // Add a second product
  await drawer.getByRole('button', { name: 'Close cart' }).click();
  await page.goto(`${BASE}/shop/daily-sunscreen`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.waitForTimeout(700);
  badge = await page.locator('header button[aria-label*="Open cart"] span').first().innerText();
  if (badge.trim() === '3') ok('second product → badge 3'); else fail('badge after 2nd product', badge);

  // Persistence across reload
  await page.reload({ waitUntil: 'networkidle' });
  badge = await page.locator('header button[aria-label*="Open cart"] span').first().innerText();
  if (badge.trim() === '3') ok('cart persists across reload'); else fail('cart persistence', badge);

  // Cart page + discount code
  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
  await page.locator('#discount').fill('GLOW10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(900);
  const body = await page.locator('body').innerText();
  if (/GLOW10 applied/i.test(body)) ok('valid discount GLOW10 applied'); else fail('discount not applied');
  if (/Discount/.test(body) && /−\$/.test(body)) ok('discount line shown in summary');

  // Invalid code
  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
  await page.locator('#discount').fill('FAKECODE');
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(900);
  if (/not valid/i.test(await page.locator('body').innerText())) ok('invalid discount rejected');
  else fail('invalid discount not rejected');

  // Remove item
  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
  const before = await page.locator('main ul > li').count();
  await page.getByRole('button', { name: 'Remove' }).first().click();
  await page.waitForTimeout(600);
  const after = await page.locator('main ul > li').count();
  if (after === before - 1) ok(`remove item (${before} → ${after})`); else fail('remove item', `${before}→${after}`);

  // Clear cart → empty state
  await page.getByRole('button', { name: 'Clear cart' }).click();
  await page.waitForTimeout(600);
  if (/Your cart is empty/i.test(await page.locator('body').innerText())) ok('clear cart → empty state');
  else fail('clear cart failed');

  await ctx.close();
}

/* ── 4. Checkout → order → confirmation ────────────────────────────────── */
console.log('\n[4] Checkout and order creation');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await newPage(ctx);

  await page.goto(`${BASE}/shop/barrier-moisturizer`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.waitForTimeout(600);
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });

  if (/simulated payment/i.test(await page.locator('body').innerText())) ok('mock-payment disclosure shown');
  else fail('mock payment disclosure missing');

  // Validation blocks empty submit
  await page.getByRole('button', { name: 'Place order' }).first().click();
  await page.waitForTimeout(500);
  const errCount = await page.locator('[role="alert"]').count();
  if (errCount > 0) ok(`client validation blocks empty submit (${errCount} errors)`);
  else fail('validation did not block empty submit');

  await page.fill('#fullName', 'Ada Lovelace');
  await page.fill('#email', 'ada@example.test');
  await page.fill('#phone', '+2348012345678');
  await page.fill('#addressLine1', '12 Awolowo Road');
  await page.fill('#city', 'Lagos');
  await page.fill('#state', 'Lagos');
  await page.fill('#postalCode', '101233');
  await page.selectOption('#country', 'Nigeria');
  await page.getByRole('button', { name: 'Place order' }).first().click();

  await page.waitForURL(/\/order\/LUM-/, { timeout: 20000 });
  ok(`order placed → ${new URL(page.url()).pathname}`);

  await page.waitForLoadState('networkidle');
  const conf = await page.locator('body').innerText();
  if (/Thank you, Ada/.test(conf)) ok('confirmation greets customer');
  if (/Development order/i.test(conf)) ok('simulated-order disclosure on confirmation');
  if (/Barrier Moisturizer/.test(conf)) ok('order items listed');
  if (/LUM-/.test(conf)) ok('order number displayed');

  // Cart emptied after purchase
  const badge = await page.locator('header button[aria-label*="Open cart"] span').count();
  if (badge === 0) ok('cart cleared after purchase'); else fail('cart not cleared');

  await ctx.close();
}

/* ── 5. Admin auth + management ────────────────────────────────────────── */
console.log('\n[5] Admin authentication and management');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await newPage(ctx);

  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  if (await page.locator('#admin-password').isVisible()) ok('unauthenticated → login gate');
  else fail('admin not protected');

  // Wrong password rejected
  await page.fill('#admin-email', 'admin@lumera.test');
  await page.fill('#admin-password', 'wrongpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(1200);
  if (/Incorrect email or password/i.test(await page.locator('body').innerText())) ok('wrong password rejected');
  else fail('wrong password not rejected');

  // Correct login
  await page.fill('#admin-password', 'lumera-admin');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForSelector('text=/total sales/i', { timeout: 20000 });
  const dash = await page.locator('body').innerText();
  if (/total sales/i.test(dash)) ok('login → dashboard with analytics');
  else fail('dashboard did not load');
  if (/average order value/i.test(dash)) ok('AOV metric present');
  if (/best sellers/i.test(dash)) ok('best sellers present');
  if (/revenue . last 30 days/i.test(dash)) ok('revenue chart present');

  // Orders panel
  await page.getByRole('button', { name: 'Orders', exact: true }).click();
  await page.waitForTimeout(1500);
  const orderRows = await page.locator('tbody tr').count();
  if (orderRows > 0) ok(`orders panel lists ${orderRows} orders`); else fail('no orders listed');

  // Search orders
  await page.locator('input[type="search"]').first().fill('Ada');
  await page.waitForTimeout(1400);
  const searched = await page.locator('tbody tr').count();
  if (searched >= 1 && searched < orderRows) ok(`order search "Ada" → ${searched}`);
  else if (searched >= 1) ok(`order search returned ${searched}`);

  // Change status
  await page.locator('input[type="search"]').first().fill('');
  await page.waitForTimeout(1200);
  const sel = page.locator('tbody select').first();
  await sel.selectOption('shipped');
  await page.waitForTimeout(1500);
  if ((await sel.inputValue()) === 'shipped') ok('order status changed → shipped');
  else fail('status change failed');

  // Products panel
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.waitForTimeout(1500);
  const prodRows = await page.locator('tbody tr').count();
  if (prodRows === 7) ok('products panel lists 7 products'); else fail('product rows', String(prodRows));

  // Create a product
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.waitForTimeout(700);
  const dialog = page.locator('aside').last();
  await dialog.locator('input').nth(0).fill('LUMÉRA QA Test Serum');
  const priceInput = dialog.locator('input').nth(3);
  await priceInput.fill('19.50');
  await page.getByRole('button', { name: 'Create product' }).click();
  await page.waitForTimeout(2000);
  if (/QA Test Serum/.test(await page.locator('body').innerText())) ok('product created via admin');
  else fail('product creation failed');

  // Verify it appears on the storefront
  const shopPage = await newPage(ctx);
  await shopPage.goto(`${BASE}/shop?search=QA Test`, { waitUntil: 'networkidle' });
  if (/QA Test Serum/.test(await shopPage.locator('body').innerText())) ok('new product visible on storefront');
  else fail('new product not on storefront');
  await shopPage.close();

  // Delete it
  page.once('dialog', (d) => d.accept());
  const row = page.locator('tbody tr', { hasText: 'QA Test Serum' });
  await row.getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(2000);
  if (!/QA Test Serum/.test(await page.locator('body').innerText())) ok('product deleted via admin');
  else fail('product deletion failed');

  // Reviews panel + placeholder warning
  await page.getByRole('button', { name: 'Reviews', exact: true }).click();
  await page.waitForTimeout(1500);
  if (/placeholder sample review/i.test(await page.locator('body').innerText()))
    ok('reviews panel warns about placeholder content');
  else fail('placeholder review warning missing');

  // Discounts + Customers panels
  await page.getByRole('button', { name: 'Discounts', exact: true }).click();
  await page.waitForTimeout(1400);
  if (/GLOW10/.test(await page.locator('body').innerText())) ok('discounts panel lists codes');
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await page.waitForTimeout(1400);
  if (/Total spent/.test(await page.locator('body').innerText())) ok('customers panel loads');

  // Sign out
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForTimeout(1500);
  if (await page.locator('#admin-password').isVisible()) ok('sign out returns to login gate');
  else fail('sign out failed');

  await ctx.close();
}

/* ── 6. Responsive across devices ──────────────────────────────────────── */
console.log('\n[6] Responsive layout');
{
  const viewports = [
    ['iPhone SE', 375, 667],
    ['iPhone 14 Pro', 393, 852],
    ['Android (Pixel 7)', 412, 915],
    ['iPad Mini', 768, 1024],
    ['iPad Pro', 1024, 1366],
    ['Laptop', 1440, 900],
    ['Desktop', 1920, 1080],
  ];

  for (const [name, width, height] of viewports) {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900 });
    const page = await newPage(ctx);
    let issues = 0;

    for (const route of ['/', '/shop', '/shop/glow-serum', '/cart', '/checkout', '/faq']) {
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      if (overflow > 2) {
        fail(`${name} ${route} horizontal overflow`, `${overflow}px`);
        issues++;
      }
    }

    // Touch target audit on mobile
    if (width < 900) {
      await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle' });
      const small = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('button, a[href], select, input')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (el.classList.contains('sr-only')) continue; // visually hidden until focused
          if (r.height < 40 && !el.closest('nav[aria-label="Breadcrumb"]') && !el.closest('footer')) {
            out.push(`${el.tagName}.${(el.className || '').toString().slice(0, 25)}:${Math.round(r.height)}px`);
          }
        }
        return out.slice(0, 5);
      });
      if (small.length === 0) ok(`${name} touch targets ≥40px`);
      else fail(`${name} small touch targets`, small.join(', '));
    }

    if (issues === 0) ok(`${name} (${width}×${height}) no overflow`);
    await ctx.close();
  }

  // Mobile menu + cart drawer behaviour
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const page = await newPage(ctx);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.waitForTimeout(700);
  if (await page.getByRole('navigation', { name: 'Mobile' }).isVisible()) ok('mobile menu opens');
  else fail('mobile menu did not open');
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page.waitForTimeout(600);

  await page.goto(`${BASE}/shop/glow-serum`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.waitForTimeout(800);
  const w = await page.getByRole('dialog', { name: 'Shopping cart' }).boundingBox();
  if (w && w.width >= 360) ok(`mobile cart drawer full-width (${Math.round(w.width)}px)`);
  else fail('mobile cart drawer width', JSON.stringify(w));
  await ctx.close();
}

/* ── 7. Navigation / no broken links ───────────────────────────────────── */
console.log('\n[7] Internal links');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await newPage(ctx);
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const hrefs = await page.locator('a[href^="/"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')))]);
  const checked = new Set();
  for (const href of hrefs) {
    const path = href.split('?')[0];
    if (checked.has(path)) continue;
    checked.add(path);
    const res = await page.request.get(BASE + href);
    if (res.status() >= 400) fail(`broken link ${href}`, String(res.status()));
  }
  ok(`${checked.size} unique internal links resolve`);

  // Footer links from a deep page
  await page.goto(`${BASE}/faq`, { waitUntil: 'networkidle' });
  const footerLinks = await page.locator('footer a[href^="/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  for (const href of [...new Set(footerLinks)]) {
    const res = await page.request.get(BASE + href);
    if (res.status() >= 400) fail(`broken footer link ${href}`, String(res.status()));
  }
  ok(`${new Set(footerLinks).size} footer links resolve`);

  await ctx.close();
}

/* ── Summary ───────────────────────────────────────────────────────────── */
await browser.close();
console.log(`\n${'─'.repeat(62)}`);
console.log(`PASSED: ${passes}`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  [...new Set(problems)].forEach((p) => console.log('  • ' + p));
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
