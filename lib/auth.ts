import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { upsertUserProfile } from "@/lib/user-data";

const adapter = clientPromise ? MongoDBAdapter(clientPromise) : undefined;
const isAuthDebug = process.env.NEXTAUTH_DEBUG === "true";

export const authOptions: NextAuthOptions = {
  ...(adapter ? { adapter } : {}),
  debug: isAuthDebug,
  logger: {
    error(code, metadata) {
      if (isAuthDebug) {
        console.error(`[NextAuth][error][${code}]`, metadata ?? "");
      }
    },
    warn(code) {
      if (isAuthDebug) {
        console.warn(`[NextAuth][warn][${code}]`);
      }
    },
    debug(code, metadata) {
      if (isAuthDebug) {
        console.log(`[NextAuth][debug][${code}]`, metadata ?? "");
      }
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user?.id) return;
      if (!clientPromise) return;
      try {
        await upsertUserProfile({
          userId: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          provider: account?.provider ?? null,
          providerAccountId: account?.providerAccountId ?? null,
        });
      } catch (error) {
        console.error("[Auth] Failed to upsert user profile", error);
      }
    },
  },
};
