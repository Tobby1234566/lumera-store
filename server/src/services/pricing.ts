import { db } from '../db/knex.js';
import { config } from '../config.js';
import { badRequest } from '../lib/http.js';

/**
 * Server-authoritative pricing.
 *
 * Prices, shipping and discounts are ALWAYS recalculated here from the
 * database. Amounts sent by the browser are treated as untrusted input and are
 * never used to compute what a customer is charged.
 */

export type CartLineInput = { productId?: string; slug?: string; quantity: number };

export type PricedLine = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  size: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  discountCode: string | null;
  freeShippingThresholdCents: number;
};

export async function validateDiscountCode(code: string, subtotalCents: number) {
  const record = await db('discount_codes').whereRaw('LOWER(code) = ?', [code.trim().toLowerCase()]).first();
  if (!record || !record.is_active) {
    throw badRequest('That discount code is not valid.');
  }
  const nowMs = Date.now();
  if (record.starts_at && new Date(record.starts_at).getTime() > nowMs) {
    throw badRequest('That discount code is not active yet.');
  }
  if (record.expires_at && new Date(record.expires_at).getTime() < nowMs) {
    throw badRequest('That discount code has expired.');
  }
  if (record.usage_limit !== null && Number(record.times_used) >= Number(record.usage_limit)) {
    throw badRequest('That discount code has reached its usage limit.');
  }
  if (subtotalCents < Number(record.min_subtotal_cents)) {
    const min = (Number(record.min_subtotal_cents) / 100).toFixed(2);
    throw badRequest(`This code requires a minimum subtotal of ${min}.`);
  }

  const amount =
    record.type === 'percent'
      ? Math.round((subtotalCents * Number(record.value)) / 100)
      : Number(record.value);

  return { record, discountCents: Math.min(amount, subtotalCents) };
}

export async function priceCart(
  lines: CartLineInput[],
  discountCode?: string | null,
): Promise<PricedCart> {
  if (!lines.length) throw badRequest('Your cart is empty.');

  const priced: PricedLine[] = [];
  let subtotalCents = 0;

  for (const line of lines) {
    const quantity = Math.floor(Number(line.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      throw badRequest('Quantities must be between 1 and 99.');
    }

    const query = db('products').where({ is_active: true });
    const product = line.productId
      ? await query.clone().where({ id: line.productId }).first()
      : await query.clone().where({ slug: line.slug }).first();

    if (!product) throw badRequest(`A product in your cart is no longer available.`);
    if (Number(product.inventory) < quantity) {
      throw badRequest(`Only ${product.inventory} of ${product.name} remaining.`);
    }

    const unitPriceCents = Number(product.price_cents);
    const lineTotalCents = unitPriceCents * quantity;
    subtotalCents += lineTotalCents;

    let image: string | null = null;
    try {
      image = JSON.parse(product.images)[0] ?? null;
    } catch {
      image = null;
    }

    priced.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image,
      size: product.size,
      unitPriceCents,
      quantity,
      lineTotalCents,
    });
  }

  let discountCents = 0;
  let appliedCode: string | null = null;
  if (discountCode && discountCode.trim()) {
    const { record, discountCents: amount } = await validateDiscountCode(discountCode, subtotalCents);
    discountCents = amount;
    appliedCode = record.code;
  }

  const shippingCents =
    subtotalCents >= config.store.freeShippingThresholdCents ? 0 : config.store.shippingFlatRateCents;

  const taxable = Math.max(0, subtotalCents - discountCents);
  const taxCents = Math.round(taxable * config.store.taxRate);
  const totalCents = Math.max(0, taxable + shippingCents + taxCents);

  return {
    lines: priced,
    subtotalCents,
    shippingCents,
    discountCents,
    taxCents,
    totalCents,
    currency: config.store.currency,
    discountCode: appliedCode,
    freeShippingThresholdCents: config.store.freeShippingThresholdCents,
  };
}
