import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order } from '../types';
import { useSeo } from '../lib/seo';
import { formatMoney, formatDate } from '../lib/format';
import { Image, Notice, Spinner } from '../components/ui';

const STATUS_COPY: Record<string, string> = {
  pending: 'We have received your order and are awaiting payment confirmation.',
  paid: 'Payment confirmed. Your order is being prepared for dispatch.',
  processing: 'Your order is being packed.',
  shipped: 'Your order is on its way.',
  delivered: 'Your order has been delivered.',
  cancelled: 'This order has been cancelled.',
  refunded: 'This order has been refunded.',
};

export function OrderConfirmation() {
  const { orderNumber = '' } = useParams();
  const [params] = useSearchParams();
  const email = params.get('email') ?? undefined;
  const paymentReference = params.get('tx_ref') ?? params.get('reference');
  const paymentStatus = params.get('status');
  const accessToken = params.get('access_token') ?? '';

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useSeo({
    title: `Order ${orderNumber} | LUMÉRA`,
    description:
      'Your LUMÉRA order confirmation, including the items ordered, your delivery address and what happens next.',
    noIndex: true,
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (paymentReference && accessToken && (paymentStatus === 'successful' || paymentStatus === 'success')) {
          const verified = await api.paymentVerify(paymentReference, accessToken);
          if (active) setOrder(verified.order);
          return;
        }
        if (paymentReference && accessToken && (paymentStatus === 'failed' || paymentStatus === 'abandoned')) {
          await api.paymentFail(paymentReference, 'Payment provider reported a failed payment.', accessToken);
        }
        const result = await api.order(orderNumber, email, accessToken);
        if (active) setOrder(result.order);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Order not found.');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [orderNumber, email, paymentReference, paymentStatus, accessToken]);

  if (error) {
    return (
      <div className="shell py-28 text-center lg:py-36">
        <p className="eyebrow">Order</p>
        <h1 className="mt-4 text-4xl text-ink">We could not find that order</h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted">
          Please check the order number, or contact us and we will look into it for you.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link to="/contact" className="btn-primary">
            Contact us
          </Link>
          <Link to="/shop" className="btn-secondary">
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="shell flex justify-center py-40">
        <Spinner className="h-6 w-6 text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="shell py-12 lg:py-20">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="#F5F1EB"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="eyebrow mt-7">Order confirmed</p>
          <h1 className="mt-4 text-4xl leading-tight text-ink sm:text-5xl">Thank you, {order.fullName.split(' ')[0]}.</h1>
          <p className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed text-ink-muted">
            {STATUS_COPY[order.status] ?? 'We have received your order.'} A confirmation has been sent
            to <span className="text-ink">{order.email}</span>.
          </p>
        </div>

        {order.isSimulatedPayment && (
          <Notice tone="warn" className="mt-9">
            <strong className="font-medium">Development order.</strong> This order was placed using the
            mock payment driver. No real payment was processed and nothing will be shipped. It exists
            so the order flow can be tested end to end.
          </Notice>
        )}

        {/* Meta */}
        <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden border border-sand-200 bg-sand-200 sm:grid-cols-4">
          {[
            ['Order', order.orderNumber],
            ['Date', formatDate(order.createdAt)],
            ['Total', formatMoney(order.totalCents, order.currency)],
            ['Status', order.status],
          ].map(([label, value]) => (
            <div key={label} className="bg-sand-50 px-4 py-5">
              <dt className="text-[10px] uppercase tracking-luxe text-ink-faint">{label}</dt>
              <dd className="mt-1.5 text-[14px] capitalize text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Items */}
        <section className="mt-12">
          <h2 className="text-[12px] uppercase tracking-luxe text-ink">Items</h2>
          <ul className="mt-5 divide-y divide-sand-200 border-y border-sand-200">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-5">
                <Link to={`/shop/${item.slug}`} className="shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    wrapperClassName="h-24 w-20"
                    className="h-full w-full object-cover"
                  />
                </Link>
                <div className="flex flex-1 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link to={`/shop/${item.slug}`} className="font-display text-lg text-ink hover:underline underline-offset-4">
                      {item.name.replace('LUMÉRA ', '')}
                    </Link>
                    <p className="mt-1 text-[12px] text-ink-faint">{item.size}</p>
                    <p className="mt-1 text-[13px] text-ink-muted">
                      Qty {item.quantity} × {formatMoney(item.unitPriceCents, order.currency)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[14.5px] tabular-nums text-ink">
                    {formatMoney(item.lineTotalCents, order.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-3 text-[14.5px]">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="tabular-nums text-ink">{formatMoney(order.subtotalCents, order.currency)}</dd>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-emerald-800">
                <dt>Discount {order.discountCode && `(${order.discountCode})`}</dt>
                <dd className="tabular-nums">−{formatMoney(order.discountCents, order.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-muted">Shipping</dt>
              <dd className="tabular-nums text-ink">
                {order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents, order.currency)}
              </dd>
            </div>
            {order.taxCents > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Tax</dt>
                <dd className="tabular-nums text-ink">{formatMoney(order.taxCents, order.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-sand-200 pt-4 text-[18px]">
              <dt className="text-ink">Total</dt>
              <dd className="tabular-nums text-ink">{formatMoney(order.totalCents, order.currency)}</dd>
            </div>
          </dl>
        </section>

        {/* Shipping */}
        <section className="mt-12 grid gap-8 border-t border-sand-200 pt-10 sm:grid-cols-2">
          <div>
            <h2 className="text-[12px] uppercase tracking-luxe text-ink">Shipping to</h2>
            <address className="mt-4 text-[14.5px] not-italic leading-relaxed text-ink-soft">
              {order.fullName}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && (
                <>
                  <br />
                  {order.shippingAddress.line2}
                </>
              )}
              <br />
              {order.shippingAddress.city}
              {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
              {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
              <br />
              {order.shippingAddress.country}
            </address>
          </div>

          <div>
            <h2 className="text-[12px] uppercase tracking-luxe text-ink">What happens next</h2>
            <ol className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-muted">
              <li>1. We pack your order within 1–2 business days.</li>
              <li>2. You receive a dispatch email with tracking.</li>
              <li>3. Standard delivery takes 3–7 business days.</li>
            </ol>
            {order.trackingNumber && (
              <p className="mt-4 text-[13.5px] text-ink">
                Tracking: <span className="font-medium">{order.trackingNumber}</span>
                {order.shippingCarrier && ` (${order.shippingCarrier})`}
              </p>
            )}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap justify-center gap-3 border-t border-sand-200 pt-10">
          <Link to="/shop" className="btn-primary">
            Continue shopping
          </Link>
          <Link to="/contact" className="btn-secondary">
            Need help?
          </Link>
        </div>
      </div>
    </div>
  );
}
