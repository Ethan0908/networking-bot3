import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs"; // safer with googleapis

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };