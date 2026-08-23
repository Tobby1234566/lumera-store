import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatDateTime, formatMoney } from '../../../lib/format';
import { Notice, Spinner } from '../../../components/ui';

const severityClasses: Record<string, string> = {
  critical: 'border-red-200 bg-red-50 text-red-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  info: 'border-sand-300 bg-sand-50 text-ink',
};

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border border-sand-300 bg-sand-50 p-5">
      <p className="text-[10px] uppercase tracking-luxe text-ink-faint">{label}</p>
      <p className="mt-3 font-display text-2xl text-ink">{value}</p>
      <p className="mt-1.5 text-[11.5px] text-ink-faint">{note}</p>
    </div>
  );
}

export function AgentPanel() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState('');
  const [reply, setReply] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  const load = () => {
    setError('');
    api.admin
      .agentOverview()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the agent.'));
  };

  useEffect(load, []);

  const runAudit = async () => {
    setBusy(true);
    setError('');
    try {
      const next = await api.admin.runAgentAudit();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The store audit failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitChat = async (event: FormEvent) => {
    event.preventDefault();
    if (!chat.trim()) return;
    setChatBusy(true);
    setError('');
    try {
      const result = await api.admin.agentChat(chat);
      setReply(result.reply);
      setChat('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The agent could not answer.');
    } finally {
      setChatBusy(false);
    }
  };

  const review = async (id: string, decision: 'approve' | 'reject') => {
    setBusy(true);
    setError('');
    try {
      await api.admin.reviewAgentApproval(id, decision);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The approval decision failed.');
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <Notice tone="error">{error}</Notice>;
  if (!data) return <div className="flex justify-center py-24"><Spinner className="h-6 w-6 text-ink-muted" /></div>;

  const { settings, summary, opportunities, approvals, activities } = data;

  return (
    <div className="space-y-8">
      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-col justify-between gap-4 border border-sand-300 bg-ink p-6 text-sand-50 md:flex-row md:items-center">
        <div>
          <p className="text-[10px] uppercase tracking-luxe text-sand-300">LUMÉRA operations agent</p>
          <h1 className="mt-2 font-display text-3xl">Run the store with guardrails.</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-sand-200">
            Routine analysis and store housekeeping can run automatically. Price changes, discounts, refunds, ad spend, supplier orders, and every other money-related action stay paused until you approve them.
          </p>
        </div>
        <button type="button" onClick={runAudit} disabled={busy} className="shrink-0 bg-sand-50 px-4 py-3 text-[11px] uppercase tracking-wide2 text-ink transition-colors hover:bg-white disabled:opacity-60">
          {busy ? 'Auditing…' : 'Run store audit'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Store revenue" value={formatMoney(summary.revenueCents)} note="Paid and fulfilled orders" />
        <Metric label="Orders" value={String(summary.orderCount)} note={`${summary.paidOrderCount} paid or fulfilled`} />
        <Metric label="Open messages" value={String(summary.openMessageCount)} note="Customer support backlog" />
        <Metric label="Approval queue" value={String(summary.pendingApprovalCount)} note="Money actions awaiting you" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="border border-sand-300 bg-sand-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[12px] uppercase tracking-luxe text-ink">Opportunities and alerts</h2>
              <p className="mt-2 text-[12px] text-ink-muted">The agent’s latest read of your catalog, orders, customers, and support inbox.</p>
            </div>
            <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] uppercase tracking-wide2 text-emerald-900">{settings.enabled ? 'Active' : 'Paused'}</span>
          </div>
          <div className="mt-6 space-y-3">
            {opportunities.map((item: any) => (
              <div key={item.id} className={`border p-4 ${severityClasses[item.severity] ?? severityClasses.info}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium">{item.title}</p>
                    <p className="mt-1.5 text-[12px] leading-5 opacity-80">{item.detail}</p>
                  </div>
                  {item.requiresApproval && <span className="shrink-0 text-[10px] uppercase tracking-wide2">Approval required</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-sand-300 bg-sand-50 p-6">
          <h2 className="text-[12px] uppercase tracking-luxe text-ink">Ask the agent</h2>
          <p className="mt-2 text-[12px] leading-5 text-ink-muted">Ask for an audit, a growth idea, product copy, or a customer-support plan. The agent can recommend money actions, but cannot execute them without approval.</p>
          <form onSubmit={submitChat} className="mt-5 space-y-3">
            <textarea value={chat} onChange={(event) => setChat(event.target.value)} rows={5} maxLength={4000} placeholder="Example: Which product should I promote next, and why?" className="w-full resize-y border border-sand-300 bg-white p-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-ink" />
            <button type="submit" disabled={chatBusy || !chat.trim()} className="w-full bg-ink px-4 py-3 text-[11px] uppercase tracking-wide2 text-sand-50 transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
              {chatBusy ? 'Thinking…' : 'Ask agent'}
            </button>
          </form>
          {reply && <div className="mt-5 border-l-2 border-ink bg-white p-4 text-[12.5px] leading-6 text-ink-soft whitespace-pre-wrap">{reply}</div>}
          {!settings.approvalEmail && <p className="mt-4 text-[11px] text-amber-800">Set an approval contact before connecting external actions.</p>}
        </section>
      </div>

      <section className="border border-amber-300 bg-amber-50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[12px] uppercase tracking-luxe text-amber-950">Owner approval queue</h2>
            <p className="mt-2 text-[12px] text-amber-900/75">Nothing in this queue executes until you explicitly approve it.</p>
          </div>
          <span className="text-[11px] uppercase tracking-wide2 text-amber-900">Money actions locked by default</span>
        </div>
        <div className="mt-5 space-y-3">
          {approvals.length === 0 ? (
            <p className="border border-amber-200 bg-amber-100/60 p-4 text-[12px] text-amber-900">No pending approvals. When the agent proposes a price change or discount, it will appear here.</p>
          ) : approvals.map((approval: any) => (
            <div key={approval.id} className="flex flex-col justify-between gap-4 border border-amber-200 bg-sand-50 p-4 md:flex-row md:items-center">
              <div>
                <p className="text-[13px] font-medium text-ink">{approval.title}</p>
                <p className="mt-1 text-[12px] leading-5 text-ink-muted">{approval.description}</p>
                <p className="mt-2 text-[10.5px] text-ink-faint">Requested {formatDateTime(approval.createdAt)} by {approval.requestedBy}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => review(approval.id, 'reject')} disabled={busy} className="border border-sand-400 px-3 py-2 text-[10px] uppercase tracking-wide2 text-ink-soft hover:border-ink disabled:opacity-60">Reject</button>
                <button type="button" onClick={() => review(approval.id, 'approve')} disabled={busy} className="bg-ink px-3 py-2 text-[10px] uppercase tracking-wide2 text-sand-50 hover:bg-ink/90 disabled:opacity-60">Approve and execute</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-sand-300 bg-sand-50 p-6">
        <h2 className="text-[12px] uppercase tracking-luxe text-ink">Agent activity</h2>
        <div className="mt-5 divide-y divide-sand-200">
          {activities.length === 0 ? <p className="py-4 text-[12px] text-ink-muted">No activity yet. Run an audit to begin the operating log.</p> : activities.map((item: any) => (
            <div key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <div><p className="text-[13px] text-ink">{item.title}</p><p className="text-[12px] text-ink-muted">{item.detail}</p></div>
              <span className="shrink-0 text-[10.5px] text-ink-faint">{formatDateTime(item.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
