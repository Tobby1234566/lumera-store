import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { Accordion, Reveal } from '../components/ui';

const GROUPS = [
  {
    title: 'Products & routine',
    items: [
      {
        q: 'Where should I start if I have never had a routine?',
        a: 'Three steps do most of the work: a gentle cleanser, a moisturiser, and a daily SPF. Add a serum once that feels effortless. Our Glow Routine Bundle puts those four together at a lower price than buying them separately.',
      },
      {
        q: 'Are LUMÉRA products suitable for sensitive skin?',
        a: 'Every formula is made without added fragrance or essential oils, which are among the most common causes of irritation. That said, sensitivity is individual — we recommend patch testing any new product on a small area of skin for a few days before applying it to your whole face.',
      },
      {
        q: 'Can I use the Glow Serum and the Gentle Exfoliant together?',
        a: 'We suggest using them at different times rather than layering them in one sitting. Vitamin C in the morning, exfoliant in the evening two to three times a week. If your skin feels sensitised, reduce the exfoliant to once a week.',
      },
      {
        q: 'Are your products cruelty-free?',
        a: 'Yes. We do not test on animals at any stage, and we do not work with suppliers or third parties who do. Our range is also formulated without animal-derived ingredients.',
      },
      {
        q: 'Are they safe to use during pregnancy?',
        a: 'Many people continue using products like ours during pregnancy, but we are not in a position to give individual medical guidance. Please check with your doctor or midwife about any product or ingredient before using it while pregnant or breastfeeding.',
      },
      {
        q: 'How long does a bottle last?',
        a: 'With daily use as directed, the cleanser and toner generally last around three months, the serum and moisturiser around two to three, and the sunscreen around six to eight weeks if you are applying and reapplying generously.',
      },
    ],
  },
  {
    title: 'Orders & shipping',
    items: [
      {
        q: 'How long will my order take?',
        a: 'We dispatch within 1–2 business days. Standard delivery then takes 3–7 business days domestically and 7–21 business days internationally, depending on destination and customs.',
      },
      {
        q: 'How much is shipping?',
        a: 'Standard shipping is $6.95, and free on orders over $60. Any express options available for your address are shown at checkout.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Yes, to most countries. Import duties and taxes are set by your country and are not included in our prices — they are the recipient’s responsibility.',
      },
      {
        q: 'Can I change or cancel my order?',
        a: 'If it has not shipped yet, almost certainly. Email us with your order number as soon as possible and we will do what we can.',
      },
    ],
  },
  {
    title: 'Returns & refunds',
    items: [
      {
        q: 'What is your returns policy?',
        a: 'You can return any product within 30 days of delivery for a refund, whether it is opened or not. We only ask that you contact us first so we can issue return instructions.',
      },
      {
        q: 'What if my order arrives damaged?',
        a: 'Email us within 7 days with a photo and your order number. We will send a replacement or issue a full refund, and you will not need to return the damaged item.',
      },
      {
        q: 'When will I receive my refund?',
        a: 'Refunds are issued to the original payment method within 5–10 business days of us receiving your return, and typically appear on your statement within a further few days.',
      },
    ],
  },
  {
    title: 'Payments & privacy',
    items: [
      {
        q: 'Is my payment information secure?',
        a: 'Yes. Card details are entered directly into our payment provider’s secure fields and are transmitted straight to them. LUMÉRA never receives or stores your full card number.',
      },
      {
        q: 'What do you do with my data?',
        a: 'We collect only what is needed to fulfil your order and answer your questions. We do not sell personal data. Our Privacy Policy explains exactly what is stored and for how long.',
      },
    ],
  },
];

export function FAQ() {
  useSeo({
    title: 'Frequently Asked Questions | LUMÉRA',
    description:
      'Answers to common questions about LUMÉRA products, routines, shipping, returns, payments and privacy.',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: GROUPS.flatMap((g) =>
        g.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      ),
    },
  });

  return (
    <div className="shell py-12 lg:py-20">
      <header className="max-w-2xl">
        <p className="eyebrow">Help</p>
        <h1 className="mt-5 text-4xl leading-tight text-ink sm:text-5xl">Frequently asked questions</h1>
        <p className="mt-6 text-[15.5px] leading-relaxed text-ink-soft">
          If your question is not answered here, please{' '}
          <Link to="/contact" className="text-ink link-underline">
            get in touch
          </Link>
          .
        </p>
      </header>

      <div className="mt-14 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-8">
          {GROUPS.map((group, gi) => (
            <Reveal key={group.title} delay={gi * 60}>
              <section className={gi > 0 ? 'mt-14' : ''}>
                <h2 className="eyebrow mb-2">{group.title}</h2>
                <div className="border-t border-sand-200">
                  {group.items.map((item) => (
                    <Accordion key={item.q} title={item.q}>
                      <p>{item.a}</p>
                    </Accordion>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>

        <aside className="lg:col-span-4">
          <div className="border border-sand-200 bg-sand-100 p-7 lg:sticky lg:top-28">
            <h2 className="font-display text-2xl text-ink">Still stuck?</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
              We answer every message ourselves, usually within a business day or two.
            </p>
            <Link to="/contact" className="btn-primary mt-6 w-full">
              Contact us
            </Link>

            <ul className="mt-8 space-y-2.5 border-t border-sand-300 pt-6 text-[13.5px]">
              {[
                ['/shipping-policy', 'Shipping policy'],
                ['/returns-policy', 'Returns & refunds'],
                ['/privacy-policy', 'Privacy policy'],
                ['/terms', 'Terms & conditions'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-ink-muted transition-colors hover:text-ink">
                    {label} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
