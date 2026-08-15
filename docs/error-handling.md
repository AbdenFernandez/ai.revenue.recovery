# Error handling strategy

## Goals

- Consistent API error shape for clients
- Safe internal error messages (no stack traces or secrets in responses)
- Typed error codes for programmatic handling
- Structured logging on the server

## Core types

All application errors flow through `AppError` (`lib/errors.ts`).

| Code | HTTP | Usage |
|------|------|-------|
| `VALIDATION_ERROR` | 400 | Invalid input, failed Zod parse |
| `UNAUTHORIZED` | 401 | Missing or invalid session |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `INTERNAL_ERROR` | 500 | Unexpected failure |
| `CONFIGURATION_ERROR` | 500 | Missing/invalid env configuration |
| `EXTERNAL_SERVICE_ERROR` | 502 | Supabase, AI provider, etc. |

## API response shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

`details` is optional and should never contain secrets.

## Route Handlers

Use `withErrorHandling` from `lib/api/route-handler.ts`:

```typescript
export const GET = withErrorHandling(async () => {
  // throw AppError or let unknown errors be normalized
});
```

## Validation

- Parse all external input with Zod at the boundary (API, server actions, webhooks).
- On failure, throw `VALIDATION_ERROR` with sanitized field details.
- Never trust client-side validation alone.

## UI states

Every data-fetching view must handle:

- **Loading** — in-progress fetch
- **Empty** — valid response with no data
- **Error** — failed fetch with user-safe message
- **Success** — rendered data

See `hooks/use-health-check.ts` for a minimal client-side pattern.

## AI-specific rules (future phases)

- Validate structured AI output against schemas.
- Retry transient failures with limits.
- Never auto-send customer communications without explicit authorization.
