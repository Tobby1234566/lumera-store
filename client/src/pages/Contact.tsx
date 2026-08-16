import { useState } from 'react';
import { api } from '../lib/api';
import { useSeo } from '../lib/seo';
import { Notice, Spinner } from '../components/ui';

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  useSeo({
    title: 'Contact LUMÉRA',
    description:
      'Questions about an order, a product or your routine? Contact the LUMÉRA team — we reply within 1–2 business days.',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    setFeedback('');
    try {
      const result = await api.contact(form);
      setState('done');
      setFeedback(result.message);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setState('error');
      setFeedback(err instanceof Error ? err.message : 'Your message could not be sent.');
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="shell py-12 lg:py-20">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-5">
          <p className="eyebrow">Contact</p>
          <h1 className="mt-5 text-4xl leading-tight text-ink sm:text-5xl">Get in touch</h1>
          <p className="mt-6 text-[15.5px] leading-relaxed text-ink-soft">
            Whether it is a question about an order, an ingredient, or which product suits your skin —
            we would rather you asked than guessed.
          </p>

          <dl className="mt-12 space-y-8">
            <div>
              <dt className="eyebrow">Email</dt>
              <dd className="mt-2 text-[15px] text-ink">hello@lumera.example</dd>
            </div>
            <div>
              <dt className="eyebrow">Response time</dt>
              <dd className="mt-2 text-[15px] text-ink">Within 1–2 business days</dd>
            </div>
            <div>
              <dt className="eyebrow">Support hours</dt>
              <dd className="mt-2 text-[15px] text-ink">Monday to Friday, 9am–5pm</dd>
            </div>
            <div>
              <dt className="eyebrow">Order enquiries</dt>
              <dd className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                Please include your order number (it begins with LUM-) so we can help faster.
              </dd>
            </div>
          </dl>

          <div className="mt-12 border-l-2 border-clay-300 pl-5">
            <p className="text-[13.5px] leading-relaxed text-ink-muted">
              We are happy to help you choose between products, but we cannot offer medical advice.
              For persistent or painful skin concerns, please speak to a doctor or dermatologist.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="border border-sand-200 bg-sand-100 p-6 sm:p-8 lg:p-10">
            <h2 className="text-[12px] uppercase tracking-luxe text-ink">Send a message</h2>

            {state === 'done' ? (
              <div className="py-10 text-center">
                <p className="font-display text-2xl text-ink">Message sent</p>
                <p className="mx-auto mt-4 max-w-sm text-[14.5px] leading-relaxed text-ink-muted">
                  {feedback}
                </p>
                <button type="button" onClick={() => setState('idle')} className="btn-secondary mt-8">
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-5">
                {state === 'error' && <Notice tone="error">{feedback}</Notice>}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="label">
                      Your name <span className="text-clay-500">*</span>
                    </label>
                    <input
                      id="name"
                      required
                      minLength={2}
                      value={form.name}
                      onChange={set('name')}
                      autoComplete="name"
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="label">
                      Email <span className="text-clay-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={set('email')}
                      autoComplete="email"
                      className="field"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="label">
                    Subject <span className="text-clay-500">*</span>
                  </label>
                  <input
                    id="subject"
                    required
                    minLength={2}
                    value={form.subject}
                    onChange={set('subject')}
                    placeholder="Order LUM-XXXXXX, product question…"
                    className="field"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="label">
                    Message <span className="text-clay-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    minLength={10}
                    rows={6}
                    value={form.message}
                    onChange={set('message')}
                    className="field resize-y"
                  />
                  <p className="mt-1.5 text-[12px] text-ink-faint">Minimum 10 characters.</p>
                </div>

                <button type="submit" disabled={state === 'loading'} className="btn-primary w-full sm:w-auto sm:px-10">
                  {state === 'loading' ? <Spinner /> : 'Send message'}
                </button>

                <p className="text-[11.5px] leading-relaxed text-ink-faint">
                  We use your details only to respond to this enquiry. See our{' '}
                  <a href="/privacy-policy" className="underline underline-offset-2">
                    Privacy Policy
                  </a>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
