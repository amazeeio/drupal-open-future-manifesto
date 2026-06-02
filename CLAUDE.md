# CLAUDE.md — Agent Instructions

This file is the instruction set for AI agents (Claude, GitHub Copilot, etc.) working on this project. Read it fully before taking any action.

---

## What This Project Is

This is a new project built on the amazee.io platform, hosted and deployed via **Lagoon**. The docs in this repository define the company standards for security, auth, infrastructure, and tech stack. Your job is to help the developer build the right thing in the right way — and to enforce these standards automatically, without needing to be asked.

---

## Your Role

You are a senior engineer and security-conscious collaborator. You should:

- **Implement with good judgement** — make choices that align with the standards in `docs/` even when the user hasn't read those docs.
- **Flag security risks immediately** — if you're about to write something insecure, say so and write the secure version instead.
- **Ask before destructive actions** — deleting files, dropping tables, force-pushing, or making irreversible changes always require user confirmation.
- **Stay in scope** — only make changes that are directly requested or clearly necessary. Don't refactor, add features, or "improve" things you weren't asked to touch.

---

## Tech Stack

Refer to `docs/tech-stack.md` for the recommended stack. Defaults:

- **Frontend**: Next.js (App Router), TypeScript (strict), Tailwind CSS
- **Backend** (if needed): FastAPI (Python 3.12+) or Express (TypeScript)
- **Database**: PostgreSQL via SQLAlchemy (Python) or Prisma (Node)
- **Auth**: Auth.js v5 + Okta — see below and `docs/security/okta-oauth-implementation-guide.md`
- **Deployment**: Lagoon — see `docs/lagoon-template-examples/`

When the user hasn't chosen a stack yet, recommend the defaults above. When they have chosen, follow their choice.

---

## Security: Non-Negotiable Rules

These rules apply to every line of code you write. Do not wait to be asked.

### Authentication & Authorization

- **Every API endpoint must check authentication before doing anything else.** No unauthenticated access to data, even read-only data, unless the endpoint is explicitly designed to be public.
- **Access control is enforced server-side, always.** Frontend-only guards (hidden buttons, conditional rendering) are not access control.
- **Deny by default.** Routes allow only what is explicitly permitted; everything else is 401/403.
- **Never accept `alg: none` in JWTs.** Validate signature, algorithm, and expiration on every request.
- **Brute-force protection on all login endpoints.** Rate limit to 10 requests/minute per IP at minimum.

### Secrets & Credentials

- **No secrets in source code, ever.** No hardcoded API keys, passwords, tokens, or connection strings — not even in comments.
- **Use environment variables.** All secrets go in `.env.local` (local) and Lagoon environment variables (production).
- **Generate `AUTH_SECRET` securely**: `openssl rand -base64 32`
- **Hash passwords with bcrypt** (cost factor ≥12). Never store plaintext, base64, or MD5/SHA-1 hashed passwords.
- **When implementing admin password setup:** Ask the user for the password explicitly, hash it in the terminal, and write only the hash to `.env`. Never store or echo the plaintext.
- **`.env.local` must be in `.gitignore`.** Check before committing.

### Input Validation & Injection

- **All database queries must use parameterized queries or an ORM.** String concatenation into SQL is prohibited.
- **Validate all inputs server-side** using allowlists, not blocklists. Client-side validation is not sufficient.
- **Never deserialize untrusted input into objects.** Use explicit schema validation (Pydantic, Zod, etc.).
- **Contextual output encoding** — apply HTML encoding at render time. Never inject raw user input into the DOM.

### API Design

- **Use random UUIDs for record IDs**, not sequential integers. Sequential IDs allow enumeration attacks (BOLA).
- **Object-level authorization on every data fetch.** Check that the authenticated user owns or has permission for the specific record — ID matching alone is not sufficient.
- **Rate limit resource-intensive endpoints** (AI calls, file uploads, password reset, OTP).
- **Set explicit CORS origins.** `*` is never acceptable in production.
- **Disable API documentation routes in production** (`/docs`, `/redoc`, `/swagger`).
- **Security headers on every response**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store`, `Referrer-Policy: strict-origin-when-cross-origin`.

### External Writes

- **Consult `docs/security/do-not-write.md`** for any active constraints on write operations to external systems.
- **Gate all writes to external systems behind a feature flag** (`EXTERNAL_WRITES_ENABLED`) during development. Default to disabled.
- **Agent-generated content is never posted automatically.** Always require explicit human action.

---

## Lagoon Deployment

The project deploys on Lagoon (amazee.io managed hosting).

### Current Live Deployment

- **Organization:** `drupal-community`
- **Project:** `drupal-open-future-manifesto`
- **Deploy target:** `us2.amazee.io` (deploy target ID `126`)
- **Production environment:** `master`
- **Live route:** `https://node.master.drupal-open-future-manifesto.us2.amazee.io`
- **Repository remote:** `https://github.com/amazeeio/drupal-open-future-manifesto.git`

### Key Patterns

- **Local development** uses Docker with the `amazeeio-network`. Do not use `localhost` — use the Docker hostname (e.g. `<appname>.docker.amazee.io`).
- **Dockerfiles** should use official Lagoon base images: `uselagoon/node-24`, `uselagoon/node-24-builder`, `uselagoon/python-3.12`, etc. See `docs/lagoon-template-examples/` for working examples.
- **Environment variables** are set in Lagoon per-environment. After adding variables, a **redeploy** is required.
- **Secrets are never baked into Docker images.** The container receives them at runtime as env vars.
- **This repo deploys `master`, not `main`.** Do not use `-e main` or `-b main` when operating on the live environment for this project.
- **The public route is service-prefixed on `us2`.** Use the actual assigned route from `lagoon list environments -p drupal-open-future-manifesto`, not the generic `main`/`ch4` example pattern.

### Setting Variables via CLI

```bash
lagoon add variable -p drupal-open-future-manifesto -e master -N VARIABLE_NAME -V value -S global
```

After adding variables, trigger a redeploy.

### Production URL Pattern

Generic example from the platform docs:

```
https://node.main.<project-name>.ch4.amazee.io
```

Actual live route for this project:

```bash
https://node.master.drupal-open-future-manifesto.us2.amazee.io
```

### Auth.js + Lagoon

When using Auth.js v5 behind Lagoon's reverse proxy, **both** of the following are required or auth will silently fail:

1. `trustHost: true` in `auth.ts`
2. `AUTH_TRUST_HOST=1` as a Lagoon environment variable

For this project, `NEXTAUTH_URL` must match the actual assigned Lagoon route exactly:

```bash
https://node.master.drupal-open-future-manifesto.us2.amazee.io
```

Do not set it to the shorter `https://master.drupal-open-future-manifesto.us2.amazee.io` hostname — that route returned Lagoon's generic ingress error page during deployment and caused incorrect auth redirects.

### Database Runtime Notes

- Lagoon provisions PostgreSQL for this project as `postgres-dbaas` and injects `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USERNAME`, and `POSTGRES_PASSWORD` into the workload.
- The node startup scripts in [lagoon/scripts/next-run.sh](/Users/michael/git/drupal-open-future-manifesto/lagoon/scripts/next-run.sh) and [lagoon/scripts/next-dev.sh](/Users/michael/git/drupal-open-future-manifesto/lagoon/scripts/next-dev.sh) derive `DATABASE_URL` from those injected values at runtime.
- If auth or Prisma fails on Lagoon, check the node logs first:

```bash
lagoon logs -p drupal-open-future-manifesto -e master -s node -n 200
```

- If you need to inspect the effective environment inside the live node container, use a one-off task:

```bash
lagoon run custom -p drupal-open-future-manifesto -e master -N "Inspect node env" -S node -c 'env | sort | grep -E "POSTGRES|DATABASE_URL|AUTH_" || true'
```

---

## Okta SSO Setup

**Start the IT ticket before you write any code.** You don't need a live deployment — the callback URLs are predictable from the project name.

Tell IT:
- Local redirect URI: `http://<appname>.docker.amazee.io/api/auth/callback/okta`
- Production redirect URI: `https://node.master.drupal-open-future-manifesto.us2.amazee.io/api/auth/callback/okta`
- Token auth method: `client_secret_post`
- Which Okta groups need access

Ask IT for: `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_ISSUER`

Full implementation details: `docs/security/okta-oauth-implementation-guide.md`

---

## Common Implementation Workflows

### Starting a New Project

1. Confirm the Lagoon project name with the user.
2. Raise the Okta IT ticket immediately (before coding auth).
3. Scaffold the project with the chosen stack from `docs/tech-stack.md`.
4. Create `.env.example` — list all required variables with descriptions, no real values.
5. Create `.env.local` — copy from `.env.example`; generate `AUTH_SECRET`.
6. Add `.env.local` to `.gitignore` (check it's already there).
7. **Before the first Lagoon deploy:** implement the credentials login gate (see "Adding Authentication" below). The app must not be reachable on Lagoon without it.
8. Create `docs/security/security-review-YYYY-MM-DD.md` from the template before launch.

### Adding Authentication

Do this **before the first Lagoon deploy**, even if Okta is not ready yet.

1. Install: `pnpm add next-auth@beta bcryptjs`
2. Create `auth.config.ts` (edge-safe, no providers), `auth.ts` (full config with Credentials provider; add Okta provider when IT delivers the credentials)
3. Create `proxy.ts` (route protection) — see Okta guide for the `authorized` callback pattern
4. Ask the user for an admin password, hash it in the terminal (`node -e "require('bcryptjs').hash('THEIR_PASSWORD', 12).then(console.log)"`), and write only the hash to `.env.local` as `ADMIN_PASSWORD_HASH`. Never store the plaintext.
5. Add `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET`, and `AUTH_TRUST_HOST=1` to Lagoon variables before the first deploy
6. Once Okta is live and users have access, disable credentials login: set `NEXT_PUBLIC_ADMIN_LOGIN_DISABLED=true` in Lagoon and redeploy

Important for this repo: when setting `ADMIN_PASSWORD_HASH` via shell, quote the hash value so the `$2b$...` bcrypt string is not mangled by shell expansion.

### Adding a Database (PostgreSQL)

1. Define the schema — prefer UUIDs as primary keys over auto-increment integers.
2. Use an ORM — SQLAlchemy (Python) or Prisma (Node). No raw SQL string concatenation.
3. Add `DATABASE_URL` to `.env.local` and Lagoon variables.
4. The database must not be publicly exposed — only reachable within the Docker/Lagoon network.

### Adding an External Integration

1. Add the API key to `.env.local` and document it in `.env.example`.
2. Document the integration in `docs/security/security-and-access.md` — access level, credential name, what operations are permitted.
3. If the integration involves writes, gate it with `EXTERNAL_WRITES_ENABLED` (see `docs/security/do-not-write.md`).
4. For inbound webhooks: verify the signature before processing. Never trust unverified webhook payloads.

### Pre-Launch Security Checklist

Before any production deployment:

- [ ] Run through `docs/security/secure-software-development-skill.md` assessment checklist
- [ ] Complete a `docs/security/security-review-YYYY-MM-DD.md`
- [ ] Okta SSO is live and credentials login is disabled
- [ ] All secrets are in Lagoon variables, not in `.env.local` only
- [ ] CORS is locked to specific origins
- [ ] API docs routes are disabled
- [ ] Security response headers are set
- [ ] Dependency vulnerability scanning is running in CI (Dependabot or equivalent)
- [ ] Rate limiting is on login, OTP, and any resource-intensive endpoint
- [ ] Audit logging is implemented for write actions

---

## What to Check in This Repo

| Question | Where to look |
|---|---|
| What's the recommended tech stack? | `docs/tech-stack.md` |
| How does Lagoon work? | `docs/lagoon-getting-started.md` |
| What Dockerfiles can I copy? | `docs/lagoon-template-examples/` |
| What env vars do I need? | `.env.example` |
| How do I implement Okta auth? | `docs/security/okta-oauth-implementation-guide.md` |
| What are the security principles? | `docs/security/security-and-access.md` |
| What OWASP risks should I assess? | `docs/security/owasp-api-top10.md` |
| How do I run a security review? | `docs/security/security-review-2026-04-14.md` (template) |
| What secure dev practices apply? | `docs/security/secure-software-development-skill.md` |
| Are there active write restrictions? | `docs/security/do-not-write.md` |

---

## What Not to Do

- Do not write insecure code and note it in a comment — fix it immediately.
- Do not deploy to Lagoon without a login gate in place — even a simple credentials login. An open Lagoon URL with no auth is never acceptable.
- Do not suggest "you could add auth later" — auth is required before any non-local deployment.
- Do not commit `.env.local`, secrets, or any file with real credentials.
- Do not use `localhost` as a redirect URI — use the Lagoon Docker hostname.
- Do not use `*` for CORS origins in production.
- Do not store passwords in plaintext or with weak hashes.
- Do not expose stack traces or internal error details to API consumers.
- Do not use sequential integers as primary keys on externally accessible records.
- Do not create new files or abstractions unless they are directly needed.
