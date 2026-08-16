import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSeo } from '../lib/seo';

/**
 * Policy pages.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANT — LEGAL REVIEW REQUIRED BEFORE LAUNCH
 * ─────────────────────────────────────────────────────────────────────────────
 * These are clear, good-faith starting templates written for a direct-to-
 * consumer cosmetics store. They are NOT legal advice and are not tailored to
 * any specific jurisdiction. Before accepting real orders you must have them
 * reviewed by a qualified lawyer and updated with:
 *   • your registered company name, address and registration number
 *   • your actual data processors (payment, email, analytics, fulfilment)
 *   • jurisdiction-specific consumer rights (UK/EU distance selling, CCPA, NDPR…)
 *   • your genuine retention periods and governing law
 * Search for [BRACKETED] placeholders — each one needs a real value.
 */

const UPDATED = 'Last updated: 14 August 2026';

function PolicyLayout({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="shell py-12 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <header className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-5 text-4xl leading-tight text-ink">{title}</h1>
            <p className="mt-5 text-[14.5px] leading-relaxed text-ink-muted">{intro}</p>
            <p className="mt-6 text-[12px] text-ink-faint">{UPDATED}</p>

            <div className="mt-8 border border-amber-200 bg-amber-50 p-4">
              <p className="text-[12px] leading-relaxed text-amber-900">
                <strong className="font-medium">Template notice:</strong> this policy is a starting
                template and must be reviewed by a qualified lawyer, with all bracketed placeholders
                completed, before the store accepts real orders.
              </p>
            </div>
          </div>
        </header>

        <div className="lg:col-span-8">
          <div className="prose-lumera space-y-10">{children}</div>

          <div className="mt-14 border-t border-sand-200 pt-8">
            <p className="text-[14px] text-ink-muted">
              Questions about this policy?{' '}
              <Link to="/contact" className="text-ink link-underline">
                Contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-clay-500" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Privacy ─────────────────────────────────────────────────────────────── */

export function PrivacyPolicy() {
  useSeo({
    title: 'Privacy Policy | LUMÉRA',
    description: 'How LUMÉRA collects, uses, stores and protects your personal information.',
  });

  return (
    <PolicyLayout
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What we collect, why we collect it, and what we will never do with it."
    >
      <Section title="Who we are">
        <p>
          LUMÉRA ([REGISTERED COMPANY NAME], [COMPANY REGISTRATION NUMBER], [REGISTERED ADDRESS]) is
          the data controller for the personal information described in this policy. You can reach us
          at [PRIVACY CONTACT EMAIL].
        </p>
      </Section>

      <Section title="What we collect">
        <p>We collect only what we need to run the store and answer your questions.</p>
        <List
          items={[
            'Order information: your name, email address, phone number and shipping address.',
            'Order contents: the products, quantities and amounts associated with your purchase.',
            'Communications: the content of messages you send us through the contact form.',
            'Newsletter: your email address, if you choose to subscribe.',
            'Basic analytics: anonymous event counts such as “product viewed” or “add to cart”, with no personal identifiers attached.',
          ]}
        />
        <p>
          <strong className="font-medium text-ink">We never see or store your card details.</strong>{' '}
          Payment information is entered directly into our payment provider’s secure systems. We
          retain only a transaction reference so we can match a payment to an order.
        </p>
      </Section>

      <Section title="Why we use it">
        <List
          items={[
            'To process, fulfil and deliver your order (necessary to perform our contract with you).',
            'To send transactional emails such as order and shipping confirmations (contract).',
            'To respond to your enquiries (legitimate interest in supporting our customers).',
            'To send marketing emails, only where you have opted in (consent — withdrawable at any time).',
            'To understand which products and pages are popular, in aggregate (legitimate interest).',
            'To meet accounting, tax and other legal obligations (legal obligation).',
          ]}
        />
      </Section>

      <Section title="Who we share it with">
        <p>
          We do not sell your personal data — to anyone, ever. We share the minimum necessary with
          service providers who help us operate:
        </p>
        <List
          items={[
            'Our payment provider, to process your payment: [PAYMENT PROVIDER].',
            'Our email provider, to send transactional and marketing email: [EMAIL PROVIDER].',
            'Our shipping and fulfilment partners, to deliver your order: [CARRIERS].',
            'Our hosting and database provider, which stores the data: [HOSTING PROVIDER].',
          ]}
        />
        <p>
          Each provider is bound by contract to process data only on our instructions. We may also
          disclose information where we are legally required to do so.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Order records are retained for [RETENTION PERIOD, e.g. 7 years] to satisfy accounting and
          tax requirements. Contact messages are kept for [RETENTION PERIOD]. Newsletter subscriptions
          are kept until you unsubscribe. Anonymous analytics events are retained in aggregate.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct, delete, restrict or
          port your personal data, to object to certain processing, and to withdraw consent for
          marketing at any time. To exercise any of these, email [PRIVACY CONTACT EMAIL] and we will
          respond within [STATUTORY PERIOD, e.g. 30 days].
        </p>
        <p>
          If you are unhappy with how we have handled your data, you may complain to your local
          supervisory authority ([RELEVANT AUTHORITY]).
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use a small number of strictly necessary cookies and local storage entries to keep your
          shopping cart and, for staff, an admin session. We do not currently use advertising or
          cross-site tracking cookies. If that changes, we will update this policy and request your
          consent where required.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use HTTPS across the site, store administrator passwords using industry-standard hashing,
          validate all input on the server, and restrict administrative access to authenticated staff.
          No system is perfectly secure, but we take reasonable and current measures to protect your
          information.
        </p>
      </Section>

      <Section title="Children">
        <p>
          Our store is not directed at children under [AGE, e.g. 16], and we do not knowingly collect
          their personal data. If you believe a child has provided us information, contact us and we
          will delete it.
        </p>
      </Section>
    </PolicyLayout>
  );
}

/* ── Terms ───────────────────────────────────────────────────────────────── */

export function Terms() {
  useSeo({
    title: 'Terms & Conditions | LUMÉRA',
    description: 'The terms governing your use of the LUMÉRA website and any purchases you make.',
  });

  return (
    <PolicyLayout
      eyebrow="Legal"
      title="Terms & Conditions"
      intro="The agreement between you and LUMÉRA when you use this site or place an order."
    >
      <Section title="1. These terms">
        <p>
          By using this website or placing an order you agree to these terms. They form a contract
          between you and [REGISTERED COMPANY NAME] ("LUMÉRA", "we", "us"), registered at
          [REGISTERED ADDRESS] under company number [COMPANY REGISTRATION NUMBER].
        </p>
      </Section>

      <Section title="2. Orders">
        <p>
          Placing an order is an offer to buy. A contract is formed only when we send you a dispatch
          confirmation. We may decline or cancel an order — for example if an item is out of stock, if
          a price was listed in error, or if we suspect fraudulent activity. If we cancel after you
          have paid, we will refund you in full.
        </p>
      </Section>

      <Section title="3. Pricing">
        <p>
          Prices are shown in [CURRENCY] and may change at any time before you place an order.
          Shipping is calculated and displayed at checkout. Import duties and taxes on international
          orders are set by the destination country and are the recipient’s responsibility.
        </p>
        <p>
          Occasionally a product may be mispriced. If the correct price is higher than the listed
          price, we will contact you before dispatch to confirm whether you wish to proceed.
        </p>
      </Section>

      <Section title="4. Products and cosmetic claims">
        <p>
          LUMÉRA products are cosmetics. They are intended to cleanse, hydrate and improve the
          appearance and feel of skin. They are{' '}
          <strong className="font-medium text-ink">
            not intended to diagnose, treat, cure or prevent any disease or medical condition
          </strong>
          , and nothing on this site should be read as a medical claim or as personalised medical
          advice.
        </p>
        <p>
          Individual results vary. If you have a persistent, painful or worsening skin concern, please
          consult a doctor or dermatologist. Always read the packaging, patch test new products, and
          discontinue use if irritation occurs.
        </p>
      </Section>

      <Section title="5. Payment">
        <p>
          Payment is taken through our payment provider at the time of ordering. We do not receive or
          store your card details. You confirm that you are authorised to use the payment method you
          provide.
        </p>
      </Section>

      <Section title="6. Delivery and returns">
        <p>
          Delivery timescales are estimates, not guarantees. Risk passes to you on delivery. Your
          cancellation and return rights are set out in our{' '}
          <Link to="/returns-policy" className="text-ink link-underline">
            Returns & Refund Policy
          </Link>
          , which forms part of these terms and does not affect your statutory rights.
        </p>
      </Section>

      <Section title="7. Acceptable use">
        <p>
          You agree not to misuse this site — including attempting to gain unauthorised access,
          interfering with its operation, scraping it at scale, or submitting unlawful content
          through our forms.
        </p>
      </Section>

      <Section title="8. Intellectual property">
        <p>
          All content on this site — text, imagery, branding and design — belongs to LUMÉRA or its
          licensors and may not be reproduced commercially without written permission.
        </p>
      </Section>

      <Section title="9. Liability">
        <p>
          Nothing in these terms excludes liability for death or personal injury caused by our
          negligence, for fraud, or for any liability that cannot lawfully be excluded. Subject to
          that, our total liability in connection with an order is limited to the amount you paid for
          it. [REVIEW WITH COUNSEL FOR YOUR JURISDICTION.]
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These terms are governed by the laws of [JURISDICTION], and the courts of [JURISDICTION]
          have exclusive jurisdiction over any dispute, without affecting any mandatory consumer
          protections available to you locally.
        </p>
      </Section>
    </PolicyLayout>
  );
}

/* ── Shipping ────────────────────────────────────────────────────────────── */

export function ShippingPolicy() {
  useSeo({
    title: 'Shipping Policy | LUMÉRA',
    description:
      'LUMÉRA shipping rates, dispatch times, delivery estimates, international shipping and tracking information.',
  });

  return (
    <PolicyLayout
      eyebrow="Support"
      title="Shipping Policy"
      intro="How and when your order reaches you."
    >
      <Section title="Processing time">
        <p>
          Orders are packed and dispatched within 1–2 business days. Orders placed on a weekend or a
          public holiday are processed on the next business day. You will receive a dispatch email
          with tracking as soon as your parcel leaves us.
        </p>
      </Section>

      <Section title="Rates and delivery estimates">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-sand-300 text-left">
                <th className="py-3 pr-4 font-medium text-ink">Method</th>
                <th className="py-3 pr-4 font-medium text-ink">Cost</th>
                <th className="py-3 font-medium text-ink">Estimated delivery</th>
              </tr>
            </thead>
            <tbody className="text-ink-soft">
              <tr className="border-b border-sand-200">
                <td className="py-3 pr-4">Standard</td>
                <td className="py-3 pr-4">$6.95</td>
                <td className="py-3">3–7 business days</td>
              </tr>
              <tr className="border-b border-sand-200">
                <td className="py-3 pr-4">Standard, orders over $60</td>
                <td className="py-3 pr-4">Free</td>
                <td className="py-3">3–7 business days</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">International</td>
                <td className="py-3 pr-4">Calculated at checkout</td>
                <td className="py-3">7–21 business days</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[13.5px] text-ink-muted">
          Delivery estimates are provided by our carriers and are not guaranteed. [UPDATE THESE RATES
          AND ZONES TO MATCH YOUR ACTUAL CARRIER AGREEMENTS.]
        </p>
      </Section>

      <Section title="International orders, duties and taxes">
        <p>
          We ship to most countries. Import duties, taxes and customs fees are determined by the
          destination country, are not included in our prices, and are the recipient’s
          responsibility. Customs processing can add delays we are unable to influence.
        </p>
      </Section>

      <Section title="Tracking">
        <p>
          Every order ships with tracking. If your tracking has not updated for more than five
          business days, contact us with your order number and we will open an enquiry with the
          carrier.
        </p>
      </Section>

      <Section title="Incorrect addresses">
        <p>
          Please check your shipping address carefully at checkout. If a parcel is returned to us
          because of an incorrect or incomplete address, we will contact you to arrange redelivery;
          a further shipping charge may apply.
        </p>
      </Section>

      <Section title="Lost or damaged parcels">
        <p>
          If your order arrives damaged, email us within 7 days of delivery with a photograph and your
          order number and we will replace it or refund you in full. If a parcel is confirmed lost in
          transit, we will send a replacement or issue a refund.
        </p>
      </Section>
    </PolicyLayout>
  );
}

/* ── Returns ─────────────────────────────────────────────────────────────── */

export function ReturnsPolicy() {
  useSeo({
    title: 'Returns & Refund Policy | LUMÉRA',
    description:
      'LUMÉRA offers 30-day returns, including on opened products. Read how to start a return and when to expect your refund.',
  });

  return (
    <PolicyLayout
      eyebrow="Support"
      title="Returns & Refunds"
      intro="Thirty days, opened or unopened. Skincare is personal, and sometimes it simply does not suit you."
    >
      <Section title="Our promise">
        <p>
          If a LUMÉRA product is not right for your skin, return it within 30 days of delivery for a
          refund — even if you have opened it and used most of it. We would rather you found something
          that works than kept a bottle you dislike.
        </p>
      </Section>

      <Section title="How to start a return">
        <List
          items={[
            'Email [RETURNS EMAIL] within 30 days of delivery with your order number (it begins with LUM-).',
            'Tell us briefly which item you are returning and why — this genuinely helps us improve.',
            'We will send return instructions and a return address within 1–2 business days.',
            'Post the item back to us. Keep your proof of postage until the refund is confirmed.',
          ]}
        />
        <p>
          Please do not send anything back before contacting us — unannounced returns can go
          unprocessed.
        </p>
      </Section>

      <Section title="Return shipping costs">
        <p>
          If the return is because of our error — the wrong item, a faulty product or damage in
          transit — we cover return postage. If you are returning simply because you changed your
          mind or the product did not suit you, the return postage is yours to cover. [ADJUST TO
          MATCH YOUR JURISDICTION'S CONSUMER LAW.]
        </p>
      </Section>

      <Section title="Refunds">
        <p>
          Once your return reaches us we inspect it and email you the outcome. Approved refunds are
          issued to the original payment method within 5–10 business days, and generally appear on
          your statement within a few days after that. Original shipping charges are refunded only
          where the return is due to our error or where required by law.
        </p>
      </Section>

      <Section title="Exchanges">
        <p>
          The fastest way to exchange is to return the original item for a refund and place a new
          order for the product you want, so you are not waiting for the return to arrive first.
        </p>
      </Section>

      <Section title="Damaged or incorrect items">
        <p>
          Email us within 7 days of delivery with a photograph and your order number. We will send a
          replacement or refund you in full, and you will not usually need to return the item.
        </p>
      </Section>

      <Section title="Items we cannot accept">
        <List
          items={[
            'Returns requested more than 30 days after delivery.',
            'Products purchased from a third-party retailer rather than directly from us.',
            'Products that have been visibly tampered with, decanted or contaminated.',
          ]}
        />
      </Section>

      <Section title="Your statutory rights">
        <p>
          This policy sits alongside, and does not replace, your legal rights as a consumer under
          [APPLICABLE CONSUMER LAW]. Where local law grants you stronger rights than this policy, those
          rights apply.
        </p>
      </Section>
    </PolicyLayout>
  );
}
