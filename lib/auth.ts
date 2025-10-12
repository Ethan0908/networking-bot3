import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { saveUserTokens, clearUserTokens } from "./tokenStore";

const scopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: scopes,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user, trigger }) {
      const email = (user?.email || (token as any)?.email || account?.providerAccountId) ?? null;
      if (user?.email) {
        (token as any).email = user.email;
      }
      if (account && email) {
        let expiresAt = Date.now() + 3600 * 1000;
        if (account.expires_in != null) {
          const expiresInSec = Number(account.expires_in);
          if (!Number.isNaN(expiresInSec)) {
            expiresAt = Date.now() + expiresInSec * 1000;
          }
        } else if (account.expires_at != null) {
          const epochSeconds = Number(account.expires_at);
          if (!Number.isNaN(epochSeconds)) {
            expiresAt = epochSeconds * 1000;
          }
        }
        saveUserTokens(String(email), {
          accessToken: account.access_token ?? null,
          refreshToken: account.refresh_token ?? null,
          expiresAt,
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && (token as any)?.email) {
        session.user.email = String((token as any).email);
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  events: {
    async signOut({ token }) {
      const email = (token as any)?.email;
      if (email) {
        clearUserTokens(String(email));
      }
    },
  },
};
