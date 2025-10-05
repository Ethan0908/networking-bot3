import NextAuth from "next-auth";
// go up 4 levels from this file to reach /lib/auth
import { authOptions } from "../../../../lib/auth";

export const runtime = "nodejs";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };