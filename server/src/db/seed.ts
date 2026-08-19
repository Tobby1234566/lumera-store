import bcrypt from 'bcryptjs';
import { db } from './knex.js';
import { createSchema } from './schema.js';
import { config } from '../config.js';
import { id, orderNumber } from '../lib/ids.js';
import { catalog, seededReviews } from '../data/catalog.js';

/**
 * Seeds the database with the development catalogue, an admin user, sample
 * discount codes and a handful of MOCK orders so the admin dashboard has
 * something to display.
 *
 * NOTE: the seeded orders are clearly-labelled development fixtures. They are
 * not real transactions and no real payment was ever taken.
 */

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

async function seedAdmin() {
  const existing = await db('admin_users').where({ email: config.seedAdmin.email }).first();
  const passwordHash = await bcrypt.hash(config.seedAdmin.password, 12);
  if (existing) {
    await db('admin_users')
      .where({ id: existing.id })
      .update({
        name: config.seedAdmin.name,
        password_hash: passwordHash,
        role: 'admin',
        updated_at: new Date().toISOString(),
      });
    console.log(`[seed] admin updated: ${config.seedAdmin.email}`);
    return;
  }
  await db('admin_users').insert({
    id: id('adm'),
    email: config.seedAdmin.email.toLowerCase(),
    name: config.seedAdmin.name,
    password_hash: passwordHash,
    role: 'admin',
    created_at: new Date().toISOString(),
  });
  console.log(`[seed] admin created: ${config.seedAdmin.email} / ${config.seedAdmin.password}`);
}

async function seedProducts() {
  const nowIso = new Date().toISOString();
  for (const p of catalog) {
    const existing = await db('products').where({ slug: p.slug }).first();
    const row = {
      slug: p.slug,
      name: p.name,
      category: p.category,
      tagline: p.tagline,
      short_description: p.shortDescription,
      description: p.description,
      price_cents: p.priceCents,
      compare_at_price_cents: p.compareAtPriceCents ?? null,
      size: p.size,
      inventory: p.inventory,
      is_active: true,
      is_featured: !!p.isFeatured,
      is_best_seller: !!p.isBestSeller,
      sort_order: p.sortOrder,
      units_sold: p.unitsSold,
      images: JSON.stringify(p.images),
      benefits: JSON.stringify(p.benefits),
      key_ingredients: JSON.stringify(p.keyIngredients),
      ingredients_list: p.ingredientsList,
      how_to_use: p.howToUse,
      skin_types: JSON.stringify(p.skinTypes),
      seo_title: p.seoTitle,
      seo_description: p.seoDescription,
      updated_at: nowIso,
    };
    if (existing) {
      await db('products').where({ id: existing.id }).update(row);
    } else {
      await db('products').insert({ ...row, id: id('prd'), created_at: nowIso });
    }
  }
  console.log(`[seed] ${catalog.length} products upserted`);
}

async function seedReviews() {
  await db('reviews').where({ is_placeholder: true }).del();
  for (const r of seededReviews) {
    const product = await db('products').where({ slug: r.productSlug }).first();
    if (!product) continue;
    await db('reviews').insert({
      id: id('rev'),
      product_id: product.id,
      author_name: r.author,
      rating: r.rating,
      title: r.title,
      body: r.body,
      is_placeholder: true,
      is_published: true,
      is_verified_purchase: false,
      created_at: daysAgo(r.daysAgo),
    });
  }
  console.log(`[seed] ${seededReviews.length} seeded reviews inserted`);
}

async function seedDiscounts() {
  const codes = [
    { code: 'GLOW10', type: 'percent', value: 10, min_subtotal_cents: 0, usage_limit: null },
    { code: 'WELCOME15', type: 'percent', value: 15, min_subtotal_cents: 5000, usage_limit: null },
    { code: 'FIVEOFF', type: 'fixed', value: 500, min_subtotal_cents: 3000, usage_limit: 200 },
  ];
  for (const c of codes) {
    const existing = await db('discount_codes').where({ code: c.code }).first();
    if (existing) continue;
    await db('discount_codes').insert({
      id: id('dsc'),
      code: c.code,
      type: c.type,
      value: c.value,
      min_subtotal_cents: c.min_subtotal_cents,
      usage_limit: c.usage_limit,
      is_active: true,
      times_used: 0,
      created_at: new Date().toISOString(),
    });
  }
  console.log(`[seed] discount codes ready: ${codes.map((c) => c.code).join(', ')}`);
}

/** Development-only fixture orders so the dashboard is not empty. */
async function seedMockOrders() {
  const count = await db('orders').count<{ c: number }[]>({ c: '*' });
  if (Number(count[0].c) > 0) {
    console.log('[seed] orders already present — skipping mock orders');
    return;
  }

  const products = await db('products').select('*');
  const byslug = (s: string) => products.find((p: any) => p.slug === s)!;

  const fixtures = [
    { name: 'Sample Customer One', email: 'sample.one@example.test', city: 'Lagos', country: 'Nigeria', state: 'Lagos', status: 'delivered', items: [['glow-serum', 1], ['daily-sunscreen', 1]], days: 26 },
    { name: 'Sample Customer Two', email: 'sample.two@example.test', city: 'Manchester', country: 'United Kingdom', state: 'Greater Manchester', status: 'shipped', items: [['glow-routine-bundle', 1]], days: 18 },
    { name: 'Sample Customer Three', email: 'sample.three@example.test', city: 'Toronto', country: 'Canada', state: 'Ontario', status: 'processing', items: [['hydrating-cleanser', 2], ['balancing-toner', 1]], days: 11 },
    { name: 'Sample Customer Four', email: 'sample.four@example.test', city: 'Austin', country: 'United States', state: 'Texas', status: 'paid', items: [['barrier-moisturizer', 1], ['gentle-exfoliant', 1]], days: 6 },
    { name: 'Sample Customer Five', email: 'sample.five@example.test', city: 'Nairobi', country: 'Kenya', state: 'Nairobi', status: 'pending', items: [['glow-serum', 1]], days: 2 },
    { name: 'Sample Customer Six', email: 'sample.six@example.test', city: 'Berlin', country: 'Germany', state: 'Berlin', status: 'delivered', items: [['daily-sunscreen', 2]], days: 40 },
    { name: 'Sample Customer Seven', email: 'sample.seven@example.test', city: 'Lagos', country: 'Nigeria', state: 'Lagos', status: 'delivered', items: [['glow-routine-bundle', 1], ['gentle-exfoliant', 1]], days: 53 },
    { name: 'Sample Customer Eight', email: 'sample.eight@example.test', city: 'Sydney', country: 'Australia', state: 'NSW', status: 'cancelled', items: [['balancing-toner', 1]], days: 33 },
  ];

  for (const f of fixtures) {
    const createdAt = daysAgo(f.days);
    let subtotal = 0;
    const lines = f.items.map(([slug, qty]) => {
      const p = byslug(slug as string);
      const q = Number(qty);
      const line = p.price_cents * q;
      subtotal += line;
      return { p, q, line };
    });

    const shipping = subtotal >= config.store.freeShippingThresholdCents ? 0 : config.store.shippingFlatRateCents;
    const total = subtotal + shipping;
    const paidStatuses = ['paid', 'processing', 'shipped', 'delivered'];
    const isPaid = paidStatuses.includes(f.status);

    let customer = await db('customers').where({ email: f.email }).first();
    if (!customer) {
      const cid = id('cus');
      await db('customers').insert({
        id: cid,
        email: f.email,
        full_name: f.name,
        phone: '+10000000000',
        orders_count: 0,
        total_spent_cents: 0,
        accepts_marketing: false,
        created_at: createdAt,
        updated_at: createdAt,
      });
      customer = await db('customers').where({ id: cid }).first();
    }

    const oid = id('ord');
    await db('orders').insert({
      id: oid,
      order_number: orderNumber(),
      customer_id: customer.id,
      email: f.email,
      full_name: f.name,
      phone: '+10000000000',
      address_line1: '1 Sample Street',
      city: f.city,
      state: f.state,
      postal_code: '00000',
      country: f.country,
      notes: 'Development fixture order — not a real transaction.',
      subtotal_cents: subtotal,
      shipping_cents: shipping,
      discount_cents: 0,
      tax_cents: 0,
      total_cents: total,
      currency: config.store.currency,
      status: f.status,
      payment_status: isPaid ? 'paid' : f.status === 'cancelled' ? 'failed' : 'unpaid',
      payment_provider: 'mock',
      payment_reference: isPaid ? `mock_${oid}` : null,
      paid_at: isPaid ? createdAt : null,
      shipped_at: ['shipped', 'delivered'].includes(f.status) ? createdAt : null,
      delivered_at: f.status === 'delivered' ? createdAt : null,
      created_at: createdAt,
      updated_at: createdAt,
    });

    for (const l of lines) {
      await db('order_items').insert({
        id: id('itm'),
        order_id: oid,
        product_id: l.p.id,
        product_name: l.p.name,
        product_slug: l.p.slug,
        product_image: JSON.parse(l.p.images)[0] ?? null,
        size: l.p.size,
        unit_price_cents: l.p.price_cents,
        quantity: l.q,
        line_total_cents: l.line,
      });
    }

    await db('order_events').insert({
      order_id: oid,
      type: 'created',
      message: 'Development fixture order created by the seed script.',
      created_at: createdAt,
    });

    if (isPaid) {
      await db('customers')
        .where({ id: customer.id })
        .update({
          orders_count: Number(customer.orders_count) + 1,
          total_spent_cents: Number(customer.total_spent_cents) + total,
          updated_at: createdAt,
        });
    }
  }
  console.log(`[seed] ${fixtures.length} MOCK orders inserted (development fixtures only)`);
}

async function main() {
  await createSchema(db);
  await seedAdmin();
  await seedProducts();
  await seedReviews();
  await seedDiscounts();
  await seedMockOrders();
  console.log('[seed] complete');
  await db.destroy();
}

main().catch(async (err) => {
  console.error('[seed] failed:', err);
  await db.destroy();
  process.exit(1);
});
