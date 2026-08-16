import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { Image, Reveal, SectionHeading } from '../components/ui';

const VALUES = [
  {
    title: 'Formulate with restraint',
    body: 'A shorter ingredient list is usually a better one. We include what earns its place and leave out what is there for marketing.',
  },
  {
    title: 'Price with honesty',
    body: 'We sell direct and keep packaging simple. That is the whole reason a LUMÉRA serum costs what it does rather than three times as much.',
  },
  {
    title: 'Say only what is true',
    body: 'Skincare is cosmetic. We describe what a product is designed to help with in plain language, and we never imply a medical outcome.',
  },
  {
    title: 'Make it easy to keep up',
    body: 'The best routine is the one you actually follow. Ours is built to be four steps, not fourteen.',
  },
];

export function About() {
  useSeo({
    title: 'About LUMÉRA — Our Approach to Skincare',
    description:
      'LUMÉRA makes simple, fragrance-free skincare at honest prices. Read about our approach to formulation, pricing and the claims we are willing to make.',
  });

  return (
    <>
      <section className="shell py-16 lg:py-24">
        <Reveal>
          <div className="max-w-3xl">
            <p className="eyebrow">About</p>
            <h1 className="mt-5 text-4xl leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
              Good skincare should not require a translator.
            </h1>
            <p className="mt-8 text-[17px] leading-relaxed text-ink-soft">
              LUMÉRA began with a fairly ordinary frustration: shopping for skincare had become
              exhausting. Ingredient lists read like chemistry exams, prices ranged from suspiciously
              cheap to genuinely absurd, and every other bottle promised something that no cosmetic
              product can honestly deliver.
            </p>
          </div>
        </Reveal>
      </section>

      <Reveal>
        <Image
          src="/images/hero.jpg"
          alt="LUMÉRA skincare bottles arranged on a stone surface in soft natural light"
          sizes="100vw"
          wrapperClassName="h-[40vh] min-h-[280px] w-full lg:h-[60vh]"
          className="h-full w-full object-cover"
        />
      </Reveal>

      <section className="shell py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <h2 className="text-3xl leading-tight text-ink sm:text-4xl">
              We wanted fewer products, better made.
            </h2>
          </Reveal>

          <Reveal delay={100} className="lg:col-span-7">
            <div className="space-y-5 text-[15.5px] leading-relaxed text-ink-soft">
              <p>
                So we built a small range instead of a large one. Seven products, each with a clear
                job: cleanse, tone, treat, exfoliate, moisturise, protect — and one bundle that puts
                the four essentials together for people starting from scratch.
              </p>
              <p>
                Every formula is fragrance-free, because added fragrance is one of the most common
                causes of irritation and adds nothing to how a product performs. Every formula is
                cruelty-free. And every formula lists its active concentrations openly, so you can
                compare us to anyone.
              </p>
              <p>
                We are also careful about what we claim. You will not find before-and-after imagery on
                this site, or language suggesting our products treat medical conditions. Skincare can
                genuinely improve how skin looks and feels. It is not medicine, and we think brands
                that blur that line do real harm.
              </p>
              <p>
                What we will promise is straightforward: considered formulas, transparent pricing,
                and honest descriptions of what each product is for.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-sand-200 bg-sand-100 py-16 lg:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading eyebrow="What we stand for" title="Four principles" align="left" />
          </Reveal>

          <div className="mt-12 grid gap-px overflow-hidden border border-sand-300 bg-sand-300 sm:grid-cols-2">
            {VALUES.map((value, i) => (
              <Reveal key={value.title} delay={i * 80}>
                <div className="h-full bg-sand-50 p-8 lg:p-10">
                  <span className="font-display text-2xl text-clay-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 font-display text-2xl text-ink">{value.title}</h3>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">{value.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-16 text-center lg:py-24">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-3xl leading-tight text-ink sm:text-4xl">
            Luxury skincare without the intimidating price tag.
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/shop" className="btn-primary">
              Shop the range
            </Link>
            <Link to="/faq" className="btn-secondary">
              Read the FAQ
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
