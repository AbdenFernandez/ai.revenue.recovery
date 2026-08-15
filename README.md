# AI Revenue Recovery Agent

Production-oriented SaaS foundation for identifying inactive, lost, and recoverable customers using AI-powered recovery campaigns.

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers with service/repository layers
- **Database:** PostgreSQL (Supabase-compatible)
- **Auth:** Supabase Auth (SSR-ready client setup)
- **Validation:** Zod
- **Unit tests:** Vitest
- **E2E tests:** Playwright

## Prerequisites

- Node.js 20+
- npm 10+
- (Optional) [Supabase CLI](https://supabase.com/docs/guides/cli) for local database/auth

## Development setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in Supabase values when you have a project. The app runs without Supabase credentials in Phase 0; auth/database features require configuration.

3. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

4. **(Optional) Run Supabase locally**

   ```bash
   supabase start
   supabase db reset
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |

## Project structure

```
app/            Next.js App Router pages and API routes
components/     Reusable UI and layout components
lib/            Config, errors, logging, Supabase clients, utilities
services/       Business/service layer (no direct HTTP concerns)
repositories/   Data access layer (tenant-scoped queries)
types/          Shared TypeScript types
schemas/        Zod validation schemas
hooks/          Client-side React hooks
tests/          Vitest unit/integration tests
e2e/            Playwright end-to-end tests
supabase/       Migrations and local Supabase config
public/         Static assets
docs/           Architecture and engineering guides
```

## Documentation

- [Architecture](docs/architecture.md)
- [Error handling](docs/error-handling.md)
- [Logging](docs/logging.md)

## Security notes

- Never commit `.env.local` or service-role keys.
- All tenant-scoped tables must use Row Level Security (RLS).
- Revenue and financial calculations must be performed server-side.
- AI-generated output must be validated before use.

## Phase status

**Phase 0 — Project foundation:** complete scaffold, health endpoint, migrations skeleton, tests, and build pipeline. No product/business features yet.

## License

Proprietary — all rights reserved.
