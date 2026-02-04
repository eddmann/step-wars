<p align="center">
  <img src="docs/logo.svg" alt="Step Wars" width="400">
</p>

# Step Wars

_A fitness challenge app where users compete by tracking daily steps._

This started as a friendly rivalry: a friend and I have been challenging each other on step goals for the past year. WhatsApp screenshots weren't cutting it anymore, so I built an app to make it real.

![Step Wars Intro](docs/step-wars.gif)

## Rules / Gameplay

- Challenge modes: `cumulative` (most total steps) and `daily_winner` (top 3 daily: 3/2/1).
- Edit window: today always editable, yesterday editable until noon.
- Timezone model: users log in their own timezone; challenges use the creator’s timezone for leaderboards and cutoffs; cron runs at noon UTC but processes per‑challenge timezone.

## Scoring

Daily winner points: 1st=3, 2nd=2, 3rd=1.  
Cumulative: winner is highest total steps across the challenge window.

## Quick Start

```bash
make start
```

Common commands:

```bash
make lint
make test
make build
```

Run `make` to see all available targets.

## Architecture

### Client

React + Redux Toolkit + React Router SPA.

- UI and routes live in `src/`.
- API client lives in `src/lib/api.ts` with typed request/response handling.

### API Architecture

Cloudflare Workers + Hono + D1 SQLite, structured as a layered architecture with manual dependency injection:

- Routes: `worker/routes/` (HTTP handlers, validation)
- Use cases: `worker/usecases/` (business logic)
- Repositories: `worker/repositories/` (data access via interfaces)
- Services: `worker/services/` (challenge lifecycle, notifications, streak)
- Clock injection: `worker/utils/clock.ts`

Routes wire concrete implementations at call time (for example `createD1UserRepository(env)`), and use cases declare dependencies as interfaces. It’s simpler than clean/hexagonal/onion patterns: no separate domain model layer, shared types live in `shared/`, and the HTTP layer calls use cases directly without adapters. The same pattern applies to services and clock injection, keeping everything testable without mocks or network calls.

## Testing

### Client Testing Strategy

Stack: Bun test runner + Testing Library + MSW.

- UI tests: `src/**/*.test.tsx`
- Fixtures: `src/test/fixtures.ts`
- MSW mocks: `src/test/mocks/`

Run:

```bash
make test/client
```

### API Testing Strategy

- Use-case tests: `worker/test/usecases/*.test.ts`
- Repository tests: `worker/test/repositories/*.d1.test.ts`
- HTTP API tests: `worker/test/http/*.http.test.ts`

Run:

```bash
make test/worker
```

## Database Migrations

```bash
make db
make db/remote
```

## License

[MIT License](LICENSE)
