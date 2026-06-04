import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cache } from "react";
import { getAllowedDomain, isAllowedEmail } from "@/lib/auth/domain";
import { getDb } from "@/lib/db/client";
import { schedulers } from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      const allowedDomain = getAllowedDomain();
      if (!allowedDomain) {
        console.error("ALLOWED_DOMAIN is not configured");
        return false;
      }

      if (!user.email || !isAllowedEmail(user.email, allowedDomain)) {
        return false;
      }

      if (!account?.providerAccountId) {
        return false;
      }

      const db = getDb();
      await db
        .insert(schedulers)
        .values({
          email: user.email,
          name: user.name ?? user.email,
          googleSub: account.providerAccountId,
        })
        .onConflictDoUpdate({
          target: schedulers.googleSub,
          set: {
            email: user.email,
            name: user.name ?? user.email,
          },
        });

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

export async function getSession() {
  return auth();
}

export const getSchedulerId = cache(async function getSchedulerId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const db = getDb();
  const [scheduler] = await db
    .select({ id: schedulers.id })
    .from(schedulers)
    .where(eq(schedulers.email, session.user.email))
    .limit(1);

  return scheduler?.id ?? null;
});

export const { GET, POST } = handlers;
