import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatMoney, formatDate } from '../../../lib/format';
import { Notice, Spinner } from '../../../components/ui';

export function DiscountsPanel() {
  const [discounts, setDiscounts] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ code: '', type: 'percent', value: '', minSubtotal: '', usageLimit: '' });

  const load = () => {
    api.admin
      .discounts()
      .then((r: any) => setDiscounts(r.discounts))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load discount codes.'));
  };

  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.admin.createDiscount({
        code: form.code,
        type: form.type,
        value:
          form.type === 'percent'
            ? parseInt(form.value, 10)
            : Math.round(parseFloat(form.value) * 100),
        minSubtotalCents: form.minSubtotal ? Math.round(parseFloat(form.minSubtotal) * 100) : 0,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
      });
      setForm({ code: '', type: 'percent', value: '', minSubtotal: '', usageLimit: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the code.');
    }
  };

  const toggle = async (discount: any) => {
    await api.admin.toggleDiscount(discount.id, !discount.isActive).catch(() => undefined);
    load();
  };

  const remove = async (discount: any) => {
    if (!window.confirm(`Delete the code ${discount.code}?`)) return;
    await api.admin.deleteDiscount(discount.id).catch(() => undefined);
    load();
  };

  return (
    <div className="space-y-8">
      {error && <Notice tone="error">{error}</Notice>}

      <form onSubmit={create} className="border border-sand-300 bg-sand-50 p-6">
        <h2 className="text-[12px] uppercase tracking-luxe text-ink">Create a discount code</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="GLOW10"
              required
              minLength={3}
              className="field uppercase"
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="field"
            >
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="label">{form.type === 'percent' ? 'Percent off' : 'Amount off'}</label>
            <input
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === 'percent' ? '10' : '5.00'}
              required
              className="field"
            />
          </div>
          <div>
            <label className="label">Min. subtotal</label>
            <input
              value={form.minSubtotal}
              onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })}
              placeholder="0.00"
              className="field"
            />
          </div>
          <div>
            <label className="label">Usage limit</label>
            <input
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              placeholder="Unlimited"
              className="field"
            />
          </div>
        </div>
        <button type="submit" className="btn-primary mt-5 px-8">
          Create code
        </button>
      </form>

      {discounts === null ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-ink-muted" />
        </div>
      ) : (
        <div className="overflow-x-auto border border-sand-300 bg-sand-50">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-sand-300 bg-sand-100 text-left text-[10.5px] uppercase tracking-wide2 text-ink-faint">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Minimum</th>
                <th className="px-4 py-3 font-medium">Used</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {discounts.map((discount) => (
                <tr key={discount.id} className={discount.isActive ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium tracking-wide2 text-ink">{discount.code}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {discount.type === 'percent' ? `${discount.value}% off` : `${formatMoney(discount.value)} off`}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {discount.minSubtotalCents ? formatMoney(discount.minSubtotalCents) : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">
                    {discount.timesUsed}
                    {discount.usageLimit ? ` / ${discount.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-muted">{formatDate(discount.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => toggle(discount)}
                        className="text-[12px] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                      >
                        {discount.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(discount)}
                        className="text-[12px] text-red-700 underline-offset-4 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
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
