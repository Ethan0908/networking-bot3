import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export default NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
});
