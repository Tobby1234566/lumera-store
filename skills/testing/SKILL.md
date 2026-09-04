# Testing skill

## Purpose

Use this skill whenever code is added, modified, refactored, or suspected to be broken in the Lumera repository.

## Repository context

Lumera is an npm-workspaces monorepo with:

- `client/`: Vite, React, and TypeScript frontend.
- `server/`: Node, TypeScript, Express-style API, Knex, and server tests.
- `.qa/`: browser-oriented end-to-end and screenshot scripts.

## Procedure

1. Inspect the changed files and identify the smallest relevant validation command.
2. Check whether the change affects client code, server code, database schema, authentication, payments, admin workflows, or end-to-end behavior.
3. Run focused validation first:
   - Client TypeScript or build changes: `npm --workspace client run typecheck` and, when relevant, `npm --workspace client run build`.
   - Server TypeScript or route changes: `npm --workspace server run typecheck` and `npm --workspace server run test`.
   - Database or migration changes: inspect migration ordering and run the relevant migration or test against local/mock data only.
   - Admin, checkout, authentication, or cross-layer changes: run `npm run typecheck`, `npm test`, and the applicable `.qa` script if the local app is available.
4. For broad changes, run the repository checks:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
5. Review failures. Distinguish regressions introduced by the change from pre-existing failures, missing environment variables, unavailable services, or unrelated tooling issues.
6. Do not weaken tests, remove assertions, skip failing checks, or modify production behavior solely to make validation pass.
7. Report every command run, its outcome, and any limitation. Include the exact failure summary when a check fails.

## Safety rules

Use only local or mock data. Do not contact live payment providers, issue refunds, change prices, send campaigns, or mutate production data during testing. Never print or commit secrets. Treat `.env`, database files, screenshots containing customer data, and generated artifacts as sensitive unless they are explicitly safe to share.

## Completion criteria

A change is ready to report as complete only when the relevant checks pass or any remaining failure is clearly documented with a cause and recommended next step.

## Final report template

```text
Validation completed:
- <command>: PASS / FAIL / BLOCKED — <brief result>

Changed files:
- <file>: <purpose>

Notes:
- <remaining limitation, risk, or follow-up>
```
