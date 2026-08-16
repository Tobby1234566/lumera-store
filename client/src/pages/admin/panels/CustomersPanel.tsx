import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatMoney, formatDate } from '../../../lib/format';
import { Notice, Spinner } from '../../../components/ui';

export function CustomersPanel() {
  const [customers, setCustomers] = useState<any[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomers(null);
      api.admin
        .customers(search)
        .then((r: any) => setCustomers(r.customers))
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Could not load customers.');
          setCustomers([]);
        });
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      {error && <Notice tone="error">{error}</Notice>}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="field sm:max-w-md"
      />

      {customers === null ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-6 w-6 text-ink-muted" />
        </div>
      ) : customers.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-ink-muted">No customers found.</p>
      ) : (
        <div className="overflow-x-auto border border-sand-300 bg-sand-50">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-sand-300 bg-sand-100 text-left text-[10.5px] uppercase tracking-wide2 text-ink-faint">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Marketing</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Total spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-sand-100/60">
                  <td className="px-4 py-3">
                    <p className="text-ink">{customer.fullName}</p>
                    <p className="text-[11.5px] text-ink-faint">{customer.email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{customer.phone ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{customer.ordersCount}</td>
                  <td className="px-4 py-3 text-[12px] text-ink-soft">
                    {customer.acceptsMarketing ? 'Subscribed' : '—'}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-muted">{formatDate(customer.createdAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {formatMoney(customer.totalSpentCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
