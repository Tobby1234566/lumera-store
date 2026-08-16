import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { Notice, Spinner, Stars } from '../../../components/ui';

export function ReviewsPanel() {
  const [reviews, setReviews] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    api.admin
      .reviews()
      .then((r: any) => setReviews(r.reviews))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load reviews.'));
  };

  useEffect(load, []);

  const removePlaceholders = async () => {
    if (
      !window.confirm(
        'Permanently delete every placeholder sample review? Do this before launch so no sample content is shown as genuine.',
      )
    )
      return;
    try {
      const r = await api.admin.deletePlaceholderReviews();
      setNotice(`${r.deleted} placeholder review${r.deleted === 1 ? '' : 's'} deleted.`);
      load();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the placeholder reviews.');
    }
  };

  const remove = async (review: any) => {
    if (!window.confirm('Delete this review?')) return;
    await api.admin.deleteReview(review.id).catch(() => undefined);
    load();
  };

  const placeholderCount = reviews?.filter((r) => r.isPlaceholder).length ?? 0;

  return (
    <div className="space-y-6">
      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      {placeholderCount > 0 && (
        <Notice tone="warn">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong className="font-medium">
                {placeholderCount} placeholder sample review{placeholderCount === 1 ? '' : 's'}
              </strong>{' '}
              are currently published. They are labelled as samples on the storefront, but must be
              removed before launch so nothing is presented as a genuine customer review.
            </span>
            <button
              type="button"
              onClick={removePlaceholders}
              className="shrink-0 border border-amber-700 px-4 py-2 text-[11px] uppercase tracking-wide2 text-amber-900 transition-colors hover:bg-amber-700 hover:text-white"
            >
              Remove all samples
            </button>
          </div>
        </Notice>
      )}

      <div className="border border-sand-300 bg-sand-50 p-5">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          <strong className="font-medium text-ink">Collecting genuine reviews:</strong> the{' '}
          <code className="bg-sand-200 px-1">reviews</code> table already supports verified-purchase
          flagging and publish/unpublish moderation. To start collecting real reviews, add a
          submission form to the product page (or connect a post-purchase email flow) that POSTs to a
          new authenticated endpoint, and set{' '}
          <code className="bg-sand-200 px-1">is_verified_purchase</code> by matching the reviewer’s
          email against a delivered order.
        </p>
      </div>

      {reviews === null ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-6 w-6 text-ink-muted" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-ink-muted">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="border border-sand-300 bg-sand-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Stars rating={review.rating} size={13} />
                    <span className="text-[13px] font-medium text-ink">{review.authorName}</span>
                    {review.isPlaceholder && (
                      <span className="border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9.5px] uppercase tracking-wide2 text-amber-800">
                        Sample
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-faint">
                    {review.productName} · {formatDate(review.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(review)}
                  className="shrink-0 text-[12px] text-red-700 underline-offset-4 hover:underline"
                >
                  Delete
                </button>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
