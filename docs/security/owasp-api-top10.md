---
name: owasp-api-top10
description: Assess APIs and API-consuming codebases against the OWASP API Security Top 10 (2023). Use when reviewing API endpoints, authentication flows, authorization logic, rate limiting, input validation, SSRF risks, security configuration, or third-party API integrations for security issues.
metadata:
  source: OWASP API Security Top 10 – 2023
  version: 2023
  reference: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
---

# OWASP API Security Top 10 Assessment

## Purpose

This skill provides assessment criteria based on the OWASP API Security Top 10 (2023 edition). Use it when reviewing API implementations, API gateway configuration, or code that exposes or consumes APIs for security compliance.

## The OWASP API Security Top 10 (2023)

### API1:2023 — Broken Object Level Authorization (BOLA)

**Risk:** Every API endpoint that receives an object ID and performs an action must validate that the authenticated user has permission to access that specific object. Failures lead to unauthorized data disclosure, modification, or deletion.

**Look for:**
- Object IDs accepted from client in path, query string, headers, or body without ownership checks.
- Authorization logic that only compares a user ID from a token to the requested ID — this only covers a narrow subset of cases.
- GraphQL mutations that delete or modify records by ID without permission checks.

**Prevent:**
- Implement per-object authorization checks in every function that accesses data by a client-supplied ID.
- Validate using user policies and hierarchy — not just ID matching.
- Prefer random, unpredictable GUIDs over sequential integers for record IDs.
- Write automated tests that confirm the authorization mechanism rejects cross-user access; fail builds when tests do not pass.

---

### API2:2023 — Broken Authentication

**Risk:** Authentication mechanisms implemented incorrectly allow attackers to compromise tokens or exploit flaws to assume other users' identities.

**Look for:**
- No protection against credential stuffing or brute force (no rate limiting, CAPTCHA, or lockout on login endpoints).
- Weak passwords permitted; no minimum length enforced.
- Auth tokens or passwords sent in the URL.
- Sensitive operations (email change, password change) that do not require re-authentication.
- JWT tokens accepted without signature validation, or with `{"alg":"none"}`.
- JWT expiration date not validated.
- Passwords stored in plaintext, base64, or with weak hashing (MD5/SHA-1).
- Microservices that accept calls from other microservices without authentication.
- Weak or predictable tokens used for service-to-service authentication.

**Prevent:**
- Use standard authentication libraries — do not roll your own token generation or password storage.
- Enforce brute force protection on login and credential recovery endpoints, stricter than general rate limits.
- Require re-authentication for sensitive operations (e.g. changing email or 2FA phone number).
- Implement MFA where possible.
- Validate JWT signature, algorithm, and expiration on every request.
- API keys must not be used for user authentication; they are for API client (machine) authentication only.

---

### API3:2023 — Broken Object Property Level Authorization

**Risk:** API endpoints expose or accept object properties the user should not have access to. Combines *Excessive Data Exposure* (returning too many fields) and *Mass Assignment* (accepting too many fields on write).

**Look for:**
- Responses that serialize entire objects (`to_json()`, `to_string()`) instead of returning only required fields.
- Write endpoints that bind all incoming request fields to internal objects without an allowlist (mass assignment).
- Fields in responses that are only meant for privileged roles (e.g. `isAdmin`, `internalScore`).
- User-controlled input that can change internal state flags (e.g. `"blocked": false`).

**Prevent:**
- Cherry-pick specific properties to return; never serialize entire model objects.
- Define and enforce a schema-based response validation mechanism.
- Maintain an explicit allowlist of properties that clients are permitted to set on writes.
- Avoid functions that automatically bind client input to internal objects.

---

### API4:2023 — Unrestricted Resource Consumption

**Risk:** APIs that do not limit client interactions can be abused to cause denial of service or drive up operational costs via third-party API charges.

**Look for:**
- No execution timeouts on long-running operations.
- No maximum payload size, array length, or string length enforced server-side.
- No rate limiting on API endpoints, or rate limiting that can be bypassed (e.g. GraphQL query batching).
- Password reset or OTP endpoints that can be called an unlimited number of times.
- No spending limits or billing alerts configured for third-party API integrations.
- No limit on the number of records returned per page.

**Prevent:**
- Enforce maximum input sizes for all parameters: string length, array element count, file upload size.
- Implement per-client rate limiting; apply stricter limits to sensitive operations (OTP, password reset).
- Use container/serverless resource constraints (CPU, memory, file descriptors, process count).
- Add server-side validation on pagination parameters controlling response record counts.
- Configure spending cap alerts for all third-party service integrations.

---

### API5:2023 — Broken Function Level Authorization (BFLA)

**Risk:** Access control for API functions is missing or incomplete, allowing attackers to call administrative or privileged endpoints they should not have access to.

**Look for:**
- Administrative endpoints discoverable at predictable paths (e.g. `/api/v1/users/export_all`) without authorization checks.
- HTTP method manipulation: accessing a `DELETE` or `POST` endpoint by an unauthorized user when only `GET` is expected to be secured.
- Endpoints that grant access based on URL path convention (e.g. `/api/admins/`) rather than enforced checks.
- Administrative actions in ordinary controllers without role-based authorization checks.

**Prevent:**
- Deny all access by default; require explicit grants to specific roles for every function.
- Use a centralized authorization module invoked consistently from all business functions.
- Ensure all administrative controllers inherit from an abstract base that enforces role/group checks.
- Review API endpoints specifically for function-level authorization gaps, considering the user hierarchy.

---

### API6:2023 — Unrestricted Access to Sensitive Business Flows

**Risk:** APIs expose business flows (purchasing, booking, commenting, referrals) without compensating controls, enabling automated abuse that harms the business even when individual API calls are technically valid.

**Look for:**
- Purchase, booking, or reservation endpoints with no bot/automation detection.
- Referral or reward endpoints automatable with simple scripts.
- High-value flows (ticket purchase, limited stock) accessible without device fingerprinting or CAPTCHA.
- Developer or B2B API endpoints that skip the protections applied to consumer-facing endpoints.

**Prevent:**
- Identify sensitive business flows during design and apply appropriate compensating controls.
- Use device fingerprinting, CAPTCHA, or biometric human detection on high-risk flows.
- Detect non-human behavioral patterns (e.g. cart + checkout in under one second).
- Consider blocking known proxy/Tor exit node IP ranges for sensitive transactions.
- Apply equivalent protections to machine-to-machine (B2B/developer) APIs.

---

### API7:2023 — Server Side Request Forgery (SSRF)

**Risk:** When an API fetches a remote resource based on a user-supplied URL without validation, attackers can coerce the server to make requests to internal services, cloud metadata endpoints, or other unintended destinations.

**Look for:**
- Endpoints that accept a URL and fetch it server-side (webhooks, URL-based image/file uploads, URL previews, custom SSO).
- No validation of the scheme, host, port, or expected origin of the supplied URL.
- HTTP redirects followed automatically without a depth limit or allowlist check.
- Cloud environments (AWS, GCP, Azure, Kubernetes) where the metadata service (`169.254.169.254`) is reachable from the application.

**Prevent:**
- Isolate resource-fetching functionality so it can only reach external (not internal) origins.
- Use an allowlist of permitted URL schemes, ports, and remote origins.
- Disable automatic following of HTTP redirects.
- Use a well-tested URL parser; be aware of URL parsing inconsistency attacks.
- Validate and sanitize all client-supplied URLs; never return raw responses from fetched resources directly to clients.

---

### API8:2023 — Security Misconfiguration

**Risk:** Missing hardening, outdated patches, extraneous features, incorrect permissions, or missing security headers expose the API to a wide range of attacks.

**Look for:**
- Missing TLS on any internal or external API communication.
- Unnecessary HTTP verbs enabled (e.g. `TRACE`, `OPTIONS`, unconstrained `PUT`/`DELETE`).
- Error responses that include stack traces or reveal internal implementation details.
- Missing or misconfigured CORS policy.
- Absence of security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`, etc.).
- Cloud storage (S3 buckets) or services with overly permissive access policies.
- Logging libraries with unsafe default configurations (e.g. Log4Shell-style JNDI lookups).
- Responses that lack `Cache-Control` headers for sensitive data, causing caching in browsers or proxies.
- HTTP server chain (load balancer → proxy → backend) inconsistencies that enable request smuggling.

**Prevent:**
- Implement a repeatable, automated hardening process applied to every environment.
- Continuously assess configuration effectiveness across the full API stack (code, orchestration, cloud services).
- Restrict HTTP verbs per endpoint; disable all others explicitly.
- Enforce TLS everywhere, including internal service-to-service communication.
- Implement `Cache-Control: no-store` for all API responses containing sensitive data.
- Define and enforce strict API response schemas including error responses.
- Implement and test a proper CORS policy for browser-accessed APIs.

---

### API9:2023 — Improper Inventory Management

**Risk:** Unknown, undocumented, or deprecated API versions, hosts, and data flows expand the attack surface and make it harder to apply consistent security controls.

**Look for:**
- API versions or hosts running in non-production environments (staging, beta, dev) without the same security controls as production.
- Endpoints with no documentation or documentation that is not kept up to date.
- No retirement plan for old API versions; deprecated versions still accessible.
- No inventory of third-party integrations or the data they receive.
- Sensitive data shared with third parties without business justification or documented approval.
- API documentation publicly accessible when it should be restricted.

**Prevent:**
- Maintain a complete inventory of all API hosts: environment, access scope (public/internal/partner), and API version.
- Document all endpoints including authentication, rate limits, CORS policy, parameters, and error responses.
- Generate API documentation automatically (e.g. OpenAPI/Swagger) as part of the CI/CD pipeline.
- Restrict API documentation access to authorized consumers only.
- Apply production-equivalent security controls to all non-production deployments that use real data.
- Define and enforce an API version retirement policy; perform risk analysis before decommissioning.
- Inventory all third-party data flows; document the data type, sensitivity, and approval status.

---

### API10:2023 — Unsafe Consumption of APIs

**Risk:** Developers implicitly trust data from third-party APIs and apply weaker validation, allowing attackers who compromise a third-party service to inject malicious payloads into the consuming application.

**Look for:**
- Data from third-party APIs passed directly into SQL queries, HTML templates, or shell commands without sanitization.
- API integrations that communicate over HTTP instead of HTTPS.
- Automatic following of redirects from third-party APIs without validation.
- No timeout configured for third-party API calls.
- No limit on the size of third-party API responses processed.

**Prevent:**
- Treat data from third-party APIs with the same level of skepticism as user-supplied input — validate and sanitize before use.
- Ensure all API integrations use TLS (HTTPS) for communication.
- Maintain an allowlist of permitted redirect destinations; do not blindly follow redirects.
- Assess third-party API providers' security posture before integration.
- Configure timeouts and response size limits for all outbound API calls.

---

## Assessment Checklist

When reviewing an API or API-consuming codebase, verify:

### Authorization
- [ ] Every endpoint that uses a client-supplied object ID has an ownership/permission check (API1 — BOLA).
- [ ] Function-level authorization denies by default and requires explicit role grants (API5 — BFLA).
- [ ] API responses return only the minimum required fields; no full object serialization (API3).
- [ ] Write endpoints use an explicit allowlist of accepted properties; no mass assignment (API3).

### Authentication
- [ ] Login and credential recovery endpoints have rate limiting, CAPTCHA, or lockout (API2).
- [ ] JWT tokens are validated for signature, algorithm, and expiration (API2).
- [ ] Sensitive operations require re-authentication (API2).
- [ ] Passwords are hashed with a modern algorithm (bcrypt, Argon2, scrypt) (API2).

### Rate Limiting & Resource Controls
- [ ] All endpoints have rate limiting; sensitive endpoints (OTP, password reset) have stricter limits (API4).
- [ ] Maximum payload sizes, array lengths, and string lengths are enforced server-side (API4).
- [ ] Third-party API spending limits or billing alerts are configured (API4).

### Configuration & Infrastructure
- [ ] TLS is enforced on all API communications, internal and external (API8).
- [ ] Only required HTTP verbs are enabled per endpoint (API8).
- [ ] Error responses are generic; no stack traces or internal detail exposed (API8).
- [ ] Security headers and CORS policy are correctly configured (API8).
- [ ] `Cache-Control: no-store` is set on all sensitive API responses (API8).

### SSRF & External Requests
- [ ] User-supplied URLs are validated against an allowlist of schemes, ports, and origins (API7).
- [ ] HTTP redirects are not automatically followed without validation (API7).

### Inventory & Third-Party Integrations
- [ ] A complete inventory of all API hosts, versions, and environments is maintained (API9).
- [ ] Non-production API deployments have equivalent security controls to production (API9).
- [ ] Data received from third-party APIs is validated and sanitized before use (API10).
- [ ] All third-party API communications use TLS (API10).

### Business Flow Protection
- [ ] Sensitive business flows (purchase, booking, referral) have bot/automation controls (API6).

## Scoring

When producing a security posture score:

- Start at **100**.
- Deduct per finding: **Critical −12** | **High −6** | **Medium −3** | **Low −1**.
- Clamp at 0.
- Posture label: **Poor** (0–39) | **Fair** (40–69) | **Good** (70–89) | **Excellent** (90–100).

## Output Format

Produce a Markdown report with:
1. **Executive Summary** — overall posture score and label, top 3 risks.
2. **Findings** — per finding: API category (e.g. API1 — BOLA), severity, description, affected code/endpoint, recommendation.
3. **Checklist** — the assessment checklist above with ✅ pass / ❌ fail / ⚠️ warn against each item.
4. **Recommendations** — prioritized remediation actions ordered by severity.

## References

- [OWASP API Security Top 10 – 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP API Security Project](https://owasp.org/www-project-api-security/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)
- [OWASP Server-Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)