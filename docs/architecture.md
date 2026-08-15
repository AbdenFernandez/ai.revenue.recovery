# Architecture

## Overview

AI Revenue Recovery Agent is a multi-tenant SaaS platform. The codebase separates concerns into distinct layers so product features can be added incrementally without coupling UI, business rules, and data access.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React / Next.js App Router)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  app/ — pages, layouts, Route Handlers                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  services/ — business logic, orchestration                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  repositories/ — PostgreSQL/Supabase data access            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Supabase (PostgreSQL + Auth + RLS)                         │
└─────────────────────────────────────────────────────────────┘
```

## Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| `app/` | Routing, rendering, HTTP entry points |
| `components/` | Presentational and layout UI |
| `hooks/` | Client-side state and data fetching |
| `schemas/` | Input/output validation (Zod) |
| `types/` | Shared TypeScript contracts |
| `services/` | Business rules, authorization checks, orchestration |
| `repositories/` | SQL/Supabase queries with tenant scoping |
| `lib/` | Cross-cutting utilities (config, errors, logging, Supabase clients) |

## Multi-tenancy

- Each **business** is a tenant (`businesses` table).
- Users belong to exactly one business via `profiles.business_id`.
- All tenant-scoped tables include `business_id` and enforce **Row Level Security**.
- Repositories must always filter by the authenticated user's business.
- Service-role keys are server-only and used only for admin/system tasks with explicit safeguards.

## Authentication

- Supabase Auth manages identity (`auth.users`).
- Application profiles live in `public.profiles`.
- SSR session refresh is handled in `middleware.ts` via `@supabase/ssr`.
- Protected routes and onboarding flows will be added in a later phase.

## Configuration

- `lib/config.ts` validates environment variables with Zod.
- Server secrets (`SUPABASE_SERVICE_ROLE_KEY`) are never exposed to the client.
- Public values use the `NEXT_PUBLIC_` prefix.

## API design

- Route Handlers validate input/output with Zod schemas.
- Errors use the `AppError` taxonomy in `lib/errors.ts`.
- `withErrorHandling` wraps handlers for consistent responses.

## Testing strategy

| Type | Tool | Location |
|------|------|----------|
| Unit | Vitest | `tests/` |
| E2E | Playwright | `e2e/` |

Critical business calculations and authorization rules will require unit tests in future phases.

## Deployment target (development)

Free-tier friendly stack:

- Vercel (Next.js)
- Supabase (PostgreSQL + Auth)

Production hardening (monitoring, WAF, backups) will be addressed in later phases.
