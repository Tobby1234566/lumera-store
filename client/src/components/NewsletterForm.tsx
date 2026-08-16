import { useState } from 'react';
import { api } from '../lib/api';
import { Spinner } from './ui';

export function NewsletterForm({
  source = 'footer',
  className = '',
  variant = 'default',
}: {
  source?: string;
  className?: string;
  variant?: 'default' | 'light';
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('loading');
    try {
      const result = await api.newsletter(email.trim(), source);
      setState('done');
      setMessage(result.message);
      setEmail('');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Please enter a valid email address.');
    }
  };

  if (state === 'done') {
    return (
      <p
        className={`text-[13.5px] ${variant === 'light' ? 'text-sand-100' : 'text-ink'} ${className}`}
        role="status"
      >
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={className} noValidate>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === 'error') setState('idle');
          }}
          placeholder="Your email address"
          autoComplete="email"
          className={`field flex-1 ${
            variant === 'light' ? 'border-sand-100/30 bg-transparent text-sand-50 placeholder:text-sand-300' : ''
          }`}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className={variant === 'light' ? 'btn bg-sand-50 text-ink hover:bg-white sm:px-8' : 'btn-primary sm:px-8'}
        >
          {state === 'loading' ? <Spinner /> : 'Sign up'}
        </button>
      </div>

      {state === 'error' && (
        <p className="mt-2 text-[12.5px] text-red-700" role="alert">
          {message}
        </p>
      )}

      <p
        className={`mt-2.5 text-[11.5px] leading-relaxed ${
          variant === 'light' ? 'text-sand-300' : 'text-ink-faint'
        }`}
      >
        By signing up you agree to our{' '}
        <a href="/privacy-policy" className="underline underline-offset-2">
          Privacy Policy
        </a>
        . Unsubscribe at any time.
      </p>
    </form>
  );
}
