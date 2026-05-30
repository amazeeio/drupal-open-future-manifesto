import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign In | A Manifesto for an Open Future"
};

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string | string[];
  }>;
};

function getCallbackUrl(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "/";
  }

  return value ?? "/";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const allowCredentials =
    process.env.NEXT_PUBLIC_ADMIN_LOGIN_DISABLED !== "true" &&
    Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH);
  const allowOkta = Boolean(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER);
  const callbackUrl = getCallbackUrl(resolvedSearchParams?.callbackUrl);

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Protected Access</span>
        <h1 className="auth-title">Sign in to view and manage the manifesto.</h1>
        <p className="auth-copy">
          This Lagoon deployment stays behind authentication until Okta is live and the public launch is intentionally opened.
        </p>

        <LoginForm allowCredentials={allowCredentials} allowOkta={allowOkta} callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}