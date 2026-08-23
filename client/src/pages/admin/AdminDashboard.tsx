import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useSeo } from '../../lib/seo';
import { formatMoney, formatDateTime } from '../../lib/format';
import { Notice, Spinner } from '../../components/ui';
import { AdminLogin } from './AdminLogin';
import { OrdersPanel } from './panels/OrdersPanel';
import { ProductsPanel } from './panels/ProductsPanel';
import { CustomersPanel } from './panels/CustomersPanel';
import { DiscountsPanel } from './panels/DiscountsPanel';
import { ReviewsPanel } from './panels/ReviewsPanel';
import { AgentPanel } from './panels/AgentPanel';

type Tab = 'overview' | 'orders' | 'products' | 'customers' | 'discounts' | 'reviews' | 'agent';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'customers', label: 'Customers' },
  { id: 'discounts', label: 'Discounts' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'agent', label: 'Agent' },
];

export function AdminDashboard() {
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useSeo({ title: 'Admin | LUMÉRA', description: 'LUMÉRA administration.', noIndex: true });

  const check = () => {
    api.admin
      .me()
      .then((r: any) => setAdmin(r.admin))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  };

  useEffect(check, []);

  const logout = async () => {
    await api.admin.logout().catch(() => undefined);
    setAdmin(null);
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-100">
        <Spinner className="h-6 w-6 text-ink-muted" />
      </div>
    );
  }

  if (!admin) {
    return (
      <AdminLogin
        onSuccess={() => {
          setChecking(true);
          check();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <header className="border-b border-sand-300 bg-sand-50">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-xl tracking-[0.2em] text-ink">LUMÉRA</span>
            <span className="text-[10px] uppercase tracking-luxe text-ink-faint">Admin</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-ink-muted hover:text-ink"
            >
              View store ↗
            </a>
            <span className="hidden text-[12px] text-ink-muted sm:inline">{admin.email}</span>
            <button
              type="button"
              onClick={logout}
              className="border border-sand-300 px-3 py-2 text-[11px] uppercase tracking-wide2 text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-[1400px] px-5 lg:px-8" aria-label="Admin sections">
          <div className="-mx-5 overflow-x-auto px-5 no-scrollbar lg:mx-0 lg:px-0">
            <div className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-[12.5px] transition-colors ${
                    tab === t.id
                      ? 'border-ink text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8 lg:py-10">
        {tab === 'overview' && <Overview />}
        {tab === 'orders' && <OrdersPanel />}
        {tab === 'products' && <ProductsPanel />}
        {tab === 'customers' && <CustomersPanel />}
        {tab === 'discounts' && <DiscountsPanel />}
        {tab === 'reviews' && <ReviewsPanel />}
        {tab === 'agent' && <AgentPanel />}
      </main>
    </div>
  );
}

/* ── Overview ────────────────────────────────────────────────────────────── */

function Overview() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.admin
      .analytics()
      .then((d: any) => setData(d))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load analytics.'));
  }, []);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data)
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-ink-muted" />
      </div>
    );

  const { totals, revenueSeries, bestSellers, recentOrders, lowStock, byStatus } = data;
  const maxRevenue = Math.max(1, ...revenueSeries.map((d: any) => d.revenueCents));

  const cards = [
    { label: 'Total sales', value: formatMoney(totals.revenueCents), note: 'Paid orders only' },
    { label: 'Orders', value: String(totals.ordersCount), note: `${totals.allOrdersCount} including unpaid` },
    { label: 'Average order value', value: formatMoney(totals.averageOrderValueCents), note: 'Per paid order' },
    { label: 'Customers', value: String(totals.customersCount), note: `${totals.pendingCount} orders pending` },
  ];

  return (
    <div className="space-y-8">
      <Notice tone="warn">
        <strong className="font-medium">Development data.</strong> These figures include seeded
        fixture orders and simulated mock payments. They do not represent real sales. Run{' '}
        <code className="bg-amber-100 px-1">npm run db:reset</code> to clear them before launch.
      </Notice>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="border border-sand-300 bg-sand-50 p-5">
            <p className="text-[10px] uppercase tracking-luxe text-ink-faint">{card.label}</p>
            <p className="mt-3 font-display text-3xl text-ink">{card.value}</p>
            <p className="mt-1.5 text-[11.5px] text-ink-faint">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="border border-sand-300 bg-sand-50 p-6 lg:col-span-2">
          <h2 className="text-[12px] uppercase tracking-luxe text-ink">Revenue — last 30 days</h2>
          <div className="mt-8 flex h-48 items-end gap-[3px]">
            {revenueSeries.map((day: any) => (
              <div key={day.date} className="group relative flex-1">
                <div
                  className="w-full bg-ink/80 transition-colors group-hover:bg-ink"
                  style={{ height: `${Math.max(2, (day.revenueCents / maxRevenue) * 180)}px` }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-[10px] text-sand-50 group-hover:block">
                  {day.date}: {formatMoney(day.revenueCents)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10.5px] text-ink-faint">
            <span>{revenueSeries[0]?.date}</span>
            <span>{revenueSeries[revenueSeries.length - 1]?.date}</span>
          </div>
        </div>

        {/* Best sellers */}
        <div className="border border-sand-300 bg-sand-50 p-6">
          <h2 className="text-[12px] uppercase tracking-luxe text-ink">Best sellers</h2>
          {bestSellers.length === 0 ? (
            <p className="mt-5 text-[13px] text-ink-muted">No sales recorded yet.</p>
          ) : (
            <ol className="mt-5 space-y-4">
              {bestSellers.map((product: any, i: number) => (
                <li key={product.slug} className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="text-[12px] text-ink-faint tabular-nums">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-ink">
                        {product.name.replace('LUMÉRA ', '')}
                      </p>
                      <p className="text-[11.5px] text-ink-faint">{product.units} units</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[13px] tabular-nums text-ink-soft">
                    {formatMoney(product.revenueCents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="border border-sand-300 bg-sand-50 p-6 lg:col-span-2">
          <h2 className="text-[12px] uppercase tracking-luxe text-ink">Recent orders</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[440px] text-[13px]">
              <thead>
                <tr className="border-b border-sand-300 text-left text-[10.5px] uppercase tracking-wide2 text-ink-faint">
                  <th className="pb-2.5 pr-3 font-medium">Order</th>
                  <th className="pb-2.5 pr-3 font-medium">Customer</th>
                  <th className="pb-2.5 pr-3 font-medium">Status</th>
                  <th className="pb-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {recentOrders.map((order: any) => (
                  <tr key={order.id}>
                    <td className="py-3 pr-3">
                      <span className="font-medium text-ink">{order.orderNumber}</span>
                      <span className="block text-[11px] text-ink-faint">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-ink-soft">{order.fullName}</td>
                    <td className="py-3 pr-3">
                      <StatusPill status={order.status} />
                    </td>
                    <td className="py-3 text-right tabular-nums text-ink">
                      {formatMoney(order.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status breakdown */}
          <div className="border border-sand-300 bg-sand-50 p-6">
            <h2 className="text-[12px] uppercase tracking-luxe text-ink">Orders by status</h2>
            <ul className="mt-5 space-y-2.5">
              {Object.entries(byStatus).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between text-[13px]">
                  <StatusPill status={status} />
                  <span className="tabular-nums text-ink-soft">{String(count)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Low stock */}
          <div className="border border-sand-300 bg-sand-50 p-6">
            <h2 className="text-[12px] uppercase tracking-luxe text-ink">Low stock</h2>
            {lowStock.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-muted">All products are well stocked.</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {lowStock.map((product: any) => (
                  <li key={product.slug} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate text-ink-soft">{product.name.replace('LUMÉRA ', '')}</span>
                    <span className="shrink-0 tabular-nums text-amber-700">{product.inventory}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-sand-200 text-ink-soft',
    paid: 'bg-emerald-100 text-emerald-900',
    processing: 'bg-blue-100 text-blue-900',
    shipped: 'bg-indigo-100 text-indigo-900',
    delivered: 'bg-emerald-200 text-emerald-950',
    cancelled: 'bg-red-100 text-red-900',
    refunded: 'bg-amber-100 text-amber-900',
  };
  return (
    <span
      className={`inline-block px-2 py-1 text-[10.5px] uppercase tracking-wide2 ${
        colors[status] ?? 'bg-sand-200 text-ink-soft'
      }`}
    >
      {status}
    </span>
  );
}
