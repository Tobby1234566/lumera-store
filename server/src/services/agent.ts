import { z } from 'zod';
import { db } from '../db/knex.js';
import { config } from '../config.js';
import { id } from '../lib/ids.js';

const approvalActionSchema = z.discriminatedUnion('actionType', [
  z.object({
    actionType: z.literal('update_product_price'),
    productId: z.string().min(1).max(120),
    priceCents: z.number().int().min(0).max(10_000_000),
    compareAtPriceCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  }),
  z.object({
    actionType: z.literal('create_discount'),
    code: z.string().min(3).max(40),
    type: z.enum(['percent', 'fixed']),
    value: z.number().int().min(1).max(1_000_000),
    minSubtotalCents: z.number().int().min(0).default(0),
    usageLimit: z.number().int().min(1).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
]);

export type ApprovalAction = z.infer<typeof approvalActionSchema>;

const asBool = (value: unknown) => value === true || value === 1 || value === '1';
const parseJson = (value: unknown) => {
  try {
    return JSON.parse(String(value ?? '{}'));
  } catch {
    return {};
  }
};

async function ensureSettings() {
  const existing = await db('agent_settings').first();
  if (existing) return existing;
  const now = new Date().toISOString();
  const row = {
    id: 'agent_default',
    enabled: true,
    money_requires_approval: true,
    approval_email: config.seedAdmin.email,
    created_at: now,
    updated_at: now,
  };
  await db('agent_settings').insert(row);
  return row;
}

async function activity(kind: string, title: string, detail: string, severity = 'info', metadata: Record<string, unknown> = {}) {
  await db('agent_activities').insert({
    id: id('agt'),
    kind,
    title,
    detail,
    severity,
    metadata: JSON.stringify(metadata),
    created_at: new Date().toISOString(),
  });
}

export async function getAgentOverview() {
  const settings = await ensureSettings();
  const [products, orders, messages, customers, approvals, activities] = await Promise.all([
    db('products').select('id', 'name', 'slug', 'price_cents', 'inventory', 'is_active', 'description', 'seo_title', 'seo_description'),
    db('orders').select('id', 'status', 'payment_status', 'total_cents', 'created_at'),
    db('contact_messages').select('id', 'name', 'email', 'subject', 'message', 'is_handled', 'created_at'),
    db('customers').select('id', 'email', 'full_name', 'orders_count', 'total_spent_cents', 'accepts_marketing'),
    db('agent_approvals').where({ status: 'pending' }).orderBy('created_at', 'desc').limit(50),
    db('agent_activities').orderBy('created_at', 'desc').limit(40),
  ]);

  const paid = (orders as any[]).filter((o) => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status));
  const revenueCents = paid.reduce((sum, o) => sum + Number(o.total_cents), 0);
  const opportunities = buildOpportunities(products as any[], orders as any[], messages as any[], customers as any[]);

  return {
    settings: {
      enabled: asBool(settings.enabled),
      moneyRequiresApproval: asBool(settings.money_requires_approval),
      approvalEmail: settings.approval_email ?? '',
    },
    summary: {
      productCount: products.length,
      activeProductCount: (products as any[]).filter((p) => asBool(p.is_active)).length,
      orderCount: orders.length,
      paidOrderCount: paid.length,
      revenueCents,
      customerCount: customers.length,
      openMessageCount: (messages as any[]).filter((m) => !asBool(m.is_handled)).length,
      pendingApprovalCount: approvals.length,
    },
    opportunities,
    approvals: (approvals as any[]).map(serializeApproval),
    activities: (activities as any[]).map(serializeActivity),
  };
}

function buildOpportunities(products: any[], orders: any[], messages: any[], customers: any[]) {
  const results: any[] = [];
  for (const product of products) {
    const inventory = Number(product.inventory);
    if (asBool(product.is_active) && inventory < 10) {
      results.push({
        id: `stock-${product.id}`,
        type: 'inventory',
        severity: inventory === 0 ? 'critical' : 'warning',
        title: inventory === 0 ? `${product.name} is out of stock` : `${product.name} is running low`,
        detail: inventory === 0 ? 'Pause promotion and replenish before the next campaign.' : `${inventory} units remain. Prepare a replenishment plan before stock becomes a customer-service issue.`,
        requiresApproval: false,
      });
    }
    if (asBool(product.is_active) && (!String(product.description ?? '').trim() || !String(product.seo_description ?? '').trim())) {
      results.push({
        id: `content-${product.id}`,
        type: 'content',
        severity: 'info',
        title: `${product.name} needs stronger product content`,
        detail: 'The agent can draft a clearer product description and SEO metadata for review.',
        requiresApproval: false,
      });
    }
  }

  const openMessages = messages.filter((m) => !asBool(m.is_handled));
  if (openMessages.length) {
    results.push({
      id: 'support-inbox',
      type: 'customer_support',
      severity: openMessages.length > 5 ? 'warning' : 'info',
      title: `${openMessages.length} customer message${openMessages.length === 1 ? '' : 's'} need attention`,
      detail: 'The agent can classify the messages and draft replies. Refunds, credits, and other financial resolutions require approval.',
      requiresApproval: false,
    });
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  if (pendingOrders.length) {
    results.push({
      id: 'pending-orders',
      type: 'order_operations',
      severity: 'warning',
      title: `${pendingOrders.length} order${pendingOrders.length === 1 ? '' : 's'} still pending`,
      detail: 'Review payment status and fulfillment readiness. The agent will not mark an order paid without provider verification.',
      requiresApproval: false,
    });
  }

  const repeatCustomers = customers.filter((c) => Number(c.orders_count) >= 2).length;
  if (repeatCustomers) {
    results.push({
      id: 'retention',
      type: 'growth',
      severity: 'info',
      title: `${repeatCustomers} repeat customer${repeatCustomers === 1 ? '' : 's'} identified`,
      detail: 'A retention campaign could be drafted. Any discount, paid campaign, or incentive must be approved before launch.',
      requiresApproval: true,
    });
  }

  if (!results.length) {
    results.push({
      id: 'healthy-store',
      type: 'status',
      severity: 'success',
      title: 'No urgent store issues found',
      detail: 'The agent audit found no low-stock, support backlog, pending-order, or catalog-completeness alerts.',
      requiresApproval: false,
    });
  }
  return results;
}

function serializeApproval(row: any) {
  return {
    id: row.id,
    actionType: row.action_type,
    title: row.title,
    description: row.description,
    payload: parseJson(row.payload),
    status: row.status,
    requestedBy: row.requested_by,
    reviewedBy: row.reviewed_by,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    executedAt: row.executed_at,
  };
}

function serializeActivity(row: any) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    detail: row.detail,
    severity: row.severity,
    metadata: parseJson(row.metadata),
    createdAt: row.created_at,
  };
}

export async function runStoreAudit(adminEmail: string) {
  const overview = await getAgentOverview();
  await activity('audit', 'Store audit completed', `Reviewed ${overview.summary.productCount} products, ${overview.summary.orderCount} orders, ${overview.summary.customerCount} customers, and the support inbox.`, overview.opportunities.some((o) => o.severity === 'critical') ? 'critical' : 'info', { opportunityCount: overview.opportunities.length, requestedBy: adminEmail });
  return getAgentOverview();
}

export async function createApproval(input: unknown, adminEmail: string) {
  const action = approvalActionSchema.parse(input);
  const now = new Date().toISOString();
  let title = '';
  let description = '';
  if (action.actionType === 'update_product_price') {
    const product = await db('products').where({ id: action.productId }).first();
    if (!product) throw new Error('Product not found.');
    title = `Change price for ${product.name}`;
    description = `Change the product price to ${action.priceCents} cents${action.compareAtPriceCents ? ` with a compare-at price of ${action.compareAtPriceCents} cents` : ''}.`;
  } else {
    if (action.type === 'percent' && action.value > 100) throw new Error('A percentage discount cannot exceed 100.');
    title = `Create discount ${action.code.toUpperCase()}`;
    description = `Create a ${action.type === 'percent' ? `${action.value}%` : `${action.value} cents`} discount. This will affect customer checkout totals.`;
  }
  const approvalId = id('apr');
  await db('agent_approvals').insert({
    id: approvalId,
    action_type: action.actionType,
    title,
    description,
    payload: JSON.stringify(action),
    status: 'pending',
    requested_by: adminEmail,
    created_at: now,
  });
  await activity('approval_requested', title, description, 'warning', { approvalId, actionType: action.actionType });
  const row = await db('agent_approvals').where({ id: approvalId }).first();
  return serializeApproval(row);
}

export async function reviewApproval(approvalId: string, decision: 'approve' | 'reject', adminEmail: string, note?: string) {
  const approval = await db('agent_approvals').where({ id: approvalId }).first();
  if (!approval) throw new Error('Approval request not found.');
  if (approval.status !== 'pending') throw new Error('This approval request has already been reviewed.');

  const now = new Date().toISOString();
  if (decision === 'reject') {
    await db('agent_approvals').where({ id: approvalId }).update({ status: 'rejected', reviewed_by: adminEmail, review_note: note ?? null, reviewed_at: now });
    await activity('approval_rejected', approval.title, note || 'The owner rejected this money-related action.', 'info', { approvalId });
  } else {
    const action = approvalActionSchema.parse(parseJson(approval.payload));
    await executeApprovedAction(action);
    await db('agent_approvals').where({ id: approvalId }).update({ status: 'approved', reviewed_by: adminEmail, review_note: note ?? null, reviewed_at: now, executed_at: now });
    await activity('approval_executed', approval.title, 'The owner approved the action and it was executed.', 'success', { approvalId, actionType: action.actionType });
  }
  const row = await db('agent_approvals').where({ id: approvalId }).first();
  return serializeApproval(row);
}

async function executeApprovedAction(action: ApprovalAction) {
  if (action.actionType === 'update_product_price') {
    const product = await db('products').where({ id: action.productId }).first();
    if (!product) throw new Error('Product no longer exists.');
    await db('products').where({ id: action.productId }).update({ price_cents: action.priceCents, compare_at_price_cents: action.compareAtPriceCents ?? null, updated_at: new Date().toISOString() });
    return;
  }

  const code = action.code.trim().toUpperCase().replace(/\s+/g, '');
  const clash = await db('discount_codes').whereRaw('LOWER(code) = ?', [code.toLowerCase()]).first();
  if (clash) throw new Error('That discount code already exists.');
  await db('discount_codes').insert({
    id: id('dsc'),
    code,
    type: action.type,
    value: action.value,
    min_subtotal_cents: action.minSubtotalCents,
    usage_limit: action.usageLimit ?? null,
    expires_at: action.expiresAt ?? null,
    is_active: true,
    times_used: 0,
    created_at: new Date().toISOString(),
  });
}

export async function agentChat(message: string) {
  const cleanMessage = message.trim().slice(0, 4000);
  if (!cleanMessage) throw new Error('Message is required.');
  const overview = await getAgentOverview();
  const storeContext = JSON.stringify({ summary: overview.summary, opportunities: overview.opportunities });

  if (!config.ai.apiKey) {
    return {
      configured: false,
      reply: `The store agent is ready, but its language model is not configured yet. Based on the latest audit: ${overview.summary.pendingApprovalCount} money-related action(s) await approval, ${overview.summary.openMessageCount} customer message(s) are open, and ${overview.opportunities.length} opportunity/health item(s) were identified. Your request was: “${cleanMessage}”. Add AI_API_KEY on the server to enable natural-language planning.`,
    };
  }

  const response = await fetch(`${config.ai.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ai.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ai.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: `You are the LUMÉRA e-commerce operations agent. Analyze the store context and propose safe, concrete next steps. You may recommend actions, but never claim to have executed money-related actions. Those actions require owner approval. Store context: ${storeContext}` },
        { role: 'user', content: cleanMessage },
      ],
    }),
  });
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}.`);
  const data = (await response.json()) as any;
  return { configured: true, reply: String(data?.choices?.[0]?.message?.content ?? 'The AI provider returned no response.') };
}
