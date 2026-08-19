export type Category =
  | 'cleanser'
  | 'moisturizer'
  | 'serum'
  | 'toner'
  | 'exfoliant'
  | 'sunscreen'
  | 'bundles';

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  tagline: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  size: string;
  inventory: number;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  sortOrder: number;
  unitsSold: number;
  images: string[];
  benefits: string[];
  keyIngredients: { name: string; role: string }[];
  ingredientsList: string;
  howToUse: string;
  skinTypes: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  rating: number;
  reviewCount: number;
};

export type Review = {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  isPlaceholder: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
};

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type OrderItem = {
  id: string;
  productId: string | null;
  name: string;
  slug: string;
  image: string | null;
  size: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  email: string;
  fullName: string;
  phone: string | null;
  shippingAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    country: string;
  };
  notes: string | null;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  discountCode: string | null;
  status: OrderStatus;
  paymentStatus: string;
  paymentProvider: string | null;
  isSimulatedPayment: boolean;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
  events?: { id: number; type: string; message: string; createdAt: string }[];
};

export type Quote = {
  lines: {
    productId: string;
    slug: string;
    name: string;
    image: string | null;
    size: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  discountCode: string | null;
  freeShippingThresholdCents: number;
};

export type StoreConfig = {
  currency: string;
  shippingFlatRateCents: number;
  freeShippingThresholdCents: number;
  payment: { provider: string; isMock: boolean };
};

export type Customer = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  acceptsMarketing: boolean;
  emailVerified: boolean;
  createdAt: string;
};

export type CustomerAddress = {
  id: string;
  customer_id?: string;
  label: string;
  full_name: string;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
};

export type AccountOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  items: { name: string; slug: string; image: string | null; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
};
