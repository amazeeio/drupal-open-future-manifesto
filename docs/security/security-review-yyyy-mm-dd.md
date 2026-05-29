# Security Review — [Project Name]
**Date:** [YYYY-MM-DD]  
**Scope:** [e.g. Full codebase — FastAPI backend, Next.js frontend, integrations]  
**Standards:** OWASP API Security Top 10 (2023), amazee.io Secure Software Development Policy v1.2.1 

---

## How to Use This Template

Copy this file and rename it `security-review-YYYY-MM-DD.md`. Fill in each section based on your review. Use the skill in `docs/security/secure-software-development-skill.md` and `docs/security/owasp-api-top10.md` as assessment criteria.

Score calculation: start at 100, deduct per finding — critical: −12, high: −6, medium: −3, low: −1. Clamp at 0.

| Posture | Score range |
|---|---|
| Poor | 0–39 |
| Fair | 40–69 |
| Good | 70–89 |
| Excellent | 90–100 |

---

## Executive Summary

| | |
|---|---|
| **Overall score** | _X / 100_ |
| **Posture** | _Poor / Fair / Good / Excellent_ |
| **Worst finding** | _e.g. 🔴 Unauthenticated admin endpoint_ |
| **Top risk areas** | _e.g. Authentication gaps, missing rate limiting_ |

### Top Risks

> _List the 3 most critical findings here as a quick-reference summary._

1. _Finding one_
2. _Finding two_
3. _Finding three_

---

## Findings

Use the template below for each finding. Copy the block as needed.

---

### F1 — [Finding Title] [Status: Open / ✅ Fixed YYYY-MM-DD]

| | |
|---|---|
| **Severity** | 🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low |
| **Category** | _OWASP category, e.g. API2 — Broken Authentication_ |
| **File / Location** | _e.g. `backend/app/api/auth.py` lines 45–67_ |

**Description:**

> _Explain the vulnerability: what it is, why it's a risk, and how it could be exploited._

**Recommendation:**

> _Specific, actionable fix. Include code snippets if helpful._

**Resolution** _(fill in when fixed)_:

> _What was changed and where. Reference the PR or commit if available._

---

## Assessment Checklist

Copy from `docs/security/secure-software-development-skill.md`:

- [ ] All database interactions use parameterized queries — no string concatenation.
- [ ] Dependencies are locked with hashes and scanned for known vulnerabilities.
- [ ] Input validation is server-side and uses allowlists.
- [ ] Secrets are not in source code or config files.
- [ ] Contextual output encoding is applied to prevent XSS.
- [ ] No hardcoded roles or allow-by-default logic in access control.
- [ ] CI/CD pipeline includes automated SAST and dependency vulnerability checks.
- [ ] User-facing errors are generic; internal detail is only in secure logs.
- [ ] Okta SSO is enabled for all production-accessible endpoints.
- [ ] CORS does not use `*` in production.
- [ ] No API docs publicly accessible in production.

---

## Reference: Past Security Reviews

> _Link to previous security review files in this directory so patterns and regressions can be tracked over time._

