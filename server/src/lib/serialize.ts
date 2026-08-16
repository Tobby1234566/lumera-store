/** Row -> API shape mappers. Keeps snake_case in the DB and camelCase on the wire. */

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const bool = (v: unknown) => v === true || v === 1 || v === '1';

export function serializeProduct(row: any, extras: { rating?: number; reviewCount?: number } = {}) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    tagline: row.tagline,
    shortDescription: row.short_description,
    description: row.description,
    priceCents: Number(row.price_cents),
    compareAtPriceCents: row.compare_at_price_cents === null ? null : Number(row.compare_at_price_cents),
    size: row.size,
    inventory: Number(row.inventory),
    isActive: bool(row.is_active),
    isFeatured: bool(row.is_featured),
    isBestSeller: bool(row.is_best_seller),
    sortOrder: Number(row.sort_order),
    unitsSold: Number(row.units_sold),
    images: parseJson<string[]>(row.images, []),
    benefits: parseJson<string[]>(row.benefits, []),
    keyIngredients: parseJson<{ name: string; role: string }[]>(row.key_ingredients, []),
    ingredientsList: row.ingredients_list,
    howToUse: row.how_to_use,
    skinTypes: parseJson<string[]>(row.skin_types, []),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rating: extras.rating ?? 0,
    reviewCount: extras.reviewCount ?? 0,
  };
}

export function serializeReview(row: any) {
  return {
    id: row.id,
    productId: row.product_id,
    authorName: row.author_name,
    rating: Number(row.rating),
    title: row.title,
    body: row.body,
    isPlaceholder: bool(row.is_placeholder),
    isVerifiedPurchase: bool(row.is_verified_purchase),
    createdAt: row.created_at,
  };
}

export function serializeOrder(row: any, items: any[] = [], events: any[] = []) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    shippingAddress: {
      line1: row.address_line1,
      line2: row.address_line2,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
    },
    notes: row.notes,
    subtotalCents: Number(row.subtotal_cents),
    shippingCents: Number(row.shipping_cents),
    discountCents: Number(row.discount_cents),
    taxCents: Number(row.tax_cents),
    totalCents: Number(row.total_cents),
    currency: row.currency,
    discountCode: row.discount_code,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentProvider: row.payment_provider,
    paymentReference: row.payment_reference,
    /** True when the order was paid through the development mock driver. */
    isSimulatedPayment: row.payment_provider === 'mock',
    trackingNumber: row.tracking_number,
    shippingCarrier: row.shipping_carrier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.product_name,
      slug: i.product_slug,
      image: i.product_image,
      size: i.size,
      unitPriceCents: Number(i.unit_price_cents),
      quantity: Number(i.quantity),
      lineTotalCents: Number(i.line_total_cents),
    })),
    events: events.map((e) => ({ id: e.id, type: e.type, message: e.message, createdAt: e.created_at })),
  };
}
