# GitHub Copilot Instructions

This project is built on the amazee.io platform (Lagoon hosting). The full agent instructions are in `CLAUDE.md` at the repo root — read it for implementation workflows. This file provides a compact reference for inline coding.

---

## Security Rules (Always Apply)

- **No secrets in code.** All credentials go in `.env.local` (local) and Lagoon environment variables (production). See `.env.example` for the full variable list.
- **`.env.local` must be in `.gitignore`.** Verify before every commit.
- **Hash passwords with bcrypt, cost ≥ 12.** Never store plaintext or weak hashes.
- **Parameterized queries only.** No string concatenation into SQL.
- **Validate all inputs server-side** using allowlists (Pydantic, Zod, etc.).
- **UUIDs for record IDs**, not sequential integers.
- **Deny by default.** Every API route checks authentication before doing anything else.
- **Never accept `alg: none` in JWTs.** Validate signature, algorithm, and expiration.
- **Rate limit login and resource-intensive endpoints** (10 req/min per IP minimum).
- **Explicit CORS origins.** `*` is never acceptable in production.
- **Security headers on every response:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Disable API docs in production** (`/docs`, `/redoc`, `/swagger` → 404).
- **Gate external writes** behind `EXTERNAL_WRITES_ENABLED`. Default off. See `docs/security/do-not-write.md`.

## Auth

- **Any Lagoon deployment must have a login gate**, even pre-production. A simple credentials login (email + bcrypt password) is the minimum before the first deploy.
- **Okta SSO is required before production goes live.** See `docs/security/okta-oauth-implementation-guide.md`.
- Use **Auth.js v5** (`next-auth@beta`) for Next.js projects.
- `trustHost: true` in `auth.ts` + `AUTH_TRUST_HOST=1` in Lagoon variables — both required.

## Stack Defaults

- **Frontend:** Next.js (App Router), TypeScript strict, Tailwind CSS
- **Backend:** FastAPI (Python 3.12+) or Express (TypeScript)
- **Database:** PostgreSQL — SQLAlchemy (Python) or Prisma (Node). ORM only, no raw SQL.
- **Deployment:** Lagoon — use `uselagoon/node-24` or `uselagoon/python-3.12` base images.

## Lagoon

- Local dev URL: `http://<appname>.docker.amazee.io` (not `localhost`)
- Production URL: `https://node.main.<project-name>.ch4.amazee.io`
- After adding Lagoon variables, a redeploy is required.
- See `docs/lagoon-getting-started.md` for the full CLI reference.

## What Not to Do

- Do not hardcode secrets, tokens, or passwords anywhere in code or comments.
- Do not deploy to Lagoon without a login gate in place.
- Do not use `*` for CORS in production.
- Do not use sequential integers as primary keys on externally accessible records.
- Do not expose stack traces or internal errors to API consumers.
- Do not add features, refactor, or improve things that weren't asked for.
