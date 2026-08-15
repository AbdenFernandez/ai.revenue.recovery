# Logging strategy

## Goals

- Structured, searchable logs in production
- No sensitive data (PII, tokens, API keys, full AI prompts with customer data)
- Configurable verbosity per environment

## Implementation

Server logging uses `lib/logger.ts`:

```typescript
logger.info("Health check succeeded");
logger.error("API route error", { code: "INTERNAL_ERROR", path: "/api/health" });
```

Each log line is JSON:

```json
{
  "timestamp": "2026-08-15T10:00:00.000Z",
  "level": "info",
  "message": "Health check succeeded",
  "context": {}
}
```

## Log levels

Controlled by `LOG_LEVEL` (default: `info`):

| Level | When to use |
|-------|-------------|
| `debug` | Verbose development diagnostics |
| `info` | Normal operational events |
| `warn` | Recoverable anomalies |
| `error` | Failures requiring attention |

## What to log

**Do log:**

- Request path and outcome (without sensitive query params)
- Error codes and correlation IDs
- External service failures (provider name, not credentials)

**Do not log:**

- Passwords, tokens, service-role keys
- Full customer records or message bodies
- Raw AI responses containing PII

## Client-side

Avoid `console.log` in production UI paths. Client errors should surface user-safe messages; detailed diagnostics belong on the server.

## Future improvements

- Request correlation IDs (middleware)
- Log aggregation (e.g. Axiom, Datadog) in production
- Audit log table for security-sensitive actions
