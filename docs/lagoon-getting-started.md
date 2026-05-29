# Lagoon Getting Started

Lagoon is the amazee.io managed hosting platform. This document explains the mental model and the minimum you need to know to deploy and operate a project on it.

---

## The Mental Model

Lagoon organises everything into three layers:

```
Organisation
└── Project  (your app — one per repository)
    └── Environment  (a deployed instance of that app)
        ├── Variables  (env vars injected at runtime)
        ├── Deployments  (build + deploy runs)
        └── Services  (individual containers: node, python, postgres, etc.)
```

A **project** maps to a Git repository. An **environment** maps to a Git branch — typically `main` for production, plus any feature or staging branches you deploy. Each environment is completely independent: its own containers, its own variables, its own URL.

---

## Local Development

Local development uses **Docker Compose** with the `amazeeio-network`, not plain `localhost`. This mirrors what runs in Lagoon and avoids "works on my machine" issues.

### Prerequisites

1. Install [Lagoon CLI](https://docs.lagoon.sh/installing-the-lagoon-cli/)
2. Install Docker Desktop (or equivalent)
3. Create the shared amazeeio network (one-time setup):
   ```bash
   docker network create amazeeio-network
   ```

### Start the local stack

```bash
docker compose up
```

Your app will be reachable at `http://<appname>.docker.amazee.io` — **not** `localhost`. The hostname comes from the `lagoon.name` label in your `docker-compose.yml`.

---

## Project Configuration Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Defines local services (node, python, postgres, etc.) and Lagoon labels |
| `.lagoon.yml` | Tells Lagoon which `docker-compose.yml` to use for deployments |
| `lagoon/node.dockerfile` (or similar) | Builds the production container image |

The `lagoon.type` label on each service in `docker-compose.yml` tells Lagoon how to expose it (e.g. `node` gets a public HTTPS route; `postgres` stays internal).

See `docs/lagoon-template-examples/` for working examples of all three files.

---

## Environment Variables

Variables are set per-environment in the Lagoon dashboard or CLI. They are injected into containers at runtime — never baked into images.

### Add a variable via CLI

```bash
lagoon add variable \
  -p <project-name> \
  -e main \
  -N VARIABLE_NAME \
  -V "value" \
  -S global
```

`-S global` makes the variable available to all services in that environment. Use `-S build` for build-time only args.

**After adding any variable, a redeploy is required for it to take effect.**

### Variable scopes

| Scope | When available |
|---|---|
| `global` | Runtime (containers) + build time |
| `runtime` | Runtime only |
| `build` | Build time (Docker `ARG`) only |

### Local vs. production variables

| Variable | Local (`.env.local`) | Lagoon (`main` environment) |
|---|---|---|
| `AUTH_SECRET` | ✅ | ✅ |
| `OKTA_CLIENT_ID` | ✅ | ✅ |
| `NEXTAUTH_URL` | Local Docker URL | Production URL |
| `AUTH_TRUST_HOST` | Omit | `1` |
| `DATABASE_URL` | Local Docker connection string | Production connection string |

Never set `AUTH_TRUST_HOST` locally — it's only needed behind Lagoon's reverse proxy.

> **Important:** `.env.local` must be in `.gitignore`. It contains real credentials and must never be committed. Verify this before your first commit.

---

## Deploying

Lagoon deploys automatically on push to a tracked branch. To trigger a manual redeploy (e.g. after adding env vars):

```bash
lagoon deploy branch -p <project-name> -b main
```

Or use the Lagoon dashboard: **Deployments → Deploy** button.

### Production URL

Every project gets a predictable production URL:

```
https://node.main.<project-name>.ch4.amazee.io
```

Use this URL when configuring Okta redirect URIs, CORS origins, and `NEXTAUTH_URL`.

---

## Useful CLI Commands

```bash
# List all projects you have access to
lagoon list projects

# List environments for a project
lagoon list environments -p <project-name>

# List variables for an environment
lagoon list variables -p <project-name> -e main

# Add a variable
lagoon add variable -p <project-name> -e main -N KEY -V value -S global

# Delete a variable
lagoon delete variable -p <project-name> -e main -N KEY

# Trigger a redeploy
lagoon deploy branch -p <project-name> -b main

# Stream deployment logs
lagoon get deployment -p <project-name> -e main --log-name <deployment-id>

# SSH into a running container
lagoon ssh -p <project-name> -e main -s node
```

---

## Common Gotchas

| Problem | Cause | Fix |
|---|---|---|
| App still uses old env var after adding it in dashboard | Variables require a redeploy to take effect | Trigger a redeploy |
| `UntrustedHost` errors in auth | `AUTH_TRUST_HOST` not set in Lagoon | Add `AUTH_TRUST_HOST=1` as a Lagoon variable |
| Okta callback `ERR_CONNECTION_REFUSED` locally | App running outside Docker but NEXTAUTH_URL is the Docker hostname | Run the full Docker stack, or temporarily set `NEXTAUTH_URL=http://localhost:<port>` for local testing |
| Can't reach `http://<appname>.docker.amazee.io` | amazeeio-network not created, or Docker not running | `docker network create amazeeio-network` then `docker compose up` |
| Variable typo (e.g. `DMIN_EMAIL`) silently breaks feature | Lagoon doesn't validate variable names | Double-check names after entry; compare against `.env.example` |

---

## Further Reading

- [Lagoon documentation](https://docs.lagoon.sh)
- [Lagoon CLI reference](https://docs.lagoon.sh/lagoon-cli/commands/)
- `docs/lagoon-template-examples/` — working Dockerfile and docker-compose examples for this project's stack
