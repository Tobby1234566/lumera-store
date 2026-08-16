import type { Knex } from 'knex';

/**
 * Schema definition, expressed with the Knex schema builder so it applies
 * identically to SQLite and PostgreSQL.
 *
 * Money is stored everywhere as INTEGER minor units (cents) to avoid floating
 * point rounding errors.
 */
export async function createSchema(db: Knex): Promise<void> {
  const has = (t: string) => db.schema.hasTable(t);

  if (!(await has('admin_users'))) {
    await db.schema.createTable('admin_users', (t) => {
      t.string('id').primary();
      t.string('email').notNullable().unique();
      t.string('name').notNullable();
      t.string('password_hash').notNullable();
      t.string('role').notNullable().defaultTo('admin');
      t.timestamp('created_at').notNullable();
      t.timestamp('last_login_at').nullable();
    });
  }

  if (!(await has('products'))) {
    await db.schema.createTable('products', (t) => {
      t.string('id').primary();
      t.string('slug').notNullable().unique();
      t.string('name').notNullable();
      t.string('category').notNullable().index();
      t.string('tagline').notNullable();
      t.text('short_description').notNullable();
      t.text('description').notNullable();
      t.integer('price_cents').notNullable();
      t.integer('compare_at_price_cents').nullable();
      t.string('size').notNullable();
      t.integer('inventory').notNullable().defaultTo(0);
      t.boolean('is_active').notNullable().defaultTo(true);
      t.boolean('is_featured').notNullable().defaultTo(false);
      t.boolean('is_best_seller').notNullable().defaultTo(false);
      t.integer('sort_order').notNullable().defaultTo(0);
      t.integer('units_sold').notNullable().defaultTo(0);
      // JSON-encoded string arrays / objects. Stored as text for portability.
      t.text('images').notNullable().defaultTo('[]');
      t.text('benefits').notNullable().defaultTo('[]');
      t.text('key_ingredients').notNullable().defaultTo('[]');
      t.text('ingredients_list').notNullable().defaultTo('');
      t.text('how_to_use').notNullable().defaultTo('');
      t.text('skin_types').notNullable().defaultTo('[]');
      t.string('seo_title').nullable();
      t.text('seo_description').nullable();
      t.timestamp('created_at').notNullable();
      t.timestamp('updated_at').notNullable();
    });
  }

  if (!(await has('reviews'))) {
    await db.schema.createTable('reviews', (t) => {
      t.string('id').primary();
      t.string('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      t.string('author_name').notNullable();
      t.integer('rating').notNullable();
      t.string('title').nullable();
      t.text('body').notNullable();
      /**
       * Placeholder reviews are sample content written for development. They
       * are flagged so the storefront can label them honestly and so they can
       * be deleted in one query before launch.
       */
      t.boolean('is_placeholder').notNullable().defaultTo(false);
      t.boolean('is_published').notNullable().defaultTo(true);
      t.boolean('is_verified_purchase').notNullable().defaultTo(false);
      t.timestamp('created_at').notNullable();
    });
    await db.schema.alterTable('reviews', (t) => t.index('product_id'));
  }

  if (!(await has('discount_codes'))) {
    await db.schema.createTable('discount_codes', (t) => {
      t.string('id').primary();
      t.string('code').notNullable().unique();
      t.string('type').notNullable(); // 'percent' | 'fixed'
      t.integer('value').notNullable(); // percent (1-100) or minor units
      t.integer('min_subtotal_cents').notNullable().defaultTo(0);
      t.boolean('is_active').notNullable().defaultTo(true);
      t.integer('usage_limit').nullable();
      t.integer('times_used').notNullable().defaultTo(0);
      t.timestamp('starts_at').nullable();
      t.timestamp('expires_at').nullable();
      t.timestamp('created_at').notNullable();
    });
  }

  if (!(await has('customers'))) {
    await db.schema.createTable('customers', (t) => {
      t.string('id').primary();
      t.string('email').notNullable().unique();
      t.string('full_name').notNullable();
      t.string('phone').nullable();
      t.integer('orders_count').notNullable().defaultTo(0);
      t.integer('total_spent_cents').notNullable().defaultTo(0);
      t.boolean('accepts_marketing').notNullable().defaultTo(false);
      t.timestamp('created_at').notNullable();
      t.timestamp('updated_at').notNullable();
    });
  }

  if (!(await has('orders'))) {
    await db.schema.createTable('orders', (t) => {
      t.string('id').primary();
      t.string('order_number').notNullable().unique();
      t.string('customer_id').nullable().references('id').inTable('customers').onDelete('SET NULL');
      t.string('email').notNullable();
      t.string('full_name').notNullable();
      t.string('phone').nullable();
      t.string('address_line1').notNullable();
      t.string('address_line2').nullable();
      t.string('city').notNullable();
      t.string('state').nullable();
      t.string('postal_code').nullable();
      t.string('country').notNullable();
      t.text('notes').nullable();

      t.integer('subtotal_cents').notNullable();
      t.integer('shipping_cents').notNullable().defaultTo(0);
      t.integer('discount_cents').notNullable().defaultTo(0);
      t.integer('tax_cents').notNullable().defaultTo(0);
      t.integer('total_cents').notNullable();
      t.string('currency').notNullable().defaultTo('USD');
      t.string('discount_code').nullable();

      // pending | paid | processing | shipped | delivered | cancelled | refunded
      t.string('status').notNullable().defaultTo('pending').index();
      // unpaid | paid | failed | refunded
      t.string('payment_status').notNullable().defaultTo('unpaid');
      t.string('payment_provider').nullable();
      /** Provider reference only — never raw card data. */
      t.string('payment_reference').nullable();

      t.string('tracking_number').nullable();
      t.string('shipping_carrier').nullable();
      t.timestamp('shipped_at').nullable();
      t.timestamp('delivered_at').nullable();
      t.timestamp('paid_at').nullable();
      t.timestamp('created_at').notNullable().index();
      t.timestamp('updated_at').notNullable();
    });
  }

  if (!(await has('order_items'))) {
    await db.schema.createTable('order_items', (t) => {
      t.string('id').primary();
      t.string('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
      t.string('product_id').nullable();
      // Product details are denormalised so historical orders stay accurate
      // even if the product is later renamed, repriced or deleted.
      t.string('product_name').notNullable();
      t.string('product_slug').notNullable();
      t.string('product_image').nullable();
      t.string('size').nullable();
      t.integer('unit_price_cents').notNullable();
      t.integer('quantity').notNullable();
      t.integer('line_total_cents').notNullable();
    });
    await db.schema.alterTable('order_items', (t) => t.index('order_id'));
  }

  if (!(await has('order_events'))) {
    await db.schema.createTable('order_events', (t) => {
      t.increments('id').primary();
      t.string('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
      t.string('type').notNullable();
      t.text('message').notNullable();
      t.timestamp('created_at').notNullable();
    });
  }

  if (!(await has('subscribers'))) {
    await db.schema.createTable('subscribers', (t) => {
      t.string('id').primary();
      t.string('email').notNullable().unique();
      t.string('source').notNullable().defaultTo('footer');
      t.timestamp('created_at').notNullable();
    });
  }

  if (!(await has('contact_messages'))) {
    await db.schema.createTable('contact_messages', (t) => {
      t.string('id').primary();
      t.string('name').notNullable();
      t.string('email').notNullable();
      t.string('subject').notNullable();
      t.text('message').notNullable();
      t.boolean('is_handled').notNullable().defaultTo(false);
      t.timestamp('created_at').notNullable();
    });
  }

  if (!(await has('email_verifications'))) {
    await db.schema.createTable('email_verifications', (t) => {
      t.string('id').primary();
      t.string('email').notNullable().index();
      t.string('token').notNullable().unique();
      t.boolean('is_verified').notNullable().defaultTo(false);
      t.timestamp('expires_at').notNullable();
      t.timestamp('verified_at').nullable();
      t.timestamp('created_at').notNullable();
    });
  }

  if (!(await has('analytics_events'))) {
    await db.schema.createTable('analytics_events', (t) => {
      t.increments('id').primary();
      /** product_viewed | add_to_cart | checkout_started | purchase_completed */
      t.string('name').notNullable().index();
      /** Non-identifying JSON payload only. No PII is accepted here. */
      t.text('payload').notNullable().defaultTo('{}');
      t.timestamp('created_at').notNullable();
    });
  }
}

export async function dropSchema(db: Knex): Promise<void> {
  const tables = [
    'analytics_events',
    'contact_messages',
    'subscribers',
    'order_events',
    'order_items',
    'orders',
    'email_verifications',
    'customers',
    'discount_codes',
    'reviews',
    'products',
    'admin_users',
  ];
  for (const table of tables) {
    await db.schema.dropTableIfExists(table);
  }
}
