# Development Write Constraints

During early development, write operations to external or production systems should be **explicitly disabled** until the team is ready and has confirmed the intent.

## Current Constraints

> _Document any active write restrictions here. Remove or update each item when the constraint is lifted._

Examples of constraints to track:
- Do not write to the production database from a development or staging environment.
- Do not post to external communication systems (Slack, email, ticketing) from development.
- Do not trigger billing or payment flows from any non-production environment.

## How to Enforce

Use a feature flag or environment variable (e.g. `EXTERNAL_WRITES_ENABLED=false`) to gate write operations in code. This makes accidental writes impossible, not just unlikely.

```python
# Python example
if not settings.EXTERNAL_WRITES_ENABLED:
    raise RuntimeError("External writes are disabled in this environment.")
```

```ts
// TypeScript example
if (!process.env.EXTERNAL_WRITES_ENABLED) {
  throw new Error("External writes are disabled in this environment.")
}
```

Set the flag to `true` only when:
1. The constraint has been explicitly lifted (confirm with the team lead).
2. The integration has been tested end-to-end in a safe environment first.
3. The change is documented here.
