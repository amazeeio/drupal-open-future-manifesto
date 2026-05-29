# Security & Access Model

## Principles

1. **Agents, not humans, hold credentials** — AI agents have read access to internal systems (Lagoon, external APIs, etc.) so individual engineers do not need direct access to those APIs. This is an explicit security benefit of an agent-assisted workflow.
2. **Least privilege** — every integration uses the minimum permissions required. All agent access to external systems is read-only unless explicitly stated otherwise.
3. **Human approval for all writes** — no data is written to external or customer-facing systems without an explicit engineer action. Agent-generated content is never posted automatically.
4. **Secrets are never in code** — all credentials live in environment variables. Production secrets are managed via Lagoon environment variables or a secrets vault; never baked into Docker images.
5. **Okta SSO before production** — JWT auth is acceptable for local development only. Any deployment accessible outside localhost must use Okta SSO (see `docs/security/okta-oauth-implementation-guide.md`).

---

## Authentication & Access Control

### Engineer Authentication

| Environment | Method |
|---|---|
| Local development | JWT tokens with bcrypt-hashed passwords, or no auth if the app has no user accounts yet |
| Production | Okta SSO (OIDC). JWT is issued after SSO validation and used for subsequent API calls |

JWT tokens:
- Expiry: 24h (configurable via `JWT_EXPIRATION`)
- Stored: HttpOnly cookies (preferred) or `localStorage` (document the choice and its implications)
- Refresh: frontend must handle token expiry and re-authenticate

### Role Model

Define the minimum set of roles required. Example starting point — extend when requirements demand it:

| Role | Permissions |
|---|---|
| `viewer` | Read-only access to application data |
| `editor` | Read + write on core data; cannot manage users |
| `admin` | All editor permissions + user management |

> _Replace this table with your project's actual role model. Keep it as small as possible._

Roles are enforced server-side on every request. Never enforce access control only on the frontend.

### What Users Cannot Do

> _Document explicit denial rules here. Examples:_
- Delete records from external systems
- Modify records in read-only data sources
- Trigger billing or payment actions without a secondary confirmation step

---

## Integration Permissions

For each external system the application integrates with, document the access level, credentials, and any constraints.

| System | Access level | Credentials | Notes |
|---|---|---|---|
| _e.g. GitHub API_ | _Read only_ | `GITHUB_TOKEN` | _Repo metadata only. No write access._ |
| _e.g. PostgreSQL_ | _Read + write_ | `DATABASE_URL` | _Application's own DB. Full access._ |
| _e.g. Lagoon API_ | _Read only_ | `LAGOON_API_TOKEN` | _Environment status only. No deploy/destroy actions._ |
| _e.g. External SaaS_ | _Read only_ | `SAAS_API_KEY` | _Lookups only. No record creation._ |

> _Replace these rows with your project's actual integrations. For each write-enabled integration, document exactly which write operations are permitted._

---

## Credential Management

### Local Development

All credentials in `.env.local` or `.env` (excluded from git via `.gitignore`). Use `.env.example` as the template; never commit real values. See the project root for `.env.example`.

### Production

Credentials managed as Lagoon environment variables. The container receives secrets as environment variables at runtime. Do not bake secrets into Docker images or commit them to the repository.

After adding variables to Lagoon, a redeploy is required for them to take effect.

### Rotation Policy

Define a rotation schedule appropriate to the sensitivity of each credential. Recommended minimums:

| Credential type | Rotation frequency |
|---|---|
| Application signing secrets (`AUTH_SECRET`, `JWT_SECRET`) | Every 90 days, or immediately on suspected breach |
| Third-party API keys | Annually, or on engineer offboarding if key was personally created |
| Database passwords | Annually, or on suspected breach |
| Okta client secrets | Per Okta/IT policy |

---

## Network Security

### Public Endpoints

Document which endpoints must be publicly accessible (e.g. inbound webhooks) and how they are secured:

- Webhooks: validated via HMAC signature on every request; IP allowlisting where feasible
- All other public endpoints: require authentication before any processing

### Authenticated Endpoints

All API endpoints require a valid session (cookie or JWT Bearer token). Unauthenticated requests return 401. No access control logic is applied client-side only.

### CORS

`CORS_ORIGINS` must be explicitly configured to the specific frontend URL(s) in each environment. `*` is not permitted in production.

### Database

The database must not be publicly exposed. Reachable only from within the Docker network (local) or the internal Lagoon network (production).

---

## Audit Logging

Write actions should be logged. At minimum, record:

| Field | Description |
|---|---|
| `id` | UUID |
| `user_id` | Who performed the action |
| `action` | What action was taken (e.g. `record_created`, `record_deleted`) |
| `resource_type` | The type of resource affected |
| `resource_id` | The ID of the affected resource |
| `payload` | Relevant context (JSON) — exclude PII and secrets |
| `created_at` | Timestamp |

> _Adapt this schema to your project's ORM and database. The important thing is that writes are traceable._

---

## OWASP Top 10 Compliance

Review this table when the project reaches production readiness:

| Risk | Mitigation |
|---|---|
| **A01 Broken Access Control** | Server-side route guards on all endpoints; read-only roles for external systems |
| **A02 Cryptographic Failures** | Passwords hashed with bcrypt (cost ≥12); JWT signed with strong secret; TLS required in production |
| **A03 Injection** | ORM for all DB queries (no raw SQL interpolation); input validation on all API inputs |
| **A04 Insecure Design** | Human-in-the-loop for all external writes; no automated customer-facing messages |
| **A05 Security Misconfiguration** | No `*` in CORS; explicit environment variable list; Docker network isolation |
| **A06 Vulnerable Components** | Dependencies pinned and scanned via Dependabot or equivalent |
| **A07 Authentication Failures** | JWT expiry enforced; bcrypt for passwords; Okta SSO in production |
| **A08 Software / Data Integrity** | Webhook signature verification; no `eval` or dynamic code execution |
| **A09 Security Logging** | Audit log table; all auth failures logged |
| **A10 SSRF** | LLM prompt output never used to construct URLs or HTTP requests; all external calls go to pre-defined, allowlisted endpoints |

See `docs/security/owasp-api-top10.md` for the full assessment criteria.

---

## Offboarding Checklist

When an engineer leaves the team:

1. Disable or delete their user account in the application
2. All their active sessions are invalidated
3. If they held any shared API credentials (e.g. a key created under their account), rotate those credentials
4. Remove their Okta group membership (production) to revoke SSO access
5. Revoke any personal access tokens they may have used for local development