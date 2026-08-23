import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest } from '../lib/http.js';
import { agentChat, createApproval, getAgentOverview, reviewApproval, runStoreAudit } from '../services/agent.js';

export const agentRouter = Router();

agentRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    res.json(await getAgentOverview());
  }),
);

agentRouter.post(
  '/audit',
  asyncHandler(async (req, res) => {
    res.json(await runStoreAudit(req.admin?.email ?? 'admin'));
  }),
);

agentRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const body = z.object({ message: z.string().min(1).max(4000) }).safeParse(req.body);
    if (!body.success) throw badRequest('A message between 1 and 4,000 characters is required.');
    res.json(await agentChat(body.data.message));
  }),
);

agentRouter.post(
  '/approvals',
  asyncHandler(async (req, res) => {
    res.status(201).json({ approval: await createApproval(req.body, req.admin?.email ?? 'admin') });
  }),
);

agentRouter.post(
  '/approvals/:id/review',
  asyncHandler(async (req, res) => {
    const body = z
      .object({ decision: z.enum(['approve', 'reject']), note: z.string().max(1000).optional() })
      .safeParse(req.body);
    if (!body.success) throw badRequest('Decision must be approve or reject, with an optional note.');
    res.json({ approval: await reviewApproval(req.params.id, body.data.decision, req.admin?.email ?? 'admin', body.data.note) });
  }),
);
