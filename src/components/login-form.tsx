"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  allowCredentials: boolean;
  allowOkta: boolean;
  callbackUrl: string;
};

function getSafeCallbackUrl(callbackUrl: string) {
  if (!callbackUrl) {
    return "/";
  }

  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/";
  }

  return callbackUrl;
}

export function LoginForm({ allowCredentials, allowOkta, callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<"credentials" | "okta" | null>(null);

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setPendingProvider("credentials");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: safeCallbackUrl
    });

    if (result?.error) {
      setErrorMessage("Invalid email or password.");
      setPendingProvider(null);
      return;
    }

    router.replace(result?.url ?? safeCallbackUrl);
    router.refresh();
  }

  async function handleOktaSignIn() {
    setErrorMessage(null);
    setPendingProvider("okta");
    await signIn("okta", { redirectTo: safeCallbackUrl });
  }

  if (!allowCredentials && !allowOkta) {
    return <p className="auth-note">Authentication is not configured yet. Add either admin credentials or Okta environment variables before deploying.</p>;
  }

  return (
    <div className="auth-actions">
      {allowOkta ? (
        <button className="auth-alt-btn" disabled={pendingProvider !== null} onClick={handleOktaSignIn} type="button">
          {pendingProvider === "okta" ? "Redirecting..." : "Continue with Okta"}
        </button>
      ) : null}

      {allowCredentials ? (
        <form className="auth-form" onSubmit={handleCredentialsSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input autoComplete="email" id="login-email" name="email" required type="email" />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input autoComplete="current-password" id="login-password" name="password" required type="password" />
          </div>

          <button className="sign-btn auth-submit" disabled={pendingProvider !== null} type="submit">
            {pendingProvider === "credentials" ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : null}

      {errorMessage ? <p className="status-message auth-error">{errorMessage}</p> : null}
    </div>
  );
}