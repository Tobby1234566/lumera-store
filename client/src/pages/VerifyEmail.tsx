import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email…');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is incomplete.');
      return;
    }
    api.customer.verifyEmail(token)
      .then((result) => { setState('success'); setMessage(result.message); })
      .catch((error) => { setState('error'); setMessage(error instanceof ApiError ? error.message : 'This verification link is invalid or expired.'); });
  }, [token]);

  return (
    <section className="shell flex min-h-[70vh] max-w-xl items-center justify-center py-20 text-center">
      <div>
        <p className="eyebrow">LUMÉRA account</p>
        <h1 className="mt-4 text-4xl text-ink">{state === 'success' ? 'You are all set.' : state === 'loading' ? 'One moment.' : 'Verification needs attention.'}</h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted">{message}</p>
        <Link to="/account" className="btn-primary mt-9">{state === 'success' ? 'Sign in' : 'Go to account'}</Link>
      </div>
    </section>
  );
}
