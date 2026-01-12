# AGENTS.md

## Project Overview

Step Wars: fitness challenge app where users compete by tracking daily steps. React 19 + TypeScript frontend, Hono backend on Cloudflare Workers, D1 (SQLite) database.

## Setup

```bash
bun install
bun run db:migrate:local
bun run dev
```

App runs at `http://localhost:5173`. Create account to test.

## Common Commands

| Task | Command |
|------|---------|
| Dev server | `bun run dev` |
| Build | `bun run build` |
| Type check | `bun run typecheck` |
| Unit tests | `bun run test` |
| Unit tests (UI) | `bun run test:ui` |
| E2E tests | `bun run test:e2e` |
| E2E tests (UI) | `bun run test:e2e:ui` |
| Migrate local DB | `bun run db:migrate:local` |
| Migrate remote DB | `bun run db:migrate:remote` |
| Deploy | `bun run deploy` |
| Full deploy pipeline | `bun run ship` |

## Code Conventions

**Path Aliases:**
- `@/` → `./src/`
- `@shared/` → `./shared/`

**Directory Structure:**
- `src/components/` - React components (layout, ui subdirs)
- `src/pages/` - Route page components
- `src/store/slices/` - Redux slices
- `src/lib/` - Utilities (api.ts, utils.ts)
- `worker/routes/` - API route handlers
- `worker/middleware/` - Hono middleware
- `worker/services/` - Business logic
- `shared/` - Code shared between frontend and worker
- `migrations/` - D1 SQL migrations (sequential 0001_, 0002_, etc.)

**API Routes:**
- All routes in `worker/routes/*.ts`
- Use Zod schemas with `@hono/zod-validator`
- Parameterized queries via `.bind()` - never string interpolation

**Commit Style:** Conventional Commits
- `feat:` new features
- `fix:` bug fixes
- `refactor:` code restructuring
- `chore:` dependencies, build
- `test:` test changes

## Tests & CI

**Unit/Integration (Vitest):**
- Location: `tests/**/*.test.ts`
- Run: `bun run test`
- Uses helpers from `tests/helpers.ts`:
  - `createTestUser()` - creates auth user, returns token
  - `apiRequest(method, path, token, body?)` - authenticated requests
  - `insertTestSteps()` - bypasses edit window
  - `runCron()` - triggers scheduled job

**E2E (Playwright):**
- Location: `e2e/**/*.spec.ts`
- Run: `bun run test:e2e`
- Auto-starts dev server
- Uses Chromium only

**No CI configured** - manual deployment via `bun run ship` which runs:
```
typecheck → build → db:migrate:remote → deploy
```

## PR & Workflow Rules

- Branch: `main` only (direct commits, no PR workflow currently)
- Commits follow Conventional Commits format
- No PR templates or CODEOWNERS configured
- Deploy to Cloudflare Workers via Wrangler

## Security & Gotchas

**Never commit:**
- `.env`, `.env.local`, `.env.*.local`
- `.dev.vars` (Cloudflare dev secrets)
- `.wrangler/` directory
- `node_modules/`

**Security patterns:**
- Passwords: PBKDF2 with 100k iterations + salt
- SQL: Always use parameterized queries with `.bind()`
- Validation: Zod schemas on all API inputs
- Auth: Token-based via `Authorization` header

**Gotchas:**
- Tests run sequentially (no parallelism) due to shared D1 database
- Step edit window: until noon the next day (EDIT_DEADLINE_HOUR in shared/constants.ts)
- Cron job runs at noon UTC daily (wrangler.json triggers)
- Test endpoints (`/api/__test__/*`) only available when `ENVIRONMENT=development`
- No ESLint/Prettier configured - rely on TypeScript strict mode
- CORS is `origin: "*"` - permissive for development
