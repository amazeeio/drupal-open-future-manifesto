import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;

      if (
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname === "/favicon.ico"
      ) {
        return true;
      }

      return Boolean(auth?.user);
    }
  }
};