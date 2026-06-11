import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/generated/prisma/enums";

/**
 * Edge-safe NextAuth configuration: no Prisma / Node-only imports.
 * Powers `middleware.ts` (JWT-only session check). The full config in
 * `auth.ts` extends this with the Credentials provider.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
