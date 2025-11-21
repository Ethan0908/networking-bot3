import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
  pages: {
    signIn: "/rolodex",
    error: "/rolodex",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        (token as any).access_token = account.access_token;
        (token as any).refresh_token = account.refresh_token ??
          (token as any).refresh_token;

        // coerce to number safely
        const expiresInSec = Number(account.expires_in ?? 3600);
        (token as any).expires_at = Date.now() + expiresInSec * 1000;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).access_token = (token as any).access_token;
      (session as any).refresh_token = (token as any).refresh_token;
      (session as any).expires_at = (token as any).expires_at;
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
