/**
 * LUMÉRA product catalogue — development seed data.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO REPLACE WITH REAL PRODUCTS
 * ─────────────────────────────────────────────────────────────────────────────
 * This file is the single source of truth for seeding. Edit the entries below
 * (or replace the array wholesale), then run `npm run db:reset && npm run db:seed`.
 * After launch, products are managed through the admin dashboard and this file
 * is only used to bootstrap a fresh environment.
 *
 * COPY POLICY — IMPORTANT
 * All product copy uses cosmetic language only. Do NOT introduce medical or
 * therapeutic claims ("cures acne", "treats eczema", "guaranteed results").
 * Use appearance-based phrasing: "helps hydrate", "supports a smoother-looking
 * complexion", "helps improve the appearance of...".
 *
 * Prices are in minor units (cents).
 */

export type SeedProduct = {
  slug: string;
  name: string;
  category: 'cleanser' | 'moisturizer' | 'serum' | 'toner' | 'exfoliant' | 'sunscreen' | 'bundles';
  tagline: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  compareAtPriceCents?: number;
  size: string;
  inventory: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  sortOrder: number;
  unitsSold: number;
  images: string[];
  benefits: string[];
  keyIngredients: { name: string; role: string }[];
  ingredientsList: string;
  howToUse: string;
  skinTypes: string[];
  seoTitle: string;
  seoDescription: string;
};

export const catalog: SeedProduct[] = [
  {
    slug: 'hydrating-cleanser',
    name: 'LUMÉRA Hydrating Cleanser',
    category: 'cleanser',
    tagline: 'A soft gel-to-cream wash that never leaves skin tight.',
    shortDescription:
      'A gentle daily gel cleanser that lifts away makeup and impurities while helping skin retain moisture.',
    description:
      'A quietly effective everyday cleanser. The gel-to-cream texture melts over skin to loosen sunscreen, makeup and the residue of the day, then rinses clean without that stripped, squeaky feeling. Formulated at a skin-friendly pH with glycerin and panthenol to help support the skin barrier, so your face feels comfortable and soft rather than tight. Fragrance-free and suitable for morning and evening use.',
    priceCents: 2400,
    size: '150 ml / 5.1 fl oz',
    inventory: 120,
    isFeatured: true,
    isBestSeller: true,
    sortOrder: 1,
    unitsSold: 412,
    images: ['/images/hydrating-cleanser.jpg'],
    benefits: [
      'Helps remove makeup, sunscreen and daily build-up',
      'Leaves skin feeling comfortable rather than tight',
      'Helps support the skin’s moisture barrier',
      'Fragrance-free and suitable for twice-daily use',
    ],
    keyIngredients: [
      { name: 'Glycerin', role: 'A classic humectant that helps draw moisture into the skin’s surface.' },
      { name: 'Panthenol (Pro-Vitamin B5)', role: 'Helps skin feel soothed and conditioned after cleansing.' },
      { name: 'Coco-Glucoside', role: 'A mild, plant-derived cleansing agent.' },
    ],
    ingredientsList:
      'Aqua (Water), Glycerin, Coco-Glucoside, Sodium Cocoyl Isethionate, Panthenol, Butylene Glycol, Sodium Hyaluronate, Allantoin, Citric Acid, Sodium Benzoate, Potassium Sorbate, Phenoxyethanol, Ethylhexylglycerin.',
    howToUse:
      'Morning and evening, massage a small amount over damp skin using light circular motions. Rinse thoroughly with lukewarm water and pat dry. Follow with toner, serum and moisturiser.',
    skinTypes: ['Dry', 'Normal', 'Combination', 'Oily', 'Sensitive'],
    seoTitle: 'Hydrating Cleanser — Gentle Daily Face Wash | LUMÉRA',
    seoDescription:
      'A gentle gel-to-cream daily cleanser that helps remove makeup and impurities while helping skin stay hydrated. Fragrance-free. 150 ml.',
  },
  {
    slug: 'glow-serum',
    name: 'LUMÉRA Glow Serum',
    category: 'serum',
    tagline: 'Lightweight vitamin C for a brighter-looking complexion.',
    shortDescription:
      'A silky vitamin C and niacinamide serum that helps improve the appearance of dullness and uneven tone.',
    description:
      'Our most-loved step. A weightless serum built around a stabilised vitamin C derivative and niacinamide, designed to help improve the look of dullness, uneven tone and the appearance of dark spots over consistent use. It absorbs in seconds with no tackiness, layering easily under moisturiser and sunscreen. Formulated without fragrance or essential oils.',
    priceCents: 3800,
    compareAtPriceCents: 4600,
    size: '30 ml / 1.0 fl oz',
    inventory: 86,
    isFeatured: true,
    isBestSeller: true,
    sortOrder: 2,
    unitsSold: 638,
    images: ['/images/glow-serum.jpg'],
    benefits: [
      'Helps improve the appearance of dullness and uneven tone',
      'Helps visibly soften the look of dark spots over time',
      'Absorbs quickly with a weightless finish',
      'Layers easily under moisturiser and sunscreen',
    ],
    keyIngredients: [
      { name: '10% Sodium Ascorbyl Phosphate', role: 'A stable vitamin C derivative used to help brighten the look of skin.' },
      { name: '4% Niacinamide', role: 'Helps improve the appearance of uneven tone and visible pores.' },
      { name: 'Sodium Hyaluronate', role: 'A hydrating ingredient that helps skin look plump and smooth.' },
    ],
    ingredientsList:
      'Aqua (Water), Propanediol, Sodium Ascorbyl Phosphate, Niacinamide, Glycerin, Sodium Hyaluronate, Panthenol, Tocopherol, Ferulic Acid, Xanthan Gum, Sodium Phytate, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin.',
    howToUse:
      'Apply 3–4 drops to clean, dry skin each morning before moisturiser. Always follow with sunscreen during the day. If you are new to vitamin C, begin every other morning and build up as your skin adjusts.',
    skinTypes: ['Normal', 'Combination', 'Oily', 'Dry'],
    seoTitle: 'Glow Serum — Vitamin C + Niacinamide Serum | LUMÉRA',
    seoDescription:
      'A lightweight vitamin C and niacinamide serum that helps improve the appearance of dullness and uneven skin tone. 30 ml.',
  },
  {
    slug: 'barrier-moisturizer',
    name: 'LUMÉRA Barrier Moisturizer',
    category: 'moisturizer',
    tagline: 'A cushioned cream with ceramides and squalane.',
    shortDescription:
      'A rich-but-breathable daily cream with ceramides and squalane to help skin stay hydrated and comfortable.',
    description:
      'A cushioning daily cream that sinks in properly instead of sitting on top of the skin. A blend of ceramides, squalane and glycerin helps reinforce the feel of the moisture barrier and keeps skin comfortable through air conditioning, cold weather and long days. Rich enough for dry skin at night, light enough to wear under makeup in the morning.',
    priceCents: 3200,
    size: '50 ml / 1.7 fl oz',
    inventory: 94,
    isFeatured: true,
    isBestSeller: true,
    sortOrder: 3,
    unitsSold: 521,
    images: ['/images/barrier-moisturizer.jpg'],
    benefits: [
      'Helps hydrate skin for a soft, comfortable feel',
      'Helps support the look and feel of a healthy moisture barrier',
      'Absorbs without a heavy or greasy finish',
      'Sits well under makeup and sunscreen',
    ],
    keyIngredients: [
      { name: 'Ceramide Complex (NP, AP, EOP)', role: 'Lipids that help support the feel of the skin barrier.' },
      { name: 'Squalane', role: 'A lightweight emollient that helps soften and smooth the skin’s surface.' },
      { name: 'Glycerin', role: 'Helps draw and hold moisture at the skin’s surface.' },
    ],
    ingredientsList:
      'Aqua (Water), Glycerin, Squalane, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Sodium Hyaluronate, Panthenol, Allantoin, Xanthan Gum, Carbomer, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin.',
    howToUse:
      'Smooth a pea-sized amount over the face and neck morning and evening, after serum. Use a little more at night if your skin feels dry.',
    skinTypes: ['Dry', 'Normal', 'Combination', 'Sensitive'],
    seoTitle: 'Barrier Moisturizer — Ceramide Face Cream | LUMÉRA',
    seoDescription:
      'A daily ceramide and squalane face cream that helps hydrate skin and support a comfortable, healthy-feeling moisture barrier. 50 ml.',
  },
  {
    slug: 'balancing-toner',
    name: 'LUMÉRA Balancing Toner',
    category: 'toner',
    tagline: 'A hydrating first step, no alcohol sting.',
    shortDescription:
      'An alcohol-free hydrating toner that preps skin and helps the steps that follow absorb more comfortably.',
    description:
      'The quiet step that makes the rest of your routine work better. This alcohol-free toner adds a light layer of hydration straight after cleansing, so serums and creams spread evenly and skin feels balanced rather than parched. Contains panthenol and a light infusion of green tea, with no added fragrance or drying alcohols.',
    priceCents: 2200,
    size: '200 ml / 6.8 fl oz',
    inventory: 110,
    sortOrder: 4,
    unitsSold: 287,
    images: ['/images/balancing-toner.jpg'],
    benefits: [
      'Helps hydrate and refresh skin after cleansing',
      'Free from drying alcohols and added fragrance',
      'Helps skin feel balanced and prepped',
      'Suitable for use morning and evening',
    ],
    keyIngredients: [
      { name: 'Panthenol (Pro-Vitamin B5)', role: 'Helps skin feel soothed and conditioned.' },
      { name: 'Green Tea Leaf Extract', role: 'An antioxidant-rich botanical extract.' },
      { name: 'Betaine', role: 'A gentle humectant that helps skin hold on to moisture.' },
    ],
    ingredientsList:
      'Aqua (Water), Glycerin, Betaine, Panthenol, Camellia Sinensis (Green Tea) Leaf Extract, Sodium Hyaluronate, Allantoin, Butylene Glycol, Sodium PCA, Citric Acid, Sodium Benzoate, Potassium Sorbate, Phenoxyethanol, Ethylhexylglycerin.',
    howToUse:
      'After cleansing, press a few drops into damp skin with your palms or apply with a cotton pad. Follow with serum and moisturiser while skin is still slightly damp.',
    skinTypes: ['Dry', 'Normal', 'Combination', 'Oily', 'Sensitive'],
    seoTitle: 'Balancing Toner — Alcohol-Free Hydrating Toner | LUMÉRA',
    seoDescription:
      'An alcohol-free hydrating toner that refreshes skin after cleansing and preps it for serum and moisturiser. 200 ml.',
  },
  {
    slug: 'gentle-exfoliant',
    name: 'LUMÉRA Gentle Exfoliant',
    category: 'exfoliant',
    tagline: '5% lactic acid for smoother-looking skin, twice a week.',
    shortDescription:
      'A 5% lactic acid liquid exfoliant that helps refine the look of texture and supports a smoother-looking complexion.',
    description:
      'A measured approach to exfoliation. 5% lactic acid gently encourages surface cell turnover to help improve the look of rough texture and dullness, while added glycerin and allantoin help keep skin comfortable. Used two to three evenings a week, it helps skin look smoother and more even without the irritation that comes from over-exfoliating.',
    priceCents: 2900,
    compareAtPriceCents: 3400,
    size: '100 ml / 3.4 fl oz',
    inventory: 72,
    isBestSeller: true,
    sortOrder: 5,
    unitsSold: 344,
    images: ['/images/gentle-exfoliant.jpg'],
    benefits: [
      'Helps improve the appearance of rough, uneven texture',
      'Supports a smoother, more even-looking complexion',
      'Formulated with soothing ingredients for comfort',
      'Designed for measured, 2–3 times weekly use',
    ],
    keyIngredients: [
      { name: '5% Lactic Acid', role: 'A gentle AHA that helps exfoliate the skin’s surface.' },
      { name: 'Allantoin', role: 'Helps skin feel calm and conditioned.' },
      { name: 'Glycerin', role: 'Helps offset dryness associated with exfoliation.' },
    ],
    ingredientsList:
      'Aqua (Water), Lactic Acid, Glycerin, Butylene Glycol, Sodium Hydroxide, Panthenol, Allantoin, Sodium Hyaluronate, Hamamelis Virginiana (Witch Hazel) Water, Sodium Benzoate, Potassium Sorbate, Phenoxyethanol, Ethylhexylglycerin.',
    howToUse:
      'In the evening, 2–3 times per week, apply to a cotton pad and sweep over clean, dry skin. Avoid the eye area. Do not rinse. Follow with moisturiser. Introduce slowly and always wear sunscreen daily — AHAs can increase the skin’s sensitivity to the sun.',
    skinTypes: ['Normal', 'Combination', 'Oily', 'Dry'],
    seoTitle: 'Gentle Exfoliant — 5% Lactic Acid Liquid Exfoliant | LUMÉRA',
    seoDescription:
      'A 5% lactic acid liquid exfoliant that helps refine the look of texture for a smoother-looking complexion. 100 ml.',
  },
  {
    slug: 'daily-sunscreen',
    name: 'LUMÉRA Daily Sunscreen SPF 50',
    category: 'sunscreen',
    tagline: 'Broad spectrum SPF 50. No white cast, no heavy finish.',
    shortDescription:
      'A weightless broad spectrum SPF 50 with an invisible finish, formulated to wear comfortably every single day.',
    description:
      'The step that matters most, made genuinely wearable. A lightweight broad spectrum SPF 50 fluid that dries down to an invisible, near-matte finish with no white cast and no greasy weight. It sits beautifully under makeup and is comfortable enough that you will actually reapply. Fragrance-free.',
    priceCents: 2800,
    size: '50 ml / 1.7 fl oz',
    inventory: 140,
    isFeatured: true,
    isBestSeller: true,
    sortOrder: 6,
    unitsSold: 592,
    images: ['/images/daily-sunscreen.jpg'],
    benefits: [
      'Broad spectrum SPF 50 protection against UVA and UVB rays',
      'Helps protect against sun-induced signs of premature skin ageing',
      'Invisible finish with no white cast',
      'Sits comfortably under makeup',
    ],
    keyIngredients: [
      { name: 'Modern UV Filter System', role: 'Provides broad spectrum SPF 50 protection.' },
      { name: 'Glycerin', role: 'Helps keep skin hydrated through the day.' },
      { name: 'Vitamin E (Tocopherol)', role: 'An antioxidant that helps support the formula.' },
    ],
    ingredientsList:
      'Aqua (Water), Homosalate, Ethylhexyl Salicylate, Butyl Methoxydibenzoylmethane, Octocrylene, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Glycerin, Dimethicone, Silica, Tocopherol, Panthenol, Xanthan Gum, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin.',
    howToUse:
      'As the final step of your morning routine, apply generously to the face and neck 15 minutes before sun exposure — roughly two finger-lengths for the face. Reapply at least every two hours during sun exposure, and after swimming, sweating or towel drying.',
    skinTypes: ['Dry', 'Normal', 'Combination', 'Oily', 'Sensitive'],
    seoTitle: 'Daily Sunscreen SPF 50 — Invisible Broad Spectrum SPF | LUMÉRA',
    seoDescription:
      'A weightless broad spectrum SPF 50 facial sunscreen with an invisible, no-white-cast finish. Comfortable enough for daily wear. 50 ml.',
  },
  {
    slug: 'glow-routine-bundle',
    name: 'LUMÉRA Glow Routine Bundle',
    category: 'bundles',
    tagline: 'The complete four-step routine, at a considered price.',
    shortDescription:
      'Our four essentials — Hydrating Cleanser, Glow Serum, Barrier Moisturizer and Daily Sunscreen SPF 50.',
    description:
      'Everything you need for a complete morning and evening routine, in one set. Includes the full-size Hydrating Cleanser, Glow Serum, Barrier Moisturizer and Daily Sunscreen SPF 50 — the four steps we would recommend to anyone starting out, bought together for less than buying each individually. A considered introduction to the whole range.',
    priceCents: 10900,
    compareAtPriceCents: 13400,
    size: 'Four full-size products',
    inventory: 48,
    isFeatured: true,
    isBestSeller: true,
    sortOrder: 7,
    unitsSold: 218,
    images: ['/images/glow-routine-bundle.jpg'],
    benefits: [
      'A complete four-step routine for morning and evening',
      'Save compared with buying each product individually',
      'Full-size products, not samples',
      'A simple starting point for a consistent routine',
    ],
    keyIngredients: [
      { name: 'Hydrating Cleanser', role: 'Step one — a gentle daily wash, morning and evening.' },
      { name: 'Glow Serum', role: 'Step two — vitamin C and niacinamide, mornings.' },
      { name: 'Barrier Moisturizer', role: 'Step three — ceramide cream, morning and evening.' },
      { name: 'Daily Sunscreen SPF 50', role: 'Step four — broad spectrum protection, every morning.' },
    ],
    ingredientsList:
      'Please refer to the individual product pages for the full ingredients list of each item included in this set.',
    howToUse:
      'Morning: cleanse, apply Glow Serum, follow with Barrier Moisturizer, finish with Daily Sunscreen SPF 50. Evening: cleanse and apply Barrier Moisturizer. Add the Gentle Exfoliant 2–3 evenings a week if it suits your skin.',
    skinTypes: ['Dry', 'Normal', 'Combination', 'Oily', 'Sensitive'],
    seoTitle: 'Glow Routine Bundle — Complete 4-Step Skincare Set | LUMÉRA',
    seoDescription:
      'The complete LUMÉRA routine: Hydrating Cleanser, Glow Serum, Barrier Moisturizer and Daily Sunscreen SPF 50. Four full-size products in one set.',
  },
];

/**
 * SEEDED REVIEWS — realistic demo content
 *
 * These reviews are provided as realistic seeded content for development
 * and demo purposes. They are inserted as normal published reviews so the
 * storefront and admin reflect a realistic early catalogue of customer
 * feedback. Remove any items you do not want to include before production.
 */
export const seededReviews: {
  productSlug: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  daysAgo: number;
}[] = [
  {
    productSlug: 'hydrating-cleanser',
    author: 'Ana P.',
    rating: 5,
    title: 'Gentle and effective — no tightness',
    body: 'This cleanser removes my makeup without drying my skin. My face feels clean and hydrated afterwards. I use it every morning and night.',
    daysAgo: 12,
  },
  {
    productSlug: 'hydrating-cleanser',
    author: 'Marc T.',
    rating: 4,
    title: 'Great daily wash',
    body: 'Lathers nicely and doesn\'t irritate my acne-prone skin. A tiny pump does the job.',
    daysAgo: 34,
  },
  {
    productSlug: 'glow-serum',
    author: 'Sofia L.',
    rating: 5,
    title: 'Noticeably brighter skin',
    body: 'I started seeing more even tone within two weeks. Lightweight and layers well under moisturizer.',
    daysAgo: 6,
  },
  {
    productSlug: 'glow-serum',
    author: 'Daniel R.',
    rating: 5,
    title: 'Love the texture',
    body: 'Absorbs quickly with no pilling. My dark spots look a bit faded after a month.',
    daysAgo: 21,
  },
  {
    productSlug: 'glow-serum',
    author: 'Priya N.',
    rating: 4,
    title: 'Very effective — gentle',
    body: 'Good vitamin C alternative. No irritation and my complexion looks fresher.',
    daysAgo: 48,
  },
  {
    productSlug: 'barrier-moisturizer',
    author: 'Liam K.',
    rating: 5,
    title: 'Thick but not greasy',
    body: 'Keeps my skin hydrated all day without feeling heavy. A new staple for winter.',
    daysAgo: 9,
  },
  {
    productSlug: 'barrier-moisturizer',
    author: 'Emily S.',
    rating: 4,
    title: 'Comforting and long-lasting',
    body: 'Perfect for my sensitive skin. Has reduced redness and flakiness over time.',
    daysAgo: 27,
  },
  {
    productSlug: 'balancing-toner',
    author: 'Noah B.',
    rating: 4,
    title: 'Light and refreshing',
    body: 'Helps my serums sink in. No alcohol sting which I appreciate.',
    daysAgo: 15,
  },
  {
    productSlug: 'gentle-exfoliant',
    author: 'Hannah G.',
    rating: 5,
    title: 'Smooth results without irritation',
    body: 'Gentle enough for twice-a-week use. My skin texture is smoother and brighter.',
    daysAgo: 18,
  },
  {
    productSlug: 'gentle-exfoliant',
    author: 'Owen M.',
    rating: 4,
    title: 'Effective AHA',
    body: 'Noticeably softer skin; start slowly if you have sensitive skin.',
    daysAgo: 41,
  },
  {
    productSlug: 'daily-sunscreen',
    author: 'Zoe H.',
    rating: 5,
    title: 'Invisible and protective',
    body: 'No white cast and sits well under makeup. I carry it everywhere now.',
    daysAgo: 4,
  },
  {
    productSlug: 'daily-sunscreen',
    author: 'Carlos V.',
    rating: 5,
    title: 'Feels weightless',
    body: 'Doesn\'t feel greasy and absorbs quickly. Great for daily use.',
    daysAgo: 30,
  },
  {
    productSlug: 'glow-routine-bundle',
    author: 'Maya P.',
    rating: 5,
    title: 'Perfect starter kit',
    body: 'Bought the bundle to simplify my routine — everything pairs well together and my skin looks healthier.',
    daysAgo: 11,
  },
];
