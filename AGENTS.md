# Lumera repository instructions

## Project overview

Lumera is a premium skincare e-commerce application with a Vite/React client, a Node/TypeScript server, an admin dashboard, and a portable Knex database layer. The repository uses npm workspaces.

## Required workflow

Before changing code, inspect the relevant client, server, schema, route, and existing test files. Prefer small, focused changes and preserve the existing architecture and API contracts.

After code changes, use the `testing` skill in `skills/testing/SKILL.md`. At minimum, run the narrowest relevant checks first, followed by the repository-wide checks when practical.

Do not claim a task is complete without reporting which checks were run and whether they passed. If a check cannot run because of missing services, credentials, or environment variables, report that limitation explicitly.

## Commands

- Install dependencies: `npm ci`
- Build all workspaces: `npm run build`
- Type-check all workspaces: `npm run typecheck`
- Run server tests: `npm test`
- Run database migrations: `npm run db:migrate`
- Seed local data: `npm run db:seed`
- Run end-to-end checks, when the local application is running: `node .qa/e2e.mjs`

## Safety and data rules

Never commit `.env` files, API keys, payment credentials, customer secrets, or generated database files. Do not use production credentials or live payment providers for local verification. Money-affecting actions must remain behind the existing server-side approval gate and explicit owner approval.

## Final response format

Summarize the implementation, list files changed, list validation commands and outcomes, and identify any remaining risks or follow-up work.
