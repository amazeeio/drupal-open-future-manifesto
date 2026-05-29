# Monthly Maintenance Run — Agent Instructions

**For the AI agent running this:** Read this entire file before taking any action. Execute every section in order. Do not skip sections. Do not mark a section complete until every check and fix within it is done. Report blockers immediately rather than working around them silently.

**For the vibe coder triggering this:** Tell the agent: _"Run the monthly maintenance on [project name] using maintenance.md."_ The agent will handle the rest and produce a summary report at the end.

---

## What This Is

A monthly maintenance run is a structured health check and update pass on a project. It covers:

- Upgrading all dependencies to safe, tested latest versions
- Verifying the app builds and runs correctly after upgrades
- Auditing security posture against the standards in `docs/security/`
- Confirming database integrity and schema health
- Verifying all automated jobs (GitHub Actions, Lagoon cron) are running as expected
- Producing a written maintenance log

Run this once a month per project, or immediately after any production incident.

---

## Before You Start

1. **Confirm the project name and repo location.** If the user hasn't specified, ask.
2. **Check the last maintenance date.** Look for a `maintenance-log.md` or `docs/maintenance/` directory in the project. If none exists, this is the first run — note that.
3. **Check the current branch.** Maintenance work must be done on a fresh branch named `maintenance/YYYY-MM` (e.g. `maintenance/2026-05`). Create it if it doesn't exist:
   ```bash
   git checkout -b maintenance/$(date +%Y-%m)
   ```
4. **Confirm the app is currently deployed and reachable** before making changes. Note the pre-maintenance state.
5. **Do not push or deploy anything without telling the user first.** Maintenance produces a PR — the human decides when to merge and deploy.

---

## Section 1 — Dependency Updates

### 1a. Identify the stack

Detect which package managers and runtimes the project uses:

```bash
# Check for Node/Next.js project
ls package.json pnpm-lock.yaml yarn.lock package-lock.json 2>/dev/null

# Check for Python project
ls requirements.txt pyproject.toml poetry.lock 2>/dev/null

# Check for Docker/Lagoon
ls docker-compose.yml .lagoon.yml Dockerfile 2>/dev/null
```

### 1b. Node.js / Next.js updates (if applicable)

**Check current versions before updating:**
```bash
node --version
cat package.json | grep '"next"'
pnpm list --depth=0   # or: npm list --depth=0
```

**Check for outdated packages:**
```bash
pnpm outdated         # or: npm outdated
```

**Update Next.js specifically — this is the highest priority:**

Next.js releases frequently. Always update to the latest stable version. Check https://github.com/vercel/next.js/releases for breaking changes in the release notes before applying the update.

```bash
# Update Next.js and its peer dependencies together
pnpm add next@latest react@latest react-dom@latest
```

After updating Next.js, check for any breaking changes announced in the release notes for every major/minor version you skipped. Common areas that break:
- App Router API changes (`metadata`, `generateStaticParams`, route handlers)
- Turbopack becoming default
- Image component changes
- Middleware changes
- Server Actions API changes

**Update all other dependencies:**
```bash
# Update all non-major bumps safely
pnpm update

# Review what would change at major version
pnpm outdated
```

For any package showing a **major version bump** (e.g. `^2.x` → `^3.x`), check that package's changelog before updating. Update majors one at a time, not all at once.

**Update Auth.js (next-auth) if present:**
```bash
# Check if next-auth is in use
grep "next-auth" package.json

# If yes, update — Auth.js v5 is required per project standards
pnpm add next-auth@beta
```

After updating Auth.js, verify:
- `auth.ts` still exports `{ auth, handlers, signIn, signOut }` correctly
- `trustHost: true` is still set in the Auth.js config
- The Credentials provider (if used) still references `ADMIN_PASSWORD_HASH` from env
- The Okta provider (if configured) still references `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_ISSUER`

**Update TypeScript and linting tools:**
```bash
pnpm add -D typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest
pnpm add -D eslint@latest
```

### 1c. Python updates (if applicable)

```bash
# Check current Python version
python3 --version

# List outdated packages
pip list --outdated

# If using pip + requirements.txt
pip install --upgrade -r requirements.txt
pip freeze > requirements.txt

# If using Poetry
poetry update
poetry show --outdated

# If using pyproject.toml with pip-tools
pip-compile --upgrade pyproject.toml
```

For FastAPI projects, always update together:
```bash
pip install --upgrade fastapi uvicorn pydantic
```

### 1d. Prisma updates (if applicable)

```bash
# Check for Prisma schema changes needed after engine update
pnpm add -D prisma@latest
pnpm add @prisma/client@latest

# Regenerate the client after update
pnpm prisma generate

# Check if any schema migrations are pending
pnpm prisma migrate status
```

If `migrate status` shows pending migrations, do NOT auto-apply them during maintenance without understanding what changed. Report them to the user.

### 1e. Docker / Lagoon base image updates (if applicable)

Check `Dockerfile` and `docker-compose.yml` for base images:

```bash
grep "FROM\|image:" Dockerfile docker-compose.yml .lagoon.yml 2>/dev/null
```

The project standard is:
- Node: `uselagoon/node-24` (update to latest LTS if a new LTS is out)
- Python: `uselagoon/python-3.12` (update to latest stable 3.x)

Check https://hub.docker.com/u/uselagoon for the latest available tags. Update the `FROM` line if a newer stable tag exists.

### 1f. Verify the build after all updates

```bash
# Next.js
pnpm build

# Python
python -m pytest  # or: pytest

# TypeScript type-check only
pnpm tsc --noEmit
```

**If the build fails:** fix it before continuing. Do not proceed to other sections with a broken build. Common fixes after Next.js updates:
- Renamed APIs (check release notes)
- Type errors from stricter TypeScript
- Deprecated `<Image>` or `<Link>` props
- Route handler signature changes

---

## Section 2 — Security Audit

Run through every item in this checklist. For each item, check the current code and note the status. Fix any failures immediately.

### 2a. Secrets and environment variables

- [ ] `.env.local` is listed in `.gitignore` — verify with `git check-ignore -v .env.local`
- [ ] No secrets are hardcoded in source files — run:
  ```bash
  git log --all --oneline | head -5  # confirm no secret commits
  grep -r "sk-\|Bearer \|password.*=.*['\"][^$]" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.js" src/ app/ lib/ api/ backend/ 2>/dev/null | grep -v "test\|spec\|mock\|placeholder\|example\|ADMIN_PASSWORD_HASH\|process\.env\|os\.environ"
  ```
- [ ] `.env.example` exists and lists every variable the app needs (with no real values)
- [ ] Every variable in `.env.example` has a corresponding entry in Lagoon environment variables (ask the user to confirm, or check the Lagoon project)
- [ ] `AUTH_SECRET` is set and was generated with `openssl rand -base64 32` (value should be long and random — check length if accessible)
- [ ] `AUTH_TRUST_HOST=1` is set in Lagoon environment variables (required for Auth.js behind Lagoon's reverse proxy)

### 2b. Authentication

- [ ] The app has a login gate — no route is publicly accessible without auth (check middleware or route guards)
- [ ] The Credentials provider (if still active) uses bcrypt with cost ≥12 — look for `bcrypt.compare` or `bcryptjs.compare` with a hash that starts with `$2b$12$`
- [ ] JWT tokens are validated on every API request — check middleware files
- [ ] `alg: none` is not accepted — search for any JWT verify calls missing algorithm enforcement:
  ```bash
  grep -r "jwt.verify\|decode(" --include="*.ts" --include="*.py" src/ app/ lib/ backend/ 2>/dev/null | grep -v "algorithms\|algorithm"
  ```
- [ ] Session/cookie expiry is set (Auth.js default is fine; confirm it hasn't been removed)
- [ ] Okta SSO status: is Okta configured? Is the Credentials provider supposed to be disabled? Check `NEXT_PUBLIC_ADMIN_LOGIN_DISABLED` if that pattern is in use
- [ ] Rate limiting is on the login endpoint — check for middleware like `rate-limiter-flexible`, `upstash/ratelimit`, or similar

### 2c. Database security

- [ ] No raw SQL string concatenation — scan for template literals or f-strings in DB calls:
  ```bash
  grep -rn "query\`\|execute(\`\|f\"SELECT\|f'SELECT\|f\"INSERT\|f'INSERT" --include="*.ts" --include="*.py" 2>/dev/null
  ```
- [ ] All queries go through the ORM (Prisma or SQLAlchemy) — confirm no `db.query()` with user input
- [ ] Database is not publicly exposed (check `docker-compose.yml` — the DB service should have no `ports:` mapping to the host, or only to `127.0.0.1`)
- [ ] `DATABASE_URL` is not committed to git

### 2d. API and input security

- [ ] CORS origin is explicitly set — search for `CORS_ORIGINS` or `cors({` and verify it is not `*`:
  ```bash
  grep -r "CORS\|cors(" --include="*.ts" --include="*.py" src/ app/ lib/ backend/ 2>/dev/null | grep -i "origin"
  ```
- [ ] API documentation routes are disabled in production (`/docs`, `/redoc`, `/swagger`) — check for env-based guards in FastAPI startup
- [ ] Security response headers are set — look for middleware adding:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Cache-Control: no-store`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  Check `next.config.ts` or middleware for these headers. If missing, add them.
- [ ] Record IDs are UUIDs, not sequential integers — check Prisma schema or SQLAlchemy models:
  ```bash
  grep -r "autoincrement\|SERIAL\|id.*Int\b" prisma/schema.prisma src/ backend/ 2>/dev/null | grep -v "test\|spec"
  ```
- [ ] Input validation uses allowlists (Zod, Pydantic) on all API routes — spot check 2–3 routes

### 2e. External writes

- [ ] If the app writes to external systems, `EXTERNAL_WRITES_ENABLED` is set only where intentional
- [ ] No agent-generated content posts automatically without human approval — verify any scheduled or background jobs

### 2f. Dependency vulnerability scan

```bash
# Node
pnpm audit --audit-level=moderate
# or
npm audit --audit-level=moderate

# Python
pip install safety
safety check

# GitHub — check Dependabot alerts
# (Ask the user to open the repo's Security tab and check for open Dependabot alerts)
```

For any **critical** or **high** severity vulnerabilities: fix them before the PR is created. For **moderate**: document in the maintenance log and create a follow-up issue. For **low**: note in the maintenance log.

---

## Section 3 — Database Health

### 3a. Migration status

```bash
# Prisma
pnpm prisma migrate status

# SQLAlchemy (Alembic)
alembic current
alembic history --verbose | head -20
```

Expected result: all migrations applied, no pending changes, no drift.

If migrations are pending: **do not auto-apply** without understanding what changed. Report the specific pending migrations to the user and ask before applying.

### 3b. Schema drift check (Prisma)

```bash
pnpm prisma db pull  # pulls current DB schema into temp state
# If this shows differences from your schema.prisma, there is drift
```

Schema drift means the database has diverged from what the code expects. This must be investigated and resolved.

### 3c. Prisma client freshness

After any `schema.prisma` change or Prisma version bump:
```bash
pnpm prisma generate
```

### 3d. Database connection test

If the project has a local environment running:
```bash
# Prisma
pnpm prisma db execute --stdin <<< "SELECT 1;"

# Or via the app's own health endpoint (if one exists)
curl http://localhost:3000/api/health
```

If the project uses Lagoon and you can check the Lagoon CLI:
```bash
lagoon get environments -p <project-name>
```

---

## Section 4 — GitHub Actions Health

### 4a. Review recent workflow runs

For each workflow file in `.github/workflows/`:

```bash
ls .github/workflows/
```

For each workflow, ask the user (or check GitHub UI / CLI):
```bash
# GitHub CLI (if available)
gh run list --limit 10
gh run list --workflow=<workflow-name>.yml --limit 5
```

**Check for:**
- [ ] Any workflow that has been failing for more than 1 run — identify and fix the root cause
- [ ] Any workflow that hasn't run recently despite having a `schedule` trigger — GitHub silently disables scheduled workflows on inactive repos after 60 days. Re-enable by committing something to the default branch or re-enabling via the Actions tab
- [ ] Action versions pinned to SHA or a specific version tag (not `@main` or `@master`) — floating tags are a supply chain risk

### 4b. Scheduled cron jobs — verify they're running

List all scheduled workflows:
```bash
grep -r "schedule\|cron:" .github/workflows/ 
```

For each cron-scheduled workflow, verify the last run timestamp. If a daily or weekly cron hasn't run in more than 2× its expected interval, it may be disabled.

**Common schedules in this project portfolio:**
- Dependency scans: weekly (Monday 8am UTC)
- Data snapshots: daily or weekly
- Reporting workflows: weekly

If a cron workflow is silently disabled, re-enable it:
1. Make a trivial commit (e.g. update a comment in the workflow file itself)
2. Push to the default branch
3. Verify the next scheduled run executes

### 4c. Update GitHub Actions versions

Check for outdated action versions:
```bash
grep -r "uses:" .github/workflows/ | grep -oP 'uses: \K[^\s]+' | sort -u
```

Common actions to keep current:
- `actions/checkout` — keep at `@v4`
- `actions/setup-node` — keep at `@v4`
- `actions/setup-python` — keep at `@v5`
- `actions/cache` — keep at `@v4`
- `actions/upload-artifact` / `download-artifact` — keep at `@v4`

Update any outdated action references in the workflow files.

### 4d. Secrets referenced in workflows

```bash
grep -r "secrets\." .github/workflows/
```

For each `secrets.SECRET_NAME` referenced: confirm the secret is set in the GitHub repo (Settings → Secrets and variables → Actions). Missing secrets cause silent failures.

---

## Section 5 — Lagoon Infrastructure Health

Skip this section if the project does not use Lagoon.

### 5a. Environment status

```bash
# List environments and their status
lagoon get environments -p <project-name>

# Check recent deploys
lagoon get deployments -p <project-name> -e main --limit 5
```

Look for:
- [ ] Last deploy completed successfully (status: `complete`, not `failed` or `error`)
- [ ] No environments stuck in `building` or `pending` state

### 5b. Lagoon cron jobs

Lagoon supports cron jobs defined in `.lagoon.yml`. Check for them:
```bash
grep -A5 "cron\|tasks" .lagoon.yml 2>/dev/null
```

For each cron in `.lagoon.yml`: verify the last execution succeeded. Ask the user to check the Lagoon UI for task history if needed.

### 5c. Environment variables in Lagoon

After any new variable added to `.env.example` during this maintenance run:
```bash
lagoon add variable -p <project-name> -e main -N VARIABLE_NAME -V value -S global
```

After adding variables, a redeploy is required:
```bash
lagoon deploy branch -p <project-name> -b main
```

**Do not trigger a redeploy without the user's confirmation.**

### 5d. Docker base image freshness

If the `FROM` line in `Dockerfile` was updated in Section 1e, confirm the new image tag exists:
```bash
# Check available Lagoon images
# Reference: https://hub.docker.com/u/uselagoon
grep "^FROM" Dockerfile
```

---

## Section 6 — Application Smoke Test

After all updates, run a quick functional smoke test.

### 6a. Build and type-check

```bash
# Next.js
pnpm build
pnpm tsc --noEmit

# Python
python -m py_compile $(find . -name "*.py" -not -path "*/node_modules/*" -not -path "*/.venv/*")
```

### 6b. Run tests (if a test suite exists)

```bash
# Node
pnpm test
pnpm test:e2e  # if Playwright or Cypress is configured

# Python
pytest
```

If tests fail: fix them if the failure is due to the dependency updates. Do not suppress failing tests. If a test failure is pre-existing (unrelated to this maintenance run), note it in the maintenance log as a separate issue.

### 6c. Local dev server check

If the project can be run locally:
```bash
pnpm dev   # or: npm run dev
```

Confirm the server starts without errors. Check the terminal for any deprecation warnings that became errors — these indicate code that needs to be updated alongside the dependency.

### 6d. Authentication flow check

If auth is present:
- Confirm the login page renders
- Confirm a valid login succeeds
- Confirm an invalid login is rejected (does not bypass)
- Confirm a protected page redirects to login when unauthenticated

---

## Section 7 — Maintenance Log

At the end of the run, create or update `docs/maintenance/YYYY-MM-maintenance.md` (create the `docs/maintenance/` directory if it doesn't exist) with the following format:

```markdown
# Maintenance Log — [Month Year]

**Date:** [YYYY-MM-DD]
**Agent:** Claude
**Branch:** maintenance/YYYY-MM

## Summary

[1–2 sentence overview of what was found and done]

## Dependency Updates

| Package | Before | After | Notes |
|---|---|---|---|
| next | x.x.x | x.x.x | Review release notes for breaking changes |
| ... | ... | ... | ... |

## Security Audit Results

| Check | Status | Notes |
|---|---|---|
| .env.local in .gitignore | ✅ Pass | |
| No hardcoded secrets | ✅ Pass | |
| Auth gate in place | ✅ Pass | |
| CORS not wildcard | ✅ Pass | |
| Security headers set | ⚠️ Fixed | Added X-Frame-Options to next.config.ts |
| ... | | |

## Vulnerability Scan

| Tool | Findings | Action Taken |
|---|---|---|
| pnpm audit | 0 critical, 0 high | None required |
| ... | | |

## Database

| Check | Status | Notes |
|---|---|---|
| Migrations up to date | ✅ Pass | |
| No schema drift | ✅ Pass | |
| Connection healthy | ✅ Pass | |

## GitHub Actions

| Workflow | Last Run | Status | Action Taken |
|---|---|---|---|
| dependency-scan.yml | [date] | ✅ Passing | — |
| snapshot.yml | [date] | ✅ Passing | — |
| ... | | | |

## Issues Found (Not Yet Fixed)

> Issues that require human decision or are out of scope for this run:

1. [Description, severity, suggested next step]

## Next Maintenance

**Due:** [first of next month or specific date]
**Watch for:** [anything flagged this run that should be checked next time]
```

---

## Section 8 — Pull Request

Once all sections are complete and the maintenance log is written:

1. Stage all changes:
   ```bash
   git add -A
   git status  # review what's staged
   ```

2. Commit:
   ```bash
   git commit -m "chore: monthly maintenance $(date +%Y-%m)

   - Updated Next.js to vX.X.X
   - Updated all dependencies
   - Security audit: all checks passing
   - GitHub Actions: all workflows healthy
   - Database: migrations up to date"
   ```

3. **Tell the user:** "Maintenance is complete. Here's a summary of what was done and what was found. When you're ready, push the `maintenance/YYYY-MM` branch and open a PR to merge these updates."

4. Do **not** push or open a PR automatically. The human reviews and decides.

---

## Quick Reference — What to Fix vs. What to Report

| Finding | Action |
|---|---|
| Outdated dependency (non-critical) | Update and fix any resulting build errors |
| Outdated dependency with critical CVE | Fix immediately; do not finish maintenance without resolving |
| Pending DB migrations | Report to user; do not auto-apply |
| Schema drift | Report to user; investigate before touching |
| Failing GitHub Actions workflow | Fix if cause is clear; report if investigation needed |
| Disabled scheduled cron | Re-enable with trivial commit |
| Missing security header | Fix immediately in `next.config.ts` or middleware |
| Hardcoded secret in code | **Stop everything. Report to user. Do not commit until resolved.** |
| `.env.local` not in `.gitignore` | Fix `.gitignore` immediately and verify history with `git log --all -- .env.local` |
| Wildcard CORS in production | Fix immediately |
| JWT `alg: none` accepted | Fix immediately |
| Rate limiting missing on login | Fix or create a follow-up issue with high priority |
| Auth.js Credentials still active (Okta should be primary) | Ask user if Okta is live; if yes, disable Credentials |

---

## References

All security checks in this document are grounded in the project's security standards:

- `docs/security/security-and-access.md` — authentication, CORS, audit logging, network rules
- `docs/security/owasp-api-top10.md` — OWASP API Security Top 10 (2023) assessment criteria
- `docs/security/secure-software-development-skill.md` — ASVS/NIST-based assessment checklist
- `docs/security/okta-oauth-implementation-guide.md` — Okta SSO requirements
- `docs/security/do-not-write.md` — external write constraints
- `CLAUDE.md` — project-wide agent rules and implementation standards
