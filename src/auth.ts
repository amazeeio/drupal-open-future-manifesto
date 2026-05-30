import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Okta from "next-auth/providers/okta";

import { authConfig } from "@/auth.config";

const adminLoginDisabled = process.env.NEXT_PUBLIC_ADMIN_LOGIN_DISABLED === "true";
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
const oktaConfigured = Boolean(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER);

const providers = [];

if (!adminLoginDisabled) {
  providers.push(
    Credentials({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const emailValue = credentials?.email;
        const passwordValue = credentials?.password;
        const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
        const password = typeof passwordValue === "string" ? passwordValue : "";

        if (!email || !password || !adminEmail || !adminPasswordHash) {
          return null;
        }

        if (email !== adminEmail) {
          return null;
        }

        const validPassword = await bcrypt.compare(password, adminPasswordHash);

        if (!validPassword) {
          return null;
        }

        return {
          id: "admin",
          email,
          name: "Manifesto Admin"
        };
      }
    })
  );
}

if (oktaConfigured) {
  providers.push(
    Okta({
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer: process.env.OKTA_ISSUER,
      client: {
        token_endpoint_auth_method: "client_secret_post"
      }
    })
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers
});