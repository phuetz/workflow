# Repository Guidelines

## Project Structure & Module Organization
- `src/`: TypeScript source. Frontend (`components/`, `store/`, `hooks/`), backend (`backend/server.js`, `backend/api/`, `backend/services/`), shared utils (`utils/`, `types/`).
- `public/`: Static assets served by Vite.
- `src/__tests__/`: Unit and integration tests; name files `*.test.ts` or `*.test.tsx`.
- `tests/e2e/`: Playwright end‑to‑end specs (`*.spec.ts`).
- `prisma/`: Database schema (`schema.prisma`) and seeding (`seed.ts`).
- `docker/`, `k8s/`, `scripts/`: Deployment, ops, and helper scripts.

## Build, Test, and Development Commands
- `nvm use` (Node 18.18.0) and `npm ci` to install.
- `npm run dev`: Run frontend (Vite) and backend (nodemon) together.
- `npm run build`: Type-check and build app; `npm run preview` to serve build.
- `npm test`: Run Vitest; `npm run test:coverage` for coverage; `npm run test:e2e` for Playwright; `npm run test:integration` for Node‑env integration.
- `npm run lint` / `npm run lint:fix`: ESLint checks and autofix. `npm run typecheck` for TS.
- `npm run migrate:dev` then `npm run seed` to prepare a local DB.

## Coding Style & Naming Conventions
- TypeScript, 2‑space indent, single quotes, required semicolons (see `.eslintrc.json`).
- Components: PascalCase (`UserMenu.tsx`); variables/functions: camelCase; prefer kebab‑case file names for non‑components.
- React hooks start with `use*`. Avoid `any`; prefer `zod` schemas and explicit types.
- Tools: ESLint (incl. security rules) and Prettier. Run `npm run lint && npm run format` before PRs.

## Testing Guidelines
- Frameworks: Vitest (jsdom for UI, Node for integration), Testing Library for React, Playwright for E2E.
- Naming: `*.test.ts(x)` under `src/__tests__/`; E2E as `tests/e2e/*.spec.ts`.
- Coverage: integration config targets ≥70% global (see `vitest.integration.config.ts`). Use `npm run test:coverage` locally.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, scopes allowed (e.g., `feat(api): ...`).
- PRs: clear description, linked issues, test plan/commands, and screenshots/GIFs for UI changes. Note DB migrations and new env vars.
- Required checks: `npm run lint && npm run typecheck && npm test` must pass.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local`; never commit secrets. Ensure `DATABASE_URL` is set before Prisma commands.
- Follow `.nvmrc` (Node ≥18). For Docker/K8s, see `docker-compose.yml` and `k8s/` manifests.
