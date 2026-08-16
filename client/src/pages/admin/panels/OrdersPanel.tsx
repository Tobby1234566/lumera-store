import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import type { Order } from '../../../types';
import { formatMoney, formatDateTime } from '../../../lib/format';
import { Notice, Spinner } from '../../../components/ui';
import { StatusPill } from '../AdminDashboard';

const STATUSES = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export function OrdersPanel() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setOrders(null);
    api.admin
      .orders({ search, status })
      .then((r: any) => setOrders(r.orders))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load orders.');
        setOrders([]);
      });
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const changeStatus = async (order: Order, next: string) => {
    try {
      const r = await api.admin.updateOrder(order.id, { status: next });
      setOrders((current) => current?.map((o) => (o.id === order.id ? r.order : o)) ?? null);
      if (selected?.id === order.id) setSelected(r.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order.');
    }
  };

  return (
    <div className="space-y-6">
      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number, name, email or city…"
          className="field flex-1"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field sm:w-52">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {orders === null ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-6 w-6 text-ink-muted" />
        </div>
      ) : orders.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-ink-muted">No orders match those filters.</p>
      ) : (
        <div className="overflow-x-auto border border-sand-300 bg-sand-50">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead>
              <tr className="border-b border-sand-300 bg-sand-100 text-left text-[10.5px] uppercase tracking-wide2 text-ink-faint">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-sand-100/60">
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{order.orderNumber}</span>
                    <span className="block text-[11px] text-ink-faint">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-ink-soft">{order.fullName}</span>
                    <span className="block text-[11px] text-ink-faint">{order.email}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft tabular-nums">
                    {order.items.reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-ink-soft capitalize">{order.paymentStatus}</span>
                    {order.isSimulatedPayment && (
                      <span className="block text-[10px] text-amber-700">simulated</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => changeStatus(order, e.target.value)}
                      aria-label={`Change status of ${order.orderNumber}`}
                      className="border border-sand-300 bg-white px-2 py-1.5 text-[12px] capitalize"
                    >
                      {STATUSES.filter((s) => s !== 'all').map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {formatMoney(order.totalCents, order.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(order)}
                      className="text-[12px] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const [full, setFull] = useState<Order | null>(null);

  useEffect(() => {
    api.admin
      .order(order.id)
      .then((r: any) => setFull(r.order))
      .catch(() => setFull(order));
  }, [order]);

  const data = full ?? order;

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-ink/30" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto bg-sand-50 shadow-2xl animate-slide-in-right">
        <header className="sticky top-0 flex items-center justify-between border-b border-sand-300 bg-sand-50 px-6 py-4">
          <div>
            <h2 className="font-display text-xl text-ink">{data.orderNumber}</h2>
            <p className="text-[11.5px] text-ink-faint">{formatDateTime(data.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center text-2xl font-light text-ink-soft"
          >
            ×
          </button>
        </header>

        <div className="space-y-8 px-6 py-6">
          {data.isSimulatedPayment && (
            <Notice tone="warn">
              Paid through the mock driver — this is a simulated payment, not a real transaction.
            </Notice>
          )}

          <div className="flex flex-wrap gap-2">
            <StatusPill status={data.status} />
            <span className="bg-sand-200 px-2 py-1 text-[10.5px] uppercase tracking-wide2 text-ink-soft">
              {data.paymentStatus}
            </span>
          </div>

          <section>
            <h3 className="text-[11px] uppercase tracking-luxe text-ink-faint">Customer</h3>
            <div className="mt-3 space-y-1 text-[13.5px] text-ink-soft">
              <p className="text-ink">{data.fullName}</p>
              <p>{data.email}</p>
              {data.phone && <p>{data.phone}</p>}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] uppercase tracking-luxe text-ink-faint">Shipping address</h3>
            <address className="mt-3 text-[13.5px] not-italic leading-relaxed text-ink-soft">
              {data.shippingAddress.line1}
              {data.shippingAddress.line2 && (
                <>
                  <br />
                  {data.shippingAddress.line2}
                </>
              )}
              <br />
              {data.shippingAddress.city}
              {data.shippingAddress.state && `, ${data.shippingAddress.state}`}
              {data.shippingAddress.postalCode && ` ${data.shippingAddress.postalCode}`}
              <br />
              {data.shippingAddress.country}
            </address>
            {data.notes && (
              <p className="mt-3 border-l-2 border-sand-300 pl-3 text-[13px] italic text-ink-muted">
                “{data.notes}”
              </p>
            )}
          </section>

          <section>
            <h3 className="text-[11px] uppercase tracking-luxe text-ink-faint">Items</h3>
            <ul className="mt-3 divide-y divide-sand-200 border-y border-sand-200">
              {data.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3 text-[13.5px]">
                  <div>
                    <p className="text-ink">{item.name}</p>
                    <p className="text-[11.5px] text-ink-faint">
                      {item.quantity} × {formatMoney(item.unitPriceCents, data.currency)}
                    </p>
                  </div>
                  <span className="tabular-nums text-ink-soft">
                    {formatMoney(item.lineTotalCents, data.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(data.subtotalCents, data.currency)}</dd>
              </div>
              {data.discountCents > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <dt>Discount {data.discountCode && `(${data.discountCode})`}</dt>
                  <dd className="tabular-nums">−{formatMoney(data.discountCents, data.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="tabular-nums">{formatMoney(data.shippingCents, data.currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-sand-300 pt-2 text-[15px]">
                <dt className="text-ink">Total</dt>
                <dd className="tabular-nums text-ink">{formatMoney(data.totalCents, data.currency)}</dd>
              </div>
            </dl>
          </section>

          {data.events && data.events.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-luxe text-ink-faint">History</h3>
              <ol className="mt-3 space-y-3">
                {data.events.map((event) => (
                  <li key={event.id} className="border-l-2 border-sand-300 pl-3">
                    <p className="text-[13px] text-ink-soft">{event.message}</p>
                    <p className="text-[11px] text-ink-faint">{formatDateTime(event.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
