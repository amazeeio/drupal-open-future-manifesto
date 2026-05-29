# Tech Stack

## How to Use This Document

Fill in this document at the start of your project. It serves as the single source of truth for technology choices and helps AI agents and new contributors understand the project quickly.

Delete placeholder text and replace with your actual choices. Keep this file updated as the project evolves.

---

## Overview

> _Describe what this project is in 2–3 sentences: what problem it solves, who uses it, and what kind of system it is (e.g. "A Next.js web application deployed on Lagoon that provides X for Y users. It has a Node backend, a PostgreSQL database, and authenticates via Okta SSO.")_

---

## Architecture

> _Describe the high-level architecture: is it a monolith, a decoupled frontend/backend, a monorepo? What are the main services?_

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

> _Replace the table below with your actual choices once decided._

| Layer | Choice | Version | Notes |
|---|---|---|---|
| _e.g. Framework_ | _e.g. Next.js_ | _e.g. 15.x_ | _e.g. App Router_ |
| _Language_ | | | |
| _Styling_ | | | |
| _Database_ | | | |
| _Auth_ | | | |
| _Deployment_ | Lagoon | — | amazee.io managed |

---

## Project Structure

> _Document the actual directory layout here once the project is scaffolded. Example:_

```
src/
  app/              # Next.js App Router pages and layouts
  components/       # Shared UI components
  lib/              # Server utilities, auth helpers, DB client
  types/            # Shared TypeScript interfaces
public/             # Static assets
lagoon/             # Lagoon Dockerfiles and scripts
docs/               # This documentation
```

---

## Running Locally

> _Fill in the actual commands for this project._

```bash
# Install dependencies
npm install        # or: pnpm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

**Prerequisites:**
- Node 20+ (or match the Lagoon base image version)
- Docker + the amazeeio-network for local Lagoon development
- `.env.local` file — copy from `.env.example` and fill in values

---

## Environment Variables

> _List every environment variable the project requires. Use `.env.example` as the canonical source._

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Yes | Auth.js signing secret — generate with `openssl rand -base64 32` |
| `OKTA_CLIENT_ID` | Yes (prod) | From IT — see Okta guide |
| `OKTA_CLIENT_SECRET` | Yes (prod) | From IT — see Okta guide |
| `OKTA_ISSUER` | Yes (prod) | From IT — e.g. `https://login.yourcompany.io` |
| `DATABASE_URL` | If using DB | PostgreSQL connection string |

Never commit real values. Add all secrets to Lagoon environment variables for production.

---

## Persistence Requirement (Not Yet Implemented)

The current prototype loses all state on page refresh — task statuses, deadlines, and SLA data are reset to hardcoded defaults in `src/data/`.

**A PostgreSQL database will be required** before this tool can be used in production. Specifically, the following state needs to be persisted server-side:

| Data | Current location | Must persist in DB |
|---|---|---|
| Task status per customer | `CustomerProfile.taskStatuses` (hardcoded) | Yes |
| Task deadlines per customer | `CustomerProfile.taskDeadlines` (hardcoded) | Yes |
| SLA breach records | `CustomerProfile.slaBreaches` (hardcoded) | Yes |
| Customer profiles (name, tier, package, CEM/TAM assignment, dates) | `src/data/customers.ts` (hardcoded) | Yes |
| Onboarding creation (smart pruning decisions) | Ephemeral in `NewOnboardingModal.tsx` | Yes |

PostgreSQL is the preferred choice because:
- It is a first-class citizen on the Lagoon platform (available as DBaaS via RDS/Cloud SQL — see [hosting-on-lagoon.md](hosting-on-lagoon.md))
- The Lagoon `amazeeio/postgres` image handles local dev parity automatically
- Structured relational data (customers → tasks → statuses/deadlines) maps cleanly to a relational schema

**This will require a backend API** (e.g. a Node/Express or similar service) to sit between the React frontend and the database. The frontend currently calls no APIs.
- `activeProfileId` — which customer is open in the cockpit
- `selectedTask` — which task node is selected in the DAG (drives the left panel detail view)
- `toasts` — ephemeral action feedback messages

---

## Deployment

Static build output. `npm run build` produces a `dist/` folder that can be served from any static host (Netlify, Vercel, GitHub Pages, an S3 bucket, etc.). No server-side runtime required.