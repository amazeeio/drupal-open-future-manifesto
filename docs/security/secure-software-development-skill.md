---
name: secure-software-development
description: Assess codebases and development workflows against secure software development standards. Use when reviewing code for security issues, evaluating CI/CD pipelines, checking dependency management, or validating access control, secrets handling, input validation, and logging practices.
metadata:
  source: amazee.io Secure Software Development Policy
  version: v1.2.1
---

# Secure Software Development Assessment

## Purpose

This skill provides guardrails and assessment criteria based on secure software development best practices (OWASP ASVS, NIST). Use it when reviewing code, PRs, pipelines, or architecture for security compliance.

## Core Rules

### Requirements & Design
- Consider at minimum OWASP ASVS Level 1 requirements for all software.
- Apply threat modeling to identify and prioritize security requirements per release.

### Dependency Management
- Use only actively maintained open-source libraries from trusted sources.
- Maintain a Software Bill of Materials (SBOM) for all third-party dependencies.
- Lock dependencies using cryptographically secure hashes or vendor them.
- Use automated tooling (e.g. Dependabot, Renovate) to surface known vulnerabilities.

### Injection Defense
- All database queries must use parameterization — string concatenation for queries is prohibited.
- Database access must use secure, authenticated, encrypted channels only.
- Apply contextual output encoding (HTML, JS, URL) at render time to prevent XSS.

### Input Validation
- Always validate on the server-side, even when client-side validation exists.
- Prefer allowlisting (known good) over blocklisting (known bad) for syntax validation.
- Do not accept or deserialize objects from untrusted sources; prefer JSON.
- Use ReDoS-safe regex libraries (e.g. Go's `regexp` package which uses RE2).

### Identity & Access Control
- MFA is required for Authentication Assurance Level 2 (AAL2) and above.
- Passwords must be at least 8 characters (12 if no MFA); avoid ineffective complexity rules.
- Access control must deny by default — only allow what is explicitly permitted.
- Do not hardcode roles (e.g. `if user.isAdmin`); use feature-based or attribute-based checks.

### Data Protection & Secrets
- Encrypt sensitive data in transit (TLS) and at rest using peer-reviewed solutions.
- Never store secrets in source code or config files; use a secrets vault (Vault, AWS KMS, etc.).
- Design and document application features to support key rotation.

### Logging & Error Handling
- Never log passwords, session IDs, or PII.
- User-facing error messages must be generic — no stack traces, no account existence hints.
- Protect log integrity; forward logs to a centralised, secure logging service.

### Supply Chain & Code Quality
- Sign commits with GPG or SSH keys to validate authorship.
- All changes to the default branch must be peer-reviewed by someone other than the author.
- Prefer memory-safe languages for new software.
- Run continuous SAST in the CI/CD pipeline.

## References

- [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/)
- [NIST Secure Software Development Framework (SSDF)](https://csrc.nist.gov/projects/ssdf)

## Assessment Checklist

When reviewing a codebase or PR, verify:

- [ ] All database interactions use parameterized queries — no string concatenation.
- [ ] Dependencies are locked with hashes and scanned for known vulnerabilities.
- [ ] Input validation is server-side and uses allowlists.
- [ ] Secrets are not in source code or config files; a vault is used.
- [ ] Contextual output encoding is applied to prevent XSS.
- [ ] No hardcoded roles or allow-by-default logic in access control.
- [ ] CI/CD pipeline includes automated SAST and dependency vulnerability checks.
- [ ] User-facing errors are generic; internal detail is only in secure logs.

## Output Format

Two report templates are available. Choose based on the user's request or context:

| Format | Template file | When to use |
|--------|--------------|-------------|
| **HTML** | `assets/report-template.html` | Default — rich visual report, save as `.html` |
| **Markdown** | `assets/report-template.md` | When the user asks for markdown, or output will be rendered in GitHub / a docs site |

Read the chosen template file, then replace every `{PLACEHOLDER}` token with values derived from your assessment. Each template contains inline comments explaining every placeholder.

Key substitutions to calculate (shared by both templates):
- `{SCORE}` — integer 0–100; start at 100 and deduct: critical −12, high −6, medium −3, low −1; clamp at 0.
- `{POSTURE_LABEL}` — `Poor` (0–39) | `Fair` (40–69) | `Good` (70–89) | `Excellent` (90–100).
- `{BADGE_TEXT}` — `🔴 CRITICAL FINDINGS` | `🟠 HIGH FINDINGS` | `🟡 MEDIUM FINDINGS` | `🟢 PASSING`.
- Checklist icons — `✅` pass | `❌` fail | `⚠️` warn.

HTML-only substitutions:
- `{ARC}` / `{GAP}` — SVG arc: `arc = round(SCORE / 100 × 264)`, `gap = 264 − arc`.
- `{POSTURE_CLASS}` — `posture-poor` | `posture-fair` | `posture-good`.
- `{BADGE_CLASS}` — `(default)` | `badge-high` | `badge-medium` | `badge-low`.
- Checklist `{STATUS_*}` — `fail` / `warn` / `pass`; `{ICON_*}` — `✗` / `⚠` / `✓`.

Output only the rendered content — no extra fenced code block or wrapper.