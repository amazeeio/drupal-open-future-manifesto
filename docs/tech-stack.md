# Tech Stack

## How to Use This Document

Fill in this document at the start of your project. It serves as the single source of truth for technology choices and helps AI agents and new contributors understand the project quickly.

Delete placeholder text and replace with your actual choices. Keep this file updated as the project evolves.

---

## Overview

This project is a simple manifesto website for Drupal Pivot. It presents the text of "A Manifesto for an Open Future" as a public-facing landing page and includes a TypeScript-backed signature form for collecting supporters' details.

---

## Architecture

Monolith. The frontend and backend live in a single Next.js App Router application:

- The public site is rendered by Next.js server components.
- Form submissions are handled by a Next.js route handler written in TypeScript.
- Signatures are stored in PostgreSQL via Prisma.
- The repository includes Lagoon-ready Docker Compose and container files for local and hosted environments.

**Example patterns:**
- **Decoupled** — separate frontend (Next.js) and backend (FastAPI or Express) services, each with their own Lagoon container
- **Monolith** — a single Next.js app with API routes, one container
- **Fullstack monorepo** — frontend and backend in one repo, deployed as separate Lagoon services

---

## Recommended Defaults

These are the preferred choices for new amazee.io projects. You may deviate with justification.

### Frontend

| Layer | Recommended | Notes |
|---|---|---|
| Framework | Next.js (App Router) | SSR + static; works well with Lagoon node container |
| Language | TypeScript (strict) | Enable `"strict": true` in tsconfig |
| Styling | Tailwind CSS | Utility-first; avoids CSS naming conflicts |
| Icons | lucide-react | Consistent; tree-shakeable |
| Auth | Auth.js v5 + Okta | See `docs/security/okta-oauth-implementation-guide.md` |

### Backend (if separate service)

| Layer | Recommended | Notes |
|---|---|---|
| Framework | FastAPI (Python) or Express (Node) | FastAPI for ML/LLM work; Express for simple APIs |
| Language | Python 3.12+ or TypeScript | Match team expertise |
| Database ORM | SQLAlchemy (Python) or Prisma (Node) | Never write raw SQL with string interpolation |
| Database | PostgreSQL | Managed by Lagoon |
| Auth validation | JWT (PyJWT / jose) | Validate on every request; never `alg: none` |

### Infrastructure

| Layer | Choice | Notes |
|---|---|---|
| Hosting | Lagoon (amazee.io) | See `docs/lagoon-template-examples/` |
| Container | Node 24 or Python 3.12 Lagoon images | Use official Lagoon base images |
| Secrets | Lagoon environment variables | Never commit secrets; see security docs |
| CI/CD | GitHub Actions | Dependency scanning on every PR |

---

## This Project's Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 15.x | App Router monolith |
| Language | TypeScript | 5.x | Strict mode enabled |
| Styling | Global CSS | — | Editorial layout matched to the supplied manifesto design |
| Persistence | PostgreSQL + Prisma | PostgreSQL 16 / Prisma 6.x | `Signature` records stored in Postgres |
| Auth | Not implemented | — | Required before any protected Lagoon deployment |
| Deployment | Lagoon | — | Local Docker Compose plus Lagoon Node and Postgres services |

---

## Project Structure

```
prisma/
  migrations/             # Prisma SQL migrations for PostgreSQL
  schema.prisma           # Prisma schema and data source
lagoon/
  node.dockerfile         # Lagoon production image for the Next.js app
  scripts/                # Build and runtime scripts for Lagoon and local Docker
src/
  app/                    # Page layout, home page, and API routes
    api/signatures/       # TypeScript route handler for form submissions
  components/             # Shared UI components
  lib/                    # Manifesto content, Prisma client, and signature helpers
data/
  signatures.json         # Legacy JSON store imported automatically on first Postgres boot
docs/                     # Project and platform documentation
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Generate the Prisma client
npm run db:generate

# Apply the committed migration to a configured Postgres database
npm run db:migrate

# Start development server
npm run dev

# Start the Lagoon-style local stack
docker compose up --build

# Run TypeScript checks
npm run typecheck

# Build for production
npm run build
```

**Prerequisites:**
- Node 20+
- PostgreSQL if running outside Docker Compose
- `.env.local` with `DATABASE_URL` when running the app directly on the host

---

## Environment Variables

See `.env.example` for the full list. The current site now requires `DATABASE_URL` to read and write signatures, and Docker Compose can also consume the optional `POSTGRES_*` variables for local database defaults.

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Future auth work | Auth.js signing secret |
| `OKTA_CLIENT_ID` | Future auth work | Okta application client ID |
| `OKTA_CLIENT_SECRET` | Future auth work | Okta application client secret |
| `OKTA_ISSUER` | Future auth work | Okta issuer URL |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `POSTGRES_DB` | Docker Compose only | Local Postgres database name override |
| `POSTGRES_USER` | Docker Compose only | Local Postgres user override |
| `POSTGRES_PASSWORD` | Docker Compose only | Local Postgres password override |

Never commit real values. Add all secrets to Lagoon environment variables for production.

---

## Deployment

This project requires a Node runtime because the signature form posts to a server-side route handler and reads signatures from PostgreSQL through Prisma. `npm run build` creates a production build for a Next.js server deployment, while `lagoon/node.dockerfile`, `docker-compose.yml`, and `.lagoon.yml` provide the Lagoon deployment entry points.

Before a Lagoon deployment, revisit the repository security requirements in `CLAUDE.md`, especially the authentication requirements for non-local environments.