import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { upsertUserProfile } from "@/lib/user-data";

const adapter = clientPromise ? MongoDBAdapter(clientPromise) : undefined;
const isAuthDebug = process.env.NEXTAUTH_DEBUG === "true";

// Sanitization and validation of environment variables
const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim();
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

if (process.env.NODE_ENV === "production") {
  if (!nextAuthUrl) {
    console.warn("[NextAuth][warn] NEXTAUTH_URL is not set in production.");
  } else if (nextAuthUrl.endsWith("/")) {
    console.warn("[NextAuth][warn] NEXTAUTH_URL has a trailing slash. This can cause OAuth callback issues.");
  }

  if (!nextAuthSecret) {
    console.error("[NextAuth][error] NEXTAUTH_SECRET is not set in production.");
  }

  if (googleClientSecret && (googleClientSecret.startsWith('"') || googleClientSecret.endsWith('"'))) {
    console.warn("[NextAuth][warn] GOOGLE_CLIENT_SECRET appears to be wrapped in quotes. This will cause 403 Forbidden errors.");
  }
}

export const authOptions: NextAuthOptions = {
  ...(adapter ? { adapter } : {}),
  debug: isAuthDebug,
  logger: {
    error(code, metadata) {
      // Enhanced logging for callback errors to reveal the actual response from Google
      if (isAuthDebug || code === "OAUTH_CALLBACK_ERROR") {
        let displayMeta: any = metadata;
        if (metadata && typeof metadata === 'object' && (metadata as any).error) {
          const err = (metadata as any).error;
          displayMeta = {
            ...metadata,
            error: {
              message: err.message,
              stack: err.stack,
              code: err.code,
              status: err.status,
              // openid-client often puts the response body and headers here
              body: err.body || err.response?.body || err.data,
              headers: err.response?.headers,
              // Capture any specific oauth errors
              error: err.error,
              error_description: err.error_description,
            }
          };
        }
        console.error(`[NextAuth][error][${code}]`, JSON.stringify(displayMeta, null, 2));
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
      clientId: googleClientId || "",
      clientSecret: googleClientSecret || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
      // Manual endpoint configuration to bypass 403 Forbidden on discovery or certs fetching
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://www.googleapis.com/oauth2/v3/userinfo",
      // @ts-ignore - Using accounts.google.com for certs as it's often more accessible than www.googleapis.com
      jwks_endpoint: "https://accounts.google.com/o/oauth2/v2/certs",
      issuer: "https://accounts.google.com",
      wellKnown: undefined,
      // Keep state and pkce as they are standard and secure.
      checks: ["pkce", "state"],
    }),
  ],
  session: { strategy: "jwt" },
  secret: nextAuthSecret,
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
