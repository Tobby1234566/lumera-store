import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { Reveal } from '../components/ui';

const WHATSAPP = 'https://wa.me/2349028774078?text=Hi%20NNE%20Luxe%20Hair%2C%20I%27d%20like%20to%20book%20an%20appointment.';

const SERVICES = [
  { number: '01', title: 'Wigs', body: 'Ready-to-wear and custom units selected to fit your face, lifestyle, and budget.', tone: 'bg-[#f4d9df]' },
  { number: '02', title: 'Installations', body: 'Clean, secure installs with a soft, natural finish that makes every strand feel like yours.', tone: 'bg-[#e8d8c2]' },
  { number: '03', title: 'Maintenance', body: 'Refresh, restyle, and revive your unit so your investment keeps looking its best.', tone: 'bg-[#d8e0d5]' },
];

const PICKS = [
  { title: 'The soft wave', note: 'Body wave · Everyday glam', image: '/images/nne-luxe-profile.jpg', position: 'top' },
  { title: 'The clean bob', note: 'Sleek · Effortless · Sharp', image: '/images/nne-luxe-profile.jpg', position: 'center' },
  { title: 'The statement curl', note: 'Defined · Full · Unapologetic', image: '/images/nne-luxe-profile.jpg', position: 'bottom' },
];

export function Home() {
  useSeo({
    title: 'NNE Luxe Hair — Beauty in every strand.',
    description: 'Wigs, flawless installations, and thoughtful hair care from NNE Luxe Hair in Sangotedo, Lagos. Nationwide delivery available.',
    image: '/images/nne-luxe-profile.jpg',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'HairSalon',
      name: 'NNE Luxe Hair',
      description: 'Wigs, installations, and hair care in Sangotedo, Lagos.',
      telephone: '+2349028774078',
      areaServed: 'Nigeria',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
  });

  return (
    <>
      <section className="relative overflow-hidden bg-[#f8e9ed]">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-[#bd7b91]/30 sm:h-[34rem] sm:w-[34rem]" />
        <div className="shell grid min-h-[680px] items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-20 lg:py-20">
          <div className="relative z-10 max-w-xl animate-fade-up">
            <p className="eyebrow text-[#9a536b]">NNE LUXE HAIR · SANGOTEDO, LAGOS</p>
            <h1 className="mt-6 max-w-lg text-[3.7rem] leading-[.88] text-[#251d20] sm:text-[5.5rem] lg:text-[6.8rem]">Beauty in every strand.</h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-[#5d4c51] sm:text-lg">Hair that makes you pause, smile, and feel completely yourself. Thoughtfully sourced wigs, beautiful installs, and a little extra confidence.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="btn-primary bg-[#251d20] hover:bg-[#4d353e]">Book your appointment <span aria-hidden="true">↗</span></a>
              <Link to="/shop" className="btn-secondary border-[#251d20]/30 hover:border-[#251d20] hover:bg-[#251d20]">Shop wigs</Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-[#bd7b91]/30 pt-6 text-[11px] uppercase tracking-wide2 text-[#805264]">
              <span>Nationwide delivery</span><span>WhatsApp orders</span><span>By appointment</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[480px] lg:max-w-none">
            <div className="absolute -left-5 top-12 z-10 hidden w-32 -rotate-6 bg-[#251d20] p-4 text-[#f8e9ed] shadow-xl sm:block">
              <p className="font-display text-3xl leading-none">NNE</p><p className="mt-2 text-[9px] uppercase tracking-luxe">Beauty in every strand</p>
            </div>
            <div className="relative aspect-[.78] overflow-hidden rounded-[13rem_13rem_1.5rem_1.5rem] bg-[#c88da0] shadow-2xl shadow-[#9a536b]/20">
              <img src="/images/nne-luxe-profile.jpg" alt="NNE Luxe Hair TikTok profile featuring wig transformations and installs" className="h-full w-full object-cover object-top mix-blend-multiply opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#4e2838]/35 via-transparent to-white/10" />
              <div className="absolute bottom-7 left-7 right-7 text-[#fff8f8]"><p className="font-display text-4xl leading-none">Find your<br />next look.</p><p className="mt-3 text-[10px] uppercase tracking-luxe">@nneluxehair · TikTok</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-20 lg:py-28">
        <Reveal><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow text-[#9a536b]">The NNE experience</p><h2 className="mt-4 max-w-xl text-4xl leading-[.95] text-[#251d20] sm:text-6xl">Come for the hair.<br /><em className="text-[#a7627a]">Leave feeling brand new.</em></h2></div><p className="max-w-xs text-sm leading-relaxed text-[#796a6e]">From the first DM to the final curl, we make getting your hair done feel easy, personal, and worth it.</p></div></Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">{SERVICES.map((service, i) => <Reveal key={service.title} delay={i * 80}><article className={`group min-h-[270px] ${service.tone} p-7 transition-transform duration-300 hover:-translate-y-1 sm:p-9`}><div className="flex items-start justify-between"><span className="font-display text-4xl text-[#8e5d6d]">{service.number}</span><span className="text-2xl text-[#8e5d6d] transition-transform group-hover:translate-x-1">↗</span></div><div className="mt-20"><h3 className="font-display text-3xl text-[#251d20]">{service.title}</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-[#68565b]">{service.body}</p></div></article></Reveal>)}</div>
      </section>

      <section className="bg-[#251d20] py-20 text-[#fff8f8] lg:py-28"><div className="shell"><Reveal><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow text-[#d9aaba]">Featured looks</p><h2 className="mt-4 text-4xl sm:text-6xl">Your next signature.</h2></div><Link to="/shop" className="text-xs uppercase tracking-wide2 text-[#f2d5dd] link-underline">Explore the edit →</Link></div></Reveal><div className="mt-12 grid gap-4 sm:grid-cols-3">{PICKS.map((pick, i) => <Reveal key={pick.title} delay={i * 80}><Link to="/shop" className="group block"><div className="aspect-[.78] overflow-hidden bg-[#5b3e48]"><img src={pick.image} alt={pick.title} className="h-full w-full object-cover grayscale-[15%] transition-transform duration-700 ease-luxe group-hover:scale-105" style={{ objectPosition: pick.position }} /></div><p className="mt-4 font-display text-2xl">{pick.title}</p><p className="mt-1 text-[10px] uppercase tracking-wide2 text-[#d9aaba]">{pick.note}</p></Link></Reveal>)}</div></div></section>

      <section className="shell grid items-center gap-12 py-20 lg:grid-cols-[.9fr_1.1fr] lg:py-28"><Reveal><div className="relative mx-auto max-w-sm"><div className="absolute -inset-4 rotate-3 border border-[#d9aaba]" /><img src="/images/nne-luxe-profile.jpg" alt="NNE Luxe Hair social profile and wig transformations" className="relative w-full shadow-xl" /></div></Reveal><Reveal delay={100}><div className="max-w-xl lg:pl-10"><p className="eyebrow text-[#9a536b]">Seen on your feed</p><h2 className="mt-4 text-4xl leading-[.95] text-[#251d20] sm:text-6xl">Real hair.<br /><em className="text-[#a7627a]">Real main-character energy.</em></h2><p className="mt-7 text-base leading-relaxed text-[#796a6e]">Follow along for install transformations, styling ideas, new drops, and the girls who keep NNE Luxe Hair looking good on every timeline.</p><div className="mt-8 flex flex-wrap gap-3"><a href="https://www.tiktok.com/@nneluxehair" target="_blank" rel="noreferrer" className="btn-primary bg-[#251d20] hover:bg-[#4d353e]">Follow @nneluxehair ↗</a><a href={WHATSAPP} target="_blank" rel="noreferrer" className="btn-secondary">Ask a hair question</a></div></div></Reveal></section>

      <section className="bg-[#f4d9df] py-16"><div className="shell flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center"><div><p className="eyebrow text-[#9a536b]">Ready when you are</p><h2 className="mt-3 max-w-xl text-4xl leading-none text-[#251d20] sm:text-5xl">Let’s find your perfect look.</h2></div><a href={WHATSAPP} target="_blank" rel="noreferrer" className="btn-primary shrink-0 bg-[#251d20] hover:bg-[#4d353e]">Chat with NNE on WhatsApp ↗</a></div></section>
    </>
  );
}
