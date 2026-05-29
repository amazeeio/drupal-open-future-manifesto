# Okta OAuth Implementation Guide (Auth.js v5 + Next.js App Router + Lagoon)

This guide captures lessons learned from implementing Okta OAuth on amazee.io Next.js apps running on Lagoon. Follow it on any new project to avoid common friction points.

---

## Before You Write Any Code

### Involve IT Support Early

Auth does not work until Okta is configured. Raise an IT ticket at the start — not the end — of the implementation.

**You do not need to deploy the app before contacting IT.** Everything IT needs can be determined upfront:

- The **production callback URL** is predictable from the Lagoon project name — it always follows the pattern `https://node.main.<project-name>.ch4.amazee.io`. You don't need a live deployment to know this.
- The **local dev callback URL** follows the Docker hostname pattern and is also known before deployment.
- IT can create the Okta application immediately and hand back `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, and `OKTA_ISSUER` — none of these require deployment.

Raise the ticket as soon as the Lagoon project name is confirmed. Tell them:

1. **Redirect URIs to register** in the Okta application:
   - Local dev: `http://<lagoon-local-hostname>.docker.amazee.io/api/auth/callback/okta`
   - Production: `https://<node.main.appname>.ch4.amazee.io/api/auth/callback/okta`
   - Do **not** use `localhost` — Lagoon local dev runs on a Docker hostname, not a port

2. **Sign-out redirect URIs**:
   - Local: `http://<lagoon-local-hostname>.docker.amazee.io`
   - Production: `https://<node.main.appname>.ch4.amazee.io`

3. **Okta user groups** that should have access to the application — IT needs to assign them to the Okta app. Also message **#team-it-help on Slack** with the list of specific users who need access — IT uses this to identify which Okta groups to assign to the app.

4. **The Okta Issuer URI** — ask IT to confirm the exact value. It lives in the Okta admin console under **Security → API → Authorization Servers → default → Issuer URI**. It looks like `https://yourcompany.okta.com/oauth2/default` or `https://login.yourcompany.io`.

5. **Client authentication method** — confirm the Okta app uses `client_secret_post` (not `client_secret_basic`). This is the most common cause of `OAuthCallbackError` after a successful Okta redirect.

---

## Environment Variables

### What You Need

```env
# Okta OAuth
OKTA_CLIENT_ID=           # From Okta app config
OKTA_CLIENT_SECRET=       # From Okta app config
OKTA_ISSUER=              # e.g. https://login.amazee.io — confirm with IT

# Auth.js
AUTH_SECRET=              # Generate: node -e "require('crypto').randomBytes(32).toString('base64url')" | pbcopy
NEXTAUTH_URL=             # Local: http://<appname>.docker.amazee.io  |  Prod: set in Lagoon, not .env.local

# Admin / test credentials (only needed if keeping credentials login)
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=      # Generate: node -e "require('bcryptjs').hash('yourpassword',12).then(console.log)"

# Set to "true" in Lagoon production to disable admin login entirely
NEXT_PUBLIC_ADMIN_LOGIN_DISABLED=
```

### Where to Set Them

| Variable | `.env.local` | Lagoon Variables |
|---|---|---|
| `OKTA_CLIENT_ID` | ✅ | ✅ |
| `OKTA_CLIENT_SECRET` | ✅ | ✅ |
| `OKTA_ISSUER` | ✅ | ✅ |
| `AUTH_SECRET` | ✅ | ✅ |
| `NEXTAUTH_URL` | Local URL only | Production URL |
| `ADMIN_EMAIL` | ✅ | ✅ |
| `ADMIN_PASSWORD_HASH` | ✅ | ✅ |
| `NEXT_PUBLIC_ADMIN_LOGIN_DISABLED` | (omit or `false`) | `true` |
| `AUTH_TRUST_HOST` | (omit) | `1` |

**Important:** `.env.local` is never deployed. All variables must be added manually to the Lagoon project under **Environments → main → Variables**. After adding variables, a redeploy is required.

Watch for typos when adding variables to Lagoon — in one implementation `ADMIN_EMAIL` was entered as `DMIN_EMAIL`, which silently broke admin login.

---

## Replacing a Third-Party Auth Provider (e.g. Supabase Auth)

If the app uses a third-party auth service purely for authentication (no database, storage, or realtime), remove it entirely. The example below uses Supabase, but the same pattern applies to other providers.

### Dependencies

```bash
pnpm remove @supabase/supabase-js
```

### Files to Delete

| File | Why |
|---|---|
| `lib/supabase.ts` | Supabase client singleton — no longer needed |
| `lib/api-auth.ts` | `authHeaders()` helper that built `Authorization: Bearer` headers for client fetch calls — cookies replace this |

### Files to Replace

| File | What changes |
|---|---|
| `lib/auth-api.ts` | Was: `supabase.auth.getUser(token)` Bearer token validation. Now: `auth()` cookie session check (see implementation section below) |
| `lib/auth-context.tsx` | Was: `supabase.auth.getSession()` + `onAuthStateChange`. Now: `useSession()` + `SessionProvider` from next-auth |

### Env Vars to Remove

```env
# Remove from .env.local and from Lagoon variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Patterns to Search and Remove

After deleting the files above, search the codebase for remaining references:

| Search term | What to do |
|---|---|
| `@supabase/supabase-js` | Remove import |
| `from "@/lib/supabase"` | Remove import |
| `from "@/lib/api-auth"` | Remove import, delete `authHeaders()` call sites |
| `authHeaders(session)` | Remove — no longer needed with cookie auth |
| `session.access_token` | Remove — session no longer has an access token on the client |
| `Authorization: \`Bearer` | Remove — cookies are sent automatically on same-origin requests |
| `supabase.auth` | Remove all call sites |

Run `pnpm tsc --noEmit` after cleanup to catch any missed references — Supabase types (`User`, `Session` from `@supabase/supabase-js`) used in function signatures will error once the package is removed.

### Auth Context Interface Change

The Supabase `User` type has an `email` property directly. The Auth.js user type has `email` as `string | null | undefined`. Update any component that uses `user.email` to handle the optional value:

```ts
// ❌ Old — Supabase User has email as string
{user.email}

// ✅ New — Auth.js user.email is string | null | undefined
{user?.email ?? ""}
```

---

## Implementation

### Dependencies

```bash
pnpm add next-auth@beta bcryptjs
pnpm remove @supabase/supabase-js   # or whatever auth you're replacing
```

`next-auth@beta` is Auth.js v5. Do not install the stable v4 — it does not support the App Router properly.

### File Structure

```
auth.config.ts                        # Edge-safe config (no Node.js-only imports)
auth.ts                               # Full config (Okta + Credentials providers)
proxy.ts                              # Route protection + rate limiting (renamed from middleware.ts in Next.js 16)
types/next-auth.d.ts                  # Type augmentation for session.accessToken
app/api/auth/[...nextauth]/route.ts   # Auth.js catch-all handler
lib/auth-context.tsx                  # React context wrapping SessionProvider
lib/auth-api.ts                       # Server-side session guard (replaces Bearer token checks)
```

### auth.config.ts (Edge-Safe — No Providers)

The edge runtime (used by `proxy.ts`) cannot run `bcryptjs` or full Okta provider discovery. Keep providers out of this file:

```ts
import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  providers: [],   // ← empty, providers go in auth.ts only
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAuthenticated = !!auth?.user
      const isWebhook = nextUrl.pathname.startsWith("/api/hubspot/webhooks")
      const isAuthRoute = nextUrl.pathname.startsWith("/api/auth")
      const isLoginPage = nextUrl.pathname === "/login"
      if (isWebhook || isAuthRoute || isLoginPage) return true
      return isAuthenticated
    },
    async jwt({ token, account }) {
      if (account) token.accessToken = account.access_token
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      return session
    },
  },
}
```

### auth.ts (Full Node Config)

```ts
import NextAuth from "next-auth"
import Okta from "next-auth/providers/okta"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

const adminLoginDisabled = process.env.NEXT_PUBLIC_ADMIN_LOGIN_DISABLED === "true"

const credentialsProvider = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (adminLoginDisabled) return null
    const email = credentials?.email as string | undefined
    const password = credentials?.password as string | undefined
    if (!email || !password) return null
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
    if (!adminEmail || !adminPasswordHash) return null
    if (email !== adminEmail) return null
    const valid = await bcrypt.compare(password, adminPasswordHash)
    if (!valid) return null
    return { id: "admin", email, name: "Admin" }
  },
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,   // ← required behind Lagoon/any reverse proxy
  providers: [
    Okta({
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer: process.env.OKTA_ISSUER,
      client: {
        token_endpoint_auth_method: "client_secret_post",  // ← required for Okta
      },
    }),
    ...(!adminLoginDisabled ? [credentialsProvider] : []),
  ],
})
```

### proxy.ts (Next.js 16+)

In Next.js 16, `middleware.ts` was renamed to `proxy.ts` and the exported function name changes from `middleware` to `proxy`. The codemod is:

```bash
npx @next/codemod@canary middleware-to-proxy .
```

Or rename manually and change `export default auth(function middleware(...` to `export default auth(function proxy(...`.

Combine Auth.js session checking with any existing rate limiting in the same file:

```ts
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth(function proxy(request) {
  // your rate limiting or other logic here
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)"],
}
```

### API Route Auth Guard

Replace Bearer token validation with cookie-based session check. The signature stays the same so API route call sites don't change:

```ts
// lib/auth-api.ts
import { auth } from "@/auth"
import type { NextRequest } from "next/server"

export async function getAuthUser(_request?: NextRequest) {
  const session = await auth()
  return session?.user ?? null
}
```

All API routes call it identically:
```ts
const user = await getAuthUser(request)
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
```

### Remove Bearer Tokens from Client Fetch Calls

Cookie-based auth means client-side `fetch()` to same-origin API routes no longer needs `Authorization: Bearer` headers. Remove all:

```ts
// ❌ Old pattern — remove these
const headers = authHeaders(session)
fetch("/api/...", { headers })

// ✅ New pattern — no headers needed
fetch("/api/...")
```

Search the codebase for `authHeaders`, `session.access_token`, and `Authorization: Bearer` to find every occurrence.

### Type Augmentation

Auth.js doesn't include `accessToken` on the `Session` type by default. Add this or TypeScript will error:

```ts
// types/next-auth.d.ts
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session { accessToken?: string }
}
declare module "next-auth/jwt" {
  interface JWT { accessToken?: string }
}
```

---

## Known Issues and Fixes

### `UntrustedHost` errors in server logs

**Symptom:** All auth requests fail with `UntrustedHost` errors. The URL in logs shows the wrong hostname.

**Cause:** Auth.js rejects requests where the `Host` header doesn't exactly match `NEXTAUTH_URL`. Behind Lagoon's reverse proxy, headers are rewritten.

**Fix:** Two things are both required:

1. Add `trustHost: true` to the NextAuth config in `auth.ts`
2. Add `AUTH_TRUST_HOST=1` as a Lagoon environment variable

`trustHost: true` in code alone is not sufficient — Auth.js v5 also reads the `AUTH_TRUST_HOST` env var before the application config is evaluated. Set it via the CLI:

```bash
lagoon add variable -p <project-name> -e main -N AUTH_TRUST_HOST -V 1 -S global
```

Then redeploy. Without this env var, all `/api/auth/*` calls will silently fail even with `trustHost: true` in `auth.ts`.

---

### `OAuthCallbackError` after successful Okta redirect

**Symptom:** Okta login page works, user authenticates, but gets redirected to `/login?error=OAuthCallbackError`.

**Cause:** Okta expects the token exchange request to send client credentials in the POST body (`client_secret_post`), but Auth.js v5 defaults to the `Authorization` header (`client_secret_basic`).

**Fix:** Add to the Okta provider config:
```ts
client: {
  token_endpoint_auth_method: "client_secret_post",
}
```

---

### `InvalidEndpoints` error on startup (Okta provider missing issuer)

**Symptom:** Server logs show `[auth][error] InvalidEndpoints: Provider "okta" is missing both issuer and authorization endpoint config`.

**Cause:** The Okta provider was included in `auth.config.ts` (the edge config), which runs before env vars are resolved in the edge runtime.

**Fix:** Keep `providers: []` in `auth.config.ts`. Only add providers in `auth.ts` (the full Node.js config).

---

### Callback URL `ERR_CONNECTION_REFUSED` in browser

**Symptom:** After Okta login, browser lands on `http://<appname>.docker.amazee.io/api/auth/callback/okta` with a connection refused error.

**Cause:** `NEXTAUTH_URL` is set to the Lagoon Docker hostname, but the app is running with `pnpm dev` (not inside Docker).

**Fix:** When testing outside Docker, either run the full Lagoon stack (`lagoon run`) or temporarily set `NEXTAUTH_URL=http://localhost:<port>` and add that localhost URL to Okta's redirect URIs. Don't use `localhost` as the permanent URL — use the Lagoon Docker hostname consistently to avoid port collision issues.

---

### `DMIN_EMAIL` (or other typos) in Lagoon variables

**Symptom:** Admin login silently fails even with correct credentials.

**Cause:** Variable name typo when entering into Lagoon dashboard.

**Fix:** Double-check variable names after entry. Compare against `.env.local`.

---

## Security Recommendations

### Disable Admin Login in Production

Once Okta SSO is working and users have access, disable the credentials login route entirely:

1. Add `NEXT_PUBLIC_ADMIN_LOGIN_DISABLED=true` to Lagoon production environment variables
2. This removes the "Admin / test login" toggle from the UI **and** excludes the Credentials provider from Auth.js, making the route dead even if called directly

#### For AI agents (Copilot, Claude, etc.)

Do **not** leave this as a manual user step. Use the Lagoon CLI to set it directly:

```bash
lagoon add variable -p <project-name> -e main -N NEXT_PUBLIC_ADMIN_LOGIN_DISABLED -V true -S global
```

The project name matches the Lagoon project name. Run this as part of the implementation, then confirm with the user that a redeploy is needed to apply it.

### Hash Admin Passwords with bcrypt

Never store a plain-text password. Generate the hash before adding it to any env file:

```bash
node -e "require('bcryptjs').hash('yourpassword', 12).then(console.log)"
```

Use cost factor 12 minimum.

#### For AI agents (Copilot, Claude, etc.)

When implementing admin password hashing, do **not** guess or generate a password. Instead:

1. Use `vscode_askQuestions` (or equivalent) to ask the user for the password — frame it as: *"This will be hashed with bcrypt (cost 12) and stored in `.env`. The plain-text password is never saved anywhere."*
2. Run the hash in the terminal: `node -e "require('bcryptjs').hash('THEIR_PASSWORD', 12).then(console.log)"`
3. Write the resulting hash directly into `.env` as `ADMIN_PASSWORD_HASH=<hash>`
4. Never echo or store the plain-text password anywhere.

### Exclude Webhook Routes from Auth

Inbound webhook calls from third-party services (HubSpot, GitHub, etc.) are unauthenticated by design. Whitelist them explicitly in the proxy `authorized` callback and add signature verification instead:

```ts
const isWebhook = nextUrl.pathname.startsWith("/api/hubspot/webhooks")
if (isWebhook) return true
```

### Keep `.env.local` Out of Version Control

Ensure `.env.local` is in `.gitignore`. It contains `AUTH_SECRET`, `OKTA_CLIENT_SECRET`, and `ADMIN_PASSWORD_HASH` — none of which should ever be committed.

---

## Lagoon Deployment Checklist

- [ ] All env vars added to Lagoon project Variables (not just `.env.local`)
- [ ] `NEXTAUTH_URL` set to the **production** URL in Lagoon (not the Docker local hostname)
- [ ] `NEXT_PUBLIC_ADMIN_LOGIN_DISABLED=true` added for production lockdown
- [ ] `trustHost: true` is in `auth.ts`
- [ ] `AUTH_TRUST_HOST=1` added to Lagoon environment variables
- [ ] IT has registered both redirect URIs in the Okta app
- [ ] IT has confirmed the Okta app has `client_secret_post` as the token auth method
- [ ] IT has assigned the correct Okta user groups access to the application
- [ ] Redeploy triggered after adding env vars

---

## Callback URL Reference

| Environment | Callback URL pattern |
|---|---|
| Local (Docker) | `http://<appname>.docker.amazee.io/api/auth/callback/okta` |
| Production | `https://node.main.<appname>.ch4.amazee.io/api/auth/callback/okta` |